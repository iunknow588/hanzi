import HanziWriter from 'hanzi-writer';
import { createCharDataLoader } from 'hanzi-writer-data-client';
import localDataMap from './local-data.json';

const loader = createCharDataLoader({
  source: 'hybrid',
  localData: (char) => localDataMap[char as keyof typeof localDataMap],
});

const writerContainer = document.getElementById('writer');
const statusElm = document.getElementById('loader-status');
const scoreTotalElm = document.getElementById('score-total-value');
const scoreListElm = document.getElementById('score-strokes');

if (!writerContainer) {
  throw new Error('#writer element missing');
}

const setStatus = (msg: string) => {
  if (statusElm) {
    statusElm.textContent = msg;
  }
};

type ScoreComponents = {
  endpoints: number;
  direction: number;
  shape: number;
  order: number;
};

type ScoreEntry = {
  strokeIndex: number;
  overall: number;
  accepted: boolean;
  components: ScoreComponents;
};

type ScoreUpdatePayload = {
  overallScore: number;
  strokeIndex: number;
  score: ScoreEntry;
  history: Array<ScoreEntry | null>;
};

type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

type JobRecord = {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
  fileName?: string;
  summary?: {
    cellCount?: number;
    averageScore?: number;
    scoredCount?: number;
  };
  error?: string;
  resultPath?: string;
  executionMode?: string;
};

type ResultCell = {
  id: string;
  char: string;
  score?: {
    overall?: number | null;
    endpoints?: number | null;
    direction?: number | null;
    shape?: number | null;
  } | null;
};

type JobResultPayload = {
  jobId: string;
  metrics?: {
    scoredCount?: number;
    averageScore?: number | null;
  };
  cells: ResultCell[];
};

const resetScorePanel = () => {
  if (scoreTotalElm) scoreTotalElm.textContent = '--';
  if (scoreListElm) {
    scoreListElm.innerHTML = '<li class="score-pending">等待评分…</li>';
  }
};

const formatScore = (value: number) => `${Math.round(value * 100)}`;

const getScoreBand = (value: number) => {
  if (value >= 0.8) return 'good';
  if (value >= 0.5) return 'medium';
  return 'poor';
};

const renderScoreHistory = (history: Array<ScoreEntry | null>) => {
  if (!scoreListElm) return;
  scoreListElm.innerHTML = '';
  if (!history.length) {
    scoreListElm.innerHTML = '<li class="score-pending">等待评分…</li>';
    return;
  }
  history.forEach((entry, index) => {
    const li = document.createElement('li');
    if (!entry) {
      li.className = 'score-pending';
      li.textContent = `第 ${index + 1} 笔：待评分`;
    } else {
      li.classList.add(`score-${getScoreBand(entry.overall)}`);
      const label = document.createElement('span');
      label.textContent = `第 ${index + 1} 笔：${formatScore(entry.overall)}`;
      const detail = document.createElement('span');
      detail.className = 'score-chip';
      detail.textContent = `起止${formatScore(entry.components.endpoints)} · 走向${formatScore(
        entry.components.direction,
      )} · 形态${formatScore(entry.components.shape)}`;
      li.append(label, detail);
    }
    scoreListElm.appendChild(li);
  });
};

const handleScoreUpdate = (payload: ScoreUpdatePayload) => {
  if (scoreTotalElm) {
    scoreTotalElm.textContent = `${formatScore(payload.overallScore)}`;
  }
  renderScoreHistory(payload.history);
};

const createWriter = (char: string) => {
  writerContainer.innerHTML = '';
  return HanziWriter.create(writerContainer, char, {
    width: 360,
    height: 360,
    padding: 10,
    charDataLoader: loader,
    enableLocalScoring: true,
    onScoreUpdate: handleScoreUpdate,
  });
};

const loadCharacter = (char: string) => {
  if (!char) return;
  resetScorePanel();
  const hasLocal = Boolean(localDataMap[char as keyof typeof localDataMap]);
  setStatus(hasLocal ? `使用本地缓存加载 ${char}` : `从 CDN 拉取 ${char} 数据...`);
  currentWriter
    .setCharacter(char)
    .then(() => setStatus(`已加载 ${char}`))
    .catch((error) => {
      console.error(error);
      setStatus(`加载 ${char} 失败，重建画布...`);
      currentWriter = createWriter(char);
    });
};

resetScorePanel();
let currentWriter = createWriter('我');
loadCharacter('我');

const input = document.getElementById('char-input') as HTMLInputElement | null;
const button = document.getElementById('load-btn');
const chipList = document.getElementById('local-chip-list');

if (chipList) {
  Object.keys(localDataMap).forEach((char) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = char;
    chip.addEventListener('click', () => {
      if (input) input.value = char;
      loadCharacter(char);
    });
    chipList.appendChild(chip);
  });
}

button?.addEventListener('click', () => {
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  loadCharacter(value);
});

const uploadForm = document.getElementById('upload-form') as HTMLFormElement | null;
const uploadButton = document.getElementById('upload-submit') as HTMLButtonElement | null;
const pageFileInput = document.getElementById('page-file') as HTMLInputElement | null;
const artifactSelect = document.getElementById('artifact-level') as HTMLSelectElement | null;
const scoreArtifactSelect = document.getElementById('score-artifact-level') as HTMLSelectElement | null;
const executionModeSelect = document.getElementById('execution-mode') as HTMLSelectElement | null;
const jobListElm = document.getElementById('job-list-entries');
const jobStatusMessage = document.getElementById('job-status-message');
const refreshJobsBtn = document.getElementById('refresh-jobs');
const jobResultPanel = document.getElementById('job-result-panel');
const jobResultTitle = document.getElementById('job-result-title');
const jobResultSummary = document.getElementById('job-result-summary');
const jobResultMetrics = document.getElementById('job-result-metrics');
const jobResultCells = document.getElementById('job-result-cells');
const jobResultClose = document.getElementById('job-result-close');

const apiBaseEnv = (import.meta.env.VITE_HANZI_API_BASE as string | undefined) || '';
const apiBase = apiBaseEnv.endsWith('/') ? apiBaseEnv.slice(0, -1) : apiBaseEnv;
const buildApiUrl = (pathname: string) => `${apiBase}${pathname}`;

const showJobMessage = (message: string, isError = false) => {
  if (!jobStatusMessage) return;
  jobStatusMessage.textContent = message;
  jobStatusMessage.classList.toggle('job-status-error', isError);
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    console.warn('format date failed', error);
    return value;
  }
};

const renderJobs = (jobs: JobRecord[]) => {
  if (!jobListElm) return;
  jobListElm.innerHTML = '';
  if (!jobs.length) {
    showJobMessage('暂无任务，等待上传。');
    return;
  }
  showJobMessage(`共 ${jobs.length} 个任务，最新在最前。`);
  jobs.forEach((job) => {
    const li = document.createElement('li');
    li.className = 'job-pill';
    const header = document.createElement('div');
    header.className = 'job-pill__row';
    const name = document.createElement('span');
    name.textContent = job.fileName || job.jobId;
    const status = document.createElement('span');
    status.className = `job-pill__status job-pill__status--${job.status}`;
    status.textContent = job.status;
    header.append(name, status);
    const meta = document.createElement('div');
    meta.className = 'job-pill__meta';
    meta.textContent = `ID: ${job.jobId} · 创建：${formatDate(job.createdAt)} · 更新：${formatDate(
      job.updatedAt,
    )} · 模式：${job.executionMode || 'pipeline'}`;
    li.append(header, meta);
    if (job.summary?.cellCount) {
      const cellInfo = document.createElement('div');
      cellInfo.className = 'job-pill__meta';
      cellInfo.textContent = `单元格：${job.summary.cellCount}${
        typeof job.summary.averageScore === 'number'
          ? ` · 平均分：${formatScore(job.summary.averageScore)}`
          : ''
      }${job.summary.scoredCount ? ` · 已评分：${job.summary.scoredCount}` : ''}`;
      li.appendChild(cellInfo);
    }
    if (job.status === 'succeeded') {
      const actions = document.createElement('div');
      actions.className = 'job-pill__actions';
      const download = document.createElement('a');
      download.href = buildApiUrl(`/api/jobs/${job.jobId}/result`);
      download.target = '_blank';
      download.rel = 'noreferrer';
      download.textContent = '下载结果';
      actions.appendChild(download);
      const detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'btn-secondary';
      detailBtn.textContent = '查看详情';
      detailBtn.addEventListener('click', () => viewJobResult(job.jobId));
      actions.appendChild(detailBtn);
      li.appendChild(actions);
    }
    if (job.status === 'failed' && job.error) {
      const errorText = document.createElement('div');
      errorText.className = 'job-pill__error';
      errorText.textContent = `失败：${job.error}`;
      li.appendChild(errorText);
      const actions = document.createElement('div');
      actions.className = 'job-pill__actions';
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'btn-secondary';
      retryBtn.textContent = '重试';
      retryBtn.addEventListener('click', () => retryJob(job.jobId));
      actions.appendChild(retryBtn);
      li.appendChild(actions);
    }
    jobListElm.appendChild(li);
  });
};

const fetchJobs = async () => {
  if (!jobListElm) return;
  try {
    const response = await fetch(buildApiUrl('/api/jobs'));
    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }
    const payload = (await response.json()) as JobRecord[];
    renderJobs(payload);
  } catch (error) {
    console.error('fetch jobs failed', error);
    showJobMessage('无法拉取任务，请检查 Hanzi Bridge 是否运行。', true);
  }
};

let jobPollHandle: number | null = null;
const ensurePolling = () => {
  if (!jobListElm || jobPollHandle) return;
  jobPollHandle = window.setInterval(fetchJobs, 5000);
};

const parseErrorResponse = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.error || response.statusText;
  } catch {
    return response.statusText;
  }
};

const clearJobResult = () => {
  if (jobResultTitle) jobResultTitle.textContent = '尚未选择任务';
  if (jobResultSummary) {
    jobResultSummary.textContent = '选择已完成的任务即可查看详情。';
  }
  if (jobResultMetrics) jobResultMetrics.textContent = '';
  if (jobResultCells) {
    jobResultCells.innerHTML =
      '<tr><td colspan="6" class="job-result__placeholder">暂无数据</td></tr>';
  }
};

const renderJobResult = (result: JobResultPayload | null) => {
  if (!jobResultPanel) return;
  if (!result) {
    clearJobResult();
    return;
  }
  if (jobResultTitle) jobResultTitle.textContent = `任务 ${result.jobId}`;
  if (jobResultSummary) {
    jobResultSummary.textContent = `共 ${result.cells.length} 个格子，${
      result.metrics?.scoredCount ?? 0
    } 个已评分。`;
  }
  if (jobResultMetrics) {
    const avg =
      typeof result.metrics?.averageScore === 'number'
        ? `${formatScore(result.metrics.averageScore)}`
        : '--';
    jobResultMetrics.textContent = `综合平均分：${avg}`;
  }
  if (jobResultCells) {
    jobResultCells.innerHTML = '';
    if (!result.cells.length) {
      jobResultCells.innerHTML =
        '<tr><td colspan="6" class="job-result__placeholder">无格子数据</td></tr>';
      return;
    }
    result.cells.slice(0, 50).forEach((cell) => {
      const tr = document.createElement('tr');
      const score = cell.score || {};
      const toCell = (value?: number | null) =>
        typeof value === 'number' ? formatScore(value) : '--';
      tr.innerHTML = `
        <td>${cell.id}</td>
        <td>${cell.char || '未知'}</td>
        <td>${toCell(score.overall)}</td>
        <td>${toCell(score.endpoints)}</td>
        <td>${toCell(score.direction)}</td>
        <td>${toCell(score.shape)}</td>
      `;
      jobResultCells.appendChild(tr);
    });
    if (result.cells.length > 50) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td colspan="6" class="job-result__placeholder">仅展示前 50 条，详见下载文件。</td>';
      jobResultCells.appendChild(tr);
    }
  }
};

const viewJobResult = async (jobId: string) => {
  try {
    const response = await fetch(buildApiUrl(`/api/jobs/${jobId}?includeResult=1`));
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const payload = (await response.json()) as JobRecord & { result?: JobResultPayload };
    if (payload.result) {
      renderJobResult(payload.result);
    } else {
      renderJobResult(null);
      showJobMessage('该任务暂无结果文件。', true);
    }
  } catch (error) {
    console.error('view job result failed', error);
    showJobMessage(`读取任务失败：${(error as Error).message}`, true);
  }
};

const retryJob = async (jobId: string) => {
  try {
    const response = await fetch(buildApiUrl(`/api/jobs/${jobId}/retry`), { method: 'POST' });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    fetchJobs();
  } catch (error) {
    console.error('retry job failed', error);
    showJobMessage(`重试失败：${(error as Error).message}`, true);
  }
};

const setUploading = (state: boolean) => {
  if (!uploadButton) return;
  uploadButton.disabled = state;
  uploadButton.textContent = state ? '上传中…' : '上传并排队';
};

uploadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pageFileInput || !pageFileInput.files || pageFileInput.files.length === 0) {
    showJobMessage('请选择稿纸文件后再上传。', true);
    return;
  }
  const formData = new FormData();
  formData.append('file', pageFileInput.files[0]);
  if (artifactSelect) formData.append('artifactLevel', artifactSelect.value);
  if (scoreArtifactSelect) formData.append('scoreArtifactLevel', scoreArtifactSelect.value);
  if (executionModeSelect) formData.append('executionMode', executionModeSelect.value);
  try {
    setUploading(true);
    const response = await fetch(buildApiUrl('/api/jobs'), {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }
    pageFileInput.value = '';
    showJobMessage('任务已排队，稍后刷新状态。');
    fetchJobs();
  } catch (error) {
    console.error('upload failed', error);
    showJobMessage(`上传失败：${(error as Error).message}`, true);
  } finally {
    setUploading(false);
  }
});

refreshJobsBtn?.addEventListener('click', () => {
  fetchJobs();
});

if (jobListElm) {
  fetchJobs();
  ensurePolling();
}

jobResultClose?.addEventListener('click', () => {
  clearJobResult();
});

clearJobResult();
