import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediAmministratore } from '@/lib/permessi';
import { FormAzione } from '@/components/FormAzione';
import { aggiungiResponsabile, creaCoordinamento, eliminaCoordinamento, rinominaCoordinamento, togliResponsabile } from '@/actions/organizzazione';

/** Coordinamenti dell'ente (Piemonte, Liguria…, Nazionale) e i loro responsabili (C1-08, C1-09). */
export default async function Coordinamenti() {
  const { enteId } = await richiediAmministratore();
  const [coordinamenti, utenti] = await Promise.all([
    prisma.coordinamento.findMany({
      where: { enteId },
      orderBy: { nome: 'asc' },
      include: {
        responsabili: { where: { ruolo: 'RESPONSABILE' }, include: { utente: { include: { persona: true } } } },
        _count: { select: { squadre: true, eventi: true, campionati: true } },
      },
    }),
    prisma.utente.findMany({ where: { attivo: true }, include: { persona: true }, orderBy: [{ persona: { cognome: 'asc' } }, { persona: { nome: 'asc' } }] }),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <Link href="/impostazioni" className="link text-sm">← Impostazioni</Link>
        <h1 className="mt-1 text-xl font-bold">Coordinamenti</h1>
        <p className="text-sm text-tenue">
          Ogni coordinamento ha i suoi responsabili: organizzano le gare e i campionati del coordinamento.
          Per il campionato italiano crea un coordinamento «Nazionale».
        </p>
      </div>

      {coordinamenti.map((c) => (
        <section key={c.id} className="carta space-y-3">
          <FormAzione azione={rinominaCoordinamento} nascosti={{ coordinamentoId: c.id }} dati classe="flex items-center gap-3">
            <input name="nome" required defaultValue={c.nome} className="campo text-lg font-semibold" aria-label="Nome del coordinamento" />
            <span className="whitespace-nowrap text-xs text-tenue">{c._count.squadre} squadre · {c._count.eventi} eventi</span>
          </FormAzione>

          <div>
            <span className="etichetta">Responsabili</span>
            {c.responsabili.length === 0 && <p className="text-sm text-avviso">Nessun responsabile: solo l’amministratore può organizzarne le gare.</p>}
            <ul className="space-y-1">
              {c.responsabili.map((r) => (
                <li key={r.id} className="flex items-center gap-3 text-sm">
                  <span>{r.utente.persona.nome} {r.utente.persona.cognome}</span>
                  <span className="text-tenue">{r.utente.email}</span>
                  <FormAzione azione={togliResponsabile} nascosti={{ ruoloId: r.id }} etichetta="Togli" secondario classe="ml-auto" />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-bordo pt-3">
            <FormAzione azione={aggiungiResponsabile} nascosti={{ coordinamentoId: c.id }} etichetta="Aggiungi responsabile" secondario classe="flex flex-1 flex-wrap items-end gap-3">
              <select name="utenteId" required className="campo min-w-0 flex-1" defaultValue="">
                <option value="" disabled>Scegli una persona…</option>
                {utenti.filter((x) => !c.responsabili.some((r) => r.utenteId === x.id)).map((x) => (
                  <option key={x.id} value={x.id}>{x.persona.cognome} {x.persona.nome} · {x.email}</option>
                ))}
              </select>
            </FormAzione>
            {c._count.squadre + c._count.eventi + c._count.campionati === 0 && (
              <FormAzione azione={eliminaCoordinamento} nascosti={{ coordinamentoId: c.id }} etichetta="Elimina" secondario classe=""
                conferma={`Eliminare il coordinamento «${c.nome}»?`} />
            )}
          </div>
        </section>
      ))}

      <section className="carta">
        <h2 className="mb-2 font-semibold">Nuovo coordinamento</h2>
        <FormAzione azione={creaCoordinamento} etichetta="Crea" svuotaSeOk classe="flex flex-wrap items-end gap-3">
          <input name="nome" required className="campo min-w-0 flex-1" placeholder="es. Liguria, Lombardia, Nazionale" />
        </FormAzione>
      </section>
    </main>
  );
}
