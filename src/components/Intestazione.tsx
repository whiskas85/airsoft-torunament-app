import Link from 'next/link';
import { esci } from '@/actions/auth';
import type { UtenteCorrente } from '@/lib/auth';

export function Intestazione({ utente }: { utente: UtenteCorrente }) {
  return (
    <header className="sticky top-0 z-10 border-b border-bordo bg-fondo/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="font-bold tracking-wide">TOURNAMENT<span className="text-accento">APP</span></Link>
        <span className="pill bg-bordo text-tenue">v0.1 · M1</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-tenue sm:inline">{utente.persona.nome} {utente.persona.cognome}</span>
          <form action={esci}><button className="bottone-sec px-3 py-1.5 text-sm">Esci</button></form>
        </div>
      </div>
    </header>
  );
}
