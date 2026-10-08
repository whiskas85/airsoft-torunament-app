/*
 * Service worker dell'app tornei.
 *
 * Serve una cosa: riaprire l'app di CAMPO senza rete (P1). Al momento dell'installazione scarica la
 * pagina /campo e tutti i file che la compongono; poi:
 *   - /campo           → prima la rete (versione aggiornata), se manca la copia salvata;
 *   - /_next/static/*  → dalla copia salvata (il nome cambia a ogni versione, non invecchiano mai);
 *   - /api/documenti/* → dalla cache dei documenti (regolamento, book: scaricati e verificati dall'app);
 *   - tutto il resto   → solo rete (le pagine di gestione restano online, come nel team-management).
 */
const VERSIONE = 'ta-campo-1';
const DOCUMENTI = 'ta-documenti-v1';
const BASE = ['/campo', '/manifest.webmanifest', '/icona-192.png', '/icona-512.png', '/apple-touch-icon.png'];

async function salvaApp() {
  const cache = await caches.open(VERSIONE);
  const pagina = await fetch('/campo', { cache: 'no-store' });
  if (!pagina.ok) throw new Error('pagina di campo non disponibile');
  const html = await pagina.clone().text();
  await cache.put('/campo', pagina);
  // tutti i file statici citati dalla pagina (script, stili, caratteri)
  const file = new Set([...html.matchAll(/\/_next\/static\/[^"'\s)]+/g)].map((m) => m[0].replace(/\u0026/g, '&')));
  await cache.addAll([...BASE.filter((u) => u !== '/campo'), ...file]);
}

self.addEventListener('install', (e) => {
  e.waitUntil(salvaApp().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('ta-campo-') && k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname === '/campo') {
    e.respondWith(
      fetch(req)
        .then(async (r) => {
          if (r.ok) (await caches.open(VERSIONE)).put('/campo', r.clone());
          return r;
        })
        .catch(async () => (await caches.match('/campo')) ?? new Response('Offline e app non ancora salvata su questo telefono.', { status: 503 })),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || BASE.includes(url.pathname)) {
    e.respondWith(
      caches.match(req).then((c) => c ?? fetch(req).then(async (r) => {
        if (r.ok) (await caches.open(VERSIONE)).put(req, r.clone());
        return r;
      })),
    );
    return;
  }

  if (url.pathname.startsWith('/api/documenti/')) {
    e.respondWith(
      caches.open(DOCUMENTI).then((c) => c.match(url.pathname)).then((c) => c ?? fetch(req)),
    );
  }
});
