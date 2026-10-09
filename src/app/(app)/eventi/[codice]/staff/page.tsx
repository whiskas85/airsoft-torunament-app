import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { fmtDataOra } from '@/lib/formato';
import { NOME_RUOLO_ARBITRO, RUOLI_ARBITRO } from '@/lib/arbitri';
import { FormAzione } from '@/components/FormAzione';
import { RispostaDesignazione } from '@/components/RispostaDesignazione';
import { impostaArbitro, proponiArbitro, rimuoviArbitro } from '@/actions/arbitri';
import { aggiungiStaff, togliStaff } from '@/actions/staff';

const STATO = { PROPOSTA: ['in attesa di risposta', 'bg-avviso text-black'], ACCETTATA: ['accettata', 'bg-ok text-black'], RIFIUTATA: ['rifiutata', 'bg-errore'] } as const;

export default async function Staff({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile, u, ruoli } = await contestoEvento(codice);
  // le squadre non vedono lo staff arbitrale (C1-32)
  if (!gestore && !ruoli.includes('ARBITRO')) notFound();

  const [staff, obiettivi, tipi, iscritte] = await Promise.all([
    prisma.arbitroEvento.findMany({
      where: { eventoId: ev.id },
      include: { persona: { include: { qualifiche: { where: { enteId: ev.enteId, al: null } }, membro: { where: { al: null } } } }, obiettivi: true },
      orderBy: { propostoIl: 'asc' },
    }),
    prisma.obiettivo.findMany({ where: { eventoId: ev.id }, orderBy: [{ ordine: 'asc' }, { codice: 'asc' }] }),
    prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId } }),
    prisma.squadraEvento.findMany({ where: { eventoId: ev.id }, include: { squadra: true } }),
  ]);
  const perTipo = Object.fromEntries(tipi.map((t) => [t.codice, t]));
  const conArbitro = obiettivi.filter((o) => o.tipi.some((t) => perTipo[t]?.richiedeArbitro !== false));
  const squadraIscritta = Object.fromEntries(iscritte.map((s) => [s.squadraId, s]));
  const codiceObiettivo = Object.fromEntries(obiettivi.map((o) => [o.id, o.codice]));

  // R9: un arbitro con la propria squadra in gara si segnala, non si blocca
  const conflitto = (a: (typeof staff)[number]) =>
    a.persona.membro.map((m) => squadraIscritta[m.squadraId]).filter(Boolean).map((s) => s!.squadra.nome);

  const mia = staff.find((a) => a.personaId === u.personaId);

  // organizzatori e direzione (C1-15), squadre organizzatrici (C1-14)
  const [membri, utenti] = await Promise.all([
    prisma.membroDirezione.findMany({ where: { eventoId: ev.id }, include: { utente: { include: { persona: true } } }, orderBy: { id: 'asc' } }),
    gestore ? prisma.utente.findMany({ where: { attivo: true }, include: { persona: true }, orderBy: [{ persona: { cognome: 'asc' } }, { persona: { nome: 'asc' } }] }) : [],
  ]);
  const organizzatrici = iscritte.filter((s) => s.ruolo === 'ORGANIZZATRICE');

  // persone qualificate dell'ente non ancora nello staff, con l'eventuale impegno sovrapposto
  const candidati = gestore && modificabile
    ? await prisma.qualificaArbitro.findMany({
        where: { enteId: ev.enteId, al: null, personaId: { notIn: staff.map((a) => a.personaId) } },
        include: {
          persona: { include: { arbitro: { where: { stato: 'ACCETTATA', evento: { inizio: { lt: ev.fine }, fine: { gt: ev.inizio } } }, include: { evento: true } } } },
          coordinamento: true,
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {([['ORGANIZZAZIONE', 'Organizzatori', 'Gestiscono l’evento come l’ente: obiettivi, squadre, staff.'], ['DIREZIONE', 'Direzione di gara', 'Code, contestazioni, debriefing e classifica durante la gara.']] as const).map(([ruolo, titolo, testo]) => {
          const qui = membri.filter((m) => (ruolo === 'ORGANIZZAZIONE' ? m.ruolo === 'ORGANIZZAZIONE' : m.ruolo !== 'ORGANIZZAZIONE'));
          return (
            <section key={ruolo} className="carta space-y-2">
              <h2 className="font-semibold">{titolo}</h2>
              <p className="text-xs text-tenue">{testo}</p>
              {qui.length === 0 && <p className="text-sm text-tenue">Nessuno.</p>}
              <ul className="space-y-1">
                {qui.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span>{m.utente.persona.nome} {m.utente.persona.cognome}</span>
                    {gestore && <FormAzione azione={togliStaff} nascosti={{ membroId: m.id }} etichetta="Togli" secondario classe="ml-auto" />}
                  </li>
                ))}
              </ul>
              {gestore && (
                <FormAzione azione={aggiungiStaff} nascosti={{ eventoId: ev.id, ruolo }} etichetta="Aggiungi" secondario classe="flex gap-2 border-t border-bordo pt-2">
                  <select name="utenteId" required defaultValue="" className="campo min-w-0 flex-1 py-1.5">
                    <option value="" disabled>Scegli una persona…</option>
                    {utenti.filter((x) => !qui.some((m) => m.utenteId === x.id)).map((x) => <option key={x.id} value={x.id}>{x.persona.cognome} {x.persona.nome}</option>)}
                  </select>
                </FormAzione>
              )}
            </section>
          );
        })}
      </div>

      <section className="carta space-y-1">
        <h2 className="font-semibold">Squadre organizzatrici</h2>
        {organizzatrici.length === 0
          ? <p className="text-sm text-tenue">Nessuna. Si indicano dalla scheda Squadre, con il ruolo «Organizzatrice».</p>
          : <p className="text-sm">{organizzatrici.map((s) => s.squadra.nome).join(', ')}</p>}
      </section>

      <h2 className="text-lg font-semibold">Arbitri</h2>
      {mia && (
        <section className="carta space-y-2 ring-1 ring-accento">
          <h2 className="text-lg font-semibold">La tua designazione</h2>
          <p className="text-sm">
            Ruoli: {mia.ruoli.map((r) => NOME_RUOLO_ARBITRO[r as keyof typeof NOME_RUOLO_ARBITRO] ?? r).join(', ')}
            {mia.obiettivi.length > 0 && ` · obiettivi ${mia.obiettivi.map((o) => codiceObiettivo[o.obiettivoId]).join(', ')}`}
          </p>
          <p className="text-sm">Stato: <span className={`pill ${STATO[mia.stato][1]}`}>{STATO[mia.stato][0]}</span>{mia.motivoRifiuto && <span className="text-tenue"> — {mia.motivoRifiuto}</span>}</p>
          {mia.stato === 'PROPOSTA' && modificabile && <RispostaDesignazione arbitroEventoId={mia.id} />}
        </section>
      )}

      <section className="space-y-3">
        {staff.length === 0 && <p className="text-tenue">Nessun arbitro designato.</p>}
        {staff.map((a) => {
          const c = conflitto(a);
          return (
            <div key={a.id} className="carta">
              <div className="flex flex-wrap items-center gap-2">
                <b>{a.persona.nome} {a.persona.cognome}</b>
                <span className="text-xs text-tenue">{a.persona.qualifiche[0]?.livello.toLowerCase() ?? 'senza qualifica'}</span>
                <span className={`pill ${STATO[a.stato][1]}`}>{STATO[a.stato][0]}</span>
                {c.length > 0 && <span className="pill bg-avviso text-black">conflitto: membro di {c.join(', ')}</span>}
                <span className="ml-auto text-xs text-tenue">proposto {fmtDataOra(a.propostoIl)}</span>
              </div>
              {a.motivoRifiuto && <p className="mt-1 text-sm text-tenue">Motivo del rifiuto: {a.motivoRifiuto}</p>}
              {gestore && modificabile ? (
                <div className="mt-3 space-y-3">
                  <FormAzione azione={impostaArbitro} nascosti={{ arbitroEventoId: a.id }} dati>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {RUOLI_ARBITRO.map((r) => (
                        <label key={r} className="flex items-center gap-1.5"><input type="checkbox" name="ruoli" value={r} defaultChecked={a.ruoli.includes(r)} className="h-4 w-4" /> {NOME_RUOLO_ARBITRO[r]}</label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-tenue">Obiettivi:</span>
                      {conArbitro.map((o) => (
                        <label key={o.id} className="flex items-center gap-1.5"><input type="checkbox" name="obiettivi" value={o.id} defaultChecked={a.obiettivi.some((x) => x.obiettivoId === o.id)} className="h-4 w-4" /> {o.codice}</label>
                      ))}
                      {conArbitro.length === 0 && <span className="text-tenue">nessun obiettivo con arbitro</span>}
                    </div>
                  </FormAzione>
                  <FormAzione azione={rimuoviArbitro} nascosti={{ arbitroEventoId: a.id }} etichetta="Togli dallo staff" secondario classe=""
                    conferma={`Togliere ${a.persona.nome} ${a.persona.cognome} dallo staff?`} />
                </div>
              ) : (
                <p className="mt-1 text-sm text-tenue">
                  {a.ruoli.map((r) => NOME_RUOLO_ARBITRO[r as keyof typeof NOME_RUOLO_ARBITRO] ?? r).join(', ')}
                  {a.obiettivi.length > 0 && ` · ${a.obiettivi.map((o) => codiceObiettivo[o.obiettivoId]).join(', ')}`}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {gestore && modificabile && (
        <section className="carta">
          <h2 className="mb-1 text-lg font-semibold">Proponi un arbitro</h2>
          <p className="mb-3 text-sm text-tenue">L’arbitro riceve la proposta e deve accettarla o rifiutarla. Chi ha già accettato un evento negli stessi orari non è proponibile.</p>
          {candidati.length === 0 ? (
            <p className="text-sm text-tenue">Nessun altro arbitro qualificato disponibile.</p>
          ) : (
            <FormAzione azione={proponiArbitro} nascosti={{ eventoId: ev.id }} etichetta="Invia la proposta">
              <select name="personaId" required className="campo">
                {candidati.map((c) => {
                  const impegno = c.persona.arbitro[0]?.evento;
                  return (
                    <option key={c.id} value={c.personaId} disabled={!!impegno}>
                      {c.persona.nome} {c.persona.cognome} · {c.livello.toLowerCase()}{c.coordinamento ? ` · ${c.coordinamento.nome}` : ''}{impegno ? ` · impegnato in «${impegno.nome}»` : ''}
                    </option>
                  );
                })}
              </select>
              <div className="flex flex-wrap gap-3 text-sm">
                {RUOLI_ARBITRO.map((r) => (
                  <label key={r} className="flex items-center gap-1.5"><input type="checkbox" name="ruoli" value={r} defaultChecked={r === 'OBIETTIVO'} className="h-4 w-4" /> {NOME_RUOLO_ARBITRO[r]}</label>
                ))}
              </div>
            </FormAzione>
          )}
        </section>
      )}
    </div>
  );
}
