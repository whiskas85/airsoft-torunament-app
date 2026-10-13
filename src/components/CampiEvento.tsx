import { perInputData } from '@/lib/contesto';
import { MappaEvento, type Parcheggio } from './mappa/MappaEvento';

type Opzioni = {
  puntiVisibiliInGara?: boolean;
  finestre?: { gestione?: 'DISLOCATA' | 'CENTRALIZZATA' };
  periodoContestazioniOre?: number;
  esfiltrazioneMassima?: string | null;
};
type Parametri = { finestra: { modalita: string }; esfiltrazione: { orarioMassimo: boolean } };

/** Campi comuni a creazione e modifica dell'evento: dati generali, luogo con mappa e parcheggi, opzioni (§2.2, §8.0, §6bis). */
export function CampiEvento({
  valori,
  parametri,
  penalitaRitardo,
}: {
  valori?: {
    nome?: string; inizio?: Date; fine?: Date; luogo?: string | null; locandinaUrl?: string | null; opzioni?: Opzioni;
    lat?: number | null; lon?: number | null; parcheggi?: Parcheggio[]; prefissoSquadre?: string | null;
  };
  parametri?: Parametri;
  /** punti tolti per ogni minuto di ritardo all'esfiltrazione (positivo), dalla tabella punteggi */
  penalitaRitardo?: number | null;
}) {
  const o = valori?.opzioni ?? {};
  const conOrarioMassimo = !parametri || parametri.esfiltrazione.orarioMassimo;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <label className="etichetta">Nome dell’evento</label>
          <input name="nome" required defaultValue={valori?.nome} className="campo" placeholder="es. 2ª tappa PLR Piemonte" />
        </div>
        <div>
          <label className="etichetta">Sigla delle pattuglie</label>
          <input name="prefissoSquadre" defaultValue={valori?.prefissoSquadre ?? ''} maxLength={12} className="campo font-mono uppercase" placeholder="es. PREBE" />
        </div>
      </div>
      <p className="-mt-1 text-xs text-tenue">Con la sigla, le squadre iscritte si chiamano PREBE 1, PREBE 2… nell’ordine di iscrizione.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etichetta">Inizio</label>
          <input name="inizio" type="datetime-local" required defaultValue={perInputData(valori?.inizio)} className="campo" />
        </div>
        <div>
          <label className="etichetta">Fine</label>
          <input name="fine" type="datetime-local" required defaultValue={perInputData(valori?.fine)} className="campo" />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-bordo p-3">
        <legend className="px-1 text-sm font-semibold">Campo di gara e parcheggi</legend>
        <div>
          <label className="etichetta">Nome del luogo</label>
          <input name="luogo" defaultValue={valori?.luogo ?? ''} className="campo" placeholder="es. Cava di Sant’Ambrogio (TO)" />
        </div>
        <MappaEvento
          campo={valori?.lat != null && valori?.lon != null ? { lat: valori.lat, lon: valori.lon } : null}
          parcheggi={valori?.parcheggi ?? []}
        />
      </fieldset>

      <div>
        <label className="etichetta">Locandina</label>
        <div className="flex flex-wrap items-center gap-3">
          {valori?.locandinaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valori.locandinaUrl} alt="Locandina attuale" className="h-24 rounded-lg border border-bordo object-cover" />
          )}
          <input name="locandina" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-bordo file:px-3 file:py-2 file:font-semibold file:text-testo" />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-bordo p-3">
        <legend className="px-1 text-sm font-semibold">Opzioni di gara</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="puntiVisibiliInGara" defaultChecked={!!o.puntiVisibiliInGara} className="h-5 w-5" />
          Punti visibili alle squadre durante la gara (in classifica sono sempre visibili)
        </label>
        {(!parametri || parametri.finestra.modalita === 'PRENOTATA') && (
          <div>
            <label className="etichetta">Gestione delle luci verdi</label>
            <select name="gestioneFinestre" defaultValue={o.finestre?.gestione ?? 'DISLOCATA'} className="campo">
              <option value="DISLOCATA">Dislocata: ogni arbitro gestisce la coda del suo obiettivo</option>
              <option value="CENTRALIZZATA">Centralizzata: la direzione gestisce le code di tutti gli obiettivi</option>
            </select>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="etichetta">Periodo per le contestazioni (ore)</label>
            <input name="periodoContestazioniOre" type="number" min={0} defaultValue={o.periodoContestazioniOre ?? 24} className="campo" />
          </div>
          {conOrarioMassimo && (
            <>
              <div>
                <label className="etichetta">Orario massimo di esfiltrazione</label>
                <input name="esfiltrazioneMassima" type="datetime-local" defaultValue={perInputData(o.esfiltrazioneMassima)} className="campo" />
              </div>
              <div>
                <label className="etichetta">Malus per minuto di ritardo</label>
                <div className="flex items-center gap-2">
                  <span className="text-tenue">−</span>
                  <input name="penalitaRitardo" type="number" min={0} defaultValue={penalitaRitardo ?? ''} className="campo" placeholder={valori ? 'nessuno' : 'come la tipologia'} />
                  <span className="whitespace-nowrap text-sm text-tenue">punti/min</span>
                </div>
              </div>
            </>
          )}
        </div>
        {conOrarioMassimo && (
          <p className="text-xs text-tenue">Il malus si calcola da solo quando si registra l’ora di esfiltrazione della squadra.</p>
        )}
      </fieldset>
    </>
  );
}
