import type { Metadata } from 'next';
import { AppCampo } from '@/campo/componenti/AppCampo';

// Pagina statica: il server non serve per aprirla, così il telefono la riapre anche offline (dal service worker)
export const dynamic = 'force-static';

export const metadata: Metadata = { title: 'Campo · Tournament App' };

export default function Campo() {
  return <AppCampo />;
}
