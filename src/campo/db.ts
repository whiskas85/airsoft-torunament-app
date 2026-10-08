'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Operazione } from '@/lib/campo/operazione';

/** Come il telefono vede un'operazione nel suo registro. */
export type VoceRegistro = {
  op: Operazione;
  /** da_inviare: il server non l'ha ancora · sul_server: confermata · rifiutata: il server ha detto di no */
  stato: 'da_inviare' | 'sul_server' | 'rifiutata';
  motivo?: string;
  /** mia: creata qui · qr: ricevuta da un altro telefono · server: arrivata con la sincronizzazione */
  origine: 'mia' | 'qr' | 'server';
  /** esito della verifica della firma su questo telefono */
  verifica: 'valida' | 'non_valida' | 'chiave_sconosciuta';
  ricevutaQui: string;
};

export type Pacchetto = {
  evento: { id: string; codice: string; nome: string; stato: string };
  hash: string;
  configurazione: Record<string, unknown> & {
    obiettivi: { id: string; codice: string; nome: string; tipi: string[] }[];
    squadre: { id: string; identificativo: string; nome: string; partecipanti: unknown[] }[];
    documenti: { id: string; titolo: string; ruolo: string; byte: number; hash: string; mime: string }[];
  };
  io: { utenteId: string; personaId: string; nome: string; direzione: boolean; arbitroEventoId: string | null; obiettivi: string[]; squadre: string[] };
  chiavi: { dispositivo: string; utente: string; nome: string; chiavePubblica: string }[];
  scaricatoIl: string;
};

interface Schema extends DBSchema {
  meta: { key: string; value: unknown };
  pacchetti: { key: string; value: Pacchetto };
  registro: { key: string; value: VoceRegistro; indexes: { evento: string } };
}

let db: Promise<IDBPDatabase<Schema>> | null = null;

export function apriDb() {
  db ??= openDB<Schema>('tournament-campo', 1, {
    upgrade(d) {
      d.createObjectStore('meta');
      d.createObjectStore('pacchetti', { keyPath: 'evento.id' });
      const r = d.createObjectStore('registro', { keyPath: 'op.id' });
      r.createIndex('evento', 'op.evento');
    },
  });
  return db;
}

export async function leggiMeta<T>(chiave: string): Promise<T | undefined> {
  return (await (await apriDb()).get('meta', chiave)) as T | undefined;
}
export async function scriviMeta(chiave: string, valore: unknown) {
  await (await apriDb()).put('meta', valore, chiave);
}
