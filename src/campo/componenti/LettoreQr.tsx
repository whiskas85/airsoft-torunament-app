'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Raccoglitore } from '../qr';

type Rilevatore = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Lettura con la fotocamera: usa il lettore nativo del telefono se c'è (Android), altrimenti jsQR (iPhone).
 * Raccoglie le pagine e chiama `letto` con il testo completo.
 */
export function LettoreQr({ letto, chiudi }: { letto: (testo: string) => void; chiudi: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [info, setInfo] = useState('Avvio la fotocamera…');
  const [avanzamento, setAvanzamento] = useState<{ lette: number; totale: number } | null>(null);

  useEffect(() => {
    let attivo = true;
    let flusso: MediaStream | null = null;
    const r = new Raccoglitore();

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setInfo('La fotocamera funziona solo con l’app aperta in HTTPS. Usa «Incolla codice».');
        return;
      }
      try {
        flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      } catch (e) {
        setInfo(`Fotocamera non disponibile: ${(e as Error).message}`);
        return;
      }
      const v = video.current!;
      v.srcObject = flusso;
      await v.play();

      let nativo: Rilevatore | null = null;
      try {
        const BD = (window as unknown as { BarcodeDetector?: { new (o: object): Rilevatore; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
        if (BD && (await BD.getSupportedFormats()).includes('qr_code')) nativo = new BD({ formats: ['qr_code'] });
      } catch { /* si usa jsQR */ }
      setInfo(`Inquadra il QR (${nativo ? 'lettore del telefono' : 'jsQR'})`);

      const tela = document.createElement('canvas');
      const ctx = tela.getContext('2d', { willReadFrequently: true })!;
      while (attivo) {
        let testo: string | undefined;
        try {
          if (v.readyState >= 2) {
            if (nativo) testo = (await nativo.detect(v))[0]?.rawValue;
            else {
              const s = Math.min(1, 720 / v.videoWidth);
              tela.width = v.videoWidth * s; tela.height = v.videoHeight * s;
              ctx.drawImage(v, 0, 0, tela.width, tela.height);
              testo = jsQR(ctx.getImageData(0, 0, tela.width, tela.height).data, tela.width, tela.height, { inversionAttempts: 'dontInvert' })?.data;
            }
          }
        } catch { /* fotogramma non leggibile */ }
        if (testo && r.aggiungi(testo)) {
          navigator.vibrate?.(60);
          setAvanzamento({ lette: r.lette, totale: r.totale });
          if (r.completo) {
            navigator.vibrate?.(200);
            attivo = false;
            letto(r.testo());
            break;
          }
          setInfo(`Pagina letta. Ora fatti mostrare la pagina ${r.mancanti.join(', ')}`);
        }
        await new Promise((ok) => setTimeout(ok, nativo ? 120 : 60));
      }
    })();

    return () => { attivo = false; flusso?.getTracks().forEach((t) => t.stop()); };
  }, [letto]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={video} playsInline muted className="w-full flex-1 object-cover" />
      <div className="space-y-2 bg-neutral-900 p-4 text-white">
        <div className="text-sm">{info}</div>
        {avanzamento && avanzamento.totale > 1 && <progress className="h-3 w-full" value={avanzamento.lette} max={avanzamento.totale} />}
        <button className="w-full rounded-lg bg-[#e0584b] py-3 font-semibold" onClick={chiudi}>Annulla</button>
      </div>
    </div>
  );
}
