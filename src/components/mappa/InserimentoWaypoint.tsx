'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { arrotonda, CampoNascosto, fmtPunto, icona, RicercaLuogo, useMappa, type Punto } from './base';

type Waypoint = Punto & { codice: string; nome: string };

/**
 * Waypoint in serie (C1-28): ogni clic sulla mappa ne aggiunge uno (WP1, WP2…), trascinabile;
 * nell'elenco si rinominano o si tolgono. Si salvano tutti insieme col «Salva» in alto.
 */
export function InserimentoWaypoint({ esistenti, campo, prefisso: p0 }: {
  esistenti: (Punto & { codice: string })[]; campo: Punto | null; prefisso: string;
}) {
  const div = useRef<HTMLDivElement>(null);
  const m = useMappa(div, esistenti[0] ?? campo, 15);
  const [prefisso, setPrefisso] = useState(p0);
  const [wp, setWp] = useState<Waypoint[]>([]);
  const strato = useRef<Leaflet.LayerGroup | null>(null);

  // il primo numero libero dopo quelli già usati con questo prefisso
  const numeroDa = (x: Waypoint[]) => {
    const usati = [...esistenti.map((e) => e.codice), ...x.map((w) => w.codice)]
      .map((c) => (c.startsWith(prefisso) ? Number(c.slice(prefisso.length)) : 0)).filter(Number.isFinite);
    return Math.max(0, ...usati) + 1;
  };
  const ref = useRef({ numeroDa, prefisso });
  ref.current = { numeroDa, prefisso };

  useEffect(() => {
    if (!m) return;
    const clic = (e: Leaflet.LeafletMouseEvent) => {
      const p = { lat: arrotonda(e.latlng.lat), lon: arrotonda(e.latlng.lng) };
      setWp((x) => {
        const n = ref.current.numeroDa(x);
        return [...x, { ...p, codice: `${ref.current.prefisso}${n}`, nome: `Waypoint ${n}` }];
      });
    };
    m.mappa.on('click', clic);
    return () => { m.mappa.off('click', clic); };
  }, [m]);

  useEffect(() => {
    if (!m) return;
    const { L, mappa } = m;
    strato.current?.remove();
    const g = L.layerGroup().addTo(mappa);
    strato.current = g;
    if (campo) L.marker([campo.lat, campo.lon], { icon: icona(L, 'CAMPO', '#556052', false), interactive: false }).addTo(g);
    esistenti.forEach((o) => L.marker([o.lat, o.lon], { icon: icona(L, o.codice, '#3a4636', false), interactive: false }).addTo(g));
    wp.forEach((w, i) => {
      L.marker([w.lat, w.lon], { icon: icona(L, w.codice, '#b6d36b'), draggable: true })
        .on('dragend', (e) => {
          const ll = (e.target as Leaflet.Marker).getLatLng();
          setWp((x) => x.map((y, j) => (j === i ? { ...y, lat: arrotonda(ll.lat), lon: arrotonda(ll.lng) } : y)));
        })
        .addTo(g);
    });
  }, [m, wp, esistenti, campo]);

  const cambia = (i: number, v: Partial<Waypoint>) => setWp((x) => x.map((y, j) => (j === i ? { ...y, ...v } : y)));

  return (
    <div className="space-y-3">
      <CampoNascosto name="waypoint" valore={JSON.stringify(wp)} />
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <RicercaLuogo onTrovato={(p) => m?.mappa.setView([p.lat, p.lon], 16)} />
        <label className="text-sm">
          <span className="sr-only">Prefisso dei codici</span>
          <input value={prefisso} onChange={(e) => setPrefisso(e.target.value.toUpperCase().replace(/\s+/g, ''))} onInput={(e) => e.stopPropagation()}
            className="campo font-mono" title="Prefisso dei codici (WP → WP1, WP2…)" />
        </label>
      </div>
      <p className="text-sm text-tenue">Clicca sulla mappa nei punti dei waypoint: ogni clic ne aggiunge uno. Trascinali per correggere la posizione.</p>
      <div ref={div} className="h-96 w-full overflow-hidden rounded-lg border border-bordo sm:h-[30rem]" />
      {wp.length > 0 && (
        <ol className="space-y-1.5">
          {wp.map((w, i) => (
            <li key={i} className="grid items-center gap-2 sm:grid-cols-[6rem_1fr_11rem_auto]">
              <input value={w.codice} onChange={(e) => cambia(i, { codice: e.target.value.toUpperCase() })} className="campo py-1.5 font-mono" aria-label="Codice" />
              <input value={w.nome} onChange={(e) => cambia(i, { nome: e.target.value })} className="campo py-1.5" aria-label="Nome" />
              <span className="font-mono text-xs text-tenue">{fmtPunto(w)}</span>
              <button type="button" onClick={() => setWp((x) => x.filter((_, j) => j !== i))} className="px-2 text-tenue hover:text-errore" aria-label={`Togli ${w.codice}`}>✕</button>
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm">{wp.length ? <><b>{wp.length}</b> da creare: premi <b>Salva</b> in alto.</> : 'Nessun waypoint ancora.'}</p>
    </div>
  );
}
