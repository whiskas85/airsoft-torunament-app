import Link from 'next/link';
import { richiediUtente } from '@/lib/auth';
import { mieiEventi, NOME_RUOLO, NOME_STATO_EVENTO } from '@/lib/ruoli';
import { fmtDataOra } from '@/lib/formato';
import { Intestazione } from '@/components/Intestazione';

export default async function Home() {
  const u = await richiediUtente();
  const eventi = await mieiEventi(u);
  const admin = u.ruoli.filter((r) => r.ruolo === 'AMMINISTRATORE');

  return (
    <>
      <Intestazione utente={u} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section>
          <h1 className="text-xl font-bold">Ciao {u.persona.nome}</h1>
          <p className="text-sm text-tenue">I tuoi eventi e il tuo ruolo in ciascuno.</p>
        </section>

        {admin.length > 0 && (
          <section className="carta flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <div className="font-semibold">Configurazione dell&apos;ente</div>
              <div className="text-sm text-tenue">{admin.map((r) => r.ente.nome).join(', ')}</div>
            </div>
            <Link href="/configurazione" className="bottone-sec">Tipologie e template</Link>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2">
          {eventi.length === 0 && <p className="text-tenue">Nessun evento per te, per ora.</p>}
          {eventi.map((e) => (
            <Link key={e.id} href={`/eventi/${e.codice}`} className="carta block transition hover:ring-1 hover:ring-accento">
              <div className="flex items-start gap-2">
                <span className="pill bg-accento text-black">{e.versioneTipologia.tipologia.codice}</span>
                <span className="pill bg-bordo text-tenue">{NOME_STATO_EVENTO[e.stato]}</span>
                <span className="ml-auto font-mono text-xs text-tenue">{e.codice}</span>
              </div>
              <div className="mt-2 text-lg font-semibold">{e.nome}</div>
              <div className="text-sm text-tenue">{fmtDataOra(e.inizio)} · {e.luogo}</div>
              <div className="mt-1 text-sm text-tenue">{e._count.obiettivi} obiettivi · {e._count.squadre} squadre</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.ruoli.map((r) => (
                  <span key={r} className="pill bg-bordo text-testo">
                    {NOME_RUOLO[r]}{r === 'SQUADRA' && e.miaSquadra ? ` · ${e.miaSquadra.nome}` : ''}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
