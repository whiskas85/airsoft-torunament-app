'use client';

import { useEffect, useRef } from 'react';
import { icona, useMappa, type Punto } from './base';

type Ob = Punto & { codice: string; esecuzioneM?: number | null; zonaM?: number | null; portaIn?: Punto | null; portaOut?: Punto | null; waypoint: boolean };

/** Tutto l'evento su una mappa, in sola lettura: campo, parcheggi, obiettivi con i loro cerchi e porte, waypoint. */
export function MappaPanoramica({ campo, parcheggi, obiettivi }: { campo: Punto | null; parcheggi: (Punto & { nome: string })[]; obiettivi: Ob[] }) {
  const div = useRef<HTMLDivElement>(null);
  const m = useMappa(div, campo ?? obiettivi[0] ?? null, 15);
  useEffect(() => {
    if (!m) return;
    const { L, mappa } = m;
    const g = L.layerGroup().addTo(mappa);
    const punti: [number, number][] = [];
    if (campo) { L.marker([campo.lat, campo.lon], { icon: icona(L, 'CAMPO', '#556052', false) }).addTo(g); punti.push([campo.lat, campo.lon]); }
    parcheggi.forEach((p, i) => { L.marker([p.lat, p.lon], { icon: icona(L, `P${i + 1}`, '#3d8fe8', false) }).bindTooltip(p.nome).addTo(g); punti.push([p.lat, p.lon]); });
    obiettivi.forEach((o) => {
      if (o.zonaM) L.circle([o.lat, o.lon], { radius: o.zonaM, color: '#e8a33d', weight: 1, dashArray: '4 4', fillOpacity: 0.04 }).addTo(g);
      if (o.esecuzioneM) L.circle([o.lat, o.lon], { radius: o.esecuzioneM, color: '#e0584b', weight: 1, fillOpacity: 0.12 }).addTo(g);
      if (o.portaIn) L.marker([o.portaIn.lat, o.portaIn.lon], { icon: icona(L, 'IN', '#6bd38a') }).addTo(g);
      if (o.portaOut) L.marker([o.portaOut.lat, o.portaOut.lon], { icon: icona(L, 'OUT', '#e0584b', false) }).addTo(g);
      L.marker([o.lat, o.lon], { icon: icona(L, o.codice, o.waypoint ? '#9aa78f' : '#b6d36b') }).addTo(g);
      punti.push([o.lat, o.lon]);
    });
    if (punti.length > 1) mappa.fitBounds(punti, { padding: [30, 30], maxZoom: 17 });
    return () => { g.remove(); };
  }, [m, campo, parcheggi, obiettivi]);
  return <div ref={div} className="h-72 w-full overflow-hidden rounded-lg border border-bordo sm:h-96" />;
}
