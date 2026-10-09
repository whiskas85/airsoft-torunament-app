import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { FormAzione } from '@/components/FormAzione';
import { caricaDocumento, rimuoviDocumento } from '@/actions/documenti';

const NOME = { REGOLAMENTO: 'Regolamento', BOOK: 'Book dell’evento', MODULO: 'Modulo', MAPPA: 'Mappa', ALTRO: 'Altro' } as const;
const MB = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

export default async function Documenti({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile } = await contestoEvento(codice);
  const documenti = await prisma.eventoDocumento.findMany({ where: { eventoId: ev.id }, include: { documento: true }, orderBy: { ruolo: 'asc' } });
  const totale = documenti.reduce((s, d) => s + d.documento.byte, 0);

  return (
    <div className="space-y-6">
      <section className="carta space-y-2">
        <p className="text-sm text-tenue">
          Regolamento e book vengono scaricati sul telefono di arbitri e squadre e restano disponibili anche senza rete.
          All’avvio sono congelati con il loro codice di controllo: tutti hanno esattamente la stessa versione.
          {documenti.length > 0 && <> Spazio occupato sul telefono: <b>{MB(totale)}</b>.</>}
        </p>
        {documenti.length === 0 && <p className="text-tenue">Nessun documento caricato.</p>}
        {documenti.map((d) => (
          <div key={d.documentoId} className="flex flex-wrap items-center gap-3 border-t border-bordo pt-2">
            <span className="pill bg-bordo">{NOME[d.ruolo]}</span>
            <a href={`/api/documenti/${d.documentoId}`} target="_blank" className="link">{d.documento.titolo}</a>
            <span className="text-xs text-tenue">{MB(d.documento.byte)} · {d.documento.hash.slice(0, 10)}…</span>
            {gestore && modificabile && (
              <FormAzione azione={rimuoviDocumento} nascosti={{ eventoId: ev.id, documentoId: d.documentoId }} etichetta="Togli" secondario classe="ml-auto" />
            )}
          </div>
        ))}
      </section>

      {gestore && modificabile && (
        <section className="carta">
          <h2 className="mb-3 text-lg font-semibold">Carica un documento</h2>
          <FormAzione azione={caricaDocumento} nascosti={{ eventoId: ev.id }} etichetta="Carica" svuotaSeOk>
            <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
              <div>
                <label className="etichetta">Tipo</label>
                <select name="ruolo" className="campo">
                  {Object.entries(NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="etichetta">Titolo (facoltativo)</label>
                <input name="titolo" className="campo" placeholder="es. Regolamento PLR & PCR ed. 8" />
              </div>
            </div>
            <input name="file" type="file" required className="block w-full text-sm" accept=".pdf,.html,.htm,.zip,.png,.jpg,.jpeg,.gpx,.kml,.kmz" />
            <p className="text-xs text-tenue">PDF, pagine HTML, archivi, immagini e mappe; fino a 50 MB. Il regolamento è uno solo: un nuovo caricamento sostituisce il precedente.</p>
          </FormAzione>
        </section>
      )}
    </div>
  );
}
