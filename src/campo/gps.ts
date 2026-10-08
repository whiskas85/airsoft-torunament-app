'use client';

import type { Gps } from '@/lib/campo/operazione';

/**
 * Posizione al momento dell'operazione (P8). Se il GPS non risponde in tempo o è negato
 * restituisce null: l'operazione non si blocca, ma risulterà "GPS non disponibile".
 */
export function posizione(timeoutMs = 6000): Promise<Gps> {
  return new Promise((risolvi) => {
    if (!('geolocation' in navigator)) return risolvi(null);
    navigator.geolocation.getCurrentPosition(
      (p) => risolvi({
        lat: Math.round(p.coords.latitude * 1e6) / 1e6,
        lon: Math.round(p.coords.longitude * 1e6) / 1e6,
        precisioneM: Math.round(p.coords.accuracy),
      }),
      () => risolvi(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
