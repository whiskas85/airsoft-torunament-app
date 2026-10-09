import Link from 'next/link';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { controlliEvento, puoPassare, type Controllo } from '@/lib/controlli';
import { fmtDataOra } from '@/lib/formato';
import { FormAzione } from '@/components/FormAzione';
import { CampiEvento } from '@/components/CampiEvento';
import { aggiornaEvento, annullaAvvioProva, avviaEvento, pubblicaEvento, riportaInBozza } from '@/actions/eventi';
import { debugLoginAttivo } from '@/lib/prova';

export default async function Panoramica({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile, parametri, ruoli, u } = await contestoEvento(codice);

  const conteggi = await prisma.evento.findUniqueOrThrow({
    where: { id: ev.id },
    select: {
      campionati: { include: { campionato: true } },
      _count: { select: { obiettivi: true, squadre: true, arbitri: true, documenti: true } },
      arbitri: { where: { personaId: u.personaId } },
    },
  });
  const nascosti = { eventoId: ev.id };
  // numero di tappa: posizione per data dentro al campionato (C1-20)
  const tappe = await Promise.all(conteggi.campionati.map(async (c) => ({
    nome: c.campionato.nome,
    numero: await prisma.eventoCampionato.count({ where: { campionatoId: c.campionatoId, evento: { inizio: { lte: ev.inizio } } } }),
  })));

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ['Obiettivi', conteggi._count.obiettivi, 'obiettivi'],
          ['Squadre iscritte', conteggi._count.squadre, 'squadre'],
          ...(gestore || ruoli.includes('ARBITRO') ? [['Arbitri', conteggi._count.arbitri, 'staff']] : []),
          ['Documenti', conteggi._count.documenti, 'documenti'],
        ].map(([t, n, p]) => (
          <Link key={t} href={`/eventi/${ev.codice}/${p}`} className="carta block hover:ring-1 hover:ring-accento">
            <div className="text-3xl font-bold">{n}</div>
            <div className="text-sm text-tenue">{t}</div>
          </Link>
        ))}
      </section>

      <section className="carta text-sm">
        <div><span className="text-tenue">Tipologia:</span> {ev.versioneTipologia.tipologia.nome} (versione {ev.versioneTipologia.numero}) — operatori {parametri.operatori.min}–{parametri.operatori.max}, finestre {parametri.finestra.minMin}–{parametri.finestra.maxMin} min, {parametri.finestra.modalita === 'PRENOTATA' ? 'prenotate' : 'coda all’ingresso'}</div>
        <div><span className="text-tenue">Campionati:</span> {tappe.map((t) => `${t.nome}, tappa ${t.numero}`).join(' · ') || 'nessuno (gara open)'}</div>
        {conteggi.arbitri[0] && (
          <div><span className="text-tenue">La tua designazione:</span> {conteggi.arbitri[0].stato.toLowerCase()} — {conteggi.arbitri[0].ruoli.join(', ').toLowerCase()}</div>
        )}
        {ruoli.length === 0 && !gestore && <div className="mt-2 text-avviso">Evento aperto alle iscrizioni: vai su «La mia squadra» per iscriverti.</div>}
      </section>

      {gestore && <StatoEvento ev={ev} nascosti={nascosti} />}

      {gestore && modificabile && (
        <section className="carta">
          <h2 className="mb-3 text-lg font-semibold">Dati dell’evento</h2>
          <FormAzione azione={aggiornaEvento} nascosti={nascosti} dati>
            <CampiEvento valori={{ ...ev, opzioni: ev.opzioni as object }} parametri={parametri} />
          </FormAzione>
        </section>
      )}
    </div>
  );
}

async function StatoEvento({ ev, nascosti }: { ev: Awaited<ReturnType<typeof contestoEvento>>['ev']; nascosti: Record<string, string> }) {
  if (ev.stato === 'BOZZA' || ev.stato === 'PUBBLICATO') {
    const { pubblicazione, avvio } = await controlliEvento(ev.id);
    const elenco = ev.stato === 'BOZZA' ? pubblicazione : avvio;
    return (
      <section className="carta space-y-3">
        <h2 className="text-lg font-semibold">{ev.stato === 'BOZZA' ? 'Prima di pubblicare' : 'Prima di avviare la gara'}</h2>
        <p className="text-sm text-tenue">
          {ev.stato === 'BOZZA'
            ? 'Con la pubblicazione l’evento diventa visibile alle squadre dei coordinamenti, che possono iscriversi.'
            : 'Con l’avvio si congela tutto ciò che è di gara: regolamento, template, obiettivi e tabella punteggi. Da lì nessuno, direzione compresa, può più modificarli.'}
        </p>
        <ElencoControlli codice={ev.codice} elenco={elenco} />
        <div className="flex flex-wrap gap-3">
          {ev.stato === 'BOZZA' ? (
            <FormAzione azione={pubblicaEvento} nascosti={nascosti} etichetta="Pubblica l’evento" classe="" />
          ) : (
            <>
              <FormAzione azione={avviaEvento} nascosti={nascosti} etichetta={puoPassare(elenco) ? 'Avvia la gara' : 'Avvia la gara (mancano requisiti)'} classe=""
                conferma="Avviare la gara? La configurazione verrà congelata e non si potrà più modificare." />
              <FormAzione azione={riportaInBozza} nascosti={nascosti} etichetta="Riporta in bozza" secondario classe="" />
            </>
          )}
        </div>
      </section>
    );
  }
  return (
    <section className="carta space-y-2 text-sm">
      <h2 className="text-lg font-semibold">Configurazione congelata</h2>
      <p>Avviata il {fmtDataOra(ev.avviatoIl)}. Da questo momento obiettivi, template, regolamento e tabella punteggi non cambiano più.</p>
      <p className="font-mono text-xs text-tenue">configurazione {ev.hashConfigurazione?.slice(0, 16)}… · tabella punteggi {ev.hashTabella?.slice(0, 16)}…</p>
      {debugLoginAttivo() && ev.stato === 'IN_CORSO' && (
        <FormAzione azione={annullaAvvioProva} nascosti={nascosti} etichetta="Annulla avvio (solo prova)" secondario classe="pt-2" />
      )}
    </section>
  );
}

function ElencoControlli({ codice, elenco }: { codice: string; elenco: Controllo[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {elenco.map((c) => (
        <li key={c.messaggio} className="flex items-start gap-2">
          <span className={c.ok ? 'text-ok' : c.bloccante ? 'text-errore' : 'text-avviso'}>{c.ok ? '✔' : c.bloccante ? '✖' : '!'}</span>
          <span className={c.ok ? 'text-tenue' : ''}>
            {c.messaggio}
            {!c.ok && c.dove && <> — <Link className="link" href={`/eventi/${codice}/${c.dove}`}>sistema</Link></>}
            {!c.ok && !c.bloccante && <span className="text-xs text-tenue"> (avviso)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
