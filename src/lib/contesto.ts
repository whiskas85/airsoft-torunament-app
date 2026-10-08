import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from './db';
import { richiediUtente } from './auth';
import { mieiEventi, type RuoloInEvento } from './ruoli';
import { puoGestire, STATI_MODIFICABILI } from './permessi';

/**
 * Tutto ciò che una pagina dell'evento deve sapere sull'utente: i suoi ruoli, se gestisce l'evento,
 * se la configurazione è ancora modificabile e quali sue squadre possono iscriversi.
 * `cache` evita di ricaricarlo due volte tra layout e pagina nella stessa richiesta.
 */
export const contestoEvento = cache(async (codice: string) => {
  const u = await richiediUtente();
  const ev = await prisma.evento.findUnique({
    where: { codice },
    include: { versioneTipologia: { include: { tipologia: true } }, coordinamenti: true, ente: true },
  });
  if (!ev) notFound();

  const mio = (await mieiEventi(u)).find((e) => e.id === ev.id);
  const ruoli: RuoloInEvento[] = mio?.ruoli ?? [];
  const gestore = await puoGestire(u, ev);

  // squadre dell'utente che potrebbero iscriversi (evento pubblicato e aperto al loro coordinamento)
  const mieSquadre = await prisma.squadra.findMany({ where: { membri: { some: { personaId: u.personaId, al: null } }, enteId: ev.enteId } });
  const coord = new Set(ev.coordinamenti.map((c) => c.coordinamentoId));
  const squadreIscrivibili = ev.stato === 'PUBBLICATO'
    ? mieSquadre.filter((s) => coord.size === 0 || (s.coordinamentoId && coord.has(s.coordinamentoId)))
    : [];

  if (!gestore && ruoli.length === 0 && squadreIscrivibili.length === 0) notFound();

  return {
    u, ev, ruoli, gestore,
    modificabile: STATI_MODIFICABILI.includes(ev.stato),
    mieSquadre, squadreIscrivibili,
    parametri: ev.versioneTipologia.parametri as {
      operatori: { min: number; max: number; minimoInGara: number };
      finestra: { minMin: number; maxMin: number; modalita: 'PRENOTATA' | 'CODA_INGRESSO' };
      obiettiviInSequenza: boolean;
      esfiltrazione: { orarioMassimo: boolean };
    },
  };
});

export type ContestoEvento = Awaited<ReturnType<typeof contestoEvento>>;

/** Per gli <input type="datetime-local">: data e ora locali senza fuso. */
export function perInputData(d: Date | string | null | undefined) {
  if (!d) return '';
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}
