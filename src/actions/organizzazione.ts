'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola } from '@/lib/permessi';
import { esegui, testo, type StatoForm } from '@/lib/form';

/** Coordinamenti e responsabili: solo l'amministratore dell'ente (C1-08, C1-09). */
async function admin() {
  const u = await richiediUtente();
  const r = u.ruoli.find((x) => x.ruolo === 'AMMINISTRATORE');
  if (!r) throw new ErroreRegola('Solo l’amministratore dell’ente gestisce i coordinamenti.');
  return { u, enteId: r.enteId };
}

const aggiorna = () => revalidatePath('/impostazioni/coordinamenti');

export async function creaCoordinamento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const { enteId } = await admin();
    const nome = testo(fd, 'nome');
    if (!nome) throw new ErroreRegola('Serve il nome del coordinamento.');
    if (await prisma.coordinamento.findFirst({ where: { enteId, nome: { equals: nome, mode: 'insensitive' } } })) {
      throw new ErroreRegola(`Il coordinamento «${nome}» c’è già.`);
    }
    await prisma.coordinamento.create({ data: { enteId, nome } });
    aggiorna();
    return { ok: `Coordinamento «${nome}» creato.` };
  });
}

export async function rinominaCoordinamento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const { enteId } = await admin();
    const nome = testo(fd, 'nome');
    if (!nome) throw new ErroreRegola('Il nome del coordinamento non può essere vuoto.');
    const c = await prisma.coordinamento.findFirst({ where: { id: testo(fd, 'coordinamentoId'), enteId } });
    if (!c) throw new ErroreRegola('Coordinamento non trovato.');
    await prisma.coordinamento.update({ where: { id: c.id }, data: { nome } });
    aggiorna();
  });
}

export async function eliminaCoordinamento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const { enteId } = await admin();
    const c = await prisma.coordinamento.findFirst({
      where: { id: testo(fd, 'coordinamentoId'), enteId },
      include: { _count: { select: { squadre: true, eventi: true, campionati: true } } },
    });
    if (!c) throw new ErroreRegola('Coordinamento non trovato.');
    const { squadre, eventi, campionati } = c._count;
    if (squadre + eventi + campionati > 0) {
      throw new ErroreRegola(`«${c.nome}» è in uso (${squadre} squadre, ${eventi} eventi, ${campionati} campionati): non si può eliminare.`);
    }
    await prisma.$transaction([
      prisma.ruoloEnte.deleteMany({ where: { coordinamentoId: c.id } }),
      prisma.coordinamento.delete({ where: { id: c.id } }),
    ]);
    aggiorna();
    return { ok: `«${c.nome}» eliminato.` };
  });
}

export async function aggiungiResponsabile(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const { enteId } = await admin();
    const c = await prisma.coordinamento.findFirst({ where: { id: testo(fd, 'coordinamentoId'), enteId } });
    const utente = await prisma.utente.findUnique({ where: { id: testo(fd, 'utenteId') }, include: { persona: true } });
    if (!c || !utente) throw new ErroreRegola('Scegli la persona.');
    const gia = await prisma.ruoloEnte.findFirst({ where: { utenteId: utente.id, enteId, ruolo: 'RESPONSABILE', coordinamentoId: c.id } });
    if (gia) throw new ErroreRegola(`${utente.persona.nome} ${utente.persona.cognome} è già responsabile di ${c.nome}.`);
    await prisma.ruoloEnte.create({ data: { utenteId: utente.id, enteId, ruolo: 'RESPONSABILE', coordinamentoId: c.id } });
    aggiorna();
    return { ok: `${utente.persona.nome} ${utente.persona.cognome} è responsabile di ${c.nome}.` };
  });
}

export async function togliResponsabile(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const { enteId } = await admin();
    const r = await prisma.ruoloEnte.findFirst({ where: { id: testo(fd, 'ruoloId'), enteId, ruolo: 'RESPONSABILE' } });
    if (!r) throw new ErroreRegola('Responsabile non trovato.');
    await prisma.ruoloEnte.delete({ where: { id: r.id } });
    aggiorna();
    return { ok: 'Tolto.' };
  });
}
