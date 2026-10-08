import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tournament App',
  description: 'Gestione tornei softair: arbitri, punteggi, luci verdi, classifiche — anche offline.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#141a12' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
