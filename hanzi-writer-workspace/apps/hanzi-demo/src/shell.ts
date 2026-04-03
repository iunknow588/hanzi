import './shell.css';

type ModeKey = 'practice' | 'test' | 'upload';
type FrameStateMessage = {
  type: 'hanzi-frame-state';
  mode: ModeKey;
  pageRole: 'writer' | 'upload';
  title: string;
  height: number;
};

const MODE_PAGE: Record<ModeKey, string> = {
  practice: './practice.html',
  test: './test.html',
  upload: './upload.html',
};

const MODE_META: Record<
  ModeKey,
  { label: string; description: string; page: string; roleText: string }
> = {
  practice: {
    label: '练习模式',
    description: '适合日常临摹、纠错与实时评分。',
    page: 'practice.html',
    roleText: '当前载入的是独立练习页面',
  },
  test: {
    label: '测试模式',
    description: '按字帖顺序逐字完成，更适合正式测评。',
    page: 'test.html',
    roleText: '当前载入的是独立测试页面',
  },
  upload: {
    label: '上传模式',
    description: '上传整页稿纸，统一进入桥接评分流程。',
    page: 'upload.html',
    roleText: '当前载入的是独立上传页面',
  },
};

const frame = document.getElementById('mode-frame') as HTMLIFrameElement | null;
const loadingElm = document.getElementById('mode-loading');
const currentLabelElm = document.getElementById('mode-current-label');
const currentDescElm = document.getElementById('mode-current-desc');
const currentMetaElm = document.getElementById('mode-current-meta');
const currentPageElm = document.getElementById('mode-current-page');
const currentRoleElm = document.getElementById('mode-current-role');
const switchButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-target-page]'),
);
const STORAGE_KEY = 'hanzi-demo-mode';
const MIN_FRAME_HEIGHT = 720;

const getInitialMode = (): ModeKey => {
  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get('mode') as ModeKey | null;
  if (queryMode && MODE_PAGE[queryMode]) {
    return queryMode;
  }
  const storedMode = window.localStorage.getItem(STORAGE_KEY) as ModeKey | null;
  if (storedMode && MODE_PAGE[storedMode]) {
    return storedMode;
  }
  return 'practice';
};

let activeMode: ModeKey = getInitialMode();
let lastFrameTitle = '练习模式';

const syncButtons = () => {
  switchButtons.forEach((btn) => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    btn.classList.toggle('is-active', target === activeMode);
  });
  const meta = MODE_META[activeMode];
  if (currentLabelElm) {
    currentLabelElm.textContent = meta.label;
  }
  if (currentDescElm) {
    currentDescElm.textContent = meta.description;
  }
  if (currentPageElm) {
    currentPageElm.textContent = meta.page;
  }
  if (currentRoleElm) {
    currentRoleElm.textContent = meta.roleText;
  }
  if (currentMetaElm) {
    currentMetaElm.textContent = `已加载 ${lastFrameTitle}`;
  }
};

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

const setLoading = (isLoading: boolean) => {
  if (!loadingElm) return;
  loadingElm.hidden = !isLoading;
  if (currentMetaElm && isLoading) {
    currentMetaElm.textContent = `正在切换到 ${MODE_META[activeMode].label}`;
  }
};

const applyFrameHeight = (height: number) => {
  if (!frame) return;
  frame.style.height = `${Math.max(height, MIN_FRAME_HEIGHT)}px`;
};

const loadMode = (mode: ModeKey, replaceUrl = false) => {
  if (!frame) return;
  const targetSrc = MODE_PAGE[mode];
  if (!targetSrc) return;
  activeMode = mode;
  if (frame.getAttribute('src') !== targetSrc) {
    setLoading(true);
    frame.setAttribute('src', targetSrc);
  }
  syncButtons();
  updateUrl(replaceUrl);
};

frame?.addEventListener('load', () => {
  setLoading(false);
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const payload = event.data as FrameStateMessage | undefined;
  if (!payload || payload.type !== 'hanzi-frame-state') return;
  applyFrameHeight(payload.height);
  lastFrameTitle = payload.title.replace('汉字书写评分 · ', '');
  if (payload.mode !== activeMode) {
    activeMode = payload.mode;
  }
  if (currentRoleElm) {
    currentRoleElm.textContent =
      payload.pageRole === 'upload' ? '当前载入的是独立上传页面' : `当前载入的是独立${MODE_META[activeMode].label.replace('模式', '')}页面`;
  }
  syncButtons();
  setLoading(false);
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get('mode') as ModeKey | null;
  const nextMode = queryMode && MODE_PAGE[queryMode] ? queryMode : 'practice';
  if (nextMode !== activeMode) {
    loadMode(nextMode, true);
  }
});

switchButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    if (target && target !== activeMode) {
      loadMode(target);
    }
  });
});

// Ensure initial mode reflects query param (iframe default points to practice)
if (activeMode !== 'practice') {
  loadMode(activeMode, true);
} else {
  syncButtons();
  updateUrl(true);
}
