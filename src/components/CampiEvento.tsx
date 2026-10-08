import { perInputData } from '@/lib/contesto';

type Opzioni = {
  puntiVisibiliInGara?: boolean;
  finestre?: { gestione?: 'DISLOCATA' | 'CENTRALIZZATA' };
  periodoContestazioniOre?: number;
  esfiltrazioneMassima?: string | null;
};
type Parametri = { finestra: { modalita: string }; esfiltrazione: { orarioMassimo: boolean } };

/** Campi comuni a creazione e modifica dell'evento: dati generali e opzioni (§2.2, §8.0, §6bis). */
export function CampiEvento({
  valori,
  parametri,
}: {
  valori?: { nome?: string; inizio?: Date; fine?: Date; luogo?: string | null; locandinaUrl?: string | null; opzioni?: Opzioni };
  parametri?: Parametri;
}) {
  const o = valori?.opzioni ?? {};
  return (
    <>
      <div>
        <label className="etichetta">Nome dell’evento</label>
        <input name="nome" required defaultValue={valori?.nome} className="campo" placeholder="es. 2ª tappa PLR Piemonte" />
      </div>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etichetta">Luogo</label>
          <input name="luogo" defaultValue={valori?.luogo ?? ''} className="campo" placeholder="es. Campo X, Torino" />
        </div>
        {valori && (
          <div>
            <label className="etichetta">Locandina (indirizzo dell’immagine)</label>
            <input name="locandinaUrl" defaultValue={valori.locandinaUrl ?? ''} className="campo" placeholder="https://…" />
          </div>
        )}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etichetta">Periodo per le contestazioni (ore)</label>
            <input name="periodoContestazioniOre" type="number" min={0} defaultValue={o.periodoContestazioniOre ?? 24} className="campo" />
          </div>
          {(!parametri || parametri.esfiltrazione.orarioMassimo) && (
            <div>
              <label className="etichetta">Orario massimo di esfiltrazione</label>
              <input name="esfiltrazioneMassima" type="datetime-local" defaultValue={perInputData(o.esfiltrazioneMassima)} className="campo" />
            </div>
          )}
        </div>
      </fieldset>
    </>
  );
}
