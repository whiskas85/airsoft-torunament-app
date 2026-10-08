'use client';

import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';

/** QR a schermo intero, bianco, con pagine sfogliabili a mano e schermo sempre acceso. */
export function MostraQr({ titolo, pagine, nota, chiudi }: { titolo: string; pagine: string[]; nota?: string; chiudi: () => void }) {
  const [pagina, setPagina] = useState(0);
  const immagini = useMemo(
    () => pagine.map((t) => {
      const q = qrcode(0, 'M');
      q.addData(t, 'Alphanumeric');
      q.make();
      return q.createDataURL(10, 4);
    }),
    [pagine],
  );

  useEffect(() => {
    let blocco: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen').then((b) => (blocco = b)).catch(() => null);
    return () => { blocco?.release().catch(() => null); };
  }, []);

  const copia = async () => {
    try { await navigator.clipboard.writeText(pagine.join('\n')); alert('Copiato: si può incollare in un messaggio.'); }
    catch { prompt('Copia questo testo:', pagine.join('\n')); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white p-4 text-black">
      <div className="text-lg font-bold">{titolo}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={immagini[pagina]} alt="Codice QR" className="w-[min(92vw,70vh)] [image-rendering:pixelated]" />
      {pagine.length > 1 && (
        <>
          <div className="text-sm">Pagina {pagina + 1} di {pagine.length} — quando l’altro telefono la conferma, premi «Avanti»</div>
          <div className="flex w-full max-w-md gap-2">
            <button className="flex-1 rounded-lg bg-neutral-200 py-3 font-semibold disabled:opacity-40" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>◀ Indietro</button>
            <button className="flex-1 rounded-lg bg-black py-3 font-semibold text-white disabled:opacity-40" disabled={pagina === pagine.length - 1} onClick={() => setPagina(pagina + 1)}>Avanti ▶</button>
          </div>
        </>
      )}
      {nota && <div className="text-xs text-neutral-600">{nota}</div>}
      <div className="flex w-full max-w-md gap-2">
        <button className="flex-1 rounded-lg bg-neutral-200 py-3 font-semibold" onClick={copia}>Copia testo</button>
        <button className="flex-1 rounded-lg bg-[#b6d36b] py-3 font-semibold" onClick={chiudi}>Chiudi</button>
      </div>
    </div>
  );
}
