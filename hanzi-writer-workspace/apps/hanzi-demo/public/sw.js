const CACHE_NAME = 'hanzi-demo-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/practice.html',
  '/test.html',
  '/upload.html',
  '/manifest.webmanifest',
  '/app-icon.svg',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>汉字书写评分</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8fafc;
        color: #0f172a;
        font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 520px);
        padding: 24px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 1.2rem;
      }
      p {
        margin: 0;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>页面暂时不可用</h1>
      <p>当前网络不稳定，已进入离线兜底页。请稍后刷新重试。</p>
    </main>
  </body>
</html>`;

const offlineResponse = () =>
  new Response(OFFLINE_HTML, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });

const fallbackResponse = (contentType = 'text/plain; charset=UTF-8') =>
  new Response('', {
    status: 504,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  });

const matchAppShell = async (request) => {
  const url = new URL(request.url);
  const candidates = [
    request,
    url.pathname,
    url.pathname === '/' ? '/index.html' : null,
    '/index.html',
    '/',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const cached = await caches.match(candidate, { ignoreSearch: true });
    if (cached) {
      return cached;
    }
  }

  return null;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        } catch (error) {
          const cached = await matchAppShell(request);
          if (cached) {
            return cached;
          }
          console.warn('sw navigate fallback failed', request.url, error);
          return offlineResponse();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      } catch (error) {
        if (cached) {
          return cached;
        }
        console.warn('sw asset fallback failed', request.url, error);
        return fallbackResponse();
      }
    })(),
  );
});
