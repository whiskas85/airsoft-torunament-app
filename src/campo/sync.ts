'use client';

import type { Operazione } from '@/lib/campo/operazione';
import { apriDb, leggiMeta, scriviMeta, type Pacchetto } from './db';
import { dispositivo } from './dispositivo';
import { misuraScarto } from './orologio';
import { riceviOperazioni } from './registro';

export type EsitoSync = { inviate: number; rifiutate: number; ricevute: number; ora: string };

/**
 * Sincronizzazione di un evento: invia ciò che il server non ha, riceve le novità.
 * Si può ripetere quante volte si vuole: un invio doppio non crea doppioni (P1).
 */
export async function sincronizza(p: Pacchetto): Promise<EsitoSync> {
  const db = await apriDb();
  const d = await dispositivo();
  await misuraScarto().catch(() => null);

  const daInviare = (await db.getAllFromIndex('registro', 'evento', p.evento.id)).filter((v) => v.stato === 'da_inviare');
  let segnalibro = (await leggiMeta<string>(`segnalibro:${p.evento.id}`)) ?? '0';
  const esito: EsitoSync = { inviate: 0, rifiutate: 0, ricevute: 0, ora: new Date().toISOString() };

  let primoGiro = true;
  for (let giro = 0; giro < 20; giro++) {
    const r = await fetch('/api/campo/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: p.evento.id, dispositivo: d.id, operazioni: primoGiro ? daInviare.map((v) => v.op) : [], dopo: segnalibro }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.errore ?? `sincronizzazione non riuscita (${r.status})`);

    if (primoGiro) {
      for (const id of j.accettate as string[]) {
        const v = await db.get('registro', id);
        if (v) await db.put('registro', { ...v, stato: 'sul_server', motivo: undefined });
      }
      for (const { id, motivo } of j.rifiutate as { id: string; motivo: string }[]) {
        const v = await db.get('registro', id);
        if (v) await db.put('registro', { ...v, stato: 'rifiutata', motivo });
      }
      esito.inviate = j.accettate.length;
      esito.rifiutate = j.rifiutate.length;
    }
    const ricevute = await riceviOperazioni(p, j.nuove as Operazione[], 'server');
    esito.ricevute += ricevute.nuove;
    segnalibro = j.segnalibro;
    await scriviMeta(`segnalibro:${p.evento.id}`, segnalibro);
    primoGiro = false;
    if (!j.altre) break;
  }
  await scriviMeta(`ultimoSync:${p.evento.id}`, esito);
  return esito;
}
