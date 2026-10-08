// Collaudo del motore di sincronizzazione contro un server in esecuzione (sviluppo).
//   node scripts/prova-sync.mjs [http://localhost:3100]
// Crea un telefono di prova per due utenti demo, poi prova i casi buoni e quelli d'attacco.
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((r) => r.includes('=') && !r.startsWith('#')).map((r) => [r.slice(0, r.indexOf('=')).trim(), r.slice(r.indexOf('=') + 1).trim()]));
const prisma = new PrismaClient();
const subtle = globalThis.crypto.subtle;

const canonico = (v) => Array.isArray(v) ? '[' + v.map(canonico).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonico(v[k])).join(',') + '}'
  : JSON.stringify(v ?? null);
const b64u = (buf) => Buffer.from(buf).toString('base64url');

async function telefono(email) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { email } });
  const cookie = 'ta_sessione=' + await new SignJWT({ sub: u.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(env.SESSION_SECRET));
  const coppia = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const j = await subtle.exportKey('jwk', coppia.publicKey);
  const id = crypto.randomUUID();
  const r = await fetch(`${BASE}/api/campo/dispositivi`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id, chiavePubblica: JSON.stringify({ kty: j.kty, crv: j.crv, x: j.x, y: j.y }), nome: 'prova-sync' }) });
  if (!r.ok) throw new Error('registrazione: ' + (await r.text()));
  return { u, cookie, id, privata: coppia.privateKey };
}

async function op(t, evento, dati, extra = {}) {
  const adesso = new Date();
  const bozza = { v: 1, id: crypto.randomUUID(), evento, tipo: 'prova.nota', autore: t.u.id, dispositivo: t.id, oraDispositivo: adesso.toISOString(), scartoMs: 0, oraUfficiale: adesso.toISOString(), gps: { lat: 45.07, lon: 7.68, precisioneM: 12 }, squadra: null, obiettivo: null, rif: [], dati, ...extra };
  const firma = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, t.privata, new TextEncoder().encode(canonico(bozza)));
  return { ...bozza, firma: b64u(firma) };
}

const sync = async (t, evento, operazioni) => {
  const r = await fetch(`${BASE}/api/campo/sync`, { method: 'POST', headers: { cookie: t.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ evento, dispositivo: t.id, operazioni, dopo: '0' }) });
  return { status: r.status, ...(await r.json()) };
};

let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = '') => { cond ? ok++ : ko++; console.log(`${cond ? '✔' : '✖'} ${nome}${dettaglio ? ' — ' + dettaglio : ''}`); };

const plr = await prisma.evento.findUniqueOrThrow({ where: { codice: 'DEMO-PLR-1' } });
const pcr = await prisma.evento.findUniqueOrThrow({ where: { codice: 'DEMO-PCR-1' } });
const zdt = await telefono('zdt@demo.torneo');
const arb = await telefono('arbitro2@demo.torneo');
const se = await prisma.squadraEvento.findFirstOrThrow({ where: { eventoId: plr.id, identificativo: 'ZDT' } });

// 1. caso buono
const buona = await op(zdt, plr.id, { testo: 'collaudo: buona' }, { squadra: se.id });
let r = await sync(zdt, plr.id, [buona]);
verifica('operazione valida accettata', r.accettate.includes(buona.id));

// 2. doppio invio: niente doppioni
const prima = await prisma.operazione.count({ where: { eventoId: plr.id } });
r = await sync(zdt, plr.id, [buona, buona]);
verifica('doppio invio confermato senza doppioni', r.accettate.includes(buona.id) && (await prisma.operazione.count({ where: { eventoId: plr.id } })) === prima);

// 3. dati alterati dopo la firma
const alterata = { ...(await op(zdt, plr.id, { testo: 'collaudo: 100 punti' })) };
alterata.dati = { testo: 'collaudo: 900 punti' };
r = await sync(zdt, plr.id, [alterata]);
verifica('dati alterati dopo la firma rifiutati', r.rifiutate.some((x) => x.id === alterata.id && x.motivo === 'firma non valida'), r.rifiutate.find((x) => x.id === alterata.id)?.motivo);

// 4. operazione di un altro evento consegnata qui (P11)
const altro = await op(zdt, pcr.id, { testo: 'collaudo: evento sbagliato' });
r = await sync(zdt, plr.id, [altro]);
verifica('operazione di un altro evento rifiutata', r.rifiutate.some((x) => x.id === altro.id && /altro evento/.test(x.motivo)));

// 5. orologio nel futuro
const futura = await op(zdt, plr.id, { testo: 'collaudo: futuro' }, { oraUfficiale: new Date(Date.now() + 10 * 60_000).toISOString() });
r = await sync(zdt, plr.id, [futura]);
verifica('orario nel futuro rifiutato', r.rifiutate.some((x) => x.id === futura.id && /futuro/.test(x.motivo)));

// 6. fingersi un altro: firmo col mio telefono ma dichiaro come autore l'arbitro (P9)
const finta = await op(zdt, plr.id, { testo: 'collaudo: mi fingo arbitro' }, { autore: arb.u.id });
r = await sync(zdt, plr.id, [finta]);
verifica('autore diverso dal proprietario del telefono rifiutato', r.rifiutate.some((x) => x.id === finta.id && /non appartiene/.test(x.motivo)));

// 7. consegna per conto di altri (QR): l'arbitro consegna un'operazione firmata da ZDT
const perConto = await op(zdt, plr.id, { testo: 'collaudo: consegnata dall’arbitro' }, { squadra: se.id });
r = await sync(arb, plr.id, [perConto]);
const salvata = await prisma.operazione.findUnique({ where: { id: perConto.id } });
verifica('consegna per conto di un altro accettata e tracciata', r.accettate.includes(perConto.id) && salvata?.consegnataDa === arb.u.id);

// 8. visibilità: l'arbitro (obiettivo OBJ1) non riceve le operazioni della squadra ZDT
// (il server consegna solo ciò che è arrivato da almeno 1,5 s: si aspetta un attimo)
await new Promise((ok) => setTimeout(ok, 2000));
r = await sync(arb, plr.id, []);
verifica('l’arbitro non riceve le operazioni riservate alla squadra', !r.nuove.some((x) => x.id === buona.id) && r.nuove.some((x) => x.id === perConto.id) === false);
r = await sync(zdt, plr.id, []);
verifica('la squadra riceve le proprie operazioni', r.nuove.some((x) => x.id === buona.id));

// 9. le operazioni rimandate dal server hanno la stessa firma valida
const dalServer = r.nuove.find((x) => x.id === buona.id);
const { seq: _s, ricevutaIl: _r, firma, ...resto } = dalServer;
const jwk = JSON.parse((await prisma.dispositivo.findUniqueOrThrow({ where: { id: zdt.id } })).chiavePubblica);
const chiave = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
verifica('firma ancora valida sull’operazione rimandata dal server', await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chiave, Buffer.from(firma, 'base64url'), new TextEncoder().encode(canonico(resto))));

// pulizia: tolgo le operazioni e i telefoni di collaudo
await prisma.operazione.deleteMany({ where: { dispositivoId: { in: [zdt.id, arb.id] } } });
await prisma.dispositivo.deleteMany({ where: { id: { in: [zdt.id, arb.id] } } });
await prisma.$disconnect();
console.log(`\n${ok} riusciti, ${ko} falliti`);
process.exit(ko ? 1 : 0);
