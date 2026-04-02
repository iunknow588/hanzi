const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const execPipeline = (scriptPath, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(scriptPath, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Pipeline exited with code ${code}`));
    });
  });

const getLatestOutputDir = (resultsRoot) => {
  if (!fs.existsSync(resultsRoot)) {
    throw new Error(`Results directory not found: ${resultsRoot}`);
  }
  const dirs = fs
    .readdirSync(resultsRoot)
    .map((name) => path.join(resultsRoot, name))
    .filter((item) => fs.statSync(item).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return dirs[0] || null;
};

const extractCells = (pipelineData) => {
  const items = pipelineData?.cells || pipelineData?.results || [];
  return items.map((cell, index) => ({
    id: cell.id || cell.cellId || `cell-${index}`,
    char: cell.char || cell.character || '',
    score: cell.score || cell.scores || {},
    normalizedSvg: cell.normalizedSvg || null,
    maskImage: cell.maskPath || cell.maskImage || null,
  }));
};

const computeMetrics = (cells) => {
  const values = cells
    .map((cell) => cell.score && typeof cell.score.overall === 'number' ? cell.score.overall : null)
    .filter((value) => typeof value === 'number');
  if (!values.length) {
    return {
      scoredCount: 0,
      averageScore: null,
    };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    scoredCount: values.length,
    averageScore: total / values.length,
  };
};

const buildResultPayload = ({ jobId, copiedInput, latestDir, pipelineJson, pipelineData }) => {
  const cells = extractCells(pipelineData);
  return {
    jobId,
    sourceImage: copiedInput,
    pluginOutput: latestDir,
    cells,
    metrics: computeMetrics(cells),
    rawPipeline: pipelineJson,
    generatedAt: new Date().toISOString(),
  };
};

const runPipeline = async ({
  input,
  jobId,
  pluginRoot,
  pipelineScript = 'run_pipeline.sh',
  outputDir,
  artifactLevel = 'standard',
  scoreArtifactLevel = 'standard',
}) => {
  if (!input) throw new Error('Input file is required');
  if (!jobId) throw new Error('jobId is required');
  if (!pluginRoot) throw new Error('pluginRoot is required');
  const taskDir = ensureDir(path.join(outputDir, jobId));
  const inputDir = ensureDir(path.join(taskDir, 'input'));
  const copiedInput = path.join(inputDir, path.basename(input));
  fs.copyFileSync(input, copiedInput);

  const scriptPath = path.join(pluginRoot, pipelineScript);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Pipeline script not found: ${scriptPath}`);
  }

  const runArgs = [
    '--cases',
    copiedInput,
    '--artifact-level',
    artifactLevel,
    '--score-artifact-level',
    scoreArtifactLevel,
  ];

  await execPipeline(scriptPath, runArgs, pluginRoot);

  const resultsRoot = path.join(pluginRoot, 'test', 'out');
  const latestDir = getLatestOutputDir(resultsRoot);
  if (!latestDir) {
    throw new Error('No output directory found under plugin test/out');
  }

  const pipelineJson = path.join(latestDir, 'pipeline_result.json');
  if (!fs.existsSync(pipelineJson)) {
    throw new Error(`pipeline_result.json not found in ${latestDir}`);
  }

  const pipelineData = JSON.parse(fs.readFileSync(pipelineJson, 'utf-8'));
  const hanziResult = buildResultPayload({
    jobId,
    copiedInput,
    latestDir,
    pipelineJson,
    pipelineData,
  });

  const resultPath = path.join(taskDir, 'hanzi-task-result.json');
  fs.writeFileSync(resultPath, JSON.stringify(hanziResult, null, 2));
  return {
    taskDir,
    resultPath,
    hanziResult,
  };
};

module.exports = {
  runPipeline,
};
