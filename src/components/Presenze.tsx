import { prisma } from '@/lib/db';
import { FormAzione } from './FormAzione';
import { aggiungiPrestito, ritiraIscrizione, salvaPresenze } from '@/actions/iscrizioni';

/** Presenze di una squadra iscritta: chi partecipa, ruolo, numero di fascia; più i prestiti. */
export async function Presenze({ squadraEventoId, modificabile, operatori }: {
  squadraEventoId: string; modificabile: boolean; operatori: { min: number; max: number };
}) {
  const se = await prisma.squadraEvento.findUniqueOrThrow({
    where: { id: squadraEventoId },
    include: {
      squadra: { include: { membri: { where: { al: null }, include: { persona: { include: { tessere: true } } } } } },
      partecipanti: { include: { persona: { include: { tessere: true } }, prestitoDa: true } },
    },
  });
  const presenti = Object.fromEntries(se.partecipanti.map((p) => [p.personaId, p]));
  // membri della squadra, più chi è stato aggiunto in prestito
  const righe = [
    ...se.squadra.membri.map((m) => ({ persona: m.persona, prestito: null as string | null })),
    ...se.partecipanti.filter((p) => !se.squadra.membri.some((m) => m.personaId === p.personaId))
      .map((p) => ({ persona: p.persona, prestito: p.prestitoDa?.nome ?? 'altra squadra' })),
  ];
  const fasce = (se.squadra.fasce as { colori?: string[] } | null)?.colori?.join('/') ?? '—';
  const nascosti = { squadraEventoId: se.id };

  if (se.ruolo !== 'GAREGGIA') {
    return <p className="text-sm text-tenue">Squadra {se.ruolo === 'ORGANIZZATRICE' ? 'organizzatrice' : 'in aiuto'}: non schiera una pattuglia.</p>;
  }

  return (
    <div className="space-y-4">
      <FormAzione azione={salvaPresenze} nascosti={nascosti} dati>
        <p className="text-sm text-tenue">Fascia {fasce} · servono da {operatori.min} a {operatori.max} operatori, con un capo pattuglia.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-tenue">
              <tr><th className="py-1 pr-2">Presente</th><th className="pr-2">Operatore</th><th className="pr-2">Ruolo</th><th>N° fascia</th></tr>
            </thead>
            <tbody>
              {righe.map(({ persona, prestito }) => {
                const p = presenti[persona.id];
                return (
                  <tr key={persona.id} className="border-t border-bordo">
                    <td className="py-1.5 pr-2"><input type="checkbox" name={`presente_${persona.id}`} defaultChecked={!!p} disabled={!modificabile} className="h-5 w-5" /></td>
                    <td className="pr-2">
                      {persona.nome} {persona.cognome}
                      <div className="text-xs text-tenue">{persona.tessere[0]?.numero ?? 'senza tessera'}{prestito && <span className="text-avviso"> · in prestito da {prestito}</span>}</div>
                    </td>
                    <td className="pr-2">
                      <select name={`ruolo_${persona.id}`} defaultValue={p?.ruolo ?? 'OPERATORE'} disabled={!modificabile} className="campo py-1.5">
                        <option value="CAPO_PATTUGLIA">Capo pattuglia</option>
                        <option value="VICE">Vice</option>
                        <option value="OPERATORE">Operatore</option>
                      </select>
                    </td>
                    <td><input name={`fascia_${persona.id}`} type="number" min={0} max={9} defaultValue={p?.numeroFascia ?? ''} disabled={!modificabile} className="campo w-20 py-1.5" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FormAzione>

      {modificabile && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormAzione azione={aggiungiPrestito} nascosti={nascosti} etichetta="Aggiungi in prestito" secondario svuotaSeOk>
            <label className="etichetta">Operatore di un’altra squadra (numero di tessera)</label>
            <input name="tessera" required className="campo" placeholder="es. 2026-1012" />
          </FormAzione>
          <FormAzione azione={ritiraIscrizione} nascosti={nascosti} etichetta="Ritira l’iscrizione" secondario classe="self-end"
            conferma="Ritirare la squadra dall’evento?" />
        </div>
      )}
    </div>
  );
}
