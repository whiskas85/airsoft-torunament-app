import { perInputData } from '@/lib/contesto';
import type { Fase } from '@/lib/template';

type Tipo = { codice: string; nome: string; richiedeArbitro: boolean; richiedeFinestra: boolean; abbinabileCon: string[] };
type Valori = {
  codice?: string; nome?: string; tipi?: string[]; durataMin?: number; areaDa?: Date | null; areaA?: Date | null;
  ultimaFinestra?: Date | null; ordine?: number | null; lat?: number | null; lon?: number | null;
  geometria?: { areaEsecuzioneM?: number | null; zonaObiettivoM?: number | null; note?: string | null } | null; fasi?: Fase[];
};

export function CampiObiettivo({
  tipi, valori = {}, sequenza, finestra, prossimoCodice,
}: {
  tipi: Tipo[]; valori?: Valori; sequenza: boolean; finestra: { minMin: number; maxMin: number }; prossimoCodice?: string;
}) {
  const g = valori.geometria ?? {};
  return (
    <>
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
        <div className="grid gap-1.5 sm:grid-cols-2">
          {tipi.map((t) => (
            <label key={t.codice} className="flex items-start gap-2 rounded-lg border border-bordo p-2 text-sm">
              <input type="checkbox" name="tipi" value={t.codice} defaultChecked={valori.tipi?.includes(t.codice)} className="mt-0.5 h-5 w-5" />
              <span>
                <b className="text-accento">{t.codice}</b> · {t.nome}
                <span className="block text-xs text-tenue">
                  {t.richiedeArbitro ? 'con arbitro' : 'senza arbitro'}{t.richiedeFinestra ? ', con finestra' : ''}
                  {t.abbinabileCon.length ? ` · abbinabile con ${t.abbinabileCon.join(', ')}` : ''}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="etichetta">Durata finestra (min)</label>
          <input name="durataMin" type="number" min={finestra.minMin} max={finestra.maxMin} defaultValue={valori.durataMin ?? 20} className="campo" />
          <span className="text-xs text-tenue">da {finestra.minMin} a {finestra.maxMin}</span>
        </div>
        <div>
          <label className="etichetta">Attivo dalle</label>
          <input name="areaDa" type="datetime-local" defaultValue={perInputData(valori.areaDa)} className="campo" />
        </div>
        <div>
          <label className="etichetta">Attivo fino alle</label>
          <input name="areaA" type="datetime-local" defaultValue={perInputData(valori.areaA)} className="campo" />
        </div>
        <div>
          <label className="etichetta">Ultima finestra utile</label>
          <input name="ultimaFinestra" type="datetime-local" defaultValue={perInputData(valori.ultimaFinestra)} className="campo" />
        </div>
      </div>
      <p className="-mt-1 text-xs text-tenue">Se lasci vuoti gli orari, l’obiettivo è attivo per tutta la durata dell’evento.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {sequenza && (
          <div>
            <label className="etichetta">Ordine nel percorso</label>
            <input name="ordine" type="number" min={1} defaultValue={valori.ordine ?? undefined} className="campo" />
          </div>
        )}
        <div>
          <label className="etichetta">Latitudine</label>
          <input name="lat" inputMode="decimal" defaultValue={valori.lat ?? ''} className="campo" placeholder="45.0703" />
        </div>
        <div>
          <label className="etichetta">Longitudine</label>
          <input name="lon" inputMode="decimal" defaultValue={valori.lon ?? ''} className="campo" placeholder="7.6869" />
        </div>
        <div>
          <label className="etichetta">Area esecuzione (m)</label>
          <input name="areaEsecuzioneM" type="number" defaultValue={g.areaEsecuzioneM ?? 40} className="campo" />
        </div>
        <div>
          <label className="etichetta">Zona obiettivo (m)</label>
          <input name="zonaObiettivoM" type="number" defaultValue={g.zonaObiettivoM ?? 60} className="campo" />
        </div>
      </div>
      <div>
        <label className="etichetta">Fasi E (una per riga, es. «E1: Disinnesca la bomba»)</label>
        <textarea name="fasi" rows={3} defaultValue={(valori.fasi ?? []).map((f) => `${f.codice}: ${f.nome}`).join('\n')} className="campo font-mono text-sm" />
      </div>
      <div>
        <label className="etichetta">Note su porte, percorso, area (facoltative)</label>
        <input name="noteGeometria" defaultValue={g.note ?? ''} className="campo" placeholder="es. Porta IN sul sentiero nord" />
      </div>
    </>
  );
}
