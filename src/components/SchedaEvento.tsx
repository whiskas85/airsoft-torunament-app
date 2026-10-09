import Link from 'next/link';
import { NOME_RUOLO, NOME_STATO_EVENTO, type mieiEventi } from '@/lib/ruoli';
import { fmtDataOra } from '@/lib/formato';

type Evento = Awaited<ReturnType<typeof mieiEventi>>[number];

/** Riquadro di un evento negli elenchi: tipologia, stato, data, luogo e il mio ruolo. */
export function SchedaEvento({ e }: { e: Evento }) {
  return (
    <Link href={`/eventi/${e.codice}`} className="carta block transition hover:ring-1 hover:ring-accento">
      <div className="flex items-start gap-2">
        <span className="pill bg-accento text-black">{e.versioneTipologia.tipologia.codice}</span>
        <span className={`pill ${e.stato === 'IN_CORSO' ? 'bg-ok text-black' : 'bg-bordo text-tenue'}`}>{NOME_STATO_EVENTO[e.stato]}</span>
      </div>
      <div className="mt-2 text-lg font-semibold">{e.nome}</div>
      <div className="text-sm text-tenue">{fmtDataOra(e.inizio)}{e.luogo ? ` · ${e.luogo}` : ''}</div>
      <div className="mt-1 text-sm text-tenue">{e._count.obiettivi} obiettivi · {e._count.squadre} squadre</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {e.ruoli.filter((r) => r !== 'AMMINISTRATORE').map((r) => (
          <span key={r} className="pill bg-bordo text-testo">
            {NOME_RUOLO[r]}{r === 'SQUADRA' && e.miaSquadra ? ` · ${e.miaSquadra.nome}` : ''}
          </span>
        ))}
      </div>
    </Link>
  );
}
