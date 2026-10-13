'use client';

import { useRef, useState } from 'react';
import { CampoNascosto } from './mappa/base';

export type FaseModulo = { nome: string; punti: number | null };

/**
 * Le fasi E di un obiettivo come elenco di caselle (C1-22): nome e punti per riga, «+ Aggiungi fase»,
 * e riordino trascinando **solo la maniglia** (funziona anche col dito). I codici E1, E2… seguono l'ordine.
 * Il valore viaggia in un campo nascosto `fasi` (JSON) del modulo.
 */
export function ElencoFasi({ iniziali }: { iniziali: FaseModulo[] }) {
  const [fasi, setFasi] = useState<FaseModulo[]>(iniziali);
  const [trascinata, setTrascinata] = useState<number | null>(null);
  const righe = useRef<(HTMLLIElement | null)[]>([]);

  const cambia = (i: number, f: Partial<FaseModulo>) => setFasi((x) => x.map((y, j) => (j === i ? { ...y, ...f } : y)));

  // trascinamento con i pointer event: la riga sotto il dito prende il posto di quella trascinata
  const inizia = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setTrascinata(i);
  };
  const muovi = (e: React.PointerEvent) => {
    if (trascinata === null) return;
    const sotto = righe.current.findIndex((r) => {
      if (!r) return false;
      const b = r.getBoundingClientRect();
      return e.clientY >= b.top && e.clientY <= b.bottom;
    });
    if (sotto === -1 || sotto === trascinata) return;
    setFasi((x) => {
      const y = [...x];
      const [f] = y.splice(trascinata, 1);
      y.splice(sotto, 0, f);
      return y;
    });
    setTrascinata(sotto);
  };
  const finisci = () => setTrascinata(null);

  return (
    <div className="space-y-2">
      <CampoNascosto name="fasi" valore={JSON.stringify(fasi)} />
      {fasi.length === 0 && <p className="text-sm text-tenue">Nessuna fase.</p>}
      <ol className="space-y-1.5">
        {fasi.map((f, i) => (
          <li
            key={i}
            ref={(el) => { righe.current[i] = el; }}
            className={`flex items-center gap-2 rounded-lg border p-1.5 ${trascinata === i ? 'border-accento bg-accento/10' : 'border-bordo bg-fondo'}`}
          >
            <button
              type="button"
              aria-label={`Trascina per spostare E${i + 1}`}
              title="Trascina per riordinare"
              onPointerDown={inizia(i)}
              onPointerMove={muovi}
              onPointerUp={finisci}
              onPointerCancel={finisci}
              className="cursor-grab touch-none select-none px-1.5 text-lg leading-none text-tenue active:cursor-grabbing"
            >
              ⠿
            </button>
            <span className="w-8 font-mono text-sm font-semibold text-accento">E{i + 1}</span>
            <input
              value={f.nome}
              onChange={(e) => cambia(i, { nome: e.target.value })}
              placeholder="Cosa deve fare la squadra (es. Disinnesca la bomba)"
              className="campo min-w-0 flex-1 py-1.5"
              aria-label={`Descrizione della fase E${i + 1}`}
            />
            <input
              type="number"
              value={f.punti ?? ''}
              onChange={(e) => cambia(i, { punti: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="punti"
              className="campo w-24 py-1.5"
              aria-label={`Punti della fase E${i + 1}`}
            />
            <button type="button" onClick={() => setFasi((x) => x.filter((_, j) => j !== i))} className="px-2 text-tenue hover:text-errore" aria-label={`Togli E${i + 1}`} title="Togli">✕</button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => setFasi((x) => [...x, { nome: '', punti: null }])} className="bottone-sec px-3 py-1.5 text-sm">+ Aggiungi fase</button>
    </div>
  );
}
