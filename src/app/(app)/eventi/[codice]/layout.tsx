import Link from 'next/link';
import { contestoEvento } from '@/lib/contesto';
import { NOME_RUOLO, NOME_STATO_EVENTO } from '@/lib/ruoli';
import { fmtDataOra } from '@/lib/formato';
import { SchedeEvento } from '@/components/SchedeEvento';

export default async function LayoutEvento({ children, params }: { children: React.ReactNode; params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { u, ev, ruoli, gestore, squadreIscrivibili } = await contestoEvento(codice);

  const schede = [{ percorso: '', etichetta: 'Panoramica' }, { percorso: '/obiettivi', etichetta: 'Obiettivi' }];
  if (gestore || ruoli.includes('SQUADRA') || squadreIscrivibili.length) {
    schede.push({ percorso: '/squadre', etichetta: 'Squadre' });
  }
  // lo staff arbitrale lo vedono solo chi gestisce e gli arbitri, non le squadre (C1-32)
  if (gestore || ruoli.includes('ARBITRO')) schede.push({ percorso: '/staff', etichetta: 'Staff' });
  schede.push({ percorso: '/documenti', etichetta: 'Documenti' });

  return (
    <>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div>
          <Link href="/eventi" className="link text-sm">← Eventi</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="pill bg-accento text-black">{ev.versioneTipologia.tipologia.codice}</span>
            <span className={`pill ${ev.stato === 'IN_CORSO' ? 'bg-ok text-black' : 'bg-bordo text-tenue'}`}>{NOME_STATO_EVENTO[ev.stato]}</span>
            {gestore && ruoli.length === 0 && <span className="pill bg-bordo">Gestione</span>}
            {ruoli.map((r) => <span key={r} className="pill bg-bordo">{NOME_RUOLO[r]}</span>)}
            <span className="ml-auto font-mono text-xs text-tenue">{ev.codice}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">{ev.nome}</h1>
          <p className="text-sm text-tenue">{fmtDataOra(ev.inizio)} → {fmtDataOra(ev.fine)}{ev.luogo ? ` · ${ev.luogo}` : ''}</p>
        </div>
        <SchedeEvento codice={ev.codice} schede={schede} />
        {children}
      </main>
    </>
  );
}
