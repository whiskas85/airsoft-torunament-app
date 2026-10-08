'use client';

import { leggiMeta, scriviMeta } from './db';

export type Scarto = { ms: number; misuratoIl: string; rttMs: number };

/**
 * Misura di quanto l'orologio del telefono è avanti o indietro rispetto al server (P7).
 * Fa tre prove e tiene quella con l'andata e ritorno più breve: è la più precisa.
 */
export async function misuraScarto(): Promise<Scarto> {
  let migliore: Scarto | null = null;
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const r = await fetch('/api/ora', { cache: 'no-store' });
    const t1 = Date.now();
    const { ora } = (await r.json()) as { ora: number };
    const rtt = t1 - t0;
    const s = { ms: Math.round(ora - (t0 + t1) / 2), misuratoIl: new Date(t1).toISOString(), rttMs: rtt };
    if (!migliore || rtt < migliore.rttMs) migliore = s;
  }
  await scriviMeta('scarto', migliore);
  return migliore!;
}

/** Offline si usa l'ultimo scarto misurato; mai misurato = 0, e l'operazione lo dichiara. */
export async function scartoNoto(): Promise<Scarto | null> {
  return (await leggiMeta<Scarto>('scarto')) ?? null;
}
