import type { Campo, DefinizioneTemplate, Fase } from '@/lib/template';

/**
 * Disegna una scheda leggendo la definizione del template: nessun campo è scritto nel codice.
 * In M1 è solo un'anteprima (campi non modificabili); in M4 la stessa logica diventa la scheda vera.
 */
export function AnteprimaTemplate({ def, fasi = [] }: { def: DefinizioneTemplate; fasi?: Fase[] }) {
  return (
    <div className="space-y-4">
      {def.sezioni.map((s) => (
        <fieldset key={s.chiave} className="rounded-lg border border-bordo p-3">
          <legend className="px-1 text-sm font-semibold text-accento">{s.titolo}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.campi.map((c) => <CampoAnteprima key={c.chiave} campo={c} fasi={fasi} />)}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function CampoAnteprima({ campo: c, fasi }: { campo: Campo; fasi: Fase[] }) {
  switch (c.tipo) {
    case 'sino':
      return <Riga etichetta={c.etichetta}><Scelte opzioni={['SÌ', 'NO']} /></Riga>;
    case 'contatore':
      return (
        <Riga etichetta={c.etichetta}>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: c.max }, (_, i) => (
              <span key={i} className="flex h-8 w-8 items-center justify-center rounded border border-bordo text-sm text-tenue">{i + 1}</span>
            ))}
          </div>
        </Riga>
      );
    case 'numero':
    case 'decimale':
      return <Riga etichetta={`${c.etichetta} (${c.min ?? 0}–${c.max ?? '…'})`}><input disabled className="campo" placeholder={String(c.predefinito ?? 0)} /></Riga>;
    case 'scelta':
      return <Riga etichetta={c.etichetta}><Scelte opzioni={c.opzioni} /></Riga>;
    case 'tempo':
      return <Riga etichetta={`${c.etichetta} · dal ${c.sorgente}${c.arrotonda ? ', arrotondato per eccesso' : ''}`}><input disabled className="campo" placeholder="mm:ss" /></Riga>;
    case 'orario':
      return <Riga etichetta={c.etichetta}><input disabled className="campo" placeholder="hh:mm (ora ufficiale)" /></Riga>;
    case 'foto':
      return (
        <Riga etichetta={`${c.etichetta} (min ${c.min ?? 0}, max ${c.max ?? '…'})`}>
          <div className="rounded-lg border border-dashed border-bordo p-4 text-center text-sm text-tenue">📷 Scatta dalla fotocamera</div>
        </Riga>
      );
    case 'testo':
      return <Riga etichetta={c.etichetta}><textarea disabled className="campo" rows={2} /></Riga>;
    case 'fasi':
      return (
        <div className="sm:col-span-2">
          <span className="etichetta">{c.etichetta}</span>
          {fasi.length === 0 ? (
            <p className="text-sm text-tenue">
              Le fasi le definisce ogni obiettivo (es. E1 «Disinnesca la bomba»): qui compaiono una per riga, con SÌ/NO.
            </p>
          ) : (
            <div className="space-y-2">
              {fasi.map((f) => <Riga key={f.codice} etichetta={`${f.codice} · ${f.nome}`}><Scelte opzioni={['SÌ', 'NO']} /></Riga>)}
            </div>
          )}
        </div>
      );
    case 'obiettivi_senza_arbitro':
      return <div className="text-sm text-tenue sm:col-span-2">{c.etichetta}: un SÌ/NO per ogni obiettivo senza arbitro dell’evento.</div>;
    case 'ripetuto':
      return (
        <div className="sm:col-span-2">
          <span className="etichetta">{c.etichetta} — fino a {c.max}{c.firmaPerRiga ? ', firma della squadra per ogni riga' : ''}</span>
          <div className="rounded-lg border border-bordo p-2">
            <div className="grid gap-2 sm:grid-cols-2">{c.campi.map((x) => <CampoAnteprima key={x.chiave} campo={x} fasi={fasi} />)}</div>
          </div>
        </div>
      );
  }
}

function Riga({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return <label className="block"><span className="etichetta normal-case tracking-normal">{etichetta}</span>{children}</label>;
}

function Scelte({ opzioni }: { opzioni: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opzioni.map((o) => <span key={o} className="rounded-lg border border-bordo px-3 py-1.5 text-sm">{o}</span>)}
    </div>
  );
}
