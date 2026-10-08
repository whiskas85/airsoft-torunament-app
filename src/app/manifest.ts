import type { MetadataRoute } from 'next';

/** Installazione come app: si apre direttamente sul campo, a tutto schermo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tournament App',
    short_name: 'Tournament',
    description: 'Arbitri, punteggi e luci verdi. Anche senza rete.',
    start_url: '/campo',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141a12',
    theme_color: '#141a12',
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icona-mascherabile-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
