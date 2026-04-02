#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.env.HANZI_REPO_ROOT || path.resolve(__dirname, '../../..');
const scoringCorePath =
  process.env.HANZI_SCORING_CORE ||
  path.join(repoRoot, 'hanzi-writer-workspace', 'packages', 'hanzi-scoring-core', 'dist', 'index.cjs');

let averageScores;
try {
  ({ averageScores } = require(scoringCorePath));
} catch (error) {
  throw new Error(`无法加载评分核心模块 ${scoringCorePath}：${error.message}`);
}

const args = (() => {
  const map = {};
  const source = process.argv.slice(2);
  for (let i = 0; i < source.length; i += 1) {
    const key = source[i];
    const value = source[i + 1];
    if (key.startsWith('--')) {
      map[key.slice(2)] = value;
    }
  }
  return map;
})();

const required = (value, label) => {
  if (!value) throw new Error(`Missing required argument: ${label}`);
  return value;
};

const inputPath = required(args.input, '--input');
const outputPath = required(args.output, '--output');
const jobId = required(args.job, '--job');
const dataRoot =
  args['data-root'] ||
  process.env.HANZI_DATA_ROOT ||
  path.join(repoRoot, 'hanzi-writer-data-master', 'data');

const safeReadJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    return null;
  }
};

const charFilePath = (char) => path.join(dataRoot, `${char}.json`);

const loadStandardData = (char) => {
  if (!char) return null;
  const filePath = charFilePath(char);
  if (!fs.existsSync(filePath)) return null;
  return safeReadJSON(filePath);
};

const pipeline = safeReadJSON(inputPath);
if (!pipeline) {
  throw new Error(`无法读取切分结果：${inputPath}`);
}

const normalizeUnitScore = (value) => {
  if (typeof value !== 'number') return null;
  if (value > 1) return Math.min(value / 100, 1);
  return value;
};

const convertLegacyCells = (cells) =>
  cells.map((cell, index) => {
    const standard = loadStandardData(cell.char);
    const strokeCount = standard?.strokes ? standard.strokes.length : null;
    const medianPoints = standard?.medians;
    const baseScore = cell.score?.overall ?? cell.scores?.overall ?? null;

    const derivedScore =
      typeof baseScore === 'number'
        ? baseScore
        : strokeCount
        ? Math.min(1, (cell.strokePoints?.length || strokeCount) / strokeCount)
        : 0;

    return {
      id: cell.id || cell.cellId || `cell-${index}`,
      char: cell.char || cell.character || '',
      normalizedSvg: cell.normalizedSvg || cell.svgPath || null,
      maskImage: cell.maskPath || cell.maskImage || null,
      score: {
        overall: derivedScore,
        endpoints: cell.score?.endpoints ?? null,
        direction: cell.score?.direction ?? null,
        shape: cell.score?.shape ?? null,
        order: cell.score?.order ?? null,
      },
      standardStrokeCount: strokeCount,
      standardMedians: medianPoints || null,
      sourceScore: cell.score || cell.scores || null,
    };
  });

const convertPluginResults = (results) =>
  results.map((cell, index) => {
    const standard = loadStandardData(cell.target_char);
    const strokeCount = standard?.strokes ? standard.strokes.length : null;
    const breakdown = cell.score_breakdown || cell.sub_scores || {};
    const derivedScore = normalizeUnitScore(cell.total_score);

    return {
      id: cell.cell_id || `cell-${index}`,
      char: cell.target_char || '',
      normalizedSvg: cell.features?.normalized_svg || null,
      maskImage: cell.features?.mask_path || null,
      score: {
        overall: derivedScore,
        endpoints: normalizeUnitScore(breakdown.structure_template ?? breakdown.structure),
        direction: normalizeUnitScore(breakdown.structure_accuracy ?? breakdown.structure),
        shape: normalizeUnitScore(breakdown.similarity ?? breakdown.morphology_similarity),
        order: normalizeUnitScore(breakdown.stroke_quality),
      },
      standardStrokeCount: strokeCount,
      standardMedians: standard?.medians || null,
      sourceScore: {
        totalScore: cell.total_score,
        scoreLevel: cell.score_level,
        subScores: cell.sub_scores,
        penalties: cell.penalties,
        diagnostics: cell.norm_diagnostics,
      },
    };
  });

const pluginResults = Array.isArray(pipeline.scoring?.results) ? pipeline.scoring.results : null;
const rawCells = pipeline.cells || pipeline.results || [];

const scoredCells = (pluginResults && pluginResults.length > 0
  ? convertPluginResults(pluginResults)
  : convertLegacyCells(rawCells)
);

const validScores = scoredCells
  .map((cell) => cell.score?.overall)
  .filter((value) => typeof value === 'number');

const averageScore =
  validScores.length > 0 ? validScores.reduce((acc, cur) => acc + cur, 0) / validScores.length : null;

const metrics = averageScores(
  scoredCells.map((cell) => ({
    id: cell.id,
    char: cell.char,
    standardStrokeCount: cell.standardStrokeCount,
    score: cell.score && typeof cell.score.overall === 'number' ? cell.score : null,
  })),
);

const resultPayload = {
  jobId,
  generatedAt: new Date().toISOString(),
  metrics,
  cells: scoredCells,
  artifacts: {
    segmentation: inputPath,
  },
};

fs.writeFileSync(outputPath, JSON.stringify(resultPayload, null, 2));
console.log(`[score-standard] job=${jobId} 输出 -> ${outputPath}`);
