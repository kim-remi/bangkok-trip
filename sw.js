// Offline support. Bump VERSION on every release so phones pick up the new files.
const VERSION = 'bkk-2026-11-01-6';
const SHELL = ['./', './index.html', './standalone.js', './firebase-config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const FB = 'https://www.gstatic.com/firebasejs/10.14.1/';
const SDK = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => FB + f);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(SDK.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch live Firebase traffic (data sync and sign-in handle their own offline behaviour).
  if (/googleapis\.com$/.test(url.hostname) && !/fonts\.googleapis\.com/.test(url.hostname)) return;
  if (/firebaseapp\.com$|identitytoolkit|securetoken/.test(url.hostname)) return;
  const sameOrigin = url.origin === location.origin;
  // App page: network first so updates arrive, cache when offline.
  if (req.mode === 'navigate' || (sameOrigin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith((async () => {
      try { const r = await fetch(req); (await caches.open(VERSION)).put('./index.html', r.clone()); return r; }
      catch { return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error(); }
    })());
    return;
  }
  // Firebase SDK, fonts: cache first.
  if (url.hostname === 'www.gstatic.com' || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const hit = await caches.match(req); if (hit) return hit;
      const r = await fetch(req); (await caches.open(VERSION)).put(req, r.clone()); return r;
    })());
    return;
  }
  // Other app files: serve cached, refresh in the background.
  if (sameOrigin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION); const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
  }
});
