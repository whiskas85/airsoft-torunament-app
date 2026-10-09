import 'server-only';
import { notFound } from 'next/navigation';
import { prisma } from './db';
import { richiediUtente, type UtenteCorrente } from './auth';
import type { StatoEvento } from '@prisma/client';

/** Stati in cui la configurazione dell'evento si può ancora modificare (§6bis: all'avvio si congela tutto). */
export const STATI_MODIFICABILI: StatoEvento[] = ['BOZZA', 'PUBBLICATO'];

export class ErroreRegola extends Error {}

/**
 * Chi configura un evento (obiettivi, squadre, staff, documenti): l'amministratore dell'ente,
 * il responsabile di uno dei coordinamenti dell'evento, oppure chi ne fa parte della direzione
 * o dell'organizzazione.
 */
export async function puoGestire(u: UtenteCorrente, evento: { id: string; enteId: string }) {
  if (u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE' && r.enteId === evento.enteId)) return true;
  const miei = u.ruoli.filter((r) => r.ruolo === 'RESPONSABILE' && r.enteId === evento.enteId && r.coordinamentoId).map((r) => r.coordinamentoId!);
  if (miei.length && (await prisma.eventoCoordinamento.findFirst({ where: { eventoId: evento.id, coordinamentoId: { in: miei } } }))) return true;
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

/**
 * Per le pagine dell'amministrazione: l'utente collegato e il suo ente, oppure 404.
 * Un'installazione serve un solo ente (D1), quindi l'ente è quello del ruolo.
 */
export async function richiediAmministratore() {
  const u = await richiediUtente();
  const ruolo = u.ruoli.find((r) => r.ruolo === 'AMMINISTRATORE');
  if (!ruolo) notFound();
  return { u, enteId: ruolo.enteId };
}

/**
 * Chi organizza: l'amministratore (tutti i coordinamenti) o un responsabile (i suoi).
 * `coordinamenti` è null per l'amministratore, cioè «tutti».
 */
export function organizzatore(u: UtenteCorrente) {
  const admin = u.ruoli.find((r) => r.ruolo === 'AMMINISTRATORE');
  if (admin) return { enteId: admin.enteId, admin: true, coordinamenti: null as string[] | null };
  const resp = u.ruoli.filter((r) => r.ruolo === 'RESPONSABILE' && r.coordinamentoId);
  if (resp.length) return { enteId: resp[0].enteId, admin: false, coordinamenti: resp.map((r) => r.coordinamentoId!) };
  return null;
}

/** Per le pagine di chi organizza (eventi, campionati): oppure 404. */
export async function richiediOrganizzatore() {
  const u = await richiediUtente();
  const o = organizzatore(u);
  if (!o) notFound();
  return { u, ...o };
}

/** Un responsabile tocca solo ciò che riguarda i suoi coordinamenti. */
export function controllaCoordinamenti(o: { coordinamenti: string[] | null }, scelti: string[]) {
  if (o.coordinamenti === null) return;
  if (scelti.length === 0) throw new ErroreRegola('Scegli almeno uno dei tuoi coordinamenti.');
  const fuori = scelti.filter((c) => !o.coordinamenti!.includes(c));
  if (fuori.length) throw new ErroreRegola('Puoi scegliere solo i coordinamenti di cui sei responsabile.');
}
