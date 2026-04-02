#!/usr/bin/env node
/**
 * Hanzi ⇄ Coze 本地桥接脚本
 *
 * 用法：
 *   node run-local.js --input /path/to/page.jpg --job 20260402-0001
 *
 * 可选项：
 *   --plugin-root=/home/lc/luckee_dao/baby/coze/插件
 *   --pipeline-script=run_pipeline.sh
 *   --output=./tmp-results
 *   --artifact-level=standard
 *   --score-artifact-level=debug
 */
const path = require('path');
const { runPipeline } = require('./lib/pipeline-runner');

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const prefix = `--${name}=`;
  const directIndex = args.indexOf(`--${name}`);
  if (directIndex !== -1) {
    return args[directIndex + 1];
  }
  const prefixed = args.find((arg) => arg.startsWith(prefix));
  if (prefixed) {
    return prefixed.slice(prefix.length);
  }
  return fallback;
};

const required = (value, label) => {
  if (!value) throw new Error(`Missing required argument: ${label}`);
  return value;
};

const input = required(getArg('input'), '--input');
const jobId = required(getArg('job'), '--job');
const pluginRoot = getArg('plugin-root', path.resolve(__dirname, '../../../baby/coze/插件'));
const pipelineScript = getArg('pipeline-script', 'run_pipeline.sh');
const outputDir = path.resolve(getArg('output', path.resolve(__dirname, './tmp')));
const artifactLevel = getArg('artifact-level', 'standard');
const scoreArtifactLevel = getArg('score-artifact-level', 'standard');

(async () => {
  try {
    const { resultPath } = await runPipeline({
      input,
      jobId,
      pluginRoot,
      pipelineScript,
      outputDir,
      artifactLevel,
      scoreArtifactLevel,
    });
    console.log(`[coze-bridge] job=${jobId}`);
    console.log(`[coze-bridge] plugin root: ${pluginRoot}`);
    console.log(`[coze-bridge] result written to ${resultPath}`);
  } catch (error) {
    console.error('[coze-bridge] pipeline failed:', error.message);
    process.exit(1);
  }
})();
