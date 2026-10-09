'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola, puoGestire } from '@/lib/permessi';
import { esegui, testo, type StatoForm } from '@/lib/form';

/** Ruoli di chi gestisce l'evento senza arbitrare (C1-15). */
export type RuoloStaff = 'ORGANIZZAZIONE' | 'DIREZIONE';
const RUOLI: RuoloStaff[] = ['ORGANIZZAZIONE', 'DIREZIONE'];

export async function aggiungiStaff(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await prisma.evento.findUnique({ where: { id: testo(fd, 'eventoId') } });
    if (!ev || !(await puoGestire(u, ev))) throw new ErroreRegola('Non hai i permessi per questo evento.');
    const ruolo = testo(fd, 'ruolo') as RuoloStaff;
    if (!RUOLI.includes(ruolo)) throw new ErroreRegola('Ruolo non valido.');
    const utente = await prisma.utente.findUnique({ where: { id: testo(fd, 'utenteId') }, include: { persona: true } });
    if (!utente) throw new ErroreRegola('Scegli la persona.');
    const gia = await prisma.membroDirezione.findFirst({ where: { eventoId: ev.id, utenteId: utente.id, ruolo } });
    if (gia) throw new ErroreRegola(`${utente.persona.nome} ${utente.persona.cognome} c’è già.`);
    await prisma.membroDirezione.create({ data: { eventoId: ev.id, utenteId: utente.id, ruolo } });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: `${utente.persona.nome} ${utente.persona.cognome} aggiunto.` };
  });
}

export async function togliStaff(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const m = await prisma.membroDirezione.findUnique({ where: { id: testo(fd, 'membroId') }, include: { evento: true } });
    if (!m || !(await puoGestire(u, m.evento))) throw new ErroreRegola('Non hai i permessi per questo evento.');
    await prisma.membroDirezione.delete({ where: { id: m.id } });
    revalidatePath(`/eventi/${m.evento.codice}`, 'layout');
    return { ok: 'Tolto.' };
  });
}
