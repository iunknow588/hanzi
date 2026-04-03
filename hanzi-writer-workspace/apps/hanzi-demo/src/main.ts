import HanziWriter from 'hanzi-writer';
import type { StrokeData } from 'hanzi-writer';
import { createCharDataLoader } from 'hanzi-writer-data-client';
import localDataMap from './local-data.json';
import './style.css';
import { initPwa } from './pwa';

type SessionMode = 'practice' | 'test' | 'upload';
type PageRole = 'writer' | 'upload';
type ParentFrameMessage = {
  type: 'hanzi-frame-state';
  mode: SessionMode;
  pageRole: PageRole;
  title: string;
  height: number;
};

initPwa({ page: 'mode' });

type PersistedPageState = {
  sequenceInputValue?: string;
  sequenceIndex?: number;
  activeCharacter?: string;
  hintPreference?: boolean;
  artifactLevel?: string;
  scoreArtifactLevel?: string;
  executionMode?: string;
  jobStatusFilter?: 'all' | 'queued' | 'running' | 'succeeded' | 'failed';
  resultFilter?: 'all' | 'low' | 'medium' | 'good';
  resultDimensionFilter?: 'all' | 'endpoints' | 'direction' | 'shape';
  resultQuery?: string;
};

const pageRole = (document.body?.dataset.pageRole as PageRole | undefined) ?? 'writer';
const initialSessionMode =
  (document.body?.dataset.defaultMode as SessionMode | undefined) ?? 'practice';
let sessionMode: SessionMode = initialSessionMode;
const isEmbeddedFrame = window.parent !== window;
if (isEmbeddedFrame) {
  document.body.dataset.embedded = 'true';
}
const PAGE_STORAGE_KEY = `hanzi-demo-page-state:${initialSessionMode}`;
const UI_STORAGE_KEY = `hanzi-demo-ui:${initialSessionMode}`;

const loadPersistedPageState = (): PersistedPageState => {
  try {
    const raw = window.localStorage.getItem(PAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedPageState | null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('读取页面缓存失败', error);
    return {};
  }
};

let persistedPageState: PersistedPageState = loadPersistedPageState();

const savePersistedPageState = (partial: PersistedPageState) => {
  try {
    persistedPageState = { ...persistedPageState, ...partial };
    window.localStorage.setItem(PAGE_STORAGE_KEY, JSON.stringify(persistedPageState));
  } catch (error) {
    console.warn('写入页面缓存失败', error);
  }
};

const loadUiState = () => {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { controlsCollapsed?: boolean } | null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('读取界面缓存失败', error);
    return {};
  }
};

const saveUiState = (partial: { controlsCollapsed?: boolean }) => {
  try {
    const next = { ...loadUiState(), ...partial };
    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('写入界面缓存失败', error);
  }
};

const getFrameContentRoot = () =>
  (document.getElementById('app') as HTMLElement | null) ||
  (document.querySelector('.mode-page') as HTMLElement | null) ||
  document.body;

const getFrameContentHeight = () => {
  const root = getFrameContentRoot();
  const bodyStyle = window.getComputedStyle(document.body);
  const paddingTop = Number.parseFloat(bodyStyle.paddingTop || '0') || 0;
  const paddingBottom = Number.parseFloat(bodyStyle.paddingBottom || '0') || 0;
  return Math.ceil(root.getBoundingClientRect().height + paddingTop + paddingBottom);
};

const notifyParentFrame = () => {
  if (!isEmbeddedFrame) return;
  const payload: ParentFrameMessage = {
    type: 'hanzi-frame-state',
    mode: sessionMode,
    pageRole,
    title: document.title,
    height: getFrameContentHeight(),
  };
  window.parent.postMessage(payload, window.location.origin);
};

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
const summaryActiveCharElm = document.getElementById('summary-active-char');
const summaryRemainingCountElm = document.getElementById('summary-remaining-count');
const summaryOverallScoreElm = document.getElementById('summary-overall-score');
const summaryHistoryCountElm = document.getElementById('summary-history-count');
const summaryProgressPercentElm = document.getElementById('summary-progress-percent');
const summaryRecentScoreElm = document.getElementById('summary-recent-score');
const summaryCompletedCountElm = document.getElementById('summary-completed-count');
const summaryRecentAverageElm = document.getElementById('summary-recent-average');
const summaryBestScoreElm = document.getElementById('summary-best-score');
const sequenceProgressLabelElm = document.getElementById('sequence-progress-label');
const sequenceProgressFillElm = document.getElementById('sequence-progress-fill');
const sequenceAchievementElm = document.getElementById('sequence-achievement');
const sequenceCompleteBannerElm = document.getElementById('sequence-complete-banner');
const uploadSummaryApiElm = document.getElementById('upload-summary-api');
const uploadSummaryJobCountElm = document.getElementById('upload-summary-job-count');
const uploadSummaryLastStatusElm = document.getElementById('upload-summary-last-status');
const uploadSummaryAverageElm = document.getElementById('upload-summary-average');
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
const characterResultElm = document.getElementById('character-result');
const characterResultLabelElm = document.getElementById('character-result-label');
const characterResultScoreElm = document.getElementById('character-result-score');
const characterResultNoteElm = document.getElementById('character-result-note');
const mobileControlsToggleBtn = document.getElementById(
  'mobile-controls-toggle',
) as HTMLButtonElement | null;

if (sequenceInput && typeof persistedPageState.sequenceInputValue === 'string') {
  sequenceInput.value = persistedPageState.sequenceInputValue;
}

if (hintToggleInput && typeof persistedPageState.hintPreference === 'boolean') {
  hintToggleInput.checked = persistedPageState.hintPreference;
}

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
  notifyParentFrame();
};

const setWriterFeedback = (msg: string) => {
  if (writerFeedbackElm) {
    writerFeedbackElm.textContent = msg;
  }
  notifyParentFrame();
};

const setSessionStatus = (msg: string) => {
  if (sessionStatusElm) {
    sessionStatusElm.textContent = msg;
  }
  notifyParentFrame();
};

const defaultSequenceSample = '天地玄黄宇宙洪荒';

const parseSequenceValue = (value: string) =>
  Array.from(value.replace(/\s+/g, '')).filter((char) => Boolean(char.trim()));

const restoredSequenceQueue = parseSequenceValue(sequenceInput?.value || '');
const restoredSequenceIndexRaw = persistedPageState.sequenceIndex;

let sequenceQueue: string[] = restoredSequenceQueue;
let sequenceIndex =
  restoredSequenceQueue.length &&
  typeof restoredSequenceIndexRaw === 'number' &&
  restoredSequenceIndexRaw >= 0 &&
  restoredSequenceIndexRaw < restoredSequenceQueue.length
    ? restoredSequenceIndexRaw
    : -1;

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
let activeCharacter =
  initialSessionMode === 'upload'
    ? ''
    : sequenceIndex >= 0 && sequenceIndex < sequenceQueue.length
      ? sequenceQueue[sequenceIndex]
      : persistedPageState.activeCharacter?.trim() || '我';
let latestJobRecords: JobRecord[] = [];
let latestCharacterScore: number | null = null;
const recentCharacterScores: number[] = [];
const completedSequenceSlots = new Set<number>();
let controlsCollapsed = Boolean(loadUiState().controlsCollapsed);
let lastAchievementKey = '';

const persistWriterState = () => {
  if (pageRole !== 'writer') return;
  savePersistedPageState({
    sequenceInputValue: sequenceInput?.value || '',
    sequenceIndex,
    activeCharacter,
    hintPreference: hintToggleInput?.checked ?? false,
  });
};

const syncMobileControlsToggle = () => {
  if (!mobileControlsToggleBtn || !bodyElm || pageRole !== 'writer') return;
  bodyElm.dataset.controlsCollapsed = String(controlsCollapsed);
  mobileControlsToggleBtn.textContent = controlsCollapsed ? '展开设置' : '收起设置';
  mobileControlsToggleBtn.setAttribute('aria-pressed', String(controlsCollapsed));
  saveUiState({ controlsCollapsed });
};

const updateWriterOverview = () => {
  const currentPosition =
    sequenceQueue.length && sequenceIndex >= 0 && sequenceIndex < sequenceQueue.length
      ? sequenceIndex + 1
      : 0;
  const progressPercent =
    sequenceQueue.length > 0 ? Math.round((currentPosition / sequenceQueue.length) * 100) : 0;
  const completedCount = completedSequenceSlots.size;
  const recentAverage = recentCharacterScores.length
    ? recentCharacterScores.reduce((sum, score) => sum + score, 0) / recentCharacterScores.length
    : null;
  const bestScore = recentCharacterScores.length ? Math.max(...recentCharacterScores) : null;
  const isSequenceComplete = sequenceQueue.length > 0 && completedCount >= sequenceQueue.length;
  let achievementKey = '';
  let achievementText = '';

  if (bestScore !== null && bestScore >= 0.9) {
    achievementKey = 'high-score';
    achievementText = '出现 90+ 高分字，当前笔势控制很稳定。';
  } else if (completedCount >= 10) {
    achievementKey = 'ten-complete';
    achievementText = '已完成 10 个字，适合暂停回看近期弱项。';
  } else if (completedCount >= 5) {
    achievementKey = 'five-complete';
    achievementText = '已完成 5 个字，节奏已经建立，继续保持。';
  } else if (completedCount >= 3) {
    achievementKey = 'three-complete';
    achievementText = '已连续完成 3 个字，状态正在进入稳定区。';
  }

  if (summaryActiveCharElm) {
    summaryActiveCharElm.textContent = activeCharacter || '--';
  }
  if (summaryRemainingCountElm) {
    const remaining =
      sequenceQueue.length && sequenceIndex >= -1
        ? Math.max(sequenceQueue.length - (sequenceIndex + 1), 0)
        : 0;
    summaryRemainingCountElm.textContent = `${remaining}`;
  }
  if (summaryOverallScoreElm) {
    summaryOverallScoreElm.textContent = scoreTotalElm?.textContent || '--';
  }
  if (summaryHistoryCountElm) {
    summaryHistoryCountElm.textContent = `${strokeHistory.length}`;
  }
  if (sequenceProgressLabelElm) {
    sequenceProgressLabelElm.textContent = sequenceQueue.length
      ? `${currentPosition} / ${sequenceQueue.length}`
      : '0 / 0';
  }
  if (summaryProgressPercentElm) {
    summaryProgressPercentElm.textContent = `${progressPercent}%`;
  }
  if (sequenceProgressFillElm) {
    sequenceProgressFillElm.style.width = `${progressPercent}%`;
  }
  if (summaryRecentScoreElm) {
    summaryRecentScoreElm.textContent = recentCharacterScores.length
      ? `${formatScore(recentCharacterScores[0])} 分`
      : '--';
  }
  if (summaryCompletedCountElm) {
    summaryCompletedCountElm.textContent = `${completedCount}`;
  }
  if (summaryRecentAverageElm) {
    summaryRecentAverageElm.textContent =
      typeof recentAverage === 'number' ? `${formatScore(recentAverage)} 分` : '--';
  }
  if (summaryBestScoreElm) {
    summaryBestScoreElm.textContent =
      typeof bestScore === 'number' ? `${formatScore(bestScore)} 分` : '--';
  }
  if (sequenceAchievementElm) {
    sequenceAchievementElm.hidden = !achievementText;
    if (achievementText) {
      if (achievementKey !== lastAchievementKey) {
        sequenceAchievementElm.textContent = achievementText;
      }
    }
  }
  lastAchievementKey = achievementKey;
  if (sequenceCompleteBannerElm) {
    sequenceCompleteBannerElm.hidden = !isSequenceComplete;
    if (isSequenceComplete) {
      const averageText =
        typeof recentAverage === 'number' ? `近 5 字均分 ${formatScore(recentAverage)} 分` : '继续保持当前节奏';
      sequenceCompleteBannerElm.textContent =
        sessionMode === 'test'
          ? `本轮测试已完成，共完成 ${completedCount} 个字，${averageText}。`
          : `本轮练习已完成，共完成 ${completedCount} 个字，${averageText}。`;
    }
  }
  notifyParentFrame();
};

const updateUploadOverview = () => {
  if (uploadSummaryApiElm) {
    uploadSummaryApiElm.textContent = apiConfigured ? '已完成' : '未完成';
  }
  if (uploadSummaryJobCountElm) {
    uploadSummaryJobCountElm.textContent = `${latestJobRecords.length}`;
  }
  if (uploadSummaryLastStatusElm) {
    uploadSummaryLastStatusElm.textContent =
      latestJobRecords.length
        ? getJobStatusLabel(latestJobRecords[0]?.status)
        : apiConfigured
          ? '等待任务'
          : '暂不可用';
  }
  if (uploadSummaryAverageElm) {
    const latestAverage = latestJobRecords.find(
      (job) => typeof job.summary?.averageScore === 'number',
    )?.summary?.averageScore;
    uploadSummaryAverageElm.textContent =
      typeof latestAverage === 'number' ? formatScore(latestAverage) : '--';
  }
  notifyParentFrame();
};

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

const resetRecentCharacterScores = () => {
  recentCharacterScores.length = 0;
  completedSequenceSlots.clear();
  lastAchievementKey = '';
  updateWriterOverview();
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
  updateWriterOverview();
  persistWriterState();
};

updateSequenceStatus();
updateWriterOverview();

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
  updateWriterOverview();
};

renderStrokeHistory();
strokeHistoryClearBtn?.addEventListener('click', () => {
  strokeHistory.length = 0;
  renderStrokeHistory();
  updateWriterOverview();
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
type JobFilter = JobStatus | 'all';
type ExecutionMode = 'pipeline' | 'skills';

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

type ResultCellFilter = 'all' | 'low' | 'medium' | 'good';
type ResultCellDimensionFilter = 'all' | 'endpoints' | 'direction' | 'shape';

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: '排队中',
  running: '处理中',
  succeeded: '已完成',
  failed: '处理失败',
};

const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  pipeline: '标准流程',
  skills: '分步流程',
};

const getJobStatusLabel = (status?: JobStatus) =>
  status ? JOB_STATUS_LABELS[status] || status : '--';

const getExecutionModeLabel = (mode?: string) => {
  if (mode === 'pipeline' || mode === 'skills') {
    return EXECUTION_MODE_LABELS[mode];
  }
  return '标准流程';
};

const getJobFilterLabel = (filter: JobFilter) =>
  filter === 'all' ? '全部任务' : getJobStatusLabel(filter);

const getJobDisplayName = (job: JobRecord) => job.fileName || `任务 ${job.jobId.slice(0, 8)}`;

const resetScorePanel = () => {
  if (scoreTotalElm) scoreTotalElm.textContent = '--';
  if (scoreListElm) {
    scoreListElm.innerHTML = '<li class="score-pending">等待评分…</li>';
  }
  latestCharacterScore = null;
  updateWriterOverview();
};

const formatScore = (value: number) => `${Math.round(value * 100)}`;
const formatScoreText = (value?: number | null) =>
  typeof value === 'number' ? `${formatScore(value)} 分` : '--';

const getScoreBand = (value: number) => {
  if (value >= 0.8) return 'good';
  if (value >= 0.5) return 'medium';
  return 'poor';
};

const getScoreBandLabel = (value: number) => {
  const band = getScoreBand(value);
  if (band === 'good') return '表现稳定';
  if (band === 'medium') return '需要微调';
  return '重点关注';
};

const getWeakestScoreDimension = (score?: ResultCell['score'] | null) => {
  if (!score) return null;
  const entries = [
    ['起止', score.endpoints],
    ['走向', score.direction],
    ['形态', score.shape],
  ].filter((entry): entry is [string, number] => typeof entry[1] === 'number');
  if (!entries.length) return null;
  return entries.sort((a, b) => a[1] - b[1])[0];
};

const getWeakestScoreDimensionKey = (score?: ResultCell['score'] | null) => {
  if (!score) return null;
  const entries = [
    ['endpoints', score.endpoints],
    ['direction', score.direction],
    ['shape', score.shape],
  ].filter((entry): entry is [ResultCellDimensionFilter, number] => typeof entry[1] === 'number');
  if (!entries.length) return null;
  return entries.sort((a, b) => a[1] - b[1])[0][0];
};

const getDimensionLabel = (key: ResultCellDimensionFilter | null) => {
  if (key === 'endpoints') return '起止';
  if (key === 'direction') return '走向';
  if (key === 'shape') return '形态';
  return '全部维度';
};

const getResultCellFilter = (): ResultCellFilter => {
  const value = jobResultFilter?.value as ResultCellFilter | undefined;
  if (value === 'low' || value === 'medium' || value === 'good') {
    return value;
  }
  return 'all';
};

const getFilteredResultCells = (cells: ResultCell[]) => {
  const activeFilter = getResultCellFilter();
  const activeDimensionFilter = getResultDimensionFilter();
  const query = jobResultQuery?.value.trim().toLowerCase() || '';
  return cells.filter((cell) => {
    if (activeFilter !== 'all') {
      const overall = cell.score?.overall;
      if (typeof overall !== 'number') return false;
      const band = getScoreBand(overall);
      if (activeFilter === 'low' && band !== 'poor') return false;
      if (activeFilter === 'medium' && band !== 'medium') return false;
      if (activeFilter === 'good' && band !== 'good') return false;
    }
    if (activeDimensionFilter !== 'all') {
      const weakestKey = getWeakestScoreDimensionKey(cell.score);
      if (weakestKey !== activeDimensionFilter) return false;
    }
    if (!query) return true;
    const haystack = `${cell.id} ${cell.char || ''}`.toLowerCase();
    return haystack.includes(query);
  });
};

const resetCharacterResult = (note?: string) => {
  if (!characterResultElm) return;
  characterResultElm.className = 'character-result character-result--pending';
  if (characterResultLabelElm) {
    characterResultLabelElm.textContent =
      sessionMode === 'test' ? '测试结果' : '整字结果';
  }
  if (characterResultScoreElm) {
    characterResultScoreElm.textContent = '等待完成';
  }
  if (characterResultNoteElm) {
    characterResultNoteElm.textContent =
      note || '完成一个汉字后，这里会给出整字评价与建议。';
  }
  notifyParentFrame();
};

const showCharacterResult = (char: string, score: number) => {
  if (!characterResultElm) return;
  const band = getScoreBand(score);
  const bandLabelMap = {
    good: '表现优秀',
    medium: '基本达标',
    poor: '仍需加强',
  } as const;
  const noteMap = {
    good: `“${char}” 的结构和笔势都比较稳定，可以继续保持当前节奏。`,
    medium: `“${char}” 已基本成形，建议再关注起收笔与整体重心。`,
    poor: `“${char}” 与标准字还有差距，建议放慢速度并先观察笔顺结构。`,
  } as const;
  characterResultElm.className = `character-result character-result--${band}`;
  if (characterResultLabelElm) {
    characterResultLabelElm.textContent =
      sessionMode === 'test' ? `测试结果 · ${char}` : `练习结果 · ${char}`;
  }
  if (characterResultScoreElm) {
    characterResultScoreElm.textContent = `${bandLabelMap[band]} · ${formatScore(score)} 分`;
  }
  if (characterResultNoteElm) {
    characterResultNoteElm.textContent = noteMap[band];
  }
  if (sequenceQueue.length && sequenceIndex >= 0 && sequenceIndex < sequenceQueue.length) {
    completedSequenceSlots.add(sequenceIndex);
  }
  recentCharacterScores.unshift(score);
  if (recentCharacterScores.length > 5) {
    recentCharacterScores.pop();
  }
  updateWriterOverview();
  notifyParentFrame();
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
  notifyParentFrame();
};

const handleScoreUpdate = (payload: ScoreUpdatePayload) => {
  latestCharacterScore = payload.overallScore;
  if (scoreTotalElm) {
    scoreTotalElm.textContent = `${formatScore(payload.overallScore)}`;
  }
  renderScoreHistory(payload.history);
  updateWriterOverview();
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
  updateWriterOverview();
  persistWriterState();
  const writer = currentWriter;
  resetScorePanel();
  resetCharacterResult(`已切换到“${char}”，完成整字后显示评价。`);
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
  resetRecentCharacterScores();
  if (!nextQueue.length) {
    setStatus('请输入至少一个汉字后再开始序列练习。');
    updateSequenceStatus();
    updateWriterOverview();
    setSessionStatus('尚未载入字帖，请输入汉字。');
    resetCharacterResult('尚未载入字帖，请先输入汉字再开始。');
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
let practiceHintPreference = hintToggleInput?.checked ?? true;
let hintsEnabled = practiceHintPreference;

const updateModeButtons = () => {
  modeButtons.forEach((btn) => {
    const target = btn.dataset.mode as SessionMode | undefined;
    btn.classList.toggle('is-active', target === sessionMode);
    btn.setAttribute('aria-pressed', String(target === sessionMode));
  });
  applyModePanels();
  notifyParentFrame();
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
      if (typeof latestCharacterScore === 'number') {
        showCharacterResult(activeCharacter, latestCharacterScore);
      }
      if (sessionMode === 'practice') {
        setSessionStatus('该字练习完成，可继续书写或切换其它汉字。');
        setTimeout(() => startQuiz(), 400);
      } else {
        setSessionStatus('本字测试完成，稍后自动切换到下一个字。');
        window.setTimeout(() => {
          const advanced = advanceSequenceChar();
          if (!advanced) {
            setSessionStatus('测试完成，字帖已写完，可重新开始。');
          } else {
            setSessionStatus('已切换到下一测试字，继续完成全部笔画。');
          }
        }, 900);
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
  resetCharacterResult(
    mode === 'test'
      ? '测试模式下完成整字后，会先显示结果再自动切换。'
      : '完成一个汉字后，这里会给出整字评价与建议。',
  );
  if (mode === 'upload') {
    stopQuiz();
    setWriterFeedback('上传模式：书写画布暂不可用。');
    setSessionStatus('上传模式：请选择稿纸并等待系统完成评分。');
    if (jobStatusMessage) {
      if (apiConfigured) {
        jobStatusMessage.textContent = '正在读取历史任务…';
        jobStatusMessage.classList.remove('job-status-error');
      } else {
        jobStatusMessage.textContent = '评分服务尚未配置，暂时无法读取任务。';
        jobStatusMessage.classList.add('job-status-error');
      }
    }
    if (jobListElm) jobListElm.innerHTML = '';
    if (jobResultPanel) clearJobResult(pageRole === 'upload' && previousMode === 'practice');
    if (apiConfigured) startJobPolling();
    return;
  }
  if (previousMode === 'upload') {
    stopJobPolling();
    if (jobStatusMessage) {
      jobStatusMessage.textContent = '切换到上传模式后会自动加载历史任务。';
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
  notifyParentFrame();
};

if (writerContainer) {
  resetScorePanel();
  currentWriter = createWriter(activeCharacter || '我');
  syncHintToggleState();
  updateModeButtons();
  loadCharacter(activeCharacter || '我');
} else {
  updateModeButtons();
  syncHintToggleState();
}

syncMobileControlsToggle();

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
        persistWriterState();
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
  resetRecentCharacterScores();
  if (sequenceInput) sequenceInput.value = '';
  setStatus('已清空字帖内容，输入新的字帖后重新载入。');
  setSessionStatus('字帖已清空，请输入新的汉字内容。');
  updateSequenceStatus();
  resetCharacterResult('字帖已清空，等待新的汉字内容。');
});

sequenceInput?.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    applySequenceFromInput();
  }
});

restartQuizBtn?.addEventListener('click', () => {
  resetScorePanel();
  resetRecentCharacterScores();
  resetCharacterResult('已重新开始，请完成整字后查看新的评价。');
  startQuiz();
});

hintToggleInput?.addEventListener('change', () => {
  practiceHintPreference = Boolean(hintToggleInput.checked);
  persistWriterState();
  if (sessionMode === 'practice') {
    hintsEnabled = practiceHintPreference;
    startQuiz();
  }
});

mobileControlsToggleBtn?.addEventListener('click', () => {
  controlsCollapsed = !controlsCollapsed;
  syncMobileControlsToggle();
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
const pageFilePreview = document.getElementById('page-file-preview');
const pageFilePreviewMedia = document.querySelector<HTMLElement>('.upload-file-preview__media');
const pageFilePreviewImage = document.getElementById(
  'page-file-preview-image',
) as HTMLImageElement | null;
const pageFilePreviewName = document.getElementById('page-file-preview-name');
const pageFilePreviewMeta = document.getElementById('page-file-preview-meta');
const artifactSelect = document.getElementById('artifact-level') as HTMLSelectElement | null;
const scoreArtifactSelect = document.getElementById('score-artifact-level') as HTMLSelectElement | null;
const executionModeSelect = document.getElementById('execution-mode') as HTMLSelectElement | null;
const jobListElm = document.getElementById('job-list-entries');
const jobStatusMessage = document.getElementById('job-status-message');
const jobStatusSummary = document.getElementById('job-status-summary');
const jobStatusFilterSelect = document.getElementById(
  'job-status-filter',
) as HTMLSelectElement | null;
const refreshJobsBtn = document.getElementById('refresh-jobs');
const jobResultPanel = document.getElementById('job-result-panel');
const jobResultTitle = document.getElementById('job-result-title');
const jobResultSummary = document.getElementById('job-result-summary');
const jobResultMetrics = document.getElementById('job-result-metrics');
const jobResultTotalCells = document.getElementById('job-result-total-cells');
const jobResultLowCount = document.getElementById('job-result-low-count');
const jobResultVisibleCount = document.getElementById('job-result-visible-count');
const jobResultWeakestCell = document.getElementById('job-result-weakest-cell');
const jobResultLowScore = document.getElementById('job-result-low-score');
const jobResultFilter = document.getElementById('job-result-filter') as HTMLSelectElement | null;
const jobResultDimensionFilter = document.getElementById(
  'job-result-dimension-filter',
) as HTMLSelectElement | null;
const jobResultQuery = document.getElementById('job-result-query') as HTMLInputElement | null;
const jobResultReset = document.getElementById('job-result-reset');
const jobResultDetail = document.getElementById('job-result-detail');
const jobResultDetailTitle = document.getElementById('job-result-detail-title');
const jobResultDetailBand = document.getElementById('job-result-detail-band');
const jobResultDetailSummary = document.getElementById('job-result-detail-summary');
const jobResultDetailOverall = document.getElementById('job-result-detail-overall');
const jobResultDetailEndpoints = document.getElementById('job-result-detail-endpoints');
const jobResultDetailDirection = document.getElementById('job-result-detail-direction');
const jobResultDetailShape = document.getElementById('job-result-detail-shape');
const jobResultDetailAdvice = document.getElementById('job-result-detail-advice');
const jobResultDetailActions = document.getElementById('job-result-detail-actions');
const jobResultCards = document.getElementById('job-result-cards');
const jobResultCells = document.getElementById('job-result-cells');
const jobResultClose = document.getElementById('job-result-close');
const jobResultCopy = document.getElementById('job-result-copy');
const jobResultExport = document.getElementById('job-result-export');
let currentJobResult: JobResultPayload | null = null;
let selectedResultCellId = '';
let pageFilePreviewUrl = '';

const persistUploadPreferences = () => {
  savePersistedPageState({
    artifactLevel: artifactSelect?.value,
    scoreArtifactLevel: scoreArtifactSelect?.value,
    executionMode: executionModeSelect?.value,
    jobStatusFilter:
      (jobStatusFilterSelect?.value as PersistedPageState['jobStatusFilter'] | undefined) || 'all',
    resultFilter:
      (jobResultFilter?.value as PersistedPageState['resultFilter'] | undefined) || 'all',
    resultDimensionFilter:
      (jobResultDimensionFilter?.value as PersistedPageState['resultDimensionFilter'] | undefined) ||
      'all',
    resultQuery: jobResultQuery?.value || '',
  });
};

const restoreSelectValue = (element: HTMLSelectElement | null, value: string | undefined) => {
  if (!element || !value) return;
  const hasOption = Array.from(element.options).some((option) => option.value === value);
  if (hasOption) {
    element.value = value;
  }
};

restoreSelectValue(artifactSelect, persistedPageState.artifactLevel);
restoreSelectValue(scoreArtifactSelect, persistedPageState.scoreArtifactLevel);
restoreSelectValue(executionModeSelect, persistedPageState.executionMode);
restoreSelectValue(jobStatusFilterSelect, persistedPageState.jobStatusFilter);
restoreSelectValue(jobResultFilter, persistedPageState.resultFilter);
restoreSelectValue(jobResultDimensionFilter, persistedPageState.resultDimensionFilter);
if (jobResultQuery && typeof persistedPageState.resultQuery === 'string') {
  jobResultQuery.value = persistedPageState.resultQuery;
}

const revokePageFilePreviewUrl = () => {
  if (!pageFilePreviewUrl) return;
  URL.revokeObjectURL(pageFilePreviewUrl);
  pageFilePreviewUrl = '';
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const renderPageFilePreview = (file?: File | null) => {
  if (!pageFilePreview || !pageFilePreviewName || !pageFilePreviewMeta) return;
  revokePageFilePreviewUrl();
  if (!file) {
    pageFilePreview.className = 'upload-file-preview upload-file-preview--empty';
    pageFilePreviewName.textContent = '尚未选择稿纸';
    pageFilePreviewMeta.textContent = '支持拍照、相册选择或 PDF 上传。';
    if (pageFilePreviewMedia) pageFilePreviewMedia.hidden = true;
    if (pageFilePreviewImage) pageFilePreviewImage.removeAttribute('src');
    return;
  }

  pageFilePreview.className = 'upload-file-preview';
  pageFilePreviewName.textContent = file.name;
  pageFilePreviewMeta.textContent = `${file.type || '未知格式'} · ${formatFileSize(file.size)}`;

  if (file.type.startsWith('image/') && pageFilePreviewMedia && pageFilePreviewImage) {
    pageFilePreviewUrl = URL.createObjectURL(file);
    pageFilePreviewImage.src = pageFilePreviewUrl;
    pageFilePreviewMedia.hidden = false;
  } else {
    if (pageFilePreviewMedia) pageFilePreviewMedia.hidden = true;
    if (pageFilePreviewImage) pageFilePreviewImage.removeAttribute('src');
  }
};

if (jobStatusMessage) {
  jobStatusMessage.textContent =
    pageRole === 'upload' ? '正在初始化上传模式…' : '切换到上传模式后会自动加载历史任务。';
}

const rawApiBase = (import.meta.env.VITE_HANZI_API_BASE as string | undefined) || '';
const normalizedApiBase = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;
const allowRelativeApi = import.meta.env.DEV;
const apiConfigured = Boolean(normalizedApiBase) || allowRelativeApi;
const buildApiUrl = (pathname: string) =>
  normalizedApiBase ? `${normalizedApiBase}${pathname}` : pathname;
const getActiveJobFilter = (): JobFilter => {
  const rawValue = jobStatusFilterSelect?.value as JobFilter | undefined;
  if (rawValue === 'queued' || rawValue === 'running' || rawValue === 'succeeded' || rawValue === 'failed') {
    return rawValue;
  }
  return 'all';
};

updateUploadOverview();

const showJobMessage = (message: string, isError = false) => {
  if (!jobStatusMessage) return;
  jobStatusMessage.textContent = message;
  jobStatusMessage.classList.toggle('job-status-error', isError);
  updateUploadOverview();
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

const renderJobStatusSummary = (jobs: JobRecord[]) => {
  if (!jobStatusSummary) return;
  const counts = {
    queued: jobs.filter((job) => job.status === 'queued').length,
    running: jobs.filter((job) => job.status === 'running').length,
    succeeded: jobs.filter((job) => job.status === 'succeeded').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
  };
  jobStatusSummary.innerHTML = '';
  [
    ['全部', jobs.length, 'all'],
    ['排队中', counts.queued, 'queued'],
    ['处理中', counts.running, 'running'],
    ['已完成', counts.succeeded, 'succeeded'],
    ['处理失败', counts.failed, 'failed'],
  ].forEach(([label, count, tone]) => {
    const pill = document.createElement('div');
    pill.className = `job-status-summary__item job-status-summary__item--${tone}`;
    pill.innerHTML = `<span>${label}</span><strong>${count}</strong>`;
    jobStatusSummary.appendChild(pill);
  });
};

const renderJobListItem = (job: JobRecord, featuredJobId: string) => {
  if (!jobListElm) return;
  const li = document.createElement('li');
  li.className = 'job-pill';
  if (featuredJobId && job.jobId === featuredJobId && job.status === 'succeeded') {
    li.classList.add('job-pill--featured');
  }
  const header = document.createElement('div');
  header.className = 'job-pill__row';
  const name = document.createElement('span');
  name.textContent = getJobDisplayName(job);
  const status = document.createElement('span');
  status.className = `job-pill__status job-pill__status--${job.status}`;
  status.textContent = getJobStatusLabel(job.status);
  header.append(name, status);
  const meta = document.createElement('div');
  meta.className = 'job-pill__meta';
  meta.textContent = `任务编号：${job.jobId.slice(0, 8)} · 提交：${formatDate(job.createdAt)} · 更新：${formatDate(
    job.updatedAt,
  )} · 流程：${getExecutionModeLabel(job.executionMode)}`;
  li.append(header, meta);
  if (job.summary?.cellCount) {
    const cellInfo = document.createElement('div');
    cellInfo.className = 'job-pill__meta';
    cellInfo.textContent = `格子数：${job.summary.cellCount}${
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
};

const renderJobs = (jobs: JobRecord[]) => {
  latestJobRecords = jobs;
  updateUploadOverview();
  renderJobStatusSummary(jobs);
  if (!jobListElm) return;
  jobListElm.innerHTML = '';
  if (!jobs.length) {
    showJobMessage('暂无任务，等待上传。');
    return;
  }
  const activeFilter = getActiveJobFilter();
  const filteredJobs =
    activeFilter === 'all' ? jobs : jobs.filter((job) => job.status === activeFilter);
  const featuredJobId =
    filteredJobs.find((job) => job.status === 'succeeded')?.jobId ||
    jobs.find((job) => job.status === 'succeeded')?.jobId ||
    '';
  if (!filteredJobs.length) {
    showJobMessage(`当前筛选为“${getJobFilterLabel(activeFilter)}”，暂无匹配任务。共 ${jobs.length} 个任务。`);
    const emptyItem = document.createElement('li');
    emptyItem.className = 'job-pill job-pill--empty';
    emptyItem.textContent = '当前筛选暂无任务，请切换状态筛选或刷新列表。';
    jobListElm.appendChild(emptyItem);
    return;
  }
  showJobMessage(
    activeFilter === 'all'
      ? `共 ${jobs.length} 个任务，最新在最前。`
      : `共 ${jobs.length} 个任务，筛选后显示 ${filteredJobs.length} 个“${getJobFilterLabel(activeFilter)}”。`,
  );
  const groups =
    activeFilter === 'all'
      ? [
          { title: '处理中', jobs: filteredJobs.filter((job) => job.status === 'running' || job.status === 'queued') },
          { title: '已完成', jobs: filteredJobs.filter((job) => job.status === 'succeeded') },
          { title: '处理失败', jobs: filteredJobs.filter((job) => job.status === 'failed') },
        ]
      : [{ title: getJobFilterLabel(activeFilter), jobs: filteredJobs }];

  groups.forEach((group) => {
    if (!group.jobs.length) return;
    const label = document.createElement('li');
    label.className = 'job-list__group-label';
    label.textContent = `${group.title} · ${group.jobs.length}`;
    jobListElm.appendChild(label);
    group.jobs.forEach((job) => {
      renderJobListItem(job, featuredJobId);
    });
  });
};

const fetchJobs = async () => {
  if (!jobListElm || sessionMode !== 'upload' || !apiConfigured) return;
  try {
    const response = await fetch(buildApiUrl('/api/jobs'));
    if (!response.ok) {
      throw new Error(`服务状态 ${response.status}`);
    }
    const payload = (await response.json()) as JobRecord[];
    renderJobs(payload);
  } catch (error) {
    console.error('fetch jobs failed', error);
    showJobMessage(
      '暂时无法读取任务列表，请确认评分服务已启动并可访问。',
      true,
    );
    updateUploadOverview();
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

const focusResultCell = (cellId: string) => {
  selectedResultCellId = cellId;
  if (jobResultFilter) {
    jobResultFilter.value = 'all';
  }
  if (jobResultDimensionFilter) {
    jobResultDimensionFilter.value = 'all';
  }
  if (jobResultQuery) {
    jobResultQuery.value = cellId;
  }
  persistUploadPreferences();
  renderJobResult(currentJobResult);
};

const applyResultFilters = (
  filter: ResultCellFilter,
  dimension: ResultCellDimensionFilter,
  query = '',
) => {
  if (jobResultFilter) {
    jobResultFilter.value = filter;
  }
  if (jobResultDimensionFilter) {
    jobResultDimensionFilter.value = dimension;
  }
  if (jobResultQuery) {
    jobResultQuery.value = query;
  }
  selectedResultCellId = '';
  persistUploadPreferences();
  renderJobResult(currentJobResult);
};

const getPreferredReviewCells = (result: JobResultPayload) => {
  const filteredCells = getFilteredResultCells(result.cells);
  if (filteredCells.length) return filteredCells;
  const lowCells = result.cells.filter(
    (cell) => typeof cell.score?.overall === 'number' && cell.score.overall < 0.6,
  );
  return lowCells.length ? lowCells : result.cells;
};

const buildReviewChecklistText = (result: JobResultPayload) => {
  const sourceCells = getPreferredReviewCells(result);
  const lines = [
    `任务 ${result.jobId} 复习清单`,
    `生成时间：${new Date().toLocaleString()}`,
    `共 ${sourceCells.length} 个重点格子`,
    '',
  ];

  sourceCells.forEach((cell, index) => {
    const weakest = getWeakestScoreDimension(cell.score);
    lines.push(
      `${index + 1}. ${cell.id} · ${cell.char || '未知字符'} · 总分 ${formatScoreText(cell.score?.overall)}`,
    );
    if (weakest) {
      lines.push(`   最弱维度：${weakest[0]} ${formatScoreText(weakest[1])}`);
    }
    lines.push(`   建议：${getResultAdvice(cell)}`);
    lines.push('');
  });

  return lines.join('\n').trim();
};

const copyReviewChecklist = async () => {
  if (!currentJobResult) {
    showJobMessage('请先打开任务详情，再复制复习清单。');
    return;
  }
  const text = buildReviewChecklistText(currentJobResult);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showJobMessage('复习清单已复制，可直接发送给老师或保存。');
    } else {
      throw new Error('clipboard unavailable');
    }
  } catch {
    showJobMessage('当前环境不支持直接复制，请使用导出清单。', true);
  }
};

const exportReviewChecklist = () => {
  if (!currentJobResult) {
    showJobMessage('请先打开任务详情，再导出复习清单。');
    return;
  }
  const text = buildReviewChecklistText(currentJobResult);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `review-checklist-${currentJobResult.jobId}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showJobMessage('复习清单已导出。');
};

const getResultDimensionFilter = (): ResultCellDimensionFilter => {
  const value = jobResultDimensionFilter?.value as ResultCellDimensionFilter | undefined;
  if (value === 'endpoints' || value === 'direction' || value === 'shape') {
    return value;
  }
  return 'all';
};

const setResultDetailPlaceholder = () => {
  if (jobResultDetail) {
    jobResultDetail.className = 'job-result__detail job-result__detail--empty';
  }
  if (jobResultDetailTitle) jobResultDetailTitle.textContent = '等待选择格子';
  if (jobResultDetailBand) jobResultDetailBand.textContent = '--';
  if (jobResultDetailSummary) {
    jobResultDetailSummary.textContent =
      '点击低分重点卡片或下方表格行后，这里会显示该格子的详细解释。';
  }
  if (jobResultDetailOverall) jobResultDetailOverall.textContent = '总分：--';
  if (jobResultDetailEndpoints) jobResultDetailEndpoints.textContent = '起止：--';
  if (jobResultDetailDirection) jobResultDetailDirection.textContent = '走向：--';
  if (jobResultDetailShape) jobResultDetailShape.textContent = '形态：--';
  if (jobResultDetailAdvice) jobResultDetailAdvice.textContent = '等待详情数据。';
  if (jobResultDetailActions) jobResultDetailActions.innerHTML = '';
};

const getResultAdvice = (cell: ResultCell) => {
  const overall = cell.score?.overall;
  if (typeof overall !== 'number') {
    return '当前格子缺少完整评分数据，建议先确认识别结果与评分结果是否完整。';
  }
  const weakest = getWeakestScoreDimension(cell.score);
  if (overall >= 0.8) {
    return '该格子整体表现稳定，可作为当前页的参考写法继续保持。';
  }
  if (!weakest) {
    return '该格子分数一般，建议回看原图并检查结构重心和笔顺节奏。';
  }
  if (weakest[0] === '起止') {
    return '建议重点检查起笔和收笔位置，先把落点对准标准格，再调整笔画长度。';
  }
  if (weakest[0] === '走向') {
    return '建议重点检查笔画倾斜方向和转折角度，避免线条方向偏移。';
  }
  return '建议重点检查字形结构与部件比例，先稳定重心，再微调外轮廓。';
};

const renderSelectedResultCell = (cells: ResultCell[]) => {
  const selectedCell =
    cells.find((cell) => cell.id === selectedResultCellId) ||
    cells.find((cell) => typeof cell.score?.overall === 'number') ||
    cells[0];
  if (!selectedCell) {
    setResultDetailPlaceholder();
    return;
  }
  selectedResultCellId = selectedCell.id;
  const overall = selectedCell.score?.overall;
  const band = typeof overall === 'number' ? getScoreBand(overall) : 'medium';
  if (jobResultDetail) {
    jobResultDetail.className = `job-result__detail job-result__detail--${band}`;
  }
  if (jobResultDetailTitle) {
    jobResultDetailTitle.textContent = `${selectedCell.id} · ${selectedCell.char || '未知字符'}`;
  }
  if (jobResultDetailBand) {
    jobResultDetailBand.textContent =
      typeof overall === 'number' ? getScoreBandLabel(overall) : '待补数据';
  }
  if (jobResultDetailSummary) {
    const weakest = getWeakestScoreDimension(selectedCell.score);
    jobResultDetailSummary.textContent = weakest
      ? `当前最低维度是${weakest[0]}，建议优先修正这一项。`
      : '当前格子的分项数据不足，可先查看原始评分结果。';
  }
  if (jobResultDetailOverall) {
    jobResultDetailOverall.textContent = `总分：${formatScoreText(selectedCell.score?.overall)}`;
  }
  if (jobResultDetailEndpoints) {
    jobResultDetailEndpoints.textContent = `起止：${formatScoreText(selectedCell.score?.endpoints)}`;
  }
  if (jobResultDetailDirection) {
    jobResultDetailDirection.textContent = `走向：${formatScoreText(selectedCell.score?.direction)}`;
  }
  if (jobResultDetailShape) {
    jobResultDetailShape.textContent = `形态：${formatScoreText(selectedCell.score?.shape)}`;
  }
  if (jobResultDetailAdvice) {
    jobResultDetailAdvice.textContent = getResultAdvice(selectedCell);
  }
  if (jobResultDetailActions) {
    jobResultDetailActions.innerHTML = '';
    const weakestKey = getWeakestScoreDimensionKey(selectedCell.score);

    const weakAction = document.createElement('button');
    weakAction.type = 'button';
    weakAction.className = 'btn-secondary';
    weakAction.textContent = weakestKey ? '复查同类弱项' : '查看全部格子';
    weakAction.addEventListener('click', () => {
      applyResultFilters('low', weakestKey || 'all');
    });
    jobResultDetailActions.appendChild(weakAction);

    const sameCharAction = document.createElement('button');
    sameCharAction.type = 'button';
    sameCharAction.className = 'btn-secondary';
    sameCharAction.textContent = selectedCell.char ? '定位同字符' : '清除定位';
    sameCharAction.addEventListener('click', () => {
      applyResultFilters('all', 'all', selectedCell.char || '');
    });
    jobResultDetailActions.appendChild(sameCharAction);

    const resetAction = document.createElement('button');
    resetAction.type = 'button';
    resetAction.className = 'btn-secondary';
    resetAction.textContent = '清除筛选';
    resetAction.addEventListener('click', () => {
      applyResultFilters('all', 'all');
    });
    jobResultDetailActions.appendChild(resetAction);
  }
};

const clearJobResult = (preserveFilters = false) => {
  currentJobResult = null;
  selectedResultCellId = '';
  if (jobResultTitle) jobResultTitle.textContent = '尚未选择任务';
  if (jobResultSummary) {
    jobResultSummary.textContent = '切换到上传模式并选择已完成的任务后，这里会显示评分详情。';
  }
  if (jobResultMetrics) jobResultMetrics.textContent = '';
  if (jobResultTotalCells) jobResultTotalCells.textContent = '--';
  if (jobResultLowCount) jobResultLowCount.textContent = '--';
  if (jobResultVisibleCount) jobResultVisibleCount.textContent = '--';
  if (jobResultWeakestCell) jobResultWeakestCell.textContent = '--';
  if (jobResultLowScore) jobResultLowScore.innerHTML = '';
  if (jobResultCards) {
    jobResultCards.innerHTML = '';
    jobResultCards.hidden = true;
  }
  if (!preserveFilters) {
    if (jobResultFilter) jobResultFilter.value = 'all';
    if (jobResultDimensionFilter) jobResultDimensionFilter.value = 'all';
    if (jobResultQuery) jobResultQuery.value = '';
  }
  setResultDetailPlaceholder();
  if (jobResultCells) {
    jobResultCells.innerHTML =
      '<tr><td colspan="6" class="job-result__placeholder">暂无数据</td></tr>';
  }
  persistUploadPreferences();
  updateUploadOverview();
};

const renderJobResultCards = (cells: ResultCell[]) => {
  if (!jobResultCards) return;
  jobResultCards.innerHTML = '';
  if (!cells.length) {
    jobResultCards.hidden = false;
    jobResultCards.innerHTML = '<p class="job-result__placeholder">当前筛选下无格子数据</p>';
    return;
  }
  jobResultCards.hidden = false;
  cells.slice(0, 50).forEach((cell) => {
    const card = document.createElement('article');
    const overall = cell.score?.overall;
    const band = typeof overall === 'number' ? getScoreBand(overall) : 'medium';
    const weakest = getWeakestScoreDimension(cell.score);
    card.className = `job-result__cell-card job-result__cell-card--${band}`;
    if (selectedResultCellId && selectedResultCellId === cell.id) {
      card.classList.add('job-result__cell-card--selected');
    }
    card.tabIndex = 0;

    const header = document.createElement('div');
    header.className = 'job-result__cell-card-header';
    header.innerHTML = `
      <strong>${cell.id} · ${cell.char || '未知字符'}</strong>
      <span>${typeof overall === 'number' ? getScoreBandLabel(overall) : '待补数据'}</span>
    `;

    const score = document.createElement('p');
    score.className = 'job-result__cell-card-score';
    score.textContent = `总分 ${formatScoreText(overall)}`;

    const chips = document.createElement('div');
    chips.className = 'job-result__cell-card-chips';
    [
      ['起止', cell.score?.endpoints],
      ['走向', cell.score?.direction],
      ['形态', cell.score?.shape],
    ].forEach(([label, value]) => {
      const chip = document.createElement('span');
      chip.className = 'job-result__cell-card-chip';
      chip.textContent = `${label} ${formatScoreText(value as number | null | undefined)}`;
      chips.appendChild(chip);
    });

    const note = document.createElement('p');
    note.className = 'job-result__cell-card-note';
    note.textContent = weakest
      ? `最低维度：${weakest[0]} ${formatScoreText(weakest[1])}`
      : '当前格子暂无完整分项数据';

    const selectCard = () => {
      selectedResultCellId = cell.id;
      renderJobResult(currentJobResult);
    };
    card.addEventListener('click', selectCard);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCard();
      }
    });
    card.append(header, score, chips, note);
    jobResultCards.appendChild(card);
  });
};

const renderJobResult = (result: JobResultPayload | null) => {
  currentJobResult = result;
  if (!jobResultPanel) return;
  if (!result) {
    clearJobResult();
    return;
  }
  const filteredCells = getFilteredResultCells(result.cells);
  const lowScoreCells = result.cells.filter(
    (cell) => typeof cell.score?.overall === 'number' && cell.score.overall < 0.6,
  );
  const activeDimensionFilter = getResultDimensionFilter();
  const weakestCell = [...result.cells]
    .filter((cell) => typeof cell.score?.overall === 'number')
    .sort((a, b) => (a.score!.overall! > b.score!.overall! ? 1 : -1))[0];
  if (jobResultTitle) jobResultTitle.textContent = `任务详情 · ${result.jobId.slice(0, 8)}`;
  if (jobResultSummary) {
    jobResultSummary.textContent = `共 ${result.cells.length} 个格子，当前展示 ${filteredCells.length} 个，${
      result.metrics?.scoredCount ?? 0
    } 个已评分。${
      activeDimensionFilter === 'all' ? '' : ` 当前只看“${getDimensionLabel(activeDimensionFilter)}”最弱的格子。`
    }`;
  }
  if (jobResultTotalCells) jobResultTotalCells.textContent = `${result.cells.length}`;
  if (jobResultLowCount) jobResultLowCount.textContent = `${lowScoreCells.length}`;
  if (jobResultVisibleCount) jobResultVisibleCount.textContent = `${filteredCells.length}`;
  if (jobResultWeakestCell) {
    jobResultWeakestCell.textContent = weakestCell
      ? `${weakestCell.id} · ${formatScore(weakestCell.score!.overall!)}`
      : '--';
  }
  if (jobResultMetrics) {
    const avg =
      typeof result.metrics?.averageScore === 'number'
        ? `${formatScore(result.metrics.averageScore)}`
        : '--';
    const scoredCount = result.metrics?.scoredCount ?? 0;
    jobResultMetrics.textContent = `综合平均分：${avg} · 已评分：${scoredCount} · 低分重点：${lowScoreCells.length}`;
  }
  if (jobResultLowScore) {
    jobResultLowScore.innerHTML = '';
    const highlights = [...result.cells]
      .filter((cell) => typeof cell.score?.overall === 'number')
      .sort((a, b) => (a.score!.overall! > b.score!.overall! ? 1 : -1))
      .slice(0, 3);
    if (!highlights.length) {
      jobResultLowScore.innerHTML = '<p class="job-result__placeholder">暂无低分提示</p>';
    } else {
      const title = document.createElement('h4');
      title.textContent = '低分重点提示';
      const summary = document.createElement('p');
      summary.className = 'job-result__low-score-summary';
      summary.textContent = '以下格子建议优先复查，先看总分，再关注最低维度。';
      const list = document.createElement('div');
      list.className = 'job-result__low-score-list';
      highlights.forEach((cell) => {
        const item = document.createElement('article');
        const overall = cell.score!.overall!;
        const band = getScoreBand(overall);
        const weakest = getWeakestScoreDimension(cell.score);
        item.className = `job-result__focus-card job-result__focus-card--${band}`;

        const header = document.createElement('div');
        header.className = 'job-result__focus-header';
        header.innerHTML = `
          <strong>${cell.id} · ${cell.char || '未知'}</strong>
          <span>${getScoreBandLabel(overall)}</span>
        `;

        const scoreLine = document.createElement('p');
        scoreLine.className = 'job-result__focus-score';
        scoreLine.textContent = `总分 ${formatScoreText(overall)}`;

        const detail = document.createElement('p');
        detail.className = 'job-result__focus-detail';
        detail.textContent = weakest
          ? `最低维度：${weakest[0]} ${formatScoreText(weakest[1])}`
          : '缺少分项评分数据';

        const chips = document.createElement('div');
        chips.className = 'job-result__focus-chips';
        ['endpoints', 'direction', 'shape'].forEach((key) => {
          const metricLabel =
            key === 'endpoints' ? '起止' : key === 'direction' ? '走向' : '形态';
          const value = cell.score?.[key as keyof NonNullable<ResultCell['score']>];
          const chip = document.createElement('span');
          chip.className = 'job-result__focus-chip';
          chip.textContent = `${metricLabel} ${formatScoreText(value as number | null | undefined)}`;
          chips.appendChild(chip);
        });

        item.tabIndex = 0;
        item.addEventListener('click', () => focusResultCell(cell.id));
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            focusResultCell(cell.id);
          }
        });
        item.append(header, scoreLine, detail, chips);
        list.appendChild(item);
      });
      jobResultLowScore.append(title, summary, list);
    }
  }
  renderSelectedResultCell(filteredCells);
  renderJobResultCards(filteredCells);
  if (jobResultCells) {
    jobResultCells.innerHTML = '';
    if (!filteredCells.length) {
      setResultDetailPlaceholder();
      jobResultCells.innerHTML =
        '<tr><td colspan="6" class="job-result__placeholder">当前筛选下无格子数据</td></tr>';
      return;
    }
    let selectedRow: HTMLTableRowElement | null = null;
    filteredCells.slice(0, 50).forEach((cell) => {
      const tr = document.createElement('tr');
      tr.dataset.cellId = cell.id;
      const score = cell.score || {};
      const toCell = (value?: number | null) =>
        typeof value === 'number' ? formatScore(value) : '--';
      if (typeof score.overall === 'number') {
        tr.classList.add(`job-result__row--${getScoreBand(score.overall)}`);
      }
      if (selectedResultCellId && selectedResultCellId === cell.id) {
        tr.classList.add('job-result__row--selected');
        selectedRow = tr;
      }
      tr.tabIndex = 0;
      tr.addEventListener('click', () => {
        selectedResultCellId = cell.id;
        renderJobResult(currentJobResult);
      });
      tr.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectedResultCellId = cell.id;
          renderJobResult(currentJobResult);
        }
      });
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
    if (filteredCells.length > 50) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td colspan="6" class="job-result__placeholder">仅展示前 50 条，详见下载文件。</td>';
      jobResultCells.appendChild(tr);
    }
    if (selectedRow) {
      window.setTimeout(() => {
        selectedRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 40);
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
      showJobMessage('该任务暂未生成评分结果。', true);
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
    showJobMessage('评分服务尚未配置，暂时无法上传稿纸。', true);
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
  persistUploadPreferences();
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
    renderPageFilePreview(null);
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
    showJobMessage('评分服务尚未配置，暂时无法刷新任务。', true);
    return;
  }
  fetchJobs();
});

jobStatusFilterSelect?.addEventListener('change', () => {
  persistUploadPreferences();
  renderJobs(latestJobRecords);
});

jobResultClose?.addEventListener('click', () => {
  clearJobResult();
});

jobResultCopy?.addEventListener('click', () => {
  void copyReviewChecklist();
});

jobResultExport?.addEventListener('click', () => {
  exportReviewChecklist();
});

jobResultFilter?.addEventListener('change', () => {
  selectedResultCellId = '';
  persistUploadPreferences();
  renderJobResult(currentJobResult);
});

jobResultDimensionFilter?.addEventListener('change', () => {
  selectedResultCellId = '';
  persistUploadPreferences();
  renderJobResult(currentJobResult);
});

jobResultQuery?.addEventListener('input', () => {
  selectedResultCellId = '';
  persistUploadPreferences();
  renderJobResult(currentJobResult);
});

jobResultReset?.addEventListener('click', () => {
  selectedResultCellId = '';
  if (jobResultFilter) {
    jobResultFilter.value = 'all';
  }
  if (jobResultDimensionFilter) {
    jobResultDimensionFilter.value = 'all';
  }
  if (jobResultQuery) {
    jobResultQuery.value = '';
  }
  persistUploadPreferences();
  renderJobResult(currentJobResult);
});

artifactSelect?.addEventListener('change', persistUploadPreferences);
scoreArtifactSelect?.addEventListener('change', persistUploadPreferences);
executionModeSelect?.addEventListener('change', persistUploadPreferences);
sequenceInput?.addEventListener('input', persistWriterState);
pageFileInput?.addEventListener('change', () => {
  renderPageFilePreview(pageFileInput.files?.[0] || null);
});

if (initialSessionMode !== 'practice' || pageRole === 'upload') {
  setSessionMode(initialSessionMode);
}

clearJobResult(true);
renderPageFilePreview(pageFileInput?.files?.[0] || null);

let notifyFrameHandle = 0;
const scheduleNotifyParentFrame = () => {
  if (!isEmbeddedFrame) return;
  if (notifyFrameHandle) {
    window.cancelAnimationFrame(notifyFrameHandle);
  }
  notifyFrameHandle = window.requestAnimationFrame(() => {
    notifyFrameHandle = 0;
    notifyParentFrame();
  });
};

const resizeObserver = new ResizeObserver(() => {
  scheduleNotifyParentFrame();
});

resizeObserver.observe(getFrameContentRoot());
window.addEventListener('load', scheduleNotifyParentFrame);
window.addEventListener('resize', scheduleNotifyParentFrame);
window.setTimeout(scheduleNotifyParentFrame, 0);
window.addEventListener('beforeunload', revokePageFilePreviewUrl);
