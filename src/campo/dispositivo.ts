'use client';

import { ALGORITMO, FIRMA, base64url } from '@/lib/campo/operazione';
import { leggiMeta, scriviMeta } from './db';

export type Dispositivo = {
  id: string;
  /** NON esportabile: il browser la usa per firmare ma nessuno, nemmeno l'app, può leggerla */
  chiavePrivata: CryptoKey;
  chiavePubblica: string;
  creatoIl: string;
  /** utente a cui il server ha associato il dispositivo */
  utenteId?: string;
  registratoIl?: string;
};

/** Il dispositivo di questo telefono: lo crea al primo uso. */
export async function dispositivo(): Promise<Dispositivo> {
  const esistente = await leggiMeta<Dispositivo>('dispositivo');
  if (esistente) return esistente;
  const coppia = await crypto.subtle.generateKey(ALGORITMO, false, ['sign', 'verify']);
  const pubblica = await crypto.subtle.exportKey('jwk', coppia.publicKey);
  const d: Dispositivo = {
    id: crypto.randomUUID(),
    chiavePrivata: coppia.privateKey,
    chiavePubblica: JSON.stringify({ kty: pubblica.kty, crv: pubblica.crv, x: pubblica.x, y: pubblica.y }),
    creatoIl: new Date().toISOString(),
  };
  await scriviMeta('dispositivo', d);
  return d;
}

/** Registra la chiave pubblica sul server, legata all'utente collegato. Serve la rete. */
export async function registraDispositivo(utenteId: string) {
  const d = await dispositivo();
  if (d.registratoIl && d.utenteId === utenteId) return d;
  const r = await fetch('/api/campo/dispositivi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: d.id, chiavePubblica: d.chiavePubblica, nome: nomeTelefono(), versioneApp: '0.3' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.errore ?? 'registrazione non riuscita');
  const aggiornato = { ...d, utenteId, registratoIl: j.registratoIl };
  await scriviMeta('dispositivo', aggiornato);
  return aggiornato;
}

export async function firma(testo: string) {
  const d = await dispositivo();
  const s = await crypto.subtle.sign(FIRMA, d.chiavePrivata, new TextEncoder().encode(testo));
  return base64url.da(s);
}

function nomeTelefono() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  const m = ua.match(/Android [\d.]+; ([^;)]+)/);
  return m ? m[1].trim() : /Android/.test(ua) ? 'Android' : 'Computer';
}
