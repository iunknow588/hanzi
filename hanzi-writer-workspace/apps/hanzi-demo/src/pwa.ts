import './pwa.css';

type InitPwaOptions = {
  page: 'home' | 'mode';
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INSTALL_DISMISS_KEY = 'hanzi-demo-install-dismissed-v1';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('service worker register failed', error);
    });
  });
};

const setupNetworkStatus = () => {
  const status = document.createElement('div');
  status.className = 'pwa-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.body.appendChild(status);

  let hideTimer = 0;

  const show = (message: string, persistent = false) => {
    status.textContent = message;
    status.classList.add('is-visible');
    status.classList.toggle('pwa-status--offline', persistent);
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }
    if (!persistent) {
      hideTimer = window.setTimeout(() => {
        status.classList.remove('is-visible');
      }, 2200);
    }
  };

  if (!navigator.onLine) {
    show('当前处于离线模式，可继续使用已缓存页面。', true);
  }

  window.addEventListener('offline', () => {
    show('网络已断开，切换到离线模式。', true);
  });

  window.addEventListener('online', () => {
    show('网络已恢复，已切回在线模式。');
  });
};

const setupInstallPrompt = () => {
  if (isStandalone()) return;
  if (window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1') return;

  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  const panel = document.createElement('aside');
  panel.className = 'pwa-install';
  panel.hidden = true;
  panel.innerHTML = `
    <p class="pwa-install__title">安装到桌面</p>
    <p class="pwa-install__desc">把汉字书写评分添加到主屏幕，后续可像 App 一样直接打开使用。</p>
    <div class="pwa-install__actions">
      <button type="button" class="pwa-install__primary">立即安装</button>
      <button type="button" class="pwa-install__secondary">稍后再说</button>
    </div>
  `;
  document.body.appendChild(panel);

  const installBtn = panel.querySelector('.pwa-install__primary') as HTMLButtonElement | null;
  const dismissBtn = panel.querySelector('.pwa-install__secondary') as HTMLButtonElement | null;

  const dismiss = (remember = false) => {
    panel.hidden = true;
    if (remember) {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    }
  };

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome !== 'accepted') {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    }
    deferredPrompt = null;
    dismiss();
  });

  dismissBtn?.addEventListener('click', () => {
    dismiss(true);
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    panel.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    dismiss();
    window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
  });
};

export const initPwa = (options: InitPwaOptions) => {
  if (document.body.dataset.pwaReady === 'true') return;
  document.body.dataset.pwaReady = 'true';
  registerServiceWorker();
  setupNetworkStatus();
  if (options.page === 'home') {
    setupInstallPrompt();
  }
};
