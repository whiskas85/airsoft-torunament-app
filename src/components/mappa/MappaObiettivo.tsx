'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { arrotonda, CampoNascosto, fmtPunto, icona, RicercaLuogo, useMappa, type Punto } from './base';

export type Porta = Punto & { nome: string; descrizione: string };
type Contesto = { campo: Punto | null; parcheggi: (Punto & { nome: string })[]; altri: (Punto & { codice: string })[] };

/** Un punto spostato di `metri` verso nord (positivo) o sud (negativo). */
const spostaNord = (p: Punto, metri: number): Punto => ({ lat: arrotonda(p.lat + metri / 111_320), lon: p.lon });

/**
 * L'obiettivo sulla mappa (C1-23, C1-24, C1-25): centro, area di esecuzione e zona obiettivo come due cerchi,
 * Porta IN e Porta OUT trascinabili, con nome e indicazioni per le squadre.
 * Fissato il centro, l'app propone le porte sul bordo della zona obiettivo (IN a sud, OUT a nord).
 */
export function MappaObiettivo({
  centro: c0, esecuzioneM: e0, zonaM: z0, portaIn: in0, portaOut: out0, contesto,
}: {
  centro: Punto | null; esecuzioneM: number; zonaM: number; portaIn: Porta | null; portaOut: Porta | null; contesto: Contesto;
}) {
  const div = useRef<HTMLDivElement>(null);
  const m = useMappa(div, c0 ?? contesto.campo, 17);
  const [centro, setCentro] = useState<Punto | null>(c0);
  const [esecuzione, setEsecuzione] = useState(e0);
  const [zona, setZona] = useState(z0);
  const [portaIn, setPortaIn] = useState<Porta | null>(in0);
  const [portaOut, setPortaOut] = useState<Porta | null>(out0);
  const [modo, setModo] = useState<'centro' | 'in' | 'out'>(c0 ? 'in' : 'centro');
  const strato = useRef<Leaflet.LayerGroup | null>(null);
  const proponiPorte = (p: Punto) => {
    setPortaIn((x) => ({ nome: x?.nome || 'Porta IN', descrizione: x?.descrizione ?? '', ...spostaNord(p, -zona) }));
    setPortaOut((x) => ({ nome: x?.nome || 'Porta OUT', descrizione: x?.descrizione ?? '', ...spostaNord(p, zona) }));
  };
  const fissaCentro = (p: Punto) => {
    setCentro(p);
    if (!portaIn && !portaOut) proponiPorte(p);
    setModo('in');
  };

  const stato = useRef({ modo, fissaCentro });
  stato.current = { modo, fissaCentro };
  useEffect(() => {
    if (!m) return;
    const clic = (e: Leaflet.LeafletMouseEvent) => {
      const p = { lat: arrotonda(e.latlng.lat), lon: arrotonda(e.latlng.lng) };
      const { modo: q, fissaCentro: f } = stato.current;
      if (q === 'centro') f(p);
      else if (q === 'in') setPortaIn((x) => ({ nome: x?.nome || 'Porta IN', descrizione: x?.descrizione ?? '', ...p }));
      else setPortaOut((x) => ({ nome: x?.nome || 'Porta OUT', descrizione: x?.descrizione ?? '', ...p }));
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
    const trascina = (fissa: (p: Punto) => void) => (e: Leaflet.LeafletEvent) => {
      const ll = (e.target as Leaflet.Marker).getLatLng();
      fissa({ lat: arrotonda(ll.lat), lon: arrotonda(ll.lng) });
    };
    // contesto, in tenue: campo, parcheggi, gli altri obiettivi
    if (contesto.campo) L.marker([contesto.campo.lat, contesto.campo.lon], { icon: icona(L, 'CAMPO', '#556052', false), interactive: false }).addTo(g);
    contesto.parcheggi.forEach((p, i) => L.marker([p.lat, p.lon], { icon: icona(L, `P${i + 1}`, '#2b5b8f', false) }).bindTooltip(p.nome).addTo(g));
    contesto.altri.forEach((o) => L.marker([o.lat, o.lon], { icon: icona(L, o.codice, '#3a4636', false) }).addTo(g));

    if (centro) {
      L.circle([centro.lat, centro.lon], { radius: zona, color: '#e8a33d', weight: 2, dashArray: '6 6', fillOpacity: 0.05 }).bindTooltip(`Zona obiettivo · ${zona} m`).addTo(g);
      L.circle([centro.lat, centro.lon], { radius: esecuzione, color: '#e0584b', weight: 2, fillOpacity: 0.15 }).bindTooltip(`Area di esecuzione · ${esecuzione} m`).addTo(g);
      L.marker([centro.lat, centro.lon], { icon: icona(L, 'OBJ'), draggable: true }).on('dragend', trascina(setCentro)).addTo(g);
    }
    if (portaIn) L.marker([portaIn.lat, portaIn.lon], { icon: icona(L, 'IN', '#6bd38a'), draggable: true }).on('dragend', trascina((p) => setPortaIn((x) => x && { ...x, ...p }))).addTo(g);
    if (portaOut) L.marker([portaOut.lat, portaOut.lon], { icon: icona(L, 'OUT', '#e0584b', false), draggable: true }).on('dragend', trascina((p) => setPortaOut((x) => x && { ...x, ...p }))).addTo(g);
  }, [m, centro, esecuzione, zona, portaIn, portaOut]); // eslint-disable-line react-hooks/exhaustive-deps

  const porta = (titolo: string, p: Porta | null, set: (f: (x: Porta | null) => Porta | null) => void, colore: string) => (
    <div className="space-y-1.5 rounded-lg border border-bordo p-2">
      <div className="flex items-center gap-2 text-sm">
        <span className={`pill ${colore}`}>{titolo}</span>
        <span className="font-mono text-xs text-tenue">{fmtPunto(p)}</span>
        {p && <button type="button" onClick={() => set(() => null)} className="ml-auto text-xs text-tenue hover:text-errore">togli</button>}
      </div>
      {p ? (
        <>
          <input value={p.nome} onChange={(e) => set((x) => x && { ...x, nome: e.target.value })} className="campo py-1.5" aria-label={`Testo della ${titolo}`} />
          <input value={p.descrizione} onChange={(e) => set((x) => x && { ...x, descrizione: e.target.value })} className="campo py-1.5"
            placeholder="Indicazioni per le squadre (es. cancello verde dopo il ponte)" aria-label={`Descrizione della ${titolo}`} />
        </>
      ) : (
        <p className="text-xs text-tenue">Scegli «{titolo}» qui sopra e clicca sulla mappa.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <CampoNascosto name="lat" valore={centro ? String(centro.lat) : ''} />
      <CampoNascosto name="lon" valore={centro ? String(centro.lon) : ''} />
      <CampoNascosto name="portaIn" valore={portaIn ? JSON.stringify(portaIn) : ''} />
      <CampoNascosto name="portaOut" valore={portaOut ? JSON.stringify(portaOut) : ''} />

      <RicercaLuogo onTrovato={(p) => m?.mappa.setView([p.lat, p.lon], 17)} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-tenue">Clic sulla mappa:</span>
        {([['centro', 'centro obiettivo'], ['in', 'Porta IN'], ['out', 'Porta OUT']] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setModo(v)}
            className={`rounded-full px-3 py-1 ${modo === v ? 'bg-accento font-semibold text-black' : 'bg-bordo text-tenue'}`}>{t}</button>
        ))}
        {centro && <button type="button" onClick={() => proponiPorte(centro)} className="ml-auto text-xs text-accento hover:underline">riproponi le porte</button>}
      </div>
      <div ref={div} className="h-80 w-full overflow-hidden rounded-lg border border-bordo sm:h-[28rem]" />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="etichetta"><span className="text-errore">●</span> Raggio area di esecuzione (m)</span>
          <input name="areaEsecuzioneM" type="number" min={1} value={esecuzione} onChange={(e) => setEsecuzione(Number(e.target.value) || 0)} className="campo" />
        </label>
        <label className="text-sm">
          <span className="etichetta"><span className="text-avviso">●</span> Raggio zona obiettivo (m)</span>
          <input name="zonaObiettivoM" type="number" min={1} value={zona} onChange={(e) => setZona(Number(e.target.value) || 0)} className="campo" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {porta('Porta IN', portaIn, setPortaIn, 'bg-ok text-black')}
        {porta('Porta OUT', portaOut, setPortaOut, 'bg-errore')}
      </div>
    </div>
  );
}
