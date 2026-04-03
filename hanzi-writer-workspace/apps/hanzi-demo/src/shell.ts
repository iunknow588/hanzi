import './shell.css';

type ModeKey = 'practice' | 'test' | 'upload';

const MODE_PAGE: Record<ModeKey, string> = {
  practice: '/practice.html',
  test: '/test.html',
  upload: '/upload.html',
};

const frame = document.getElementById('mode-frame') as HTMLIFrameElement | null;
const switchButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-target-page]'),
);

const getInitialMode = (): ModeKey => {
  const params = new URLSearchParams(window.location.search);
  const queryMode = params.get('mode') as ModeKey | null;
  if (queryMode && MODE_PAGE[queryMode]) {
    return queryMode;
  }
  return 'practice';
};

let activeMode: ModeKey = getInitialMode();

const syncButtons = () => {
  switchButtons.forEach((btn) => {
    const target = btn.dataset.targetPage as ModeKey | undefined;
    btn.classList.toggle('is-active', target === activeMode);
  });
};

const updateUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', activeMode);
  window.history.replaceState({}, '', url);
};

const loadMode = (mode: ModeKey) => {
  if (!frame) return;
  const targetSrc = MODE_PAGE[mode];
  if (!targetSrc) return;
  activeMode = mode;
  if (frame.getAttribute('src') !== targetSrc) {
    frame.setAttribute('src', targetSrc);
  }
  syncButtons();
  updateUrl();
};

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
  loadMode(activeMode);
} else {
  syncButtons();
  updateUrl();
}
