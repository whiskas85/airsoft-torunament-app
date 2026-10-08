'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Operazione } from '@/lib/campo/operazione';
import { leggiMeta, scriviMeta, type Pacchetto, type VoceRegistro } from '../db';
import { dispositivo, registraDispositivo, type Dispositivo } from '../dispositivo';
import { misuraScarto, scartoNoto, type Scarto } from '../orologio';
import { apriDocumento, documentiPresenti, pacchettiScaricati, scaricaPacchetto } from '../pacchetto';
import { nuovaOperazione, registroEvento, riceviOperazioni } from '../registro';
import { sincronizza, type EsitoSync } from '../sync';
import { codifica, decodifica, testoDaPagine } from '../qr';
import { MostraQr } from './MostraQr';
import { LettoreQr } from './LettoreQr';

type Io = { utenteId: string; nome: string; email: string };
type EventoServer = { id: string; codice: string; nome: string; stato: string; tipologia: string; ruoli: string[]; scaricabile: boolean; hash: string | null };
type MessaggioQr = { k: 'ops'; e: string; ops: Operazione[] };

const ora = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function AppCampo() {
  const [online, setOnline] = useState(true);
  /** la rete del telefono può esserci anche quando il server non risponde: sono due cose diverse */
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [io, setIo] = useState<Io | null>(null);
  const [nonCollegato, setNonCollegato] = useState(false);
  const [disp, setDisp] = useState<Dispositivo | null>(null);
  const [scarto, setScarto] = useState<Scarto | null>(null);
  const [eventiServer, setEventiServer] = useState<EventoServer[]>([]);
  const [pacchetti, setPacchetti] = useState<Pacchetto[]>([]);
  const [scelto, setScelto] = useState<string | null>(null);
  const [registro, setRegistro] = useState<VoceRegistro[]>([]);
  const [docPresenti, setDocPresenti] = useState<Record<string, boolean>>({});
  const [messaggio, setMessaggio] = useState<string>('');
  const [ultimoSync, setUltimoSync] = useState<EsitoSync | null>(null);
  const [qr, setQr] = useState<{ titolo: string; pagine: string[]; nota: string } | null>(null);
  const [lettore, setLettore] = useState(false);
  const [adesso, setAdesso] = useState(Date.now());

  const pacchetto = pacchetti.find((p) => p.evento.id === scelto) ?? null;
  const nomeAutore = (utenteId: string) =>
    utenteId === pacchetto?.io.utenteId ? 'io' : pacchetto?.chiavi.find((k) => k.utente === utenteId)?.nome ?? 'sconosciuto';

  const ricaricaLocale = useCallback(async () => {
    setDisp(await dispositivo());
    setScarto(await scartoNoto());
    setIo((await leggiMeta<Io>('io')) ?? null);
    const ps = await pacchettiScaricati();
    setPacchetti(ps);
    const s = scelto ?? (await leggiMeta<string>('eventoScelto')) ?? ps[0]?.evento.id ?? null;
    setScelto(s);
    const p = ps.find((x) => x.evento.id === s);
    if (p) {
      setRegistro(await registroEvento(p.evento.id));
      setDocPresenti(await documentiPresenti(p));
      setUltimoSync((await leggiMeta<EsitoSync>(`ultimoSync:${p.evento.id}`)) ?? null);
    }
  }, [scelto]);

  /** Con la rete: chi sono, registrazione del telefono, orologio, elenco eventi. */
  const collegati = useCallback(async () => {
    try {
      const r = await fetch('/api/campo/io', { cache: 'no-store' });
      setServerOk(true);
      if (r.status === 401) { setNonCollegato(true); return; }
      const j = (await r.json()) as Io;
      setNonCollegato(false);
      await scriviMeta('io', j);
      setIo(j);
      setDisp(await registraDispositivo(j.utenteId));
      setScarto(await misuraScarto());
      const e = await fetch('/api/campo/eventi', { cache: 'no-store' });
      if (e.ok) setEventiServer(await e.json());
    } catch {
      // offline o server irraggiungibile: si lavora con ciò che c'è sul telefono
      setServerOk(false);
    }
  }, []);

  const sincronizzaOra = useCallback(async (manuale = false) => {
    if (!pacchetto) return;
    if (!navigator.onLine) { if (manuale) setMessaggio('Senza rete: le operazioni restano in coda e partono appena torna.'); return; }
    try {
      const e = await sincronizza(pacchetto);
      setServerOk(true);
      setUltimoSync(e);
      if (manuale || e.inviate || e.ricevute || e.rifiutate) setMessaggio(`Sincronizzato: inviate ${e.inviate}, ricevute ${e.ricevute}${e.rifiutate ? `, rifiutate ${e.rifiutate}` : ''}.`);
      setRegistro(await registroEvento(pacchetto.evento.id));
    } catch (err) {
      const irraggiungibile = err instanceof TypeError;
      if (irraggiungibile) setServerOk(false);
      if (manuale) {
        setMessaggio(irraggiungibile
          ? 'Server non raggiungibile: le operazioni restano in coda sul telefono e partono da sole appena risponde.'
          : `Sincronizzazione non riuscita (i dati restano al sicuro): ${(err as Error).message}`);
      }
    }
  }, [pacchetto]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const su = () => { setOnline(true); collegati(); };
    const giu = () => setOnline(false);
    window.addEventListener('online', su);
    window.addEventListener('offline', giu);
    ricaricaLocale();
    if (navigator.onLine) collegati();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => null);
    const t = setInterval(() => setAdesso(Date.now()), 1000);
    return () => { window.removeEventListener('online', su); window.removeEventListener('offline', giu); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sincronizzazione automatica: al ritorno della rete, quando l'app torna in primo piano, e ogni 30 s
  useEffect(() => {
    if (!pacchetto) return;
    sincronizzaOra();
    const t = setInterval(() => { if (!document.hidden) sincronizzaOra(); }, 30_000);
    const vis = () => { if (!document.hidden) sincronizzaOra(); };
    window.addEventListener('online', vis);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); window.removeEventListener('online', vis); document.removeEventListener('visibilitychange', vis); };
  }, [pacchetto, sincronizzaOra]);

  const scegli = async (id: string) => {
    setScelto(id);
    await scriviMeta('eventoScelto', id);
    const p = pacchetti.find((x) => x.evento.id === id);
    if (p) { setRegistro(await registroEvento(id)); setDocPresenti(await documentiPresenti(p)); }
  };

  const scarica = async (id: string) => {
    try {
      const p = await scaricaPacchetto(id, setMessaggio);
      const ps = await pacchettiScaricati();
      setPacchetti(ps);
      setScelto(p.evento.id);
      await scriviMeta('eventoScelto', p.evento.id);
      setRegistro(await registroEvento(p.evento.id));
      setDocPresenti(await documentiPresenti(p));
    } catch (e) { setMessaggio(`Download non riuscito: ${(e as Error).message}`); }
  };

  const nota = async (fd: FormData) => {
    if (!pacchetto) return;
    const testo = String(fd.get('testo') ?? '').trim();
    if (!testo) return;
    setMessaggio('Firmo l’operazione…');
    try {
      await nuovaOperazione(pacchetto, 'prova.nota', { testo }, { squadra: pacchetto.io.squadre[0] ?? null, obiettivo: pacchetto.io.obiettivi[0] ?? null });
      setRegistro(await registroEvento(pacchetto.evento.id));
      setMessaggio('Operazione firmata e salvata sul telefono.');
      sincronizzaOra();
    } catch (e) { setMessaggio((e as Error).message); }
  };

  const mostraQr = async (soloDaInviare: boolean) => {
    if (!pacchetto) return;
    const ops = registro.filter((v) => (soloDaInviare ? v.stato === 'da_inviare' : v.origine === 'mia')).map((v) => v.op);
    if (!ops.length) { setMessaggio('Nessuna operazione da passare.'); return; }
    const c = await codifica({ k: 'ops', e: pacchetto.evento.id, ops } satisfies MessaggioQr);
    setQr({
      titolo: `${ops.length} operazion${ops.length === 1 ? 'e' : 'i'} firmat${ops.length === 1 ? 'a' : 'e'}`,
      pagine: c.pagine,
      nota: `${(c.byteJson / 1024).toFixed(1)} kB → ${(c.byteCompressi / 1024).toFixed(1)} kB compressi → ${c.pagine.length === 1 ? '1 QR' : `${c.pagine.length} pagine`}`,
    });
  };

  const accogliTesto = useCallback(async (testo: string) => {
    setLettore(false);
    try {
      const m = (await decodifica(testo)) as MessaggioQr;
      if (m?.k !== 'ops') throw new Error('non è un messaggio di operazioni');
      const p = (await pacchettiScaricati()).find((x) => x.evento.id === m.e);
      if (!p) throw new Error('il QR è di un evento che non è su questo telefono');
      const e = await riceviOperazioni(p, m.ops, 'qr');
      setMessaggio(`Ricevute ${e.nuove} nuove, ${e.gia} già presenti${e.rifiutate.length ? `, rifiutate ${e.rifiutate.length} (${e.rifiutate[0].motivo})` : ''}.`);
      if (p.evento.id === scelto) setRegistro(await registroEvento(p.evento.id));
    } catch (e) { setMessaggio(`QR non valido: ${(e as Error).message}`); }
  }, [scelto]);

  const incolla = async () => {
    const t = prompt('Incolla il codice ricevuto (una pagina per riga):');
    if (t) { try { await accogliTesto(testoDaPagine(t)); } catch (e) { setMessaggio((e as Error).message); } }
  };

  const daInviare = registro.filter((v) => v.stato === 'da_inviare').length;
  const oraUfficiale = new Date(adesso + (scarto?.ms ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <header className="flex flex-wrap items-center gap-2">
        <div className="font-bold">TOURNAMENT<span className="text-accento">APP</span> · campo</div>
        <span className={`pill ${!online ? 'bg-errore' : serverOk === false ? 'bg-avviso text-black' : 'bg-ok text-black'}`}>
          {!online ? 'offline' : serverOk === false ? 'server non raggiungibile' : 'online'}
        </span>
        <span className="pill bg-bordo">{daInviare} in coda</span>
        <span className="ml-auto font-mono text-sm" title="Ora ufficiale (server)">{oraUfficiale.toLocaleTimeString('it-IT')}</span>
      </header>

      {messaggio && <div className="carta border border-avviso text-sm">{messaggio}</div>}

      <section className="carta space-y-1 text-sm">
        <h2 className="mb-1 font-semibold">Questo telefono</h2>
        <div>Utente: {io ? <b>{io.nome}</b> : <span className="text-tenue">sconosciuto</span>}{nonCollegato && online && <> — <a className="link" href="/accedi">accedi</a> e torna qui</>}</div>
        <div>Dispositivo: <span className="font-mono">{disp?.id.slice(0, 8) ?? '…'}</span> · {disp?.registratoIl ? <span className="text-ok">registrato</span> : <span className="text-avviso">non registrato (serve la rete una volta)</span>}</div>
        <div>Orologio: {scarto ? `${scarto.ms >= 0 ? '+' : ''}${scarto.ms} ms rispetto al server (misurato alle ${ora(scarto.misuratoIl)})` : <span className="text-avviso">mai misurato</span>}</div>
        <div className="text-xs text-tenue">La chiave di firma è nel telefono e non è leggibile da nessuno, nemmeno dall’app.</div>
      </section>

      <section className="carta space-y-2">
        <h2 className="font-semibold">Eventi</h2>
        {eventiServer.length === 0 && pacchetti.length === 0 && <p className="text-sm text-tenue">{online ? 'Nessun evento per te.' : 'Offline: nessun evento scaricato su questo telefono.'}</p>}
        {[...new Map([...eventiServer.map((e) => [e.id, e] as const)]).values()].map((e) => {
          const p = pacchetti.find((x) => x.evento.id === e.id);
          const vecchio = p && e.hash && p.hash !== e.hash;
          return (
            <div key={e.id} className="flex flex-wrap items-center gap-2 border-t border-bordo pt-2 text-sm first:border-0 first:pt-0">
              <span className="pill bg-accento text-black">{e.tipologia}</span>
              <span className={e.id === scelto ? 'font-semibold' : ''}>{e.nome}</span>
              <span className="text-xs text-tenue">{e.ruoli.join(', ').toLowerCase()}</span>
              <span className="ml-auto flex gap-2">
                {p && <button className="bottone-sec px-3 py-1.5 text-sm" onClick={() => scegli(e.id)}>Apri</button>}
                {e.scaricabile
                  ? <button className="bottone px-3 py-1.5 text-sm" onClick={() => scarica(e.id)}>{p ? (vecchio ? 'Aggiorna' : 'Riscarica') : 'Scarica per il campo'}</button>
                  : <span className="text-xs text-tenue">non ancora avviato</span>}
              </span>
            </div>
          );
        })}
        {pacchetti.filter((p) => !eventiServer.some((e) => e.id === p.evento.id)).map((p) => (
          <div key={p.evento.id} className="flex items-center gap-2 border-t border-bordo pt-2 text-sm">
            <span>{p.evento.nome}</span><span className="text-xs text-tenue">sul telefono</span>
            <button className="bottone-sec ml-auto px-3 py-1.5 text-sm" onClick={() => scegli(p.evento.id)}>Apri</button>
          </div>
        ))}
      </section>

      {pacchetto && (
        <>
          <section className="carta space-y-2 text-sm">
            <h2 className="font-semibold">{pacchetto.evento.nome}</h2>
            <div className="text-tenue">
              Configurazione <span className="font-mono">{pacchetto.hash.slice(0, 12)}…</span> · {pacchetto.configurazione.obiettivi.length} obiettivi ·{' '}
              {pacchetto.configurazione.squadre.length} squadre · {pacchetto.chiavi.length} telefoni noti · scaricato alle {ora(pacchetto.scaricatoIl)}
            </div>
            <div>
              Sei: {[pacchetto.io.direzione && 'direzione', pacchetto.io.arbitroEventoId && `arbitro (${pacchetto.io.obiettivi.length} obiettivi)`, pacchetto.io.squadre.length && 'squadra'].filter(Boolean).join(', ')}
            </div>
            {pacchetto.configurazione.documenti.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className={docPresenti[d.id] ? 'text-ok' : 'text-errore'}>{docPresenti[d.id] ? '✔' : '✖'}</span>
                <button className="link text-left" onClick={async () => { const u = await apriDocumento(d.id); if (u) window.open(u, '_blank'); else setMessaggio('Documento non presente sul telefono.'); }}>{d.titolo}</button>
                <span className="text-xs text-tenue">{(d.byte / 1024 / 1024).toFixed(1)} MB · leggibile offline</span>
              </div>
            ))}
            {ultimoSync && <div className="text-xs text-tenue">Ultima sincronizzazione: {ora(ultimoSync.ora)}</div>}
          </section>

          <section className="carta space-y-3">
            <h2 className="font-semibold">Prova del motore</h2>
            <form action={nota} className="flex gap-2">
              <input name="testo" className="campo" placeholder="Nota di prova (diventa un’operazione firmata)" />
              <button className="bottone">Firma</button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <button className="bottone-sec" onClick={() => sincronizzaOra(true)}>☁️ Sincronizza ora</button>
              <button className="bottone-sec" onClick={() => setLettore(true)}>📷 Scansiona QR</button>
              <button className="bottone-sec" onClick={() => mostraQr(true)}>📤 QR delle operazioni in coda</button>
              <button className="bottone-sec" onClick={incolla}>⌨️ Incolla codice</button>
            </div>
          </section>

          <section className="carta space-y-2">
            <h2 className="font-semibold">Registro ({registro.length})</h2>
            {registro.length === 0 && <p className="text-sm text-tenue">Nessuna operazione.</p>}
            {registro.map((v) => (
              <div key={v.op.id} className={`rounded-lg border-l-4 bg-fondo p-2 text-sm ${v.stato === 'sul_server' ? 'border-ok' : v.stato === 'rifiutata' ? 'border-errore' : 'border-avviso'}`}>
                <div className="flex flex-wrap gap-2">
                  <b>{v.op.tipo}</b>
                  <span>{String((v.op.dati as { testo?: string }).testo ?? '')}</span>
                  <span className="ml-auto font-mono text-xs">{ora(v.op.oraUfficiale)}</span>
                </div>
                <div className="text-xs text-tenue">
                  di {nomeAutore(v.op.autore)} · {v.op.gps ? `GPS ±${v.op.gps.precisioneM} m` : 'GPS non disponibile'} ·{' '}
                  {v.stato === 'sul_server' ? '☁️ sul server' : v.stato === 'rifiutata' ? `❌ rifiutata: ${v.motivo}` : '📤 in coda'} ·{' '}
                  {v.origine === 'mia' ? 'creata qui' : v.origine === 'qr' ? 'ricevuta via QR' : 'dal server'} ·{' '}
                  {v.verifica === 'valida' ? <span className="text-ok">firma valida</span> : v.verifica === 'chiave_sconosciuta' ? <span className="text-avviso">telefono non ancora noto</span> : <span className="text-errore">firma non valida</span>}
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {qr && <MostraQr titolo={qr.titolo} pagine={qr.pagine} nota={qr.nota} chiudi={() => setQr(null)} />}
      {lettore && <LettoreQr letto={accogliTesto} chiudi={() => setLettore(false)} />}
    </div>
  );
}
