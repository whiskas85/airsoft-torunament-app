import Link from 'next/link';
import { richiediUtente } from '@/lib/auth';
import { mieiEventi } from '@/lib/ruoli';
import { SchedaEvento } from '@/components/SchedaEvento';

/** Tutti gli eventi che l'utente vede, divisi in in corso, in programma e conclusi. */
export default async function Eventi() {
  const u = await richiediUtente();
  const eventi = await mieiEventi(u);
  const admin = u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE');

  const inCorso = eventi.filter((e) => e.stato === 'IN_CORSO' || e.stato === 'DEBRIEFING');
  const programma = eventi.filter((e) => e.stato === 'BOZZA' || e.stato === 'PUBBLICATO');
  const conclusi = eventi.filter((e) => ['TERMINATO', 'UFFICIALE', 'ANNULLATO'].includes(e.stato)).reverse();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-end gap-3">
        <h1 className="mr-auto text-xl font-bold">Eventi</h1>
        {admin && <Link href="/eventi/nuovo" className="bottone">+ Nuovo evento</Link>}
      </div>
      {eventi.length === 0 && <p className="text-tenue">Nessun evento per te, per ora.</p>}
      {[
        ['In corso', inCorso],
        ['In programma', programma],
        ['Conclusi', conclusi],
      ].map(([titolo, elenco]) =>
        (elenco as typeof eventi).length ? (
          <section key={titolo as string} className="space-y-2">
            <h2 className="font-semibold">{titolo as string}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(elenco as typeof eventi).map((e) => <SchedaEvento key={e.id} e={e} />)}
            </div>
          </section>
        ) : null,
      )}
    </main>
  );
}
