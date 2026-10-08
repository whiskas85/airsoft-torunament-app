import 'server-only';
import { notFound } from 'next/navigation';
import { prisma } from './db';
import type { UtenteCorrente } from './auth';
import type { StatoEvento } from '@prisma/client';

/** Stati in cui la configurazione dell'evento si può ancora modificare (§6bis: all'avvio si congela tutto). */
export const STATI_MODIFICABILI: StatoEvento[] = ['BOZZA', 'PUBBLICATO'];

export class ErroreRegola extends Error {}

/** Ente o direzione dell'evento: chi configura obiettivi, squadre, arbitri, documenti. */
export async function puoGestire(u: UtenteCorrente, evento: { id: string; enteId: string }) {
  if (u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE' && r.enteId === evento.enteId)) return true;
  const d = await prisma.membroDirezione.findFirst({ where: { eventoId: evento.id, utenteId: u.id } });
  return !!d;
}

/** Carica l'evento per una pagina di gestione, oppure 404. */
export async function eventoDaGestire(u: UtenteCorrente, codice: string) {
  const ev = await prisma.evento.findUnique({ where: { codice }, include: { versioneTipologia: { include: { tipologia: true } } } });
  if (!ev || !(await puoGestire(u, ev))) notFound();
  return ev;
}

/** Per le azioni: l'evento deve esistere, l'utente gestirlo, e la configurazione non essere congelata. */
export async function eventoModificabile(u: UtenteCorrente, eventoId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId }, include: { versioneTipologia: true } });
  if (!ev || !(await puoGestire(u, ev))) throw new ErroreRegola('Non hai i permessi per questo evento.');
  if (!STATI_MODIFICABILI.includes(ev.stato)) {
    throw new ErroreRegola('L’evento è avviato: la configurazione è congelata e non si può più modificare.');
  }
  return ev;
}

/** La squadra (o le squadre) di cui l'utente è membro attivo. */
export async function mieSquadre(u: UtenteCorrente) {
  return prisma.squadra.findMany({ where: { membri: { some: { personaId: u.personaId, al: null } } } });
}
