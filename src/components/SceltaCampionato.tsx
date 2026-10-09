'use client';

import { useEffect, useRef, useState } from 'react';

type Tipologia = { versioneId: string; tipologiaId: string; etichetta: string };
type Campionato = { id: string; nome: string; stagione: string; tipologiaId: string; tappe: { nome: string; inizio: string }[] };

const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Tipologia, gara open o tappa di campionato (C1-11, C1-13, C1-19, C1-20).
 * I campionati proposti sono solo quelli della tipologia scelta. Il numero della tappa non si scrive:
 * si vedono le altre tappe in ordine di data, con questa gara già al suo posto.
 */
export function SceltaCampionato({ tipologie, campionati, campionatoIniziale }: {
  tipologie: Tipologia[]; campionati: Campionato[]; campionatoIniziale?: string;
}) {
  const iniziale = campionati.find((c) => c.id === campionatoIniziale);
  const [tipologiaId, setTipologiaId] = useState(iniziale?.tipologiaId ?? tipologie[0]?.tipologiaId ?? '');
  const [tipo, setTipo] = useState<'CAMPIONATO' | 'OPEN'>(iniziale ? 'CAMPIONATO' : campionati.length ? 'CAMPIONATO' : 'OPEN');
  const disponibili = campionati.filter((c) => c.tipologiaId === tipologiaId);
  const [campionatoId, setCampionatoId] = useState(iniziale?.id ?? disponibili[0]?.id ?? '');
  const [nome, setNome] = useState('');
  const [inizio, setInizio] = useState('');
  const ancora = useRef<HTMLDivElement>(null);

  // se cambia la tipologia, il campionato scelto deve essere di quella tipologia
  useEffect(() => {
    if (!disponibili.some((c) => c.id === campionatoId)) setCampionatoId(disponibili[0]?.id ?? '');
  }, [tipologiaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // nome e data dell'evento stanno in altri campi dello stesso modulo: li si segue per collocare la tappa
  useEffect(() => {
    const form = ancora.current?.closest('form');
    if (!form) return;
    const leggi = () => {
      setNome((form.elements.namedItem('nome') as HTMLInputElement | null)?.value ?? '');
      setInizio((form.elements.namedItem('inizio') as HTMLInputElement | null)?.value ?? '');
    };
    leggi();
    form.addEventListener('input', leggi);
    return () => form.removeEventListener('input', leggi);
  }, []);

  const versione = tipologie.find((t) => t.tipologiaId === tipologiaId)?.versioneId ?? '';
  const scelto = disponibili.find((c) => c.id === campionatoId);
  const tappe = scelto
    ? [...scelto.tappe.map((t) => ({ ...t, nuova: false })), { nome: nome || 'Questa gara', inizio: inizio || '9999', nuova: true }]
        .sort((a, b) => a.inizio.localeCompare(b.inizio))
    : [];

  return (
    <div ref={ancora} className="space-y-3">
      <div>
        <label className="etichetta">Tipologia di gara</label>
        <select className="campo" value={tipologiaId} onChange={(e) => setTipologiaId(e.target.value)}>
          {tipologie.map((t) => <option key={t.tipologiaId} value={t.tipologiaId}>{t.etichetta}</option>)}
        </select>
        <input type="hidden" name="versioneTipologiaId" value={versione} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {([['CAMPIONATO', 'Tappa di campionato'], ['OPEN', 'Gara open']] as const).map(([v, t]) => (
          <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${tipo === v ? 'border-accento bg-accento/10 font-semibold' : 'border-bordo'}`}>
            <input type="radio" name="tipoGara" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="h-4 w-4" /> {t}
          </label>
        ))}
      </div>

      {tipo === 'CAMPIONATO' && (
        disponibili.length === 0 ? (
          <p className="text-sm text-avviso">Nessun campionato per questa tipologia: crealo in Campionati, oppure scegli «Gara open».</p>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="etichetta">Campionato</label>
              <select name="campionatoId" className="campo" value={campionatoId} onChange={(e) => setCampionatoId(e.target.value)}>
                {disponibili.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.stagione}</option>)}
              </select>
            </div>
            <ol className="rounded-lg border border-bordo p-2 text-sm">
              {tappe.map((t, i) => (
                <li key={i} className={`flex gap-3 rounded px-2 py-1 ${t.nuova ? 'bg-accento/15 font-semibold text-accento' : 'text-tenue'}`}>
                  <span className="w-16">Tappa {i + 1}</span>
                  <span className="w-28">{t.inizio === '9999' ? 'data da scegliere' : fmt.format(new Date(t.inizio))}</span>
                  <span>{t.nome}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-tenue">Il numero della tappa segue l’ordine delle date: se cambi la data, cambia anche il numero.</p>
          </div>
        )
      )}
    </div>
  );
}
