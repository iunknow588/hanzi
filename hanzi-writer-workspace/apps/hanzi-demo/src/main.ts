import HanziWriter from 'hanzi-writer';
import type { StrokeData } from 'hanzi-writer';
import { createCharDataLoader } from 'hanzi-writer-data-client';
import localDataMap from './local-data.json';
import './style.css';

type SessionMode = 'practice' | 'test' | 'upload';
type PageRole = 'writer' | 'upload';

const pageRole = (document.body?.dataset.pageRole as PageRole | undefined) ?? 'writer';
const initialSessionMode =
  (document.body?.dataset.defaultMode as SessionMode | undefined) ?? 'practice';

const loader = createCharDataLoader({
  source: 'hybrid',
  localData: (char) => localDataMap[char as keyof typeof localDataMap],
});

const writerContainer = document.getElementById('writer');
const statusElm = document.getElementById('loader-status');
const scoreTotalElm = document.getElementById('score-total-value');
const scoreListElm = document.getElementById('score-strokes');
const chipList = document.getElementById('local-chip-list');
const restartQuizBtn = document.getElementById('restart-quiz');
const hintToggleInput = document.getElementById('hint-toggle') as HTMLInputElement | null;
const sequenceInput = document.getElementById('sequence-input') as HTMLTextAreaElement | null;
const sequenceApplyBtn = document.getElementById('sequence-apply') as HTMLButtonElement | null;
const sequenceNextBtn = document.getElementById('sequence-next') as HTMLButtonElement | null;
const sequenceCurrentElm = document.getElementById('sequence-current');
const sequenceRemainingElm = document.getElementById('sequence-remaining');
const sequencePreviewElm = document.getElementById('sequence-preview');
const sequenceSampleBtn = document.getElementById('sequence-sample') as HTMLButtonElement | null;
const sequenceResetBtn = document.getElementById('sequence-reset') as HTMLButtonElement | null;
const writerFeedbackElm = document.getElementById('writer-feedback');
const sessionStatusElm = document.getElementById('session-status');
const modeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-mode]'),
);
const modePanelSections = Array.from(
  document.querySelectorAll<HTMLElement>('[data-mode-panel]'),
);
const writerScoreLogList = document.getElementById(
  'stroke-history-list',
) as HTMLElement | null;
const strokeHistoryClearBtn = document.getElementById('stroke-history-clear');

if (!writerContainer && pageRole === 'writer') {
  throw new Error('#writer element missing');
}

if (writerContainer) {
  writerContainer.addEventListener('pointerdown', () => {
    setWriterFeedback('检测到笔画输入，继续保持即可。');
  });

  const handlePointerComplete = () => {
    setWriterFeedback('已记录该笔画，等待评分...');
  };

  writerContainer.addEventListener('pointerup', handlePointerComplete);
  writerContainer.addEventListener('pointercancel', handlePointerComplete);
}

const setStatus = (msg: string) => {
  if (statusElm) {
    statusElm.textContent = msg;
  }
};

const setWriterFeedback = (msg: string) => {
  if (writerFeedbackElm) {
    writerFeedbackElm.textContent = msg;
  }
};

const setSessionStatus = (msg: string) => {
  if (sessionStatusElm) {
    sessionStatusElm.textContent = msg;
  }
};

const defaultSequenceSample = '天地玄黄宇宙洪荒';

const parseSequenceValue = (value: string) =>
  Array.from(value.replace(/\s+/g, '')).filter((char) => Boolean(char.trim()));

let sequenceQueue: string[] = [];
let sequenceIndex = -1;

const bodyElm = document.body;
type StrokeHistoryEntry = {
  id: string;
  char: string;
  standardPaths: string[];
  userPaths: string[];
  timestamp: number;
};

const STROKE_HISTORY_LIMIT = 50;
const strokeHistory: StrokeHistoryEntry[] = [];
let currentCharStrokePaths: string[] = [];
let currentCharUserPaths: string[] = [];
let activeCharacter = initialSessionMode === 'upload' ? '' : '我';

const renderSequencePreview = () => {
  if (!sequencePreviewElm) return;
  sequencePreviewElm.innerHTML = '';
  if (!sequenceQueue.length) {
    sequencePreviewElm.textContent = '暂无字帖，先输入文字。';
    sequencePreviewElm.classList.add('copybook-preview__empty');
    return;
  }
  sequencePreviewElm.classList.remove('copybook-preview__empty');
  sequenceQueue.forEach((char, index) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    if (index === sequenceIndex) {
      chip.classList.add('chip--active');
    }
    chip.textContent = char;
    chip.addEventListener('click', () => {
      loadSequenceCharAt(index);
    });
    sequencePreviewElm.appendChild(chip);
  });
};

const updateSequenceStatus = () => {
  if (sequenceCurrentElm) {
    if (sequenceIndex >= 0 && sequenceIndex < sequenceQueue.length) {
      sequenceCurrentElm.textContent = sequenceQueue[sequenceIndex];
    } else {
      sequenceCurrentElm.textContent = '--';
    }
  }
  if (sequenceRemainingElm) {
    const remaining =
      sequenceQueue.length && sequenceIndex >= -1
        ? Math.max(sequenceQueue.length - (sequenceIndex + 1), 0)
        : 0;
    sequenceRemainingElm.textContent = `${remaining}`;
  }
  renderSequencePreview();
};

updateSequenceStatus();

const applyModePanels = () => {
  if (!bodyElm) return;
  bodyElm.setAttribute('data-session-mode', sessionMode);
  modePanelSections.forEach((section) => {
    const targetMode = section.dataset.modePanel as SessionMode | undefined;
    if (!targetMode) return;
    section.hidden = targetMode !== sessionMode;
  });
};

const renderStrokeHistory = () => {
  if (!writerScoreLogList) return;
  if (!strokeHistory.length) {
    writerScoreLogList.innerHTML = '<p class="stroke-history__placeholder">等待完成整字…</p>';
    return;
  }
  writerScoreLogList.innerHTML = '';
  strokeHistory.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'stroke-history__item';
    const meta = document.createElement('div');
    meta.className = 'stroke-history__meta';
    meta.innerHTML = `<span>${entry.char || '未识别'} · 整字覆盖</span>
      <span>${new Date(entry.timestamp).toLocaleTimeString()}</span>`;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1024 1024');
    svg.setAttribute('class', 'stroke-history__canvas');
    if (entry.standardPaths?.length) {
      entry.standardPaths.forEach((path) => {
        const standardPath = document.createElementNS(svgNS, 'path');
        standardPath.setAttribute('d', path);
        standardPath.setAttribute('fill', '#e2e8f0');
        standardPath.setAttribute('stroke', '#cbd5f5');
        standardPath.setAttribute('stroke-width', '20');
        svg.appendChild(standardPath);
      });
    }
    entry.userPaths.forEach((path) => {
      const userPath = document.createElementNS(svgNS, 'path');
      userPath.setAttribute('d', path);
      userPath.setAttribute('fill', 'none');
      userPath.setAttribute('stroke', '#ef4444');
      userPath.setAttribute('stroke-width', '60');
      userPath.setAttribute('stroke-linecap', 'round');
      userPath.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(userPath);
    });
    item.append(meta, svg);
    writerScoreLogList.appendChild(item);
  });
};

const handleCorrectStroke = (strokeData: StrokeData) => {
  if (!strokeData?.drawnPath?.pathString) return;
  currentCharUserPaths.push(strokeData.drawnPath.pathString);
};

const logCompletedCharacter = () => {
  if (!writerScoreLogList) return;
  if (!currentCharUserPaths.length) return;
  const entry: StrokeHistoryEntry = {
    id: `${activeCharacter || 'char'}-${Date.now()}`,
    char: activeCharacter,
    standardPaths: [...currentCharStrokePaths],
    userPaths: [...currentCharUserPaths],
    timestamp: Date.now(),
  };
  strokeHistory.unshift(entry);
  if (strokeHistory.length > STROKE_HISTORY_LIMIT) {
    strokeHistory.pop();
  }
  currentCharUserPaths = [];
  renderStrokeHistory();
};

renderStrokeHistory();
strokeHistoryClearBtn?.addEventListener('click', () => {
  strokeHistory.length = 0;
  renderStrokeHistory();
});

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
  setWriterFeedback(
    `第 ${payload.strokeIndex + 1} 笔：${formatScore(payload.score.overall)} 分（总分 ${formatScore(
      payload.overallScore,
    )}）`,
  );
  setSessionStatus(
    `第 ${payload.strokeIndex + 1} 笔得分 ${formatScore(payload.score.overall)}，当前总分 ${formatScore(
      payload.overallScore,
    )}。`,
  );
};

const createWriter = (char: string) => {
  if (!writerContainer) {
    throw new Error('Cannot create writer without container');
  }
  writerContainer.innerHTML = '';
  const writer = HanziWriter.create(writerContainer, char, {
    width: 360,
    height: 360,
    padding: 10,
    charDataLoader: loader,
    enableLocalScoring: true,
    onScoreUpdate: handleScoreUpdate,
  });
  return writer;
};

const loadCharacter = (char: string) => {
  if (!char || !currentWriter) return;
  activeCharacter = char;
  const writer = currentWriter;
  resetScorePanel();
  currentCharUserPaths = [];
  const hasLocal = Boolean(localDataMap[char as keyof typeof localDataMap]);
  setStatus(hasLocal ? `使用本地缓存加载 ${char}` : `从 CDN 拉取 ${char} 数据...`);
  writer
    .setCharacter(char)
    .then(() => {
      setStatus(`已加载 ${char}`);
      setWriterFeedback(`已切换到 ${char}，点击画布即可开始。`);
      writer
        .getCharacterData()
        .then((data) => {
          currentCharStrokePaths = data.strokes.map((stroke) => stroke.path);
        })
        .catch((error) => {
          console.warn('获取字形数据失败', error);
          currentCharStrokePaths = [];
        });
      startQuiz();
    })
    .catch((error) => {
      console.error(error);
      setStatus(`加载 ${char} 失败，重建画布...`);
      currentWriter = createWriter(char);
      currentCharStrokePaths = [];
      startQuiz();
    });
};

const loadSequenceCharAt = (nextIndex: number) => {
  if (!sequenceQueue.length) return false;
  if (nextIndex < 0 || nextIndex >= sequenceQueue.length) {
    updateSequenceStatus();
    return false;
  }
  sequenceIndex = nextIndex;
  const targetChar = sequenceQueue[nextIndex];
  updateSequenceStatus();
  setStatus(`序列 ${nextIndex + 1}/${sequenceQueue.length}：${targetChar}`);
  setSessionStatus(`准备练习：第 ${nextIndex + 1} 个字 ${targetChar}`);
  loadCharacter(targetChar);
  return true;
};

const applySequenceFromInput = () => {
  const raw = sequenceInput?.value || '';
  const nextQueue = parseSequenceValue(raw);
  sequenceQueue = nextQueue;
  sequenceIndex = -1;
  if (!nextQueue.length) {
    setStatus('请输入至少一个汉字后再开始序列练习。');
    updateSequenceStatus();
    setSessionStatus('尚未载入字帖，请输入汉字。');
    return;
  }
  setStatus(`已载入 ${nextQueue.length} 个汉字，自动加载第一个。`);
  setSessionStatus(`已载入字帖，总计 ${nextQueue.length} 个汉字。`);
  loadSequenceCharAt(0);
};

const advanceSequenceChar = () => {
  if (!sequenceQueue.length) {
    setStatus('当前没有练习序列，可先输入汉字后点击“载入字帖”。');
    return false;
  }
  const nextIndex = sequenceIndex + 1;
  if (nextIndex >= sequenceQueue.length) {
    setStatus('序列已写完，可重新开始或输入新的序列。');
    updateSequenceStatus();
    return false;
  }
  loadSequenceCharAt(nextIndex);
  return true;
};

let currentWriter: HanziWriter | null = null;
let sessionMode: SessionMode = 'practice';
let practiceHintPreference = hintToggleInput?.checked ?? true;
let hintsEnabled = practiceHintPreference;

const updateModeButtons = () => {
  modeButtons.forEach((btn) => {
    const target = btn.dataset.mode as SessionMode | undefined;
    btn.classList.toggle('is-active', target === sessionMode);
  });
  applyModePanels();
};

const syncHintToggleState = () => {
  if (!hintToggleInput) return;
  if (sessionMode === 'practice') {
    hintToggleInput.disabled = false;
    hintToggleInput.checked = practiceHintPreference;
    hintsEnabled = practiceHintPreference;
  } else {
    hintToggleInput.disabled = true;
    hintToggleInput.checked = false;
    hintsEnabled = false;
  }
};

const stopQuiz = () => {
  if (!currentWriter) return;
  const maybeCancelable = currentWriter as HanziWriter & { cancelQuiz?: () => void };
  maybeCancelable.cancelQuiz?.();
};

const startQuiz = () => {
  if (sessionMode === 'upload') return;
  if (!currentWriter) return;
  stopQuiz();
  const showHintAfterMisses =
    sessionMode === 'practice' && hintsEnabled ? 1 : Infinity;
  setSessionStatus(
    sessionMode === 'practice'
      ? '练习模式：随时落笔即可看到评分。'
      : '测试模式：完成整字后自动跳到下一个字。',
  );
  currentWriter.quiz({
    showHintAfterMisses,
    highlightOnComplete: true,
    onCorrectStroke: handleCorrectStroke,
    onComplete: () => {
      logCompletedCharacter();
      if (sessionMode === 'practice') {
        setSessionStatus('该字练习完成，可继续书写或切换其它汉字。');
        setTimeout(() => startQuiz(), 400);
      } else {
        const advanced = advanceSequenceChar();
        if (!advanced) {
          setSessionStatus('测试完成，字帖已写完，可重新开始。');
        } else {
          setSessionStatus('已切换到下一测试字，继续完成全部笔画。');
        }
      }
    },
  });
};

const setSessionMode = (mode: SessionMode) => {
  if (sessionMode === mode) return;
  const previousMode = sessionMode;
  sessionMode = mode;
  updateModeButtons();
  syncHintToggleState();
  if (mode === 'upload') {
    stopQuiz();
    setWriterFeedback('上传模式：书写画布暂不可用。');
    setSessionStatus('上传模式：请选择稿纸并等待 Hanzi Bridge 回传评分。');
    if (jobStatusMessage) {
      if (apiConfigured) {
        jobStatusMessage.textContent = '正在等待 Hanzi Bridge 任务列表…';
        jobStatusMessage.classList.remove('job-status-error');
      } else {
        jobStatusMessage.textContent = '未配置 Hanzi Bridge API，无法拉取任务。';
        jobStatusMessage.classList.add('job-status-error');
      }
    }
    if (jobListElm) jobListElm.innerHTML = '';
    if (jobResultPanel) clearJobResult();
    if (apiConfigured) startJobPolling();
    return;
  }
  if (previousMode === 'upload') {
    stopJobPolling();
    if (jobStatusMessage) {
      jobStatusMessage.textContent = '切换到上传模式后自动加载任务。';
      jobStatusMessage.classList.remove('job-status-error');
    }
    if (jobListElm) jobListElm.innerHTML = '';
    clearJobResult();
  }
  setSessionStatus(
    mode === 'practice'
      ? '已切换到练习模式，可使用提示并即时评分。'
      : '已切换到测试模式，禁用提示并逐字评分。',
  );
  startQuiz();
};

if (writerContainer) {
  resetScorePanel();
  currentWriter = createWriter('我');
  syncHintToggleState();
  updateModeButtons();
  loadCharacter('我');
} else {
  updateModeButtons();
  syncHintToggleState();
}

if (initialSessionMode !== 'practice' || pageRole === 'upload') {
  setSessionMode(initialSessionMode);
}

if (chipList) {
  const defaultChars = Object.keys(localDataMap);
  defaultChars.forEach((char) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = char;
    chip.addEventListener('click', () => {
      if (sequenceInput) {
        const existing = sequenceInput.value.replace(/\s+/g, '');
        sequenceInput.value = existing ? `${existing}${char}` : char;
        applySequenceFromInput();
      } else {
        sequenceQueue = [char];
        sequenceIndex = -1;
        updateSequenceStatus();
        loadSequenceCharAt(0);
      }
    });
    chipList.appendChild(chip);
  });
  if (sequenceInput && !sequenceInput.value.trim()) {
    sequenceInput.value = defaultChars.join('');
  }
}

sequenceApplyBtn?.addEventListener('click', () => {
  applySequenceFromInput();
});

sequenceNextBtn?.addEventListener('click', () => {
  advanceSequenceChar();
});

sequenceSampleBtn?.addEventListener('click', () => {
  if (sequenceInput) {
    sequenceInput.value = defaultSequenceSample;
  }
  applySequenceFromInput();
});

sequenceResetBtn?.addEventListener('click', () => {
  sequenceQueue = [];
  sequenceIndex = -1;
  if (sequenceInput) sequenceInput.value = '';
  setStatus('已清空字帖内容，输入新的字帖后重新载入。');
  setSessionStatus('字帖已清空，请输入新的汉字内容。');
  updateSequenceStatus();
});

sequenceInput?.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    applySequenceFromInput();
  }
});

restartQuizBtn?.addEventListener('click', () => {
  resetScorePanel();
  startQuiz();
});

hintToggleInput?.addEventListener('change', () => {
  practiceHintPreference = Boolean(hintToggleInput.checked);
  if (sessionMode === 'practice') {
    hintsEnabled = practiceHintPreference;
    startQuiz();
  }
});

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetMode = btn.dataset.mode as SessionMode | undefined;
    if (targetMode) {
      setSessionMode(targetMode);
    }
  });
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
const jobResultLowScore = document.getElementById('job-result-low-score');
const jobResultCells = document.getElementById('job-result-cells');
const jobResultClose = document.getElementById('job-result-close');

if (jobStatusMessage) {
  jobStatusMessage.textContent =
    pageRole === 'upload' ? '正在初始化上传模式…' : '切换到上传模式后自动加载任务。';
}

const rawApiBase = (import.meta.env.VITE_HANZI_API_BASE as string | undefined) || '';
const normalizedApiBase = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;
const allowRelativeApi = import.meta.env.DEV;
const apiConfigured = Boolean(normalizedApiBase) || allowRelativeApi;
const buildApiUrl = (pathname: string) =>
  normalizedApiBase ? `${normalizedApiBase}${pathname}` : pathname;

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
  if (!jobListElm || sessionMode !== 'upload' || !apiConfigured) return;
  try {
    const response = await fetch(buildApiUrl('/api/jobs'));
    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }
    const payload = (await response.json()) as JobRecord[];
    renderJobs(payload);
  } catch (error) {
    console.error('fetch jobs failed', error);
    showJobMessage(
      '无法拉取任务：请确认 Hanzi Bridge 已运行，并在 VITE_HANZI_API_BASE 中配置其地址。',
      true,
    );
  }
};

let jobPollHandle: number | null = null;
const startJobPolling = () => {
  if (!jobListElm || jobPollHandle || !apiConfigured || sessionMode !== 'upload') return;
  fetchJobs();
  jobPollHandle = window.setInterval(fetchJobs, 5000);
};

const stopJobPolling = () => {
  if (!jobPollHandle) return;
  window.clearInterval(jobPollHandle);
  jobPollHandle = null;
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
    jobResultSummary.textContent = '切换到上传模式并选择已完成的任务即可查看详情。';
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
  if (jobResultLowScore) {
    jobResultLowScore.innerHTML = '';
    const highlights = result.cells
      .filter((cell) => typeof cell.score?.overall === 'number')
      .sort((a, b) => (a.score!.overall! > b.score!.overall! ? 1 : -1))
      .slice(0, 3);
    if (!highlights.length) {
      jobResultLowScore.innerHTML = '<p class="job-result__placeholder">暂无低分提示</p>';
    } else {
      const title = document.createElement('h4');
      title.textContent = '低分提示';
      const list = document.createElement('ul');
      highlights.forEach((cell) => {
        const li = document.createElement('li');
        const label = `${cell.id} (${cell.char || '未知'})`;
        const scoreText = formatScore(cell.score!.overall!);
        li.textContent = `${label} · 总分 ${scoreText}`;
        list.appendChild(li);
      });
      jobResultLowScore.append(title, list);
    }
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
  if (sessionMode !== 'upload') {
    showJobMessage('请先切换到上传模式再上传稿纸。', true);
    return;
  }
  if (!apiConfigured) {
    showJobMessage('未配置 Hanzi Bridge API，无法上传稿纸。', true);
    return;
  }
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
  if (sessionMode !== 'upload') {
    showJobMessage('请切换到上传模式后再刷新任务。');
    return;
  }
  if (!apiConfigured) {
    showJobMessage('未配置 Hanzi Bridge API，无法刷新任务。', true);
    return;
  }
  fetchJobs();
});

jobResultClose?.addEventListener('click', () => {
  clearJobResult();
});

clearJobResult();
