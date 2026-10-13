import 'server-only';
import { prisma } from './db';

/**
 * Identificativo proposto per la prossima pattuglia (C1-30): con la sigla dell'evento «PREBE» → «PREBE 3»,
 * cioè il primo numero dopo il più alto già usato. Senza sigla: null (si usa la sigla della squadra).
 */
export async function prossimoIdentificativo(eventoId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId }, select: { prefissoSquadre: true } });
  if (!ev?.prefissoSquadre) return null;
  const p = ev.prefissoSquadre;
  const usati = await prisma.squadraEvento.findMany({ where: { eventoId, identificativo: { startsWith: p } }, select: { identificativo: true } });
  const numeri = usati.map((s) => Number(s.identificativo.slice(p.length).trim())).filter((n) => Number.isInteger(n));
  return `${p} ${Math.max(0, ...numeri) + 1}`;
}
