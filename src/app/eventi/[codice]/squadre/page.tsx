import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { FormAzione } from '@/components/FormAzione';
import { Presenze } from '@/components/Presenze';
import { impostaSquadraEvento, iscriviSquadra } from '@/actions/iscrizioni';

const NOME_RUOLO = { GAREGGIA: 'In gara', ORGANIZZATRICE: 'Organizzatrice', AIUTO: 'In aiuto' } as const;

export default async function Squadre({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile, parametri, mieSquadre, squadreIscrivibili, ruoli } = await contestoEvento(codice);
  if (!gestore && !ruoli.includes('SQUADRA') && squadreIscrivibili.length === 0) notFound();

  const iscritte = await prisma.squadraEvento.findMany({
    where: { eventoId: ev.id },
    include: { squadra: true, _count: { select: { partecipanti: true } } },
    orderBy: { identificativo: 'asc' },
  });

  // ─── vista del membro di squadra
  if (!gestore) {
    return (
      <div className="space-y-6">
        {mieSquadre.map((s) => {
          const se = iscritte.find((x) => x.squadraId === s.id);
          const iscrivibile = squadreIscrivibili.some((x) => x.id === s.id);
          return (
            <section key={s.id} className="carta space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{s.nome}</h2>
                {se ? <span className="pill bg-ok text-black">iscritta come {se.identificativo}</span> : <span className="pill bg-bordo">non iscritta</span>}
                {se && !se.inCampionato && <span className="pill bg-bordo">open</span>}
                {se && <span className={`pill ${se.pagato ? 'bg-ok text-black' : 'bg-errore'}`}>{se.pagato ? 'pagato' : 'da pagare'}</span>}
              </div>
              {se ? (
                <Presenze squadraEventoId={se.id} modificabile={modificabile} operatori={parametri.operatori} />
              ) : iscrivibile ? (
                <FormAzione azione={iscriviSquadra} nascosti={{ eventoId: ev.id, squadraId: s.id }} etichetta="Iscrivi la squadra">
                  <label className="etichetta">Identificativo della pattuglia</label>
                  <input name="identificativo" defaultValue={s.sigla ?? ''} className="campo w-40 font-mono uppercase" />
                </FormAzione>
              ) : (
                <p className="text-sm text-tenue">Le iscrizioni non sono aperte per questa squadra.</p>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  // ─── vista di ente e direzione
  const altre = modificabile
    ? await prisma.squadra.findMany({ where: { enteId: ev.enteId, id: { notIn: iscritte.map((s) => s.squadraId) } }, orderBy: { nome: 'asc' } })
    : [];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        {iscritte.length === 0 && <p className="text-tenue">Nessuna squadra iscritta.</p>}
        {iscritte.map((s) => {
          const fasce = (s.squadra.fasce as { colori?: string[] } | null)?.colori?.join('/') ?? '—';
          const fuori = s.ruolo === 'GAREGGIA' && (s._count.partecipanti < parametri.operatori.min || s._count.partecipanti > parametri.operatori.max);
          return (
            <details key={s.id} className="carta">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                <b className="font-mono">{s.identificativo}</b>
                <span>{s.squadra.nome}</span>
                <span className="text-xs text-tenue">fascia {fasce}</span>
                <span className="pill bg-bordo">{NOME_RUOLO[s.ruolo]}</span>
                {s.ruolo === 'GAREGGIA' && !s.inCampionato && <span className="pill bg-bordo">open</span>}
                {s.ruolo === 'GAREGGIA' && <span className={`pill ${fuori ? 'bg-errore' : 'bg-bordo'}`}>{s._count.partecipanti} operatori</span>}
                <span className={`pill ml-auto ${s.pagato ? 'bg-ok text-black' : 'bg-errore'}`}>{s.pagato ? 'pagato' : 'da pagare'}</span>
              </summary>
              <div className="mt-4 space-y-4">
                <FormAzione azione={impostaSquadraEvento} nascosti={{ squadraEventoId: s.id }} classe="grid items-end gap-3 sm:grid-cols-5">
                  <div>
                    <label className="etichetta">Identificativo</label>
                    <input name="identificativo" defaultValue={s.identificativo} disabled={!modificabile} className="campo font-mono uppercase" />
                  </div>
                  <div>
                    <label className="etichetta">Ruolo</label>
                    <select name="ruolo" defaultValue={s.ruolo} disabled={!modificabile} className="campo">
                      <option value="GAREGGIA">In gara</option>
                      <option value="ORGANIZZATRICE">Organizzatrice</option>
                      <option value="AIUTO">In aiuto</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inCampionato" defaultChecked={s.inCampionato} disabled={!modificabile} className="h-5 w-5" /> In campionato</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pagato" defaultChecked={s.pagato} className="h-5 w-5" /> Pagato</label>
                </FormAzione>
                <Presenze squadraEventoId={s.id} modificabile={modificabile} operatori={parametri.operatori} />
              </div>
            </details>
          );
        })}
      </section>

      {modificabile && altre.length > 0 && (
        <section className="carta">
          <h2 className="mb-3 text-lg font-semibold">Iscrivi una squadra</h2>
          <IscriviDaGestione eventoId={ev.id} squadre={altre} />
        </section>
      )}
    </div>
  );
}

function IscriviDaGestione({ eventoId, squadre }: { eventoId: string; squadre: { id: string; nome: string; sigla: string | null }[] }) {
  return (
    <FormAzione azione={iscriviSquadra} nascosti={{ eventoId }} etichetta="Iscrivi" classe="grid items-end gap-3 sm:grid-cols-[1fr_10rem_auto]">
      <div>
        <label className="etichetta">Squadra</label>
        <select name="squadraId" required className="campo">
          {squadre.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="etichetta">Identificativo</label>
        <input name="identificativo" className="campo font-mono uppercase" placeholder="sigla" />
      </div>
    </FormAzione>
  );
}
