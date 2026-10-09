import type { UtenteCorrente } from './auth';

export type Icona = 'casa' | 'eventi' | 'coppa' | 'ingranaggio' | 'campo';
export type VoceMenu = { href: string; etichetta: string; icona: Icona };

/** Le voci del menu, secondo i ruoli dell'utente (C1-01). Poche e sempre le stesse. */
export function vociMenu(u: UtenteCorrente): VoceMenu[] {
  const admin = u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE');
  const voci: VoceMenu[] = [
    { href: '/', etichetta: 'Inizio', icona: 'casa' },
    { href: '/eventi', etichetta: 'Eventi', icona: 'eventi' },
  ];
  if (admin) {
    voci.push(
      { href: '/campionati', etichetta: 'Campionati', icona: 'coppa' },
      { href: '/impostazioni', etichetta: 'Impostazioni', icona: 'ingranaggio' },
    );
  }
  voci.push({ href: '/campo', etichetta: 'In campo', icona: 'campo' });
  return voci;
}
