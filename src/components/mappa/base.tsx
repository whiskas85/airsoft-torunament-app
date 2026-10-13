'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';

export type Punto = { lat: number; lon: number };
export type L = typeof Leaflet;

/** Centro di partenza quando non c'è ancora nessun punto: il Piemonte. */
export const CENTRO_ITALIA_NORD: Punto = { lat: 45.07, lon: 7.69 };

/**
 * Mappa Leaflet con due livelli: satellite (Esri, il più utile per un campo da softair) e stradale (OpenStreetMap).
 * Leaflet usa `window`: si carica solo nel browser.
 */
export function useMappa(contenitore: React.RefObject<HTMLDivElement | null>, centro: Punto | null, zoom = 16) {
  const [pronta, setPronta] = useState<{ L: L; mappa: Leaflet.Map } | null>(null);
  useEffect(() => {
    let mappa: Leaflet.Map | null = null;
    let annullata = false;
    import('leaflet').then((L) => {
      if (annullata || !contenitore.current) return;
      const c = centro ?? CENTRO_ITALIA_NORD;
      mappa = L.map(contenitore.current, { center: [c.lat, c.lon], zoom: centro ? zoom : 8 });
      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Immagini © Esri',
      });
      const strade = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      });
      satellite.addTo(mappa);
      L.control.layers({ Satellite: satellite, Mappa: strade }, undefined, { position: 'topright' }).addTo(mappa);
      L.control.scale({ imperial: false }).addTo(mappa);
      setPronta({ L, mappa });
    });
    return () => { annullata = true; mappa?.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return pronta;
}

/** Segnaposto con un'etichetta breve (P, IN, OUT, WP3…), senza le immagini predefinite di Leaflet. */
export function icona(L: L, testo: string, colore = '#b6d36b', scuro = true) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${colore};color:${scuro ? '#000' : '#fff'};border:2px solid #000;border-radius:999px;padding:1px 6px;font:700 11px system-ui;white-space:nowrap;transform:translate(-50%,-50%);display:inline-block;box-shadow:0 1px 4px #0008">${testo}</div>`,
    iconSize: [0, 0],
  });
}

/**
 * Campo nascosto del modulo che segue uno stato React (JSON, coordinate…). È «controllato»: React ne scrive il
 * valore a ogni render, così non torna mai al valore iniziale. Quando il valore cambia, avvisa il modulo
 * con un evento `input`, così il «Salva» sa che c'è una modifica.
 */
export function CampoNascosto({ name, valore }: { name: string; valore: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const primo = useRef(valore);
  useEffect(() => {
    if (valore === primo.current) return;
    primo.current = valore;
    ref.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, [valore]);
  return <input ref={ref} type="hidden" name={name} value={valore} readOnly />;
}

export const arrotonda = (n: number) => Math.round(n * 1e6) / 1e6;
export const fmtPunto = (p: Punto | null) => (p ? `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}` : '—');

/** «45.07, 7.68» o «45,07 7,68» → punto; altrimenti null. */
export function leggiCoordinate(testo: string): Punto | null {
  const m = testo.trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lon = Number(m[2].replace(',', '.'));
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

/** Ricerca di un luogo (OpenStreetMap Nominatim) o di coordinate scritte a mano. */
export function RicercaLuogo({ onTrovato }: { onTrovato: (p: Punto, nome?: string) => void }) {
  const [q, setQ] = useState('');
  const [risultati, setRisultati] = useState<{ nome: string; p: Punto }[]>([]);
  const [stato, setStato] = useState('');
  const cerca = async () => {
    const coord = leggiCoordinate(q);
    if (coord) { onTrovato(coord); setRisultati([]); return; }
    if (q.trim().length < 3) return;
    setStato('Cerco…');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=it&accept-language=it&q=${encodeURIComponent(q)}`);
      const dati = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      setRisultati(dati.map((d) => ({ nome: d.display_name, p: { lat: Number(d.lat), lon: Number(d.lon) } })));
      setStato(dati.length ? '' : 'Nessun luogo trovato.');
    } catch {
      setStato('Ricerca non disponibile: scrivi le coordinate, es. 45.0703, 7.6869');
    }
  };
  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => { e.stopPropagation(); setQ(e.target.value); }}
          // scrivere nella ricerca non è una modifica da salvare
          onInput={(e) => e.stopPropagation()}
          // Invio cerca, non salva il modulo
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void cerca(); } }}
          className="campo"
          placeholder="Cerca un luogo o scrivi le coordinate (45.0703, 7.6869)"
        />
        <button type="button" onClick={() => void cerca()} className="bottone-sec">Cerca</button>
      </div>
      {stato && <p className="mt-1 text-xs text-tenue">{stato}</p>}
      {risultati.length > 0 && (
        <ul className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-bordo bg-carta text-sm shadow-xl">
          {risultati.map((r) => (
            <li key={r.nome}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-bordo" onClick={() => { onTrovato(r.p, r.nome); setRisultati([]); }}>{r.nome}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
