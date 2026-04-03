import './shell.css';
import { initPwa } from './pwa';

type ModeKey = 'practice' | 'test' | 'upload';

const MODE_META: Record<
  ModeKey,
  {
    label: string;
    description: string;
    page: string;
    scene: string;
    rhythm: string;
    deviceHint: string;
  }
> = {
  practice: {
    label: '练习模式',
    description: '适合日常临摹、纠错与实时评分，打开后即可直接进入完整书写页面。',
    page: './practice.html',
    scene: '日常临摹与实时纠错',
    rhythm: '边写边看分数反馈，适合连续练习',
    deviceHint: '手机或平板触屏书写',
  },
  test: {
    label: '测试模式',
    description: '适合逐字测评与考试流程，完成当前汉字后会自动进入下一项。',
    page: './test.html',
    scene: '课堂测评与正式测试',
    rhythm: '逐字完成后自动切换，流程更收敛',
    deviceHint: '适合统一测评场景的移动设备',
  },
  upload: {
    label: '上传模式',
    description: '适合整页稿纸上传、任务排队和评分结果查看，便于移动端提交作业。',
    page: './upload.html',
    scene: '课后作业提交与整页复查',
    rhythm: '先上传排队，再集中查看任务结果',
    deviceHint: '手机拍照上传，结果可反复查看',
  },
};

const STORAGE_KEY = 'hanzi-demo-mode';
const switchButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-target-page]'),
);
const modeCards = Array.from(document.querySelectorAll<HTMLElement>('[data-mode-card]'));
const modeLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-mode-link]'));
const currentTitleElm = document.getElementById('mode-current-title');
const currentDescElm = document.getElementById('mode-current-desc');
const currentSceneElm = document.getElementById('mode-current-scene');
const currentRhythmElm = document.getElementById('mode-current-rhythm');
const currentDeviceElm = document.getElementById('mode-current-device');
const primaryLinkElm = document.getElementById('mode-primary-link') as HTMLAnchorElement | null;
const secondaryLinkElm = document.getElementById('mode-secondary-link') as HTMLAnchorElement | null;

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

  modeCards.forEach((card) => {
    const target = card.dataset.modeCard as ModeKey | undefined;
    card.classList.toggle('is-active', target === activeMode);
  });

  modeLinks.forEach((link) => {
    const target = link.dataset.modeLink as ModeKey | undefined;
    if (!target) return;
    link.href = `${MODE_META[target].page}?mode=${target}`;
  });

  if (currentTitleElm) currentTitleElm.textContent = meta.label;
  if (currentDescElm) currentDescElm.textContent = meta.description;
  if (currentSceneElm) currentSceneElm.textContent = meta.scene;
  if (currentRhythmElm) currentRhythmElm.textContent = meta.rhythm;
  if (currentDeviceElm) currentDeviceElm.textContent = meta.deviceHint;
  if (primaryLinkElm) primaryLinkElm.href = `${meta.page}?mode=${activeMode}`;
  if (secondaryLinkElm) secondaryLinkElm.href = `${meta.page}?mode=${activeMode}`;
};

const setMode = (mode: ModeKey, replaceUrl = false) => {
  if (!MODE_META[mode]) return;
  activeMode = mode;
  syncView();
  updateUrl(replaceUrl);
};

switchButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    if (target && target !== activeMode) {
      setMode(target);
    }
  });
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get('mode') as ModeKey | null;
  const nextMode = queryMode && MODE_META[queryMode] ? queryMode : 'practice';
  if (nextMode !== activeMode) {
    setMode(nextMode, true);
  }
});

syncView();
updateUrl(true);
