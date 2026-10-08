'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola, eventoModificabile } from '@/lib/permessi';
import { esegui, testo, testoOpz, intero, decimale, dataOra, tutti, type StatoForm } from '@/lib/form';
import type { Fase } from '@/lib/template';

type Parametri = { finestra: { minMin: number; maxMin: number }; obiettiviInSequenza: boolean };

/** Fasi scritte una per riga: "E1: Disinnesca la bomba" (il codice è facoltativo: si numerano da sole). */
function leggiFasi(righe: string): Fase[] {
  return righe.split('\n').map((r) => r.trim()).filter(Boolean).map((r, i) => {
    const m = r.match(/^([A-Za-z]\d+)\s*[:\-–·]\s*(.+)$/);
    return m ? { codice: m[1].toUpperCase(), nome: m[2].trim() } : { codice: `E${i + 1}`, nome: r };
  });
}

/** Controlla tipi, abbinamenti e durata secondo la tipologia; restituisce i dati pronti da salvare. */
async function datiObiettivo(fd: FormData, ev: Awaited<ReturnType<typeof eventoModificabile>>) {
  const par = ev.versioneTipologia.parametri as Parametri;
  const tipiOb = await prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId } });
  const perCodice = Object.fromEntries(tipiOb.map((t) => [t.codice, t]));

  const codice = testo(fd, 'codice').toUpperCase();
  const nome = testo(fd, 'nome');
  const tipi = tutti(fd, 'tipi');
  if (!codice || !nome) throw new ErroreRegola('Servono codice e nome dell’obiettivo.');
  if (tipi.length === 0) throw new ErroreRegola('Scegli almeno un tipo di obiettivo.');
  if (tipi.some((t) => !perCodice[t])) throw new ErroreRegola('Tipo di obiettivo non previsto dalla tipologia.');

  // il tipo principale è il primo che non è un "abbinabile" degli altri; gli altri devono essere ammessi con lui
  const principale = tipi.find((t) => !tipi.some((x) => x !== t && perCodice[x].abbinabileCon.includes(t))) ?? tipi[0];
  const nonAmmessi = tipi.filter((t) => t !== principale && !perCodice[principale].abbinabileCon.includes(t));
  if (nonAmmessi.length) {
    throw new ErroreRegola(`Il tipo ${principale} non si abbina con ${nonAmmessi.join(', ')} (ammessi: ${perCodice[principale].abbinabileCon.join(', ') || 'nessuno'}).`);
  }
  const tipoP = perCodice[principale];

  const durataMin = intero(fd, 'durataMin') ?? par.finestra.minMin;
  if (tipoP.richiedeFinestra && (durataMin < par.finestra.minMin || durataMin > par.finestra.maxMin)) {
    throw new ErroreRegola(`La finestra deve durare da ${par.finestra.minMin} a ${par.finestra.maxMin} minuti.`);
  }
  const areaDa = dataOra(fd, 'areaDa') ?? ev.inizio;
  const areaA = dataOra(fd, 'areaA') ?? ev.fine;
  if (areaA <= areaDa) throw new ErroreRegola('L’area temporale deve finire dopo l’inizio.');
  if (areaDa < ev.inizio || areaA > ev.fine) throw new ErroreRegola('L’area temporale deve stare dentro gli orari dell’evento.');
  const ultimaFinestra = dataOra(fd, 'ultimaFinestra');
  if (ultimaFinestra && (ultimaFinestra < areaDa || ultimaFinestra > areaA)) throw new ErroreRegola('L’ultima finestra utile deve stare dentro l’area temporale.');

  // template: l'ultima versione pubblicata di quello previsto per il tipo principale
  const versioneTemplate = tipoP.templateId
    ? await prisma.versioneTemplate.findFirst({ where: { templateId: tipoP.templateId, stato: 'PUBBLICATA' }, orderBy: { numero: 'desc' } })
    : null;

  return {
    codice, nome, tipi: [principale, ...tipi.filter((t) => t !== principale)],
    durataMin, areaDa, areaA, ultimaFinestra,
    ordine: par.obiettiviInSequenza ? intero(fd, 'ordine') : null,
    lat: decimale(fd, 'lat'), lon: decimale(fd, 'lon'),
    geometria: { areaEsecuzioneM: intero(fd, 'areaEsecuzioneM'), zonaObiettivoM: intero(fd, 'zonaObiettivoM'), note: testoOpz(fd, 'noteGeometria') },
    fasi: leggiFasi(testo(fd, 'fasi')),
    versioneTemplateId: versioneTemplate?.id ?? null,
  };
}

export async function creaObiettivo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const dati = await datiObiettivo(fd, ev);
    if (await prisma.obiettivo.findUnique({ where: { eventoId_codice: { eventoId: ev.id, codice: dati.codice } } })) {
      throw new ErroreRegola(`Esiste già un obiettivo ${dati.codice}.`);
    }
    await prisma.obiettivo.create({ data: { ...dati, eventoId: ev.id } });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: `Obiettivo ${dati.codice} creato.` };
  });
}

export async function aggiornaObiettivo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const ob = await prisma.obiettivo.findFirst({ where: { id: testo(fd, 'obiettivoId'), eventoId: ev.id } });
    if (!ob) throw new ErroreRegola('Obiettivo non trovato.');
    const dati = await datiObiettivo(fd, ev);
    if (dati.codice !== ob.codice && (await prisma.obiettivo.findUnique({ where: { eventoId_codice: { eventoId: ev.id, codice: dati.codice } } }))) {
      throw new ErroreRegola(`Esiste già un obiettivo ${dati.codice}.`);
    }
    await prisma.obiettivo.update({ where: { id: ob.id }, data: dati });
    // se cambia il codice, i valori della tabella punteggi lo seguono
    if (dati.codice !== ob.codice) await rinominaPunti(ev.id, ob.codice, dati.codice);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: 'Obiettivo salvato.' };
  });
}

export async function eliminaObiettivo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const ob = await prisma.obiettivo.findFirst({ where: { id: testo(fd, 'obiettivoId'), eventoId: ev.id } });
    if (!ob) throw new ErroreRegola('Obiettivo non trovato.');
    await prisma.$transaction([
      prisma.arbitroObiettivo.deleteMany({ where: { obiettivoId: ob.id } }),
      prisma.obiettivo.delete({ where: { id: ob.id } }),
    ]);
    await rinominaPunti(ev.id, ob.codice, null);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: `Obiettivo ${ob.codice} eliminato.` };
  });
}

type Tabella = { obiettivi?: Record<string, { valorePositivo?: number; fasi?: Record<string, number> }> } & Record<string, unknown>;

async function rinominaPunti(eventoId: string, da: string, a: string | null) {
  const t = await prisma.tabellaPunteggi.findUnique({ where: { eventoId } });
  if (!t) return;
  const regole = t.regole as Tabella;
  const obiettivi = { ...(regole.obiettivi ?? {}) };
  if (a && obiettivi[da]) obiettivi[a] = obiettivi[da];
  delete obiettivi[da];
  await prisma.tabellaPunteggi.update({ where: { eventoId }, data: { regole: { ...regole, obiettivi }, versione: { increment: 1 } } });
}

/** Valori della tabella punteggi per un obiettivo: solo ente e direzione, e solo prima dell'avvio. */
export async function salvaPuntiObiettivo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const ob = await prisma.obiettivo.findFirst({ where: { id: testo(fd, 'obiettivoId'), eventoId: ev.id } });
    if (!ob) throw new ErroreRegola('Obiettivo non trovato.');
    const valorePositivo = intero(fd, 'valorePositivo');
    if (valorePositivo == null || valorePositivo < 0) throw new ErroreRegola('Il valore positivo dell’obiettivo è obbligatorio e non negativo.');
    const fasi: Record<string, number> = {};
    for (const f of ob.fasi as Fase[]) {
      const v = intero(fd, `fase_${f.codice}`);
      if (v == null) throw new ErroreRegola(`Manca il valore della fase ${f.codice}.`);
      fasi[f.codice] = v;
    }
    const t = await prisma.tabellaPunteggi.findUniqueOrThrow({ where: { eventoId: ev.id } });
    const regole = t.regole as Tabella;
    await prisma.tabellaPunteggi.update({
      where: { eventoId: ev.id },
      data: { regole: { ...regole, obiettivi: { ...(regole.obiettivi ?? {}), [ob.codice]: { valorePositivo, fasi } } }, versione: { increment: 1 } },
    });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: 'Punteggi salvati.' };
  });
}
