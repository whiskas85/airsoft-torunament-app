'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { controllaCoordinamenti, ErroreRegola, organizzatore } from '@/lib/permessi';
import { esegui, intero, testo, tutti, type StatoForm } from '@/lib/form';

/** Regole di partenza di un campionato nuovo, quando la tipologia non ne ha già uno da copiare. */
const REGOLE_BASE = {
  puntiPerPosizione: [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4],
  puntiDallaPosizioneSuccessiva: 3,
  pariMerito: 'MEDIA_POSIZIONI',
  miglioriRisultati: 3,
  tappeMinime: { giocate: 3, organizzateOAiuto: 1 },
  organizzatrici: { regola: 'MEDIA', anche: ['AIUTO'], penalitaAiutoAssente: -5 },
  squalifica: { contaInMediaCome: 0 },
  spareggi: ['NUMERO_PRIMI_POSTI', 'NUMERO_SECONDI_POSTI', 'NUMERO_TERZI_POSTI', 'MINUTI_ESFILTRAZIONE_RISPARMIATI'],
};

async function chi() {
  const u = await richiediUtente();
  const o = organizzatore(u);
  if (!o) throw new ErroreRegola('Solo chi organizza gestisce i campionati.');
  return o;
}

/** Il campionato, se l'utente lo può gestire: l'amministratore sempre, il responsabile se tocca un suo coordinamento. */
async function campionatoGestibile(o: NonNullable<ReturnType<typeof organizzatore>>, id: string) {
  const c = await prisma.campionato.findFirst({ where: { id, enteId: o.enteId }, include: { coordinamenti: true, _count: { select: { eventi: true } } } });
  if (!c) throw new ErroreRegola('Campionato non trovato.');
  if (o.coordinamenti && !c.coordinamenti.some((x) => o.coordinamenti!.includes(x.coordinamentoId))) {
    throw new ErroreRegola('Questo campionato non è di un tuo coordinamento.');
  }
  return c;
}

function datiBase(fd: FormData) {
  const nome = testo(fd, 'nome');
  const stagione = testo(fd, 'stagione');
  if (!nome) throw new ErroreRegola('Serve il nome del campionato.');
  if (!stagione) throw new ErroreRegola('Serve la stagione (es. 2026-2027).');
  return { nome, stagione, coordinamenti: tutti(fd, 'coordinamenti') };
}

export async function creaCampionato(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  let id = '';
  const r = await esegui(async () => {
    const o = await chi();
    const { nome, stagione, coordinamenti } = datiBase(fd);
    controllaCoordinamenti(o, coordinamenti);
    const tipologia = await prisma.tipologiaGara.findFirst({ where: { id: testo(fd, 'tipologiaId'), enteId: o.enteId, archiviata: false } });
    if (!tipologia) throw new ErroreRegola('Scegli la tipologia di gara.');
    // si riparte dalle regole dell'ultimo campionato della stessa tipologia
    const precedente = await prisma.campionato.findFirst({ where: { tipologiaId: tipologia.id }, orderBy: { stagione: 'desc' } });
    id = (await prisma.campionato.create({
      data: {
        enteId: o.enteId, tipologiaId: tipologia.id, nome, stagione,
        regole: (precedente?.regole as object) ?? REGOLE_BASE,
        coordinamenti: { create: coordinamenti.map((coordinamentoId) => ({ coordinamentoId })) },
      },
    })).id;
  });
  if (r.errore) return r;
  redirect(`/campionati/${id}`);
}

export async function aggiornaCampionato(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const o = await chi();
    const c = await campionatoGestibile(o, testo(fd, 'campionatoId'));
    const { nome, stagione, coordinamenti } = datiBase(fd);
    controllaCoordinamenti(o, coordinamenti);

    const punti = testo(fd, 'puntiPerPosizione').split(/[\s,;]+/).filter(Boolean).map(Number);
    if (punti.length === 0 || punti.some((n) => !Number.isFinite(n) || n < 0)) throw new ErroreRegola('Punti per posizione: numeri separati da virgola, es. 25, 22, 20.');
    const regole = {
      ...(c.regole as object),
      puntiPerPosizione: punti,
      puntiDallaPosizioneSuccessiva: Math.max(0, intero(fd, 'puntiDopo') ?? 0),
      miglioriRisultati: Math.max(1, intero(fd, 'miglioriRisultati') ?? 1),
    };
    await prisma.$transaction([
      prisma.campionato.update({ where: { id: c.id }, data: { nome, stagione, regole } }),
      prisma.campionatoCoordinamento.deleteMany({ where: { campionatoId: c.id } }),
      prisma.campionatoCoordinamento.createMany({ data: coordinamenti.map((coordinamentoId) => ({ campionatoId: c.id, coordinamentoId })) }),
    ]);
    revalidatePath('/campionati');
  });
}

export async function eliminaCampionato(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await esegui(async () => {
    const o = await chi();
    const c = await campionatoGestibile(o, testo(fd, 'campionatoId'));
    if (c._count.eventi > 0) throw new ErroreRegola('Il campionato ha già delle tappe: non si può eliminare.');
    await prisma.$transaction([
      prisma.campionatoCoordinamento.deleteMany({ where: { campionatoId: c.id } }),
      prisma.iscrizioneCampionato.deleteMany({ where: { campionatoId: c.id } }),
      prisma.campionato.delete({ where: { id: c.id } }),
    ]);
  });
  if (r.errore) return r;
  redirect('/campionati');
}
