import './shell.css';
import { initPwa } from './pwa';

type ModeKey = 'practice' | 'test' | 'upload';
type FrameStateMessage = {
  type: 'hanzi-frame-state';
  mode: ModeKey;
  pageRole: 'writer' | 'upload';
  title: string;
  height: number;
};

const MODE_META: Record<
  ModeKey,
  {
    label: string;
    description: string;
    page: string;
  }
> = {
  practice: {
    label: '练习模式',
    description: '适合日常临摹、纠错与实时评分，打开后即可直接进入完整书写页面。',
    page: './practice.html',
  },
  test: {
    label: '测试模式',
    description: '适合逐字测评与考试流程，完成当前汉字后会自动进入下一项。',
    page: './test.html',
  },
  upload: {
    label: '上传模式',
    description: '适合整页稿纸上传、任务排队和评分结果查看，便于移动端提交作业。',
    page: './upload.html',
  },
};

const STORAGE_KEY = 'hanzi-demo-mode';
const switchButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-target-page]'),
);
const frameElm = document.getElementById('mode-frame') as HTMLIFrameElement | null;
const loadingElm = document.getElementById('mode-loading');
let loadingTimer = 0;
let loadingDelayTimer = 0;

const getInitialMode = (): ModeKey => {
  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get('mode') as ModeKey | null;
  if (queryMode && MODE_META[queryMode]) {
    return queryMode;
  }
  const storedMode = window.localStorage.getItem(STORAGE_KEY) as ModeKey | null;
  if (storedMode && MODE_META[storedMode]) {
    return storedMode;
  }
  return 'practice';
};

let activeMode: ModeKey = getInitialMode();

initPwa({ page: 'home' });

const setLoading = (isLoading: boolean) => {
  if (!loadingElm) return;
  loadingElm.hidden = !isLoading;
  if (!isLoading) {
    if (loadingTimer) {
      window.clearTimeout(loadingTimer);
      loadingTimer = 0;
    }
    if (loadingDelayTimer) {
      window.clearTimeout(loadingDelayTimer);
      loadingDelayTimer = 0;
    }
  }
};

const beginLoading = () => {
  if (loadingDelayTimer) {
    window.clearTimeout(loadingDelayTimer);
  }
  if (loadingTimer) {
    window.clearTimeout(loadingTimer);
  }
  loadingDelayTimer = window.setTimeout(() => {
    setLoading(true);
  }, 180);
  loadingTimer = window.setTimeout(() => {
    console.debug('[hanzi-demo] iframe loading fallback: hide overlay after timeout');
    setLoading(false);
  }, 4000);
};

setLoading(false);

const logModeDebug = (mode: ModeKey, reason: 'init' | 'navigate') => {
  const meta = MODE_META[mode];
  console.debug(
    `[hanzi-demo] ${reason === 'init' ? '首页初始化' : '模式跳转'}：${meta.label} -> ${meta.page}。${meta.description}`,
  );
};

const getModeHref = (mode: ModeKey) => `${MODE_META[mode].page}?mode=${mode}`;

const updateUrl = (replace = false) => {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', activeMode);
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
  window.localStorage.setItem(STORAGE_KEY, activeMode);
};

const syncView = () => {
  const meta = MODE_META[activeMode];
  document.title = `汉字书写评分 · ${meta.label}`;

  switchButtons.forEach((btn) => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    const isActive = target === activeMode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
};

const syncFrameHeight = (height: number) => {
  if (!frameElm) return;
  frameElm.style.height = `${Math.max(height, 760)}px`;
};

const showMode = (mode: ModeKey, replaceUrl = false) => {
  if (!MODE_META[mode]) return;
  const nextHref = getModeHref(mode);
  const currentSrc = frameElm?.getAttribute('src') || '';
  const shouldReloadFrame = currentSrc !== nextHref;
  activeMode = mode;
  syncView();
  updateUrl(replaceUrl);
  logModeDebug(mode, 'navigate');

  if (!frameElm) return;
  if (shouldReloadFrame) {
    beginLoading();
    frameElm.src = nextHref;
  }
};

switchButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    if (target) {
      showMode(target);
    }
  });
});

frameElm?.addEventListener('load', () => {
  setLoading(false);

  try {
    const sameOriginHeight =
      frameElm.contentWindow?.document.documentElement?.scrollHeight ||
      frameElm.contentWindow?.document.body?.scrollHeight ||
      0;
    if (sameOriginHeight > 0) {
      syncFrameHeight(sameOriginHeight);
    }
  } catch (error) {
    console.debug('iframe height fallback skipped', error);
  }
});

frameElm?.addEventListener('error', () => {
  console.warn('[hanzi-demo] iframe failed to load', frameElm.src);
  setLoading(false);
});

window.addEventListener('message', (event: MessageEvent<FrameStateMessage>) => {
  if (event.origin !== window.location.origin) return;
  const payload = event.data;
  if (!payload || payload.type !== 'hanzi-frame-state') return;

  if (payload.mode && payload.mode !== activeMode && MODE_META[payload.mode]) {
    activeMode = payload.mode;
    syncView();
    updateUrl(true);
  }

  if (typeof payload.height === 'number' && Number.isFinite(payload.height)) {
    syncFrameHeight(payload.height);
  }

  setLoading(false);
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get('mode') as ModeKey | null;
  const nextMode = queryMode && MODE_META[queryMode] ? queryMode : 'practice';
  showMode(nextMode, true);
});

syncFrameHeight(880);
syncView();
showMode(activeMode, true);
logModeDebug(activeMode, 'init');
