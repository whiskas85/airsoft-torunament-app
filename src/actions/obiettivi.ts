'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola, eventoModificabile } from '@/lib/permessi';
import { esegui, testo, testoOpz, intero, decimale, dataOra, tutti, type StatoForm } from '@/lib/form';
import type { Fase } from '@/lib/template';

type Parametri = { finestra: { minMin: number; maxMin: number }; obiettiviInSequenza: boolean };

type Porta = { nome: string; descrizione: string; lat: number; lon: number };

/** Porta IN o OUT dalla mappa: nome, indicazioni per le squadre e coordinata (C1-23, C1-24). */
function leggiPorta(fd: FormData, k: string, predefinito: string): Porta | null {
  const v = testo(fd, k);
  if (!v) return null;
  try {
    const p = JSON.parse(v) as Partial<Porta>;
    if (!Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lon))) return null;
    return { nome: String(p.nome ?? '').trim() || predefinito, descrizione: String(p.descrizione ?? '').trim(), lat: Number(p.lat), lon: Number(p.lon) };
  } catch {
    throw new ErroreRegola(`${predefinito}: dati non leggibili, riposizionala sulla mappa.`);
  }
}

/** Fasi come elenco ordinato {nome, punti}: i codici E1, E2… seguono l'ordine (C1-22). */
function leggiFasi(fd: FormData): { fasi: Fase[]; punti: Record<string, number> } {
  let grezze: { nome?: unknown; punti?: unknown }[] = [];
  try {
    grezze = JSON.parse(testo(fd, 'fasi') || '[]');
  } catch {
    throw new ErroreRegola('Fasi non leggibili: riprova.');
  }
  const fasi: Fase[] = [];
  const punti: Record<string, number> = {};
  grezze.filter((f) => String(f.nome ?? '').trim()).forEach((f, i) => {
    const codice = `E${i + 1}`;
    fasi.push({ codice, nome: String(f.nome).trim() });
    if (f.punti !== null && f.punti !== undefined && f.punti !== '' && Number.isFinite(Number(f.punti))) punti[codice] = Math.round(Number(f.punti));
  });
  return { fasi, punti };
}

/** Controlla tipi, abbinamenti, finestra e dipendenze secondo la tipologia; restituisce i dati pronti da salvare. */
async function datiObiettivo(fd: FormData, ev: Awaited<ReturnType<typeof eventoModificabile>>, obiettivoId: string | null) {
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
  const sel = tipi.map((t) => perCodice[t]);
  const conArbitro = sel.some((t) => t.richiedeArbitro);

  // finestra: solo se il tipo la prevede; facoltativa per un obiettivo di sole fasi (C1-27)
  const prevedeFinestra = sel.some((t) => t.richiedeFinestra);
  const facoltativa = sel.length === 1 && tipoP.richiedeFinestra && tipoP.abbinabileCon.length === 0;
  let durataMin = prevedeFinestra ? intero(fd, 'durataMin') ?? 0 : 0;
  if (prevedeFinestra && !(facoltativa && durataMin === 0) && (durataMin < par.finestra.minMin || durataMin > par.finestra.maxMin)) {
    throw new ErroreRegola(`La finestra deve durare da ${par.finestra.minMin} a ${par.finestra.maxMin} minuti.`);
  }
  if (!prevedeFinestra) durataMin = 0;

  const areaDa = (conArbitro && dataOra(fd, 'areaDa')) || ev.inizio;
  const areaA = (conArbitro && dataOra(fd, 'areaA')) || ev.fine;
  if (areaA <= areaDa) throw new ErroreRegola('Gli orari dell’obiettivo devono finire dopo l’inizio.');
  if (areaDa < ev.inizio || areaA > ev.fine) throw new ErroreRegola('Gli orari dell’obiettivo devono stare dentro quelli dell’evento.');
  const ultimaFinestra = durataMin > 0 ? dataOra(fd, 'ultimaFinestra') : null;
  if (ultimaFinestra && (ultimaFinestra < areaDa || ultimaFinestra > areaA)) throw new ErroreRegola('L’ultima finestra utile deve stare dentro gli orari dell’obiettivo.');

  // compare dopo altri obiettivi (C1-26): tutti dell'evento, non sé stesso, senza giri chiusi
  const dipendeDa = [...new Set(tutti(fd, 'dipendeDa'))].filter((id) => id !== obiettivoId);
  if (dipendeDa.length) {
    const tuttiOb = await prisma.obiettivo.findMany({ where: { eventoId: ev.id }, select: { id: true, codice: true, dipendeDa: true } });
    const grafo = new Map(tuttiOb.map((o) => [o.id, o.dipendeDa]));
    if (dipendeDa.some((id) => !grafo.has(id))) throw new ErroreRegola('Uno degli obiettivi scelti non esiste più.');
    if (obiettivoId) {
      // da uno dei prerequisiti si torna a questo obiettivo? allora nessuno dei due comparirebbe mai
      const visti = new Set<string>();
      const coda = [...dipendeDa];
      while (coda.length) {
        const id = coda.pop()!;
        if (id === obiettivoId) throw new ErroreRegola('Dipendenze in cerchio: un obiettivo richiesto dipende a sua volta da questo.');
        if (visti.has(id)) continue;
        visti.add(id);
        coda.push(...(grafo.get(id) ?? []));
      }
    }
  }

  const capoUtenteId = conArbitro ? testoOpz(fd, 'capoUtenteId') : null;
  if (capoUtenteId && !(await prisma.utente.findUnique({ where: { id: capoUtenteId } }))) throw new ErroreRegola('Capo obiettivo non trovato.');

  // template: l'ultima versione pubblicata di quello previsto per il tipo principale
  const versioneTemplate = tipoP.templateId
    ? await prisma.versioneTemplate.findFirst({ where: { templateId: tipoP.templateId, stato: 'PUBBLICATA' }, orderBy: { numero: 'desc' } })
    : null;

  const { fasi, punti: puntiFasi } = tipi.includes('E') ? leggiFasi(fd) : { fasi: [], punti: {} };
  const valorePositivo = conArbitro ? intero(fd, 'valorePositivo') : null;
  if (valorePositivo != null && valorePositivo < 0) throw new ErroreRegola('Il valore dell’obiettivo non può essere negativo.');

  return {
    dati: {
      codice, nome, tipi: [principale, ...tipi.filter((t) => t !== principale)],
      durataMin, areaDa, areaA, ultimaFinestra,
      ordine: par.obiettiviInSequenza ? intero(fd, 'ordine') : null,
      lat: decimale(fd, 'lat'), lon: decimale(fd, 'lon'),
      geometria: {
        areaEsecuzioneM: intero(fd, 'areaEsecuzioneM'), zonaObiettivoM: intero(fd, 'zonaObiettivoM'), note: testoOpz(fd, 'noteGeometria'),
        portaIn: leggiPorta(fd, 'portaIn', 'Porta IN'), portaOut: leggiPorta(fd, 'portaOut', 'Porta OUT'),
      },
      fasi, dipendeDa, capoUtenteId,
      versioneTemplateId: versioneTemplate?.id ?? null,
    },
    punti: { valorePositivo: valorePositivo ?? undefined, fasi: puntiFasi },
  };
}

export async function creaObiettivo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  let codiceEvento = '';
  const r = await esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    codiceEvento = ev.codice;
    const { dati, punti } = await datiObiettivo(fd, ev, null);
    if (await prisma.obiettivo.findUnique({ where: { eventoId_codice: { eventoId: ev.id, codice: dati.codice } } })) {
      throw new ErroreRegola(`Esiste già un obiettivo ${dati.codice}.`);
    }
    await prisma.obiettivo.create({ data: { ...dati, eventoId: ev.id } });
    await scriviPunti(ev.id, dati.codice, punti);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
  });
  if (r.errore) return r;
  redirect(`/eventi/${codiceEvento}/obiettivi`);
}

/**
 * Waypoint (o altri obiettivi senza arbitro e senza finestra) in serie (C1-28): di solito una quindicina,
 * posizionati cliccando sulla mappa. Codici già usati vengono rifiutati tutti insieme, prima di creare.
 */
export async function creaWaypoint(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  let codiceEvento = '';
  const r = await esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    codiceEvento = ev.codice;
    const tipo = await prisma.tipoObiettivo.findFirst({ where: { versioneId: ev.versioneTipologiaId, codice: testo(fd, 'tipo') } });
    if (!tipo || tipo.richiedeArbitro || tipo.richiedeFinestra) throw new ErroreRegola('Scegli un tipo senza arbitro e senza finestra (es. B, way point).');
    let righe: { codice?: unknown; nome?: unknown; lat?: unknown; lon?: unknown }[] = [];
    try { righe = JSON.parse(testo(fd, 'waypoint') || '[]'); } catch { throw new ErroreRegola('Elenco non leggibile: riprova.'); }
    const nuovi = righe
      .map((w) => ({ codice: String(w.codice ?? '').trim().toUpperCase(), nome: String(w.nome ?? '').trim(), lat: Number(w.lat), lon: Number(w.lon) }))
      .filter((w) => w.codice);
    if (nuovi.length === 0) throw new ErroreRegola('Aggiungi almeno un waypoint (clic sulla mappa).');
    const doppi = nuovi.filter((w, i) => nuovi.findIndex((x) => x.codice === w.codice) !== i).map((w) => w.codice);
    const esistenti = await prisma.obiettivo.findMany({ where: { eventoId: ev.id, codice: { in: nuovi.map((w) => w.codice) } }, select: { codice: true } });
    const occupati = [...new Set([...doppi, ...esistenti.map((e) => e.codice)])];
    if (occupati.length) throw new ErroreRegola(`Codici già usati: ${occupati.join(', ')}.`);
    const versioneTemplate = tipo.templateId
      ? await prisma.versioneTemplate.findFirst({ where: { templateId: tipo.templateId, stato: 'PUBBLICATA' }, orderBy: { numero: 'desc' } })
      : null;
    await prisma.obiettivo.createMany({
      data: nuovi.map((w) => ({
        eventoId: ev.id, codice: w.codice, nome: w.nome || w.codice, tipi: [tipo.codice], durataMin: 0, areaDa: ev.inizio, areaA: ev.fine,
        lat: Number.isFinite(w.lat) ? w.lat : null, lon: Number.isFinite(w.lon) ? w.lon : null,
        versioneTemplateId: versioneTemplate?.id ?? null,
      })),
    });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
  });
  if (r.errore) return r;
  redirect(`/eventi/${codiceEvento}/obiettivi`);
}

export async function aggiornaObiettivo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const ob = await prisma.obiettivo.findFirst({ where: { id: testo(fd, 'obiettivoId'), eventoId: ev.id } });
    if (!ob) throw new ErroreRegola('Obiettivo non trovato.');
    const { dati, punti } = await datiObiettivo(fd, ev, ob.id);
    if (dati.codice !== ob.codice && (await prisma.obiettivo.findUnique({ where: { eventoId_codice: { eventoId: ev.id, codice: dati.codice } } }))) {
      throw new ErroreRegola(`Esiste già un obiettivo ${dati.codice}.`);
    }
    await prisma.obiettivo.update({ where: { id: ob.id }, data: dati });
    // se cambia il codice, i valori della tabella punteggi lo seguono
    if (dati.codice !== ob.codice) await rinominaPunti(ev.id, ob.codice, dati.codice);
    await scriviPunti(ev.id, dati.codice, punti);
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
    const dipendenti = await prisma.obiettivo.findMany({ where: { eventoId: ev.id, dipendeDa: { has: ob.id } } });
    await prisma.$transaction([
      prisma.arbitroObiettivo.deleteMany({ where: { obiettivoId: ob.id } }),
      ...dipendenti.map((d) => prisma.obiettivo.update({ where: { id: d.id }, data: { dipendeDa: d.dipendeDa.filter((x) => x !== ob.id) } })),
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

/** Punti dell'obiettivo e delle sue fasi nella tabella punteggi (solo organizzazione e direzione li vedono). */
async function scriviPunti(eventoId: string, codice: string, punti: { valorePositivo?: number; fasi: Record<string, number> }) {
  const t = await prisma.tabellaPunteggi.findUnique({ where: { eventoId } });
  if (!t) return;
  const regole = t.regole as Tabella;
  const voce = { ...(punti.valorePositivo != null ? { valorePositivo: punti.valorePositivo } : {}), fasi: punti.fasi };
  if (JSON.stringify(regole.obiettivi?.[codice] ?? null) === JSON.stringify(voce)) return;
  await prisma.tabellaPunteggi.update({
    where: { eventoId },
    data: { regole: { ...regole, obiettivi: { ...(regole.obiettivi ?? {}), [codice]: voce } }, versione: { increment: 1 } },
  });
}
