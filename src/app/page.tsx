import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { mieiEventi, NOME_RUOLO, NOME_STATO_EVENTO } from '@/lib/ruoli';
import { fmtDataOra } from '@/lib/formato';
import { Intestazione } from '@/components/Intestazione';
import { RispostaDesignazione } from '@/components/RispostaDesignazione';

export default async function Home() {
  const u = await richiediUtente();
  const eventi = await mieiEventi(u);
  const admin = u.ruoli.filter((r) => r.ruolo === 'AMMINISTRATORE');

  // designazioni arbitrali che aspettano una risposta
  const designazioni = await prisma.arbitroEvento.findMany({
    where: { personaId: u.personaId, stato: 'PROPOSTA', evento: { stato: { in: ['BOZZA', 'PUBBLICATO'] } } },
    include: { evento: true },
  });

  // eventi pubblicati aperti al coordinamento delle mie squadre, a cui non sono ancora iscritto
  const mieSquadre = await prisma.squadra.findMany({ where: { membri: { some: { personaId: u.personaId, al: null } } } });
  const iscrivibili = mieSquadre.length
    ? await prisma.evento.findMany({
        where: {
          stato: 'PUBBLICATO',
          id: { notIn: eventi.map((e) => e.id) },
          OR: mieSquadre.map((s) => ({ enteId: s.enteId, OR: [{ coordinamenti: { none: {} } }, { coordinamenti: { some: { coordinamentoId: s.coordinamentoId ?? '' } } }] })),
        },
        include: { versioneTipologia: { include: { tipologia: true } } },
        orderBy: { inizio: 'asc' },
      })
    : [];

  return (
    <>
      <Intestazione utente={u} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section>
          <h1 className="text-xl font-bold">Ciao {u.persona.nome}</h1>
          <p className="text-sm text-tenue">I tuoi eventi e il tuo ruolo in ciascuno.</p>
        </section>

        {designazioni.map((d) => (
          <section key={d.id} className="carta space-y-2 ring-1 ring-avviso">
            <div className="font-semibold">Designazione arbitrale: {d.evento.nome}</div>
            <div className="text-sm text-tenue">{fmtDataOra(d.evento.inizio)} → {fmtDataOra(d.evento.fine)}{d.evento.luogo ? ` · ${d.evento.luogo}` : ''} · ruoli: {d.ruoli.join(', ').toLowerCase()}</div>
            <RispostaDesignazione arbitroEventoId={d.id} />
          </section>
        ))}

        {admin.length > 0 && (
          <section className="carta flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <div className="font-semibold">Ente</div>
              <div className="text-sm text-tenue">{admin.map((r) => r.ente.nome).join(', ')}</div>
            </div>
            <Link href="/configurazione" className="bottone-sec">Tipologie e template</Link>
            <Link href="/eventi/nuovo" className="bottone">Nuovo evento</Link>
          </section>
        )}

        {iscrivibili.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold">Eventi aperti alle iscrizioni</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {iscrivibili.map((e) => (
                <Link key={e.id} href={`/eventi/${e.codice}/squadre`} className="carta block ring-1 ring-avviso hover:ring-accento">
                  <span className="pill bg-accento text-black">{e.versioneTipologia.tipologia.codice}</span>
                  <div className="mt-2 text-lg font-semibold">{e.nome}</div>
                  <div className="text-sm text-tenue">{fmtDataOra(e.inizio)}{e.luogo ? ` · ${e.luogo}` : ''}</div>
                  <div className="mt-2 text-sm text-avviso">Iscrivi la squadra →</div>
                </Link>
              ))}
            </div>
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
              <div className="text-sm text-tenue">{fmtDataOra(e.inizio)}{e.luogo ? ` · ${e.luogo}` : ''}</div>
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
