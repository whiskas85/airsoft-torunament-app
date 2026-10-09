'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { esci } from '@/actions/auth';
import type { Icona as NomeIcona, VoceMenu } from '@/lib/menu';
import { PulsanteSalva } from './Salvataggio';

const attiva = (attuale: string, href: string) => (href === '/' ? attuale === '/' : attuale.startsWith(href));

/** Intestazione fissa: logo, menu (su computer), «Salva» sempre visibile, profilo. */
export function Intestazione({ voci, nome, iniziali }: { voci: VoceMenu[]; nome: string; iniziali: string }) {
  const attuale = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-bordo bg-fondo/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
        <Link href="/" className="mr-2 font-bold tracking-wide">TOURNAMENT<span className="text-accento">APP</span></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {voci.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className={`rounded-lg px-3 py-2 text-sm ${attiva(attuale, v.href) ? 'bg-bordo font-semibold text-testo' : 'text-tenue hover:text-testo'}`}
            >
              {v.etichetta}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <PulsanteSalva />
          <MenuUtente nome={nome} iniziali={iniziali} />
        </div>
      </div>
    </header>
  );
}

function MenuUtente({ nome, iniziali }: { nome: string; iniziali: string }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-bordo text-sm font-bold uppercase" title={nome}>
        {iniziali}
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-bordo bg-carta p-2 shadow-xl">
        <div className="px-3 py-2 text-sm text-tenue">{nome}</div>
        <Link href="/profilo" className="block rounded-lg px-3 py-2 text-sm hover:bg-bordo">Il mio profilo</Link>
        <form action={esci}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bordo">Esci</button>
        </form>
      </div>
    </details>
  );
}

/** Sul telefono il menu sta in basso, a portata di pollice. */
export function BarraInBasso({ voci }: { voci: VoceMenu[] }) {
  const attuale = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-bordo bg-fondo/95 backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${voci.length}, 1fr)`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {voci.map((v) => (
        <Link key={v.href} href={v.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${attiva(attuale, v.href) ? 'text-accento' : 'text-tenue'}`}>
          <Icona nome={v.icona} />
          {v.etichetta}
        </Link>
      ))}
    </nav>
  );
}

const TRACCE: Record<NomeIcona, string> = {
  casa: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  eventi: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
  coppa: 'M8 4h8v5a4 4 0 01-8 0zM8 6H4a3 3 0 003 4M16 6h4a3 3 0 01-3 4M12 13v4M8 20h8',
  ingranaggio: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  campo: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
};

export function Icona({ nome, classe = 'h-5 w-5' }: { nome: NomeIcona; classe?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={classe} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={TRACCE[nome]} />
    </svg>
  );
}
