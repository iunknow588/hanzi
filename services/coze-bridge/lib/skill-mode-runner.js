const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const runShellCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command "${command}" exited with code ${code}`));
    });
  });

const runNodeScript = (scriptPath, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      ...options,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Node script exited with code ${code}`));
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

const runSegmentationStage = async ({
  input,
  jobId,
  pluginRoot,
  pipelineScript = 'run_pipeline.sh',
  artifactLevel = 'standard',
  scoreArtifactLevel = 'standard',
  segmentCommand,
  taskDir,
}) => {
  const inputDir = ensureDir(path.join(taskDir, 'input'));
  const copiedInput = path.join(inputDir, path.basename(input));
  fs.copyFileSync(input, copiedInput);

  const command = segmentCommand || path.join(pluginRoot, pipelineScript);
  const args = [
    '--cases',
    copiedInput,
    '--artifact-level',
    artifactLevel,
    '--score-artifact-level',
    scoreArtifactLevel,
  ];

  await runShellCommand(command, args, { cwd: pluginRoot });

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
  return { copiedInput, latestDir, pipelineJson, pipelineData };
};

const runScoringStage = async ({
  jobId,
  pipelineJson,
  scoreScript,
  dataRoot,
  taskDir,
}) => {
  const resultPath = path.join(taskDir, 'hanzi-task-result.json');
  const args = ['--input', pipelineJson, '--output', resultPath, '--job', jobId];
  if (dataRoot) {
    args.push('--data-root', dataRoot);
  }
  await runNodeScript(scoreScript, args, {
    cwd: path.dirname(scoreScript),
    env: {
      ...process.env,
      HANZI_DATA_ROOT: dataRoot || process.env.HANZI_DATA_ROOT,
    },
  });

  const hanziResult = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
  return { resultPath, hanziResult };
};

const runSkillFlow = async ({
  input,
  jobId,
  pluginRoot,
  pipelineScript,
  artifactLevel,
  scoreArtifactLevel,
  segmentCommand,
  scoreScript,
  dataRoot,
  outputDir,
}) => {
  if (!input) throw new Error('Input file is required');
  if (!jobId) throw new Error('jobId is required');
  const taskDir = ensureDir(path.join(outputDir, jobId));

  const segmentation = await runSegmentationStage({
    input,
    jobId,
    pluginRoot,
    pipelineScript,
    artifactLevel,
    scoreArtifactLevel,
    segmentCommand,
    taskDir,
  });

  const scoring = await runScoringStage({
    jobId,
    pipelineJson: segmentation.pipelineJson,
    scoreScript,
    dataRoot,
    taskDir,
  });

  return {
    taskDir,
    resultPath: scoring.resultPath,
    hanziResult: scoring.hanziResult,
  };
};

module.exports = {
  runSkillFlow,
};
