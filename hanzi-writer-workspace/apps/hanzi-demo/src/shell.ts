import './shell.css';
import { initPwa } from './pwa';

type ModeKey = 'practice' | 'test' | 'upload';

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

const logModeDebug = (mode: ModeKey, reason: 'init' | 'navigate') => {
  const meta = MODE_META[mode];
  console.debug(
    `[hanzi-demo] ${reason === 'init' ? '首页初始化' : '模式跳转'}：${meta.label} -> ${meta.page}。${meta.description}`,
  );
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

const navigateToMode = (mode: ModeKey) => {
  if (!MODE_META[mode]) return;
  activeMode = mode;
  syncView();
  window.localStorage.setItem(STORAGE_KEY, activeMode);
  logModeDebug(mode, 'navigate');
  window.location.href = `${MODE_META[mode].page}?mode=${mode}`;
};

switchButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    if (target) {
      navigateToMode(target);
    }
  });
});

syncView();
logModeDebug(activeMode, 'init');
