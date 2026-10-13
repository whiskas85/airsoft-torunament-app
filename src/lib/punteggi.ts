import 'server-only';
import { prisma } from './db';

export type RegolaPunti = { campo: string; tipo: string; punti: number; nota?: string };
export const CAMPO_RITARDO = 'esfiltrazione.ritardo_minuti';

/** Malus per minuto di ritardo all'esfiltrazione (C1-18), positivo: è una regola della tabella punteggi dell'evento. */
export async function penalitaRitardo(eventoId: string) {
  const t = await prisma.tabellaPunteggi.findUnique({ where: { eventoId } });
  const r = ((t?.regole as { regole?: RegolaPunti[] })?.regole ?? []).find((x) => x.campo === CAMPO_RITARDO);
  return r ? Math.abs(r.punti) : null;
}
