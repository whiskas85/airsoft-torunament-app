'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { arrotonda, CampoNascosto, fmtPunto, icona, RicercaLuogo, useMappa, type Punto } from './base';

export type Parcheggio = Punto & { nome: string; descrizione: string };

/**
 * Il campo di gara sulla mappa e i parcheggi per le squadre (C1-16, C1-17).
 * I dati viaggiano in campi nascosti del modulo (lat, lon, parcheggi in JSON), salvati dal «Salva» in alto.
 */
export function MappaEvento({ campo, parcheggi: iniziali }: { campo: Punto | null; parcheggi: Parcheggio[] }) {
  const div = useRef<HTMLDivElement>(null);
  const m = useMappa(div, campo, 15);
  const [centro, setCentro] = useState<Punto | null>(campo);
  const [parcheggi, setParcheggi] = useState<Parcheggio[]>(iniziali);
  const [modo, setModo] = useState<'campo' | 'parcheggio'>(campo ? 'parcheggio' : 'campo');
  const strato = useRef<Leaflet.LayerGroup | null>(null);
  // clic sulla mappa: posiziona il campo o aggiunge un parcheggio
  const modoRef = useRef(modo);
  modoRef.current = modo;
  useEffect(() => {
    if (!m) return;
    const clic = (e: Leaflet.LeafletMouseEvent) => {
      const p = { lat: arrotonda(e.latlng.lat), lon: arrotonda(e.latlng.lng) };
      if (modoRef.current === 'campo') { setCentro(p); setModo('parcheggio'); }
      else setParcheggi((x) => [...x, { ...p, nome: `Parcheggio ${x.length + 1}`, descrizione: '' }]);
    };
    m.mappa.on('click', clic);
    return () => { m.mappa.off('click', clic); };
  }, [m]);

  // disegno: si ridisegna tutto a ogni cambiamento (sono pochi punti)
  useEffect(() => {
    if (!m) return;
    const { L, mappa } = m;
    strato.current?.remove();
    const g = L.layerGroup().addTo(mappa);
    strato.current = g;
    if (centro) {
      L.marker([centro.lat, centro.lon], { icon: icona(L, 'CAMPO'), draggable: true })
        .on('dragend', (e) => { const ll = (e.target as Leaflet.Marker).getLatLng(); setCentro({ lat: arrotonda(ll.lat), lon: arrotonda(ll.lng) }); })
        .addTo(g);
    }
    parcheggi.forEach((p, i) => {
      L.marker([p.lat, p.lon], { icon: icona(L, `P${i + 1}`, '#3d8fe8', false), draggable: true })
        .bindTooltip(p.nome)
        .on('dragend', (e) => {
          const ll = (e.target as Leaflet.Marker).getLatLng();
          setParcheggi((x) => x.map((y, j) => (j === i ? { ...y, lat: arrotonda(ll.lat), lon: arrotonda(ll.lng) } : y)));
        })
        .addTo(g);
    });
  }, [m, centro, parcheggi]);

  const vai = (p: Punto) => { m?.mappa.setView([p.lat, p.lon], 16); if (!centro) setCentro(p); };

  return (
    <div className="space-y-2">
      <CampoNascosto name="lat" valore={centro ? String(centro.lat) : ''} />
      <CampoNascosto name="lon" valore={centro ? String(centro.lon) : ''} />
      <CampoNascosto name="parcheggi" valore={JSON.stringify(parcheggi)} />

      <RicercaLuogo onTrovato={(p) => vai(p)} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-tenue">Clic sulla mappa:</span>
        {([['campo', 'posiziona il campo'], ['parcheggio', 'aggiungi un parcheggio']] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setModo(v)}
            className={`rounded-full px-3 py-1 ${modo === v ? 'bg-accento font-semibold text-black' : 'bg-bordo text-tenue'}`}>{t}</button>
        ))}
        <span className="ml-auto font-mono text-xs text-tenue">campo: {fmtPunto(centro)}</span>
      </div>
      <div ref={div} className="h-80 w-full overflow-hidden rounded-lg border border-bordo sm:h-96" />

      {parcheggi.length > 0 && (
        <ul className="space-y-2">
          {parcheggi.map((p, i) => (
            <li key={i} className="grid items-center gap-2 sm:grid-cols-[2.5rem_12rem_1fr_auto]">
              <span className="pill w-fit bg-[#3d8fe8] text-white">P{i + 1}</span>
              <input value={p.nome} onChange={(e) => setParcheggi((x) => x.map((y, j) => (j === i ? { ...y, nome: e.target.value } : y)))}
                className="campo py-1.5" aria-label="Nome del parcheggio" />
              <input value={p.descrizione} placeholder="Indicazioni per le squadre (es. accesso dalla SP23)"
                onChange={(e) => setParcheggi((x) => x.map((y, j) => (j === i ? { ...y, descrizione: e.target.value } : y)))}
                className="campo py-1.5" aria-label="Descrizione del parcheggio" />
              <button type="button" onClick={() => setParcheggi((x) => x.filter((_, j) => j !== i))} className="bottone-sec px-3 py-1.5 text-sm">Togli</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
