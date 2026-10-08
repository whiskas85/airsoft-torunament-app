'use client';

import { VERSIONE_FORMATO, erroreDiForma, testoDaFirmare, type Operazione, type OperazioneDaFirmare } from '@/lib/campo/operazione';
import { firmaValida } from '@/lib/campo/verifica';
import { apriDb, type Pacchetto, type VoceRegistro } from './db';
import { dispositivo, firma } from './dispositivo';
import { scartoNoto } from './orologio';
import { posizione } from './gps';

/**
 * Crea un'operazione, la firma e la salva nel registro del telefono. Funziona senza rete:
 * l'ora ufficiale usa l'ultimo scarto misurato, il GPS se risponde.
 */
export async function nuovaOperazione(
  p: Pacchetto,
  tipo: string,
  dati: Record<string, unknown>,
  dove: { squadra?: string | null; obiettivo?: string | null; rif?: string[] } = {},
): Promise<VoceRegistro> {
  const d = await dispositivo();
  if (!d.registratoIl) throw new Error('Telefono non registrato: collegati una volta con la rete.');
  const scarto = (await scartoNoto())?.ms ?? 0;
  const adesso = Date.now();
  const bozza: OperazioneDaFirmare = {
    v: VERSIONE_FORMATO,
    id: crypto.randomUUID(),
    evento: p.evento.id,
    tipo,
    autore: p.io.utenteId,
    dispositivo: d.id,
    oraDispositivo: new Date(adesso).toISOString(),
    scartoMs: scarto,
    oraUfficiale: new Date(adesso + scarto).toISOString(),
    gps: await posizione(),
    squadra: dove.squadra ?? null,
    obiettivo: dove.obiettivo ?? null,
    rif: dove.rif ?? [],
    dati,
  };
  const op: Operazione = { ...bozza, firma: await firma(testoDaFirmare(bozza)) };
  const voce: VoceRegistro = { op, stato: 'da_inviare', origine: 'mia', verifica: 'valida', ricevutaQui: new Date().toISOString() };
  await (await apriDb()).put('registro', voce);
  return voce;
}

/** Verifica una firma con le chiavi del pacchetto (o con la propria). */
async function verifica(op: Operazione, p: Pacchetto): Promise<VoceRegistro['verifica']> {
  const d = await dispositivo();
  const chiave = op.dispositivo === d.id ? d.chiavePubblica : p.chiavi.find((k) => k.dispositivo === op.dispositivo)?.chiavePubblica;
  if (!chiave) return 'chiave_sconosciuta';
  return (await firmaValida(op, chiave)) ? 'valida' : 'non_valida';
}

export type EsitoRicezione = { nuove: number; gia: number; rifiutate: { id: string; motivo: string }[] };

/**
 * Accoglie operazioni arrivate da un altro telefono (QR) o dal server.
 * Quelle ricevute via QR restano "da inviare": questo telefono le consegnerà al server per conto dell'autore.
 */
export async function riceviOperazioni(p: Pacchetto, ops: Operazione[], origine: 'qr' | 'server'): Promise<EsitoRicezione> {
  const db = await apriDb();
  const esito: EsitoRicezione = { nuove: 0, gia: 0, rifiutate: [] };
  for (const op of ops) {
    const forma = erroreDiForma(op);
    if (forma) { esito.rifiutate.push({ id: op?.id ?? '?', motivo: forma }); continue; }
    if (op.evento !== p.evento.id) { esito.rifiutate.push({ id: op.id, motivo: 'operazione di un altro evento' }); continue; }
    const esistente = await db.get('registro', op.id);
    if (esistente) {
      // se ora arriva dal server, è confermata
      if (origine === 'server' && esistente.stato !== 'sul_server') await db.put('registro', { ...esistente, stato: 'sul_server' });
      esito.gia++;
      continue;
    }
    const v = await verifica(op, p);
    if (v === 'non_valida') { esito.rifiutate.push({ id: op.id, motivo: 'firma non valida' }); continue; }
    // le operazioni del server portano anche seq e ricevutaIl: nel registro si tiene solo l'operazione firmata
    const { seq: _s, ricevutaIl: _r, ...pulita } = op as Operazione & { seq?: string; ricevutaIl?: string };
    await db.put('registro', {
      op: pulita, stato: origine === 'server' ? 'sul_server' : 'da_inviare', origine, verifica: v, ricevutaQui: new Date().toISOString(),
    });
    esito.nuove++;
  }
  return esito;
}

export async function registroEvento(eventoId: string): Promise<VoceRegistro[]> {
  const voci = await (await apriDb()).getAllFromIndex('registro', 'evento', eventoId);
  return voci.sort((a, b) => b.op.oraUfficiale.localeCompare(a.op.oraUfficiale));
}
