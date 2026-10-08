'use client';

/**
 * Scambio via QR (P2): JSON → deflate → Base45 (modo alfanumerico del QR) → pagine.
 * Una pagina sta in un solo QR fino a ~1000 caratteri; oltre si sfoglia a mano, mai in automatico.
 * Formato di ogni pagina: TA1/<messaggio>/<indice>/<totale>/<dati>
 */

const SINGOLO_MAX = 1000;
const PAGINA = 800;
const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const PREFISSO = 'TA1/';

function b45codifica(u8: Uint8Array) {
  let o = '';
  for (let i = 0; i < u8.length; i += 2) {
    if (i + 1 < u8.length) { const x = u8[i] * 256 + u8[i + 1]; o += B45[x % 45] + B45[Math.floor(x / 45) % 45] + B45[Math.floor(x / 2025)]; }
    else { const x = u8[i]; o += B45[x % 45] + B45[Math.floor(x / 45)]; }
  }
  return o;
}
function b45decodifica(s: string) {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 3) {
    const c = [...s.slice(i, i + 3)].map((ch) => { const v = B45.indexOf(ch); if (v < 0) throw new Error('carattere non valido nel QR'); return v; });
    const x = c[0] + c[1] * 45 + (c[2] ?? 0) * 2025;
    if (c.length === 3) out.push(x >> 8, x & 255); else out.push(x);
  }
  return new Uint8Array(out);
}
async function passa(u8: Uint8Array, flusso: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([u8 as BlobPart]).stream().pipeThrough(flusso)).arrayBuffer());
}
const comprimibile = () => typeof CompressionStream !== 'undefined';

export type Pagine = { pagine: string[]; byteJson: number; byteCompressi: number };

export async function codifica(oggetto: unknown): Promise<Pagine> {
  const json = new TextEncoder().encode(JSON.stringify(oggetto));
  const corpo = comprimibile() ? await passa(json, new CompressionStream('deflate-raw')) : json;
  const u8 = new Uint8Array(corpo.length + 1);
  u8[0] = comprimibile() ? 1 : 0; // primo byte: 1 = compresso
  u8.set(corpo, 1);
  const testo = b45codifica(u8);
  const id = Math.random().toString(36).slice(2, 6).toUpperCase();
  const n = testo.length <= SINGOLO_MAX ? 1 : Math.ceil(testo.length / PAGINA);
  const dim = Math.ceil(testo.length / n);
  return {
    pagine: Array.from({ length: n }, (_, i) => `${PREFISSO}${id}/${i}/${n}/${testo.slice(i * dim, (i + 1) * dim)}`),
    byteJson: json.length,
    byteCompressi: u8.length,
  };
}

export async function decodifica(testo: string): Promise<unknown> {
  const u8 = b45decodifica(testo);
  const corpo = u8.subarray(1);
  const json = u8[0] === 1 ? await passa(corpo, new DecompressionStream('deflate-raw')) : corpo;
  return JSON.parse(new TextDecoder().decode(json));
}

/** Raccoglie le pagine lette dalla fotocamera finché il messaggio è completo. */
export class Raccoglitore {
  private messaggio: string | null = null;
  private parti = new Map<number, string>();
  totale = 0;

  /** Restituisce true se la pagina è nuova. */
  aggiungi(letto: string): boolean {
    if (!letto.startsWith(PREFISSO)) return false;
    const [, id, i, n] = letto.split('/', 4);
    const dati = letto.split('/').slice(4).join('/');
    if (this.messaggio !== id) { this.messaggio = id; this.parti.clear(); }
    this.totale = Number(n);
    const nuova = !this.parti.has(Number(i));
    this.parti.set(Number(i), dati);
    return nuova;
  }
  get lette() { return this.parti.size; }
  get mancanti() { return Array.from({ length: this.totale }, (_, k) => k).filter((k) => !this.parti.has(k)).map((k) => k + 1); }
  get completo() { return this.totale > 0 && this.parti.size === this.totale; }
  testo() { return Array.from({ length: this.totale }, (_, k) => this.parti.get(k)).join(''); }
}

/** Il testo incollato (riserva quando la fotocamera non legge): una pagina per riga. */
export function testoDaPagine(incollato: string): string {
  const r = new Raccoglitore();
  incollato.split(/\s*\n\s*/).map((x) => x.trim()).filter(Boolean).forEach((x) => r.aggiungi(x));
  if (!r.completo) throw new Error(r.totale ? `mancano le pagine ${r.mancanti.join(', ')}` : 'nessun codice riconosciuto');
  return r.testo();
}
