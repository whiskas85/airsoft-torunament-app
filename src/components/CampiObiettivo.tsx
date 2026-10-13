'use client';

import { useState } from 'react';
import { ElencoFasi, type FaseModulo } from './ElencoFasi';
import { MappaObiettivo, type Porta } from './mappa/MappaObiettivo';
import type { Punto } from './mappa/base';

export type TipoModulo = { codice: string; nome: string; richiedeArbitro: boolean; richiedeFinestra: boolean; abbinabileCon: string[] };
export type ValoriObiettivo = {
  codice?: string; nome?: string; tipi?: string[]; durataMin?: number;
  /** date già pronte per <input type="datetime-local"> */
  areaDa?: string; areaA?: string; ultimaFinestra?: string;
  ordine?: number | null; lat?: number | null; lon?: number | null;
  geometria?: { areaEsecuzioneM?: number | null; zonaObiettivoM?: number | null; note?: string | null; portaIn?: Porta | null; portaOut?: Porta | null } | null;
  fasi?: FaseModulo[]; valorePositivo?: number | null; dipendeDa?: string[]; capoUtenteId?: string | null;
};

/** Il tipo di fase: gli obiettivi che lo contengono hanno l'elenco delle fasi E1, E2… */
const TIPO_FASI = 'E';

/**
 * Campi dell'obiettivo, che cambiano col tipo scelto (C1-27, C1-29): finestra solo per i tipi che la prevedono
 * (e facoltativa per un obiettivo di sole fasi), fasi solo con E, arbitro, punti e capo obiettivo solo per i tipi
 * con arbitro. Più la mappa con raggi e porte (C1-23…25) e gli obiettivi da completare prima (C1-26).
 */
export function CampiObiettivo({
  tipi, valori = {}, sequenza, finestra, prossimoCodice, altri, contesto, utenti,
}: {
  tipi: TipoModulo[]; valori?: ValoriObiettivo; sequenza: boolean; finestra: { minMin: number; maxMin: number }; prossimoCodice?: string;
  altri: { id: string; codice: string; nome: string; lat: number | null; lon: number | null }[];
  contesto: { campo: Punto | null; parcheggi: (Punto & { nome: string })[] };
  utenti: { id: string; nome: string }[];
}) {
  const [scelti, setScelti] = useState<string[]>(valori.tipi ?? []);
  const [senzaFinestra, setSenzaFinestra] = useState(valori.durataMin === 0);
  const perCodice = Object.fromEntries(tipi.map((t) => [t.codice, t]));
  const sel = scelti.map((c) => perCodice[c]).filter(Boolean);
  const conArbitro = sel.some((t) => t.richiedeArbitro);
  const prevedeFinestra = sel.some((t) => t.richiedeFinestra);
  // un obiettivo di sole fasi (un tipo che non si abbina ad altri) può non avere finestra
  const finestraFacoltativa = sel.length === 1 && sel[0].richiedeFinestra && sel[0].abbinabileCon.length === 0;
  const conFinestra = prevedeFinestra && !(finestraFacoltativa && senzaFinestra);
  const g = valori.geometria ?? {};

  const tocca = (c: string) => setScelti((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div>
          <label className="etichetta">Codice</label>
          <input name="codice" required defaultValue={valori.codice ?? prossimoCodice} className="campo font-mono" />
        </div>
        <div>
          <label className="etichetta">Nome</label>
          <input name="nome" required defaultValue={valori.nome} className="campo" placeholder="es. Il ponte" />
        </div>
      </div>

      <div>
        <span className="etichetta">Tipo (si possono abbinare, es. A + E)</span>
        <div className="flex flex-wrap gap-2">
          {tipi.map((t) => (
            <label key={t.codice} title={t.nome}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${scelti.includes(t.codice) ? 'border-accento bg-accento/10' : 'border-bordo'}`}>
              <input type="checkbox" name="tipi" value={t.codice} checked={scelti.includes(t.codice)} onChange={() => tocca(t.codice)} className="h-4 w-4" />
              <b className="text-accento">{t.codice}</b> <span className="max-w-[14rem] truncate">{t.nome}</span>
            </label>
          ))}
        </div>
        {sel.length > 0 && (
          <p className="mt-1 text-xs text-tenue">
            {conArbitro ? 'Con arbitro' : 'Senza arbitro: lo compila la squadra'}
            {prevedeFinestra ? (conFinestra ? ', con finestra di attacco.' : ', senza finestra.') : ', senza finestra.'}
          </p>
        )}
      </div>

      {sel.length > 0 && (
        <>
          {prevedeFinestra && (
            <fieldset className="space-y-3 rounded-lg border border-bordo p-3">
              <legend className="px-1 text-sm font-semibold">Finestra di attacco</legend>
              {finestraFacoltativa && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={senzaFinestra} onChange={(e) => setSenzaFinestra(e.target.checked)} className="h-5 w-5" />
                  Questo obiettivo non ha finestra
                </label>
              )}
              {conFinestra ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="etichetta">Durata (min, da {finestra.minMin} a {finestra.maxMin})</label>
                    <input name="durataMin" type="number" min={finestra.minMin} max={finestra.maxMin} required defaultValue={valori.durataMin || 20} className="campo" />
                  </div>
                  <div>
                    <label className="etichetta">Ultima finestra utile (facoltativa)</label>
                    <input name="ultimaFinestra" type="datetime-local" defaultValue={valori.ultimaFinestra} className="campo" />
                  </div>
                </div>
              ) : (
                <input type="hidden" name="durataMin" value="0" />
              )}
            </fieldset>
          )}

          {conArbitro && (
            <fieldset className="space-y-2 rounded-lg border border-bordo p-3">
              <legend className="px-1 text-sm font-semibold">Orari (facoltativi)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="etichetta">Attivo dalle</label>
                  <input name="areaDa" type="datetime-local" defaultValue={valori.areaDa} className="campo" />
                </div>
                <div>
                  <label className="etichetta">Attivo fino alle</label>
                  <input name="areaA" type="datetime-local" defaultValue={valori.areaA} className="campo" />
                </div>
              </div>
              <p className="text-xs text-tenue">Vuoti: attivo per tutta la durata dell’evento.</p>
            </fieldset>
          )}

          {scelti.includes(TIPO_FASI) && (
            <fieldset className="space-y-2 rounded-lg border border-bordo p-3">
              <legend className="px-1 text-sm font-semibold">Fasi E</legend>
              <ElencoFasi iniziali={valori.fasi ?? []} />
            </fieldset>
          )}

          {conArbitro && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="etichetta">Punti dell’obiettivo (valore positivo)</label>
                <input name="valorePositivo" type="number" min={0} defaultValue={valori.valorePositivo ?? ''} className="campo" placeholder="si può mettere dopo" />
                <span className="text-xs text-tenue">Lo vedono solo organizzazione e direzione.</span>
              </div>
              <div>
                <label className="etichetta">Capo obiettivo</label>
                <select name="capoUtenteId" defaultValue={valori.capoUtenteId ?? ''} className="campo">
                  <option value="">Nessuno</option>
                  {utenti.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {altri.length > 0 && (
        <div>
          <span className="etichetta">Compare alla squadra solo dopo aver completato (tutti)</span>
          <div className="flex flex-wrap gap-2">
            {altri.map((o) => (
              <label key={o.id} className="flex items-center gap-1.5 rounded-lg border border-bordo px-2.5 py-1.5 text-sm">
                <input type="checkbox" name="dipendeDa" value={o.id} defaultChecked={valori.dipendeDa?.includes(o.id)} className="h-4 w-4" />
                <b>{o.codice}</b> {o.nome}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-tenue">Nessuno spuntato: la squadra lo vede subito.</p>
        </div>
      )}

      {sequenza && (
        <div className="w-40">
          <label className="etichetta">Ordine nel percorso</label>
          <input name="ordine" type="number" min={1} defaultValue={valori.ordine ?? undefined} className="campo" />
        </div>
      )}

      <fieldset className="space-y-2 rounded-lg border border-bordo p-3">
        <legend className="px-1 text-sm font-semibold">Sulla mappa</legend>
        <MappaObiettivo
          centro={valori.lat != null && valori.lon != null ? { lat: valori.lat, lon: valori.lon } : null}
          esecuzioneM={g.areaEsecuzioneM ?? 40}
          zonaM={g.zonaObiettivoM ?? 100}
          portaIn={g.portaIn ?? null}
          portaOut={g.portaOut ?? null}
          contesto={{ ...contesto, altri: altri.filter((o) => o.lat != null && o.lon != null) as { codice: string; lat: number; lon: number }[] }}
        />
        <input name="noteGeometria" defaultValue={g.note ?? ''} className="campo" placeholder="Note su percorso o area (facoltative)" />
      </fieldset>
    </div>
  );
}
