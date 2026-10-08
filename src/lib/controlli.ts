import 'server-only';
import { prisma } from './db';
import type { Fase } from './template';

export type Controllo = { messaggio: string; ok: boolean; bloccante: boolean; dove?: string };
type Parametri = { operatori: { min: number; max: number } };
type PuntiObiettivo = { valorePositivo?: number; fasi?: Record<string, number> };

/**
 * Cosa manca per pubblicare o avviare un evento. I controlli bloccanti impediscono il passaggio;
 * gli altri sono avvisi che la direzione vede ma può ignorare.
 */
export async function controlliEvento(eventoId: string) {
  const ev = await prisma.evento.findUniqueOrThrow({
    where: { id: eventoId },
    include: {
      versioneTipologia: { include: { tipiObiettivo: true } },
      obiettivi: { include: { arbitri: { include: { arbitroEvento: true } } } },
      squadre: { include: { squadra: true, _count: { select: { partecipanti: true } } } },
      arbitri: true,
      documenti: true,
      tabella: true,
    },
  });
  const tipi = Object.fromEntries(ev.versioneTipologia.tipiObiettivo.map((t) => [t.codice, t]));
  const par = ev.versioneTipologia.parametri as Parametri;
  const puntiObj = ((ev.tabella?.regole as { obiettivi?: Record<string, PuntiObiettivo> }) ?? {}).obiettivi ?? {};

  const pubblicazione: Controllo[] = [
    { messaggio: 'Data di fine successiva all’inizio', ok: ev.fine > ev.inizio, bloccante: true },
    { messaggio: 'Almeno un obiettivo', ok: ev.obiettivi.length > 0, bloccante: true, dove: 'obiettivi' },
    { messaggio: 'Regolamento caricato', ok: ev.documenti.some((d) => d.ruolo === 'REGOLAMENTO'), bloccante: false, dove: 'documenti' },
    { messaggio: 'Locandina', ok: !!ev.locandinaUrl, bloccante: false },
  ];

  const gareggianti = ev.squadre.filter((s) => s.ruolo === 'GAREGGIA');
  const conArbitro = ev.obiettivi.filter((o) => o.tipi.some((t) => tipi[t]?.richiedeArbitro !== false));
  const accettati = new Set(ev.arbitri.filter((a) => a.stato === 'ACCETTATA').map((a) => a.id));
  const senzaArbitro = conArbitro.filter((o) => !o.arbitri.some((a) => accettati.has(a.arbitroEventoId)));
  const fuoriNumero = gareggianti.filter((s) => s._count.partecipanti < par.operatori.min || s._count.partecipanti > par.operatori.max);
  const senzaPunti = ev.obiettivi.filter((o) => {
    const p = puntiObj[o.codice];
    if (p?.valorePositivo == null) return true;
    return (o.fasi as Fase[]).some((f) => p.fasi?.[f.codice] == null);
  });

  const avvio: Controllo[] = [
    { messaggio: 'Evento pubblicato', ok: ev.stato === 'PUBBLICATO', bloccante: true },
    { messaggio: 'Regolamento caricato (va scaricato su tutti i telefoni)', ok: ev.documenti.some((d) => d.ruolo === 'REGOLAMENTO'), bloccante: true, dove: 'documenti' },
    { messaggio: 'Almeno due squadre in gara', ok: gareggianti.length >= 2, bloccante: true, dove: 'squadre' },
    {
      messaggio: fuoriNumero.length
        ? `Operatori fuori dai limiti (${par.operatori.min}–${par.operatori.max}): ${fuoriNumero.map((s) => s.identificativo).join(', ')}`
        : `Ogni squadra ha da ${par.operatori.min} a ${par.operatori.max} operatori`,
      ok: fuoriNumero.length === 0, bloccante: true, dove: 'squadre',
    },
    {
      messaggio: senzaArbitro.length
        ? `Obiettivi senza arbitro che ha accettato: ${senzaArbitro.map((o) => o.codice).join(', ')}`
        : 'Ogni obiettivo con arbitro ha un arbitro che ha accettato',
      ok: senzaArbitro.length === 0, bloccante: true, dove: 'arbitri',
    },
    { messaggio: 'Capo arbitro designato e confermato', ok: ev.arbitri.some((a) => a.stato === 'ACCETTATA' && a.ruoli.includes('CAPO_ARBITRO')), bloccante: false, dove: 'arbitri' },
    {
      messaggio: senzaPunti.length
        ? `Tabella punteggi incompleta: ${senzaPunti.map((o) => o.codice).join(', ')}`
        : 'Tabella punteggi completa (valore di ogni obiettivo e di ogni fase)',
      ok: senzaPunti.length === 0, bloccante: true, dove: 'obiettivi',
    },
    { messaggio: 'Iscrizioni pagate', ok: gareggianti.every((s) => s.pagato), bloccante: false, dove: 'squadre' },
    { messaggio: 'Test ASG di tutte le squadre (arriva con M4)', ok: true, bloccante: false },
  ];

  return { pubblicazione, avvio };
}

export const puoPassare = (c: Controllo[]) => c.every((x) => x.ok || !x.bloccante);
