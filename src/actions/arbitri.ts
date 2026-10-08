'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente, type UtenteCorrente } from '@/lib/auth';
import { ErroreRegola, STATI_MODIFICABILI, puoGestire } from '@/lib/permessi';
import { esegui, testo, tutti, type StatoForm } from '@/lib/form';
import { RUOLI_ARBITRO } from '@/lib/arbitri';

/** Ente, direzione o responsabile arbitri dell'ente. */
async function gestoreArbitri(u: UtenteCorrente, eventoId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!ev) throw new ErroreRegola('Evento non trovato.');
  const resp = u.ruoli.some((r) => r.ruolo === 'RESP_ARBITRI' && r.enteId === ev.enteId);
  if (!resp && !(await puoGestire(u, ev))) throw new ErroreRegola('Non puoi designare arbitri per questo evento.');
  if (!STATI_MODIFICABILI.includes(ev.stato)) throw new ErroreRegola('L’evento è avviato: lo staff arbitrale è congelato.');
  return ev;
}

/** Un arbitro che ha accettato un evento sparisce dagli altri eventi che si sovrappongono (§9). */
async function impegnoSovrapposto(personaId: string, ev: { id: string; inizio: Date; fine: Date }) {
  return prisma.arbitroEvento.findFirst({
    where: { personaId, stato: 'ACCETTATA', eventoId: { not: ev.id }, evento: { inizio: { lt: ev.fine }, fine: { gt: ev.inizio }, stato: { not: 'ANNULLATO' } } },
    include: { evento: true },
  });
}

const ruoliDaForm = (fd: FormData) => tutti(fd, 'ruoli').filter((r) => (RUOLI_ARBITRO as readonly string[]).includes(r));

export async function proponiArbitro(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await gestoreArbitri(u, testo(fd, 'eventoId'));
    const personaId = testo(fd, 'personaId');
    const qualifica = await prisma.qualificaArbitro.findFirst({ where: { personaId, enteId: ev.enteId, al: null }, include: { persona: true } });
    if (!qualifica) throw new ErroreRegola('La persona scelta non ha una qualifica di arbitro valida per questo ente.');
    if (await prisma.arbitroEvento.findUnique({ where: { eventoId_personaId: { eventoId: ev.id, personaId } } })) {
      throw new ErroreRegola('Arbitro già designato per questo evento.');
    }
    const altro = await impegnoSovrapposto(personaId, ev);
    if (altro) throw new ErroreRegola(`Già impegnato in «${altro.evento.nome}» negli stessi orari.`);
    const ruoli = ruoliDaForm(fd);
    await prisma.arbitroEvento.create({ data: { eventoId: ev.id, personaId, ruoli: ruoli.length ? ruoli : ['OBIETTIVO'] } });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    revalidatePath('/');
    return { ok: `Proposta inviata a ${qualifica.persona.nome} ${qualifica.persona.cognome}: deve accettare o rifiutare.` };
  });
}

/** L'arbitro risponde alla designazione: accetta, oppure rifiuta con un motivo. */
export async function rispondiDesignazione(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ae = await prisma.arbitroEvento.findUnique({ where: { id: testo(fd, 'arbitroEventoId') }, include: { evento: true } });
    if (!ae || ae.personaId !== u.personaId) throw new ErroreRegola('Designazione non trovata.');
    if (!STATI_MODIFICABILI.includes(ae.evento.stato)) throw new ErroreRegola('L’evento è già avviato.');
    const accetta = testo(fd, 'risposta') === 'ACCETTA';
    const motivo = testo(fd, 'motivo');
    if (!accetta && !motivo) throw new ErroreRegola('Per rifiutare serve un motivo.');
    if (accetta) {
      const altro = await impegnoSovrapposto(u.personaId, ae.evento);
      if (altro) throw new ErroreRegola(`Hai già accettato «${altro.evento.nome}» negli stessi orari.`);
    }
    await prisma.arbitroEvento.update({
      where: { id: ae.id },
      data: { stato: accetta ? 'ACCETTATA' : 'RIFIUTATA', motivoRifiuto: accetta ? null : motivo, rispostaIl: new Date() },
    });
    revalidatePath('/');
    revalidatePath(`/eventi/${ae.evento.codice}`, 'layout');
    return { ok: accetta ? 'Designazione accettata.' : 'Designazione rifiutata.' };
  });
}

/** Ruoli nello staff e obiettivi assegnati a un arbitro. */
export async function impostaArbitro(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ae = await prisma.arbitroEvento.findUnique({ where: { id: testo(fd, 'arbitroEventoId') } });
    if (!ae) throw new ErroreRegola('Arbitro non trovato.');
    const ev = await gestoreArbitri(u, ae.eventoId);
    const ruoli = ruoliDaForm(fd);
    const obiettivi = tutti(fd, 'obiettivi');
    const validi = await prisma.obiettivo.findMany({ where: { eventoId: ev.id, id: { in: obiettivi } }, select: { id: true } });
    await prisma.$transaction([
      prisma.arbitroEvento.update({ where: { id: ae.id }, data: { ruoli: ruoli.length ? ruoli : ['OBIETTIVO'] } }),
      prisma.arbitroObiettivo.deleteMany({ where: { arbitroEventoId: ae.id } }),
      ...validi.map((o) => prisma.arbitroObiettivo.create({ data: { arbitroEventoId: ae.id, obiettivoId: o.id } })),
    ]);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: 'Salvato.' };
  });
}

export async function rimuoviArbitro(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ae = await prisma.arbitroEvento.findUnique({ where: { id: testo(fd, 'arbitroEventoId') } });
    if (!ae) throw new ErroreRegola('Arbitro non trovato.');
    const ev = await gestoreArbitri(u, ae.eventoId);
    await prisma.$transaction([
      prisma.arbitroObiettivo.deleteMany({ where: { arbitroEventoId: ae.id } }),
      prisma.arbitroEvento.delete({ where: { id: ae.id } }),
    ]);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    revalidatePath('/');
    return { ok: 'Arbitro rimosso dallo staff.' };
  });
}
