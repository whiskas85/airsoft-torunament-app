import 'server-only';
import { prisma } from './db';
import { hashCanonico } from './canonico';
import { ErroreRegola } from './permessi';
import { intero, testo } from './form';

/** Parametri di gara di una tipologia (§2 dei requisiti). Gli altri campi del JSON si conservano così come sono. */
export type ParametriTipologia = {
  operatori: { min: number; max: number; minimoInGara: number };
  finestra: { minMin: number; maxMin: number; modalita: 'PRENOTATA' | 'CODA_INGRESSO'; gestione?: string };
  obiettiviInSequenza: boolean;
  esfiltrazione: { orarioMassimo: boolean };
  [altro: string]: unknown;
};

export const PARAMETRI_VUOTI: ParametriTipologia = {
  operatori: { min: 3, max: 6, minimoInGara: 2 },
  finestra: { minMin: 5, maxMin: 30, modalita: 'PRENOTATA', gestione: 'DISLOCATA' },
  obiettiviInSequenza: false,
  esfiltrazione: { orarioMassimo: true },
};

/** Legge i parametri dal modulo, partendo da quelli attuali (per non perdere i campi che il modulo non mostra). */
export function parametriDaForm(fd: FormData, attuali: ParametriTipologia): ParametriTipologia {
  const n = (k: string, d: number) => intero(fd, k) ?? d;
  const p: ParametriTipologia = {
    ...attuali,
    operatori: { min: n('operatoriMin', attuali.operatori.min), max: n('operatoriMax', attuali.operatori.max), minimoInGara: n('minimoInGara', attuali.operatori.minimoInGara) },
    finestra: {
      ...attuali.finestra,
      minMin: n('finestraMin', attuali.finestra.minMin),
      maxMin: n('finestraMax', attuali.finestra.maxMin),
      modalita: testo(fd, 'modalita') === 'CODA_INGRESSO' ? 'CODA_INGRESSO' : 'PRENOTATA',
    },
    obiettiviInSequenza: fd.get('obiettiviInSequenza') === 'on',
    esfiltrazione: { ...attuali.esfiltrazione, orarioMassimo: fd.get('orarioMassimo') === 'on' },
  };
  const { operatori: o, finestra: f } = p;
  if (o.min < 1 || o.max < o.min) throw new ErroreRegola('Operatori: il massimo deve essere almeno pari al minimo.');
  if (o.minimoInGara < 1 || o.minimoInGara > o.min) throw new ErroreRegola('Il minimo in gara non può superare il minimo di operatori.');
  if (f.minMin < 1 || f.maxMin < f.minMin) throw new ErroreRegola('Finestra: la durata massima deve essere almeno pari alla minima.');
  return p;
}

/**
 * Le tipologie hanno versioni (gli eventi già creati restano legati alla loro), ma chi le gestisce non le vede:
 * se la versione attuale è già usata da qualche evento, una modifica ne crea una nuova; altrimenti la aggiorna.
 */
export async function salvaParametri(tipologiaId: string, parametri: ParametriTipologia) {
  const v = await prisma.versioneTipologia.findFirstOrThrow({
    where: { tipologiaId },
    orderBy: { numero: 'desc' },
    include: { tipiObiettivo: true, documenti: true, template: true, _count: { select: { eventi: true } } },
  });
  if (hashCanonico(v.parametri) === hashCanonico(parametri)) return v;
  const tipi = v.tipiObiettivo.map(({ id: _id, versioneId: _v, ...t }) => t);
  const hash = hashCanonico({ parametri, regole: v.regolePredefinite, tipi });

  if (v._count.eventi === 0) {
    return prisma.versioneTipologia.update({ where: { id: v.id }, data: { parametri: parametri as object, hash } });
  }
  return prisma.versioneTipologia.create({
    data: {
      tipologiaId, numero: v.numero + 1, stato: 'PUBBLICATA', pubblicataIl: new Date(), hash,
      parametri: parametri as object,
      regolePredefinite: v.regolePredefinite as object,
      tipiObiettivo: { create: tipi },
      documenti: { create: v.documenti.map((d) => ({ documentoId: d.documentoId })) },
      template: { create: v.template.map((t) => ({ versioneTemplateId: t.versioneTemplateId })) },
    },
  });
}

/** Una tipologia nuova, copiando (se scelta) l'ultima versione di un'altra: tipi di obiettivo, regole, template, documenti. */
export async function creaTipologia(enteId: string, codice: string, nome: string, daId: string | null) {
  const da = daId
    ? await prisma.versioneTipologia.findFirst({
        where: { tipologiaId: daId, tipologia: { enteId } },
        orderBy: { numero: 'desc' },
        include: { tipiObiettivo: true, documenti: true, template: true },
      })
    : null;
  const parametri = (da?.parametri as ParametriTipologia) ?? PARAMETRI_VUOTI;
  const regole = (da?.regolePredefinite as object) ?? { regole: [] };
  const tipi = da?.tipiObiettivo.map(({ id: _id, versioneId: _v, ...t }) => t) ?? [];
  return prisma.tipologiaGara.create({
    data: {
      enteId, codice, nome,
      versioni: {
        create: {
          numero: 1, stato: 'PUBBLICATA', pubblicataIl: new Date(),
          parametri: parametri as object, regolePredefinite: regole,
          hash: hashCanonico({ parametri, regole, tipi }),
          tipiObiettivo: { create: tipi },
          documenti: { create: da?.documenti.map((d) => ({ documentoId: d.documentoId })) ?? [] },
          template: { create: da?.template.map((t) => ({ versioneTemplateId: t.versioneTemplateId })) ?? [] },
        },
      },
    },
  });
}
