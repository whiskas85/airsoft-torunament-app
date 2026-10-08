/**
 * Formato delle operazioni di gara, uguale sul telefono e sul server (modello dei dati §7).
 * Niente dipendenze da Node o dal browser: questo file gira in entrambi.
 */

export const VERSIONE_FORMATO = 1;

export type Gps = { lat: number; lon: number; precisioneM: number } | null;

/** Un'operazione firmata: tutto tranne `firma` entra nella firma. */
export type Operazione = {
  v: number;
  /** creato dal telefono (UUID): un invio ripetuto non crea doppioni */
  id: string;
  /** uuid dell'evento (P11): un'operazione di un altro evento viene rifiutata */
  evento: string;
  tipo: string;
  autore: string;
  dispositivo: string;
  /** orologio del telefono, ISO */
  oraDispositivo: string;
  /** scarto noto fra telefono e server, in ms (server − telefono) */
  scartoMs: number;
  /** ora del telefono corretta con lo scarto: è quella che conta in gara (P6bis, P7) */
  oraUfficiale: string;
  /** posizione con precisione, oppure null = GPS non disponibile (P8) */
  gps: Gps;
  /** sempre presenti, anche se null: il server le rimanda identiche e la firma resta valida */
  squadra: string | null;
  obiettivo: string | null;
  rif: string[];
  dati: Record<string, unknown>;
  firma: string;
};

export type OperazioneDaFirmare = Omit<Operazione, 'firma'>;

/** JSON con chiavi ordinate: telefono e server devono ottenere esattamente la stessa stringa da firmare. */
export function canonico(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonico(o[k])).join(',') + '}';
  }
  return JSON.stringify(v ?? null);
}

/** Il testo che viene firmato: l'operazione senza la firma. */
export function testoDaFirmare(op: OperazioneDaFirmare | Operazione): string {
  const { firma: _f, ...resto } = op as Operazione;
  return canonico(resto);
}

export const base64url = {
  da(buf: ArrayBuffer): string {
    const b = new Uint8Array(buf);
    let s = '';
    for (const x of b) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  a(s: string): Uint8Array<ArrayBuffer> {
    const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  },
};

export const ALGORITMO = { name: 'ECDSA', namedCurve: 'P-256' } as const;
export const FIRMA = { name: 'ECDSA', hash: 'SHA-256' } as const;

/**
 * Tipi di operazione conosciuti. M3 usa solo `prova.nota` per collaudare il motore;
 * gli altri arrivano con M4 (luci verdi, schede, firme, esfiltrazione…).
 */
export const TIPI_OPERAZIONE = ['prova.nota'] as const;
export type TipoOperazione = (typeof TIPI_OPERAZIONE)[number];

/** Controllo di forma, uguale sui due lati: cosa deve esserci in ogni operazione. */
export function erroreDiForma(op: Partial<Operazione>): string | null {
  if (op.v !== VERSIONE_FORMATO) return 'formato non supportato';
  for (const k of ['id', 'evento', 'tipo', 'autore', 'dispositivo', 'oraDispositivo', 'oraUfficiale', 'firma'] as const) {
    if (typeof op[k] !== 'string' || !op[k]) return `manca ${k}`;
  }
  if (typeof op.scartoMs !== 'number' || !Number.isInteger(op.scartoMs)) return 'manca lo scarto dell’orologio';
  for (const k of ['squadra', 'obiettivo'] as const) {
    if (!(k in op) || (op[k] !== null && typeof op[k] !== 'string')) return `${k} deve essere presente (anche null)`;
  }
  if (!('gps' in op) || (op.gps !== null && (typeof op.gps !== 'object' || typeof op.gps.lat !== 'number'))) return 'gps deve essere presente (anche null)';
  if (!Array.isArray(op.rif) || typeof op.dati !== 'object' || op.dati === null) return 'struttura non valida';
  if (Number.isNaN(Date.parse(op.oraUfficiale!)) || Number.isNaN(Date.parse(op.oraDispositivo!))) return 'orario non valido';
  if (!(TIPI_OPERAZIONE as readonly string[]).includes(op.tipo!)) return `tipo sconosciuto: ${op.tipo}`;
  return null;
}
