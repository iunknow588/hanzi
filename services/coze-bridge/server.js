#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { executeJob } = require('./lib/job-runner');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const config = {
  port: parseInt(process.env.HANZI_BRIDGE_PORT || '8787', 10),
  pluginRoot: process.env.HANZI_PLUGIN_ROOT || path.resolve(__dirname, '../../../baby/coze/插件'),
  pipelineScript: process.env.HANZI_PIPELINE_SCRIPT || 'run_pipeline.sh',
  jobsRoot: path.resolve(process.env.HANZI_JOBS_ROOT || path.join(__dirname, 'jobs')),
  artifactLevel: process.env.HANZI_ARTIFACT_LEVEL || 'standard',
  scoreArtifactLevel: process.env.HANZI_SCORE_ARTIFACT_LEVEL || 'standard',
  executionMode: process.env.HANZI_EXECUTION_MODE || 'pipeline',
  segmentCommand: process.env.HANZI_SEGMENT_COMMAND || null,
  scoreScript:
    process.env.HANZI_SCORE_SCRIPT || path.resolve(__dirname, './skills/score-standard.js'),
  dataRoot: process.env.HANZI_DATA_ROOT || path.resolve(__dirname, '../../../hanzi-writer-data-master/data'),
};

ensureDir(config.jobsRoot);
const uploadsDir = ensureDir(path.join(config.jobsRoot, '_uploads'));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname) || '.dat';
    cb(null, `${timestamp}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({ storage });
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const jobStore = new Map();
const jobQueue = [];
let isProcessing = false;

const jobStatusPath = (jobId) => path.join(config.jobsRoot, jobId, 'status.json');

const sanitizeJob = (record) => {
  if (!record) return null;
  const { uploadPath, ...rest } = record;
  return rest;
};

const persistJob = (record) => {
  const dir = path.join(config.jobsRoot, record.jobId);
  ensureDir(dir);
  fs.writeFileSync(jobStatusPath(record.jobId), JSON.stringify(record, null, 2));
};

const updateJob = (jobId, updater) => {
  const current = jobStore.get(jobId) || {};
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  const timestamp = new Date().toISOString();
  next.updatedAt = timestamp;
  if (!next.createdAt) next.createdAt = timestamp;
  jobStore.set(jobId, next);
  persistJob(next);
  return next;
};

const enqueueJob = (jobConfig) => {
  jobQueue.push(jobConfig);
  processQueue();
};

const processQueue = () => {
  if (isProcessing) return;
  const nextJob = jobQueue.shift();
  if (!nextJob) return;
  isProcessing = true;
  updateJob(nextJob.jobId, (current) => ({
    ...current,
    status: 'running',
    startedAt: new Date().toISOString(),
  }));
  executeJob({
    mode: nextJob.executionMode || config.executionMode,
    input: nextJob.input,
    jobId: nextJob.jobId,
    pluginRoot: config.pluginRoot,
    pipelineScript: config.pipelineScript,
    outputDir: config.jobsRoot,
    artifactLevel: nextJob.options.artifactLevel,
    scoreArtifactLevel: nextJob.options.scoreArtifactLevel,
    segmentCommand: config.segmentCommand,
    scoreScript: config.scoreScript,
    dataRoot: config.dataRoot,
  })
    .then(({ resultPath, hanziResult }) => {
      updateJob(nextJob.jobId, (current) => ({
        ...current,
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        resultPath,
        summary: {
          cellCount: hanziResult.cells?.length || 0,
          scoredCount: hanziResult.metrics?.scoredCount || null,
          averageScore: hanziResult.metrics?.averageScore ?? null,
        },
      }));
    })
    .catch((error) => {
      updateJob(nextJob.jobId, (current) => ({
        ...current,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: error.message,
      }));
    })
    .finally(() => {
      isProcessing = false;
      processQueue();
    });
};

const listStatusFiles = () => {
  if (!fs.existsSync(config.jobsRoot)) return;
  fs.readdirSync(config.jobsRoot).forEach((entry) => {
    if (entry.startsWith('_')) return;
    const statusFile = jobStatusPath(entry);
    if (fs.existsSync(statusFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
        jobStore.set(entry, data);
      } catch {
        // ignore broken status file
      }
    }
  });
};

const nextJobId = () => {
  const now = new Date();
  const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
  const timePart = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  const randomPart = Math.floor(Math.random() * 1e3)
    .toString()
    .padStart(3, '0');
  return `job-${datePart}-${timePart}-${randomPart}`;
};

app.get('/api/jobs', (_req, res) => {
  const items = Array.from(jobStore.values())
    .map(sanitizeJob)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(items);
});

app.get('/api/jobs/:jobId', (req, res) => {
  const record = jobStore.get(req.params.jobId);
  if (!record) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (req.query.includeResult === '1' || req.query.includeResult === 'true') {
    const resultPath = path.join(config.jobsRoot, req.params.jobId, 'hanzi-task-result.json');
    if (fs.existsSync(resultPath)) {
      try {
        const body = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
        res.json({ ...sanitizeJob(record), result: body });
        return;
      } catch (error) {
        res.status(500).json({ error: `Failed to parse result: ${error.message}` });
        return;
      }
    }
  }
  res.json(sanitizeJob(record));
});

app.get('/api/jobs/:jobId/result', (req, res) => {
  const resultPath = path.join(config.jobsRoot, req.params.jobId, 'hanzi-task-result.json');
  if (!fs.existsSync(resultPath)) {
    res.status(404).json({ error: 'Result not found' });
    return;
  }
  res.sendFile(resultPath);
});

app.post('/api/jobs', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  const jobId = req.body.jobId || nextJobId();
  const options = {
    artifactLevel: req.body.artifactLevel || config.artifactLevel,
    scoreArtifactLevel: req.body.scoreArtifactLevel || config.scoreArtifactLevel,
  };
  const creation = {
    jobId,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: req.file.originalname,
    sourceSize: req.file.size,
    options,
    executionMode: req.body.executionMode || config.executionMode,
    uploadPath: req.file.path,
  };
  jobStore.set(jobId, creation);
  persistJob(creation);
  enqueueJob({
    jobId,
    input: req.file.path,
    options,
    executionMode: creation.executionMode,
  });
  res.status(202).json({ jobId, status: 'queued' });
});

app.post('/api/jobs/:jobId/retry', (req, res) => {
  const record = jobStore.get(req.params.jobId);
  if (!record) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (!record.uploadPath || !fs.existsSync(record.uploadPath)) {
    res.status(400).json({ error: 'Original upload no longer available' });
    return;
  }
  updateJob(record.jobId, (current) => ({
    ...current,
    status: 'queued',
    finishedAt: undefined,
    error: undefined,
  }));
  enqueueJob({
    jobId: record.jobId,
    input: record.uploadPath,
    options: record.options,
    executionMode: record.executionMode || config.executionMode,
  });
  res.json({ jobId: record.jobId, status: 'queued' });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    queueSize: jobQueue.length,
    processing: isProcessing,
    pluginRoot: config.pluginRoot,
    executionMode: config.executionMode,
  });
});

listStatusFiles();
app.listen(config.port, () => {
  console.log(`[coze-bridge] listening on http://localhost:${config.port}`);
});
