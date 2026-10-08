'use client';

import { apriDb, type Pacchetto } from './db';

export const CACHE_DOCUMENTI = 'ta-documenti-v1';

async function sha256(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Scarica il pacchetto dell'evento e i suoi documenti, verificando ogni file con il suo SHA-256:
 * in campo tutti devono avere esattamente lo stesso regolamento.
 */
export async function scaricaPacchetto(eventoId: string, avanzamento?: (msg: string) => void): Promise<Pacchetto> {
  avanzamento?.('Scarico la configurazione…');
  const r = await fetch(`/api/campo/eventi/${eventoId}/pacchetto`, { cache: 'no-store' });
  const p = (await r.json()) as Pacchetto & { errore?: string };
  if (!r.ok) throw new Error(p.errore ?? 'pacchetto non disponibile');

  const cache = await caches.open(CACHE_DOCUMENTI);
  for (const doc of p.configurazione.documenti) {
    const url = `/api/documenti/${doc.id}`;
    const gia = await cache.match(url);
    if (gia && (await sha256(await gia.clone().arrayBuffer())) === doc.hash) continue;
    avanzamento?.(`Scarico «${doc.titolo}» (${(doc.byte / 1024 / 1024).toFixed(1)} MB)…`);
    const risposta = await fetch(url, { cache: 'no-store' });
    if (!risposta.ok) throw new Error(`documento «${doc.titolo}» non scaricato`);
    const buf = await risposta.clone().arrayBuffer();
    if ((await sha256(buf)) !== doc.hash) throw new Error(`documento «${doc.titolo}» diverso dall’originale (codice di controllo)`);
    await cache.put(url, risposta);
  }
  await (await apriDb()).put('pacchetti', p);
  avanzamento?.('Pronto per il campo.');
  return p;
}

export async function pacchettiScaricati(): Promise<Pacchetto[]> {
  return (await apriDb()).getAll('pacchetti');
}

/** Documento dal telefono (anche offline), come indirizzo apribile. */
export async function apriDocumento(id: string): Promise<string | null> {
  const r = await (await caches.open(CACHE_DOCUMENTI)).match(`/api/documenti/${id}`);
  return r ? URL.createObjectURL(await r.blob()) : null;
}

export async function documentiPresenti(p: Pacchetto): Promise<Record<string, boolean>> {
  const cache = await caches.open(CACHE_DOCUMENTI);
  const esito: Record<string, boolean> = {};
  for (const d of p.configurazione.documenti) esito[d.id] = !!(await cache.match(`/api/documenti/${d.id}`));
  return esito;
}
