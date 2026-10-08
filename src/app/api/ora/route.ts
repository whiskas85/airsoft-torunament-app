export const dynamic = 'force-dynamic';

/**
 * L'ora del server, riferimento ufficiale per tutti i telefoni (P7).
 * Il telefono misura l'andata e ritorno e calcola il proprio scarto: scarto = server + rtt/2 − locale.
 */
export function GET() {
  return Response.json({ ora: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
