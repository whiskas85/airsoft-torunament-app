import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tournament App',
  description: 'Gestione tornei softair: arbitri, punteggi, luci verdi, classifiche — anche offline.',
  icons: { icon: '/icona-192.png', apple: '/apple-touch-icon.png' },
  // su iPhone l'app installata in Home si apre a tutto schermo
  appleWebApp: { capable: true, title: 'Tournament', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#141a12' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
