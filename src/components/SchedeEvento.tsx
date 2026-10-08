'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SchedeEvento({ codice, schede }: { codice: string; schede: { percorso: string; etichetta: string; avviso?: boolean }[] }) {
  const attuale = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-bordo px-4">
      {schede.map((s) => {
        const href = `/eventi/${codice}${s.percorso}`;
        const attiva = s.percorso === '' ? attuale === href : attuale.startsWith(href);
        return (
          <Link
            key={s.percorso}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${attiva ? 'border-accento font-semibold text-testo' : 'border-transparent text-tenue hover:text-testo'}`}
          >
            {s.etichetta}{s.avviso && <span className="ml-1 text-avviso">●</span>}
          </Link>
        );
      })}
    </nav>
  );
}
