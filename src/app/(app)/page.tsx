import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { mieiEventi } from '@/lib/ruoli';
import { fmtDataOra } from '@/lib/formato';
import { RispostaDesignazione } from '@/components/RispostaDesignazione';
import { SchedaEvento } from '@/components/SchedaEvento';
import { Icona } from '@/components/Intestazione';

/** Pagina iniziale: le cose da fare subito e i pulsanti per arrivare dappertutto (C1-01). */
export default async function Home() {
  const u = await richiediUtente();
  const eventi = await mieiEventi(u);
  const admin = u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE');

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

  // prossimi eventi: da ieri in avanti, i primi quattro
  const ieri = Date.now() - 86400_000;
  const prossimi = eventi.filter((e) => +e.fine >= ieri && e.stato !== 'ANNULLATO').slice(0, 4);
  const inCampo = eventi.some((e) => e.ruoli.includes('ARBITRO') || e.ruoli.includes('SQUADRA'));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">Ciao {u.persona.nome}</h1>

      {admin && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/eventi/nuovo" className="carta flex flex-col items-start gap-2 bg-accento text-black transition hover:brightness-110">
            <span className="text-3xl leading-none">+</span>
            <span className="font-semibold">Nuovo evento</span>
          </Link>
          {[
            { href: '/eventi', testo: 'Eventi', icona: 'eventi' as const },
            { href: '/campionati', testo: 'Campionati', icona: 'coppa' as const },
            { href: '/impostazioni', testo: 'Impostazioni', icona: 'ingranaggio' as const },
          ].map((v) => (
            <Link key={v.href} href={v.href} className="carta flex flex-col items-start gap-2 transition hover:ring-1 hover:ring-accento">
              <Icona nome={v.icona} classe="h-7 w-7 text-accento" />
              <span className="font-semibold">{v.testo}</span>
            </Link>
          ))}
        </section>
      )}

      {designazioni.map((d) => (
        <section key={d.id} className="carta space-y-2 ring-1 ring-avviso">
          <div className="font-semibold">Designazione arbitrale: {d.evento.nome}</div>
          <div className="text-sm text-tenue">{fmtDataOra(d.evento.inizio)} → {fmtDataOra(d.evento.fine)}{d.evento.luogo ? ` · ${d.evento.luogo}` : ''} · ruoli: {d.ruoli.join(', ').toLowerCase()}</div>
          <RispostaDesignazione arbitroEventoId={d.id} />
        </section>
      ))}

      {iscrivibili.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Aperti alle iscrizioni</h2>
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

      {inCampo && (
        <section className="carta flex flex-wrap items-center gap-3 ring-1 ring-accento">
          <div className="mr-auto">
            <div className="font-semibold">App di campo</div>
            <div className="text-sm text-tenue">Per arbitri e squadre: funziona anche senza rete. Aprila una volta con la rete e aggiungila alla schermata Home.</div>
          </div>
          <Link href="/campo" className="bottone">Apri</Link>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-baseline">
          <h2 className="font-semibold">Prossimi eventi</h2>
          <Link href="/eventi" className="link ml-auto text-sm">Tutti gli eventi →</Link>
        </div>
        {prossimi.length === 0 && <p className="text-tenue">Nessun evento in programma.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {prossimi.map((e) => <SchedaEvento key={e.id} e={e} />)}
        </div>
      </section>
    </main>
  );
}
