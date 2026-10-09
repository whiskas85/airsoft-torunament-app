import { richiediUtente } from '@/lib/auth';
import { vociMenu } from '@/lib/menu';
import { ProviderSalvataggio } from '@/components/Salvataggio';
import { Intestazione, BarraInBasso } from '@/components/Intestazione';

/** Guscio dell'area riservata: intestazione con menu e «Salva», barra in basso sul telefono. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const u = await richiediUtente();
  const voci = vociMenu(u);
  return (
    <ProviderSalvataggio>
      <Intestazione voci={voci} nome={`${u.persona.nome} ${u.persona.cognome}`} iniziali={`${u.persona.nome[0] ?? ''}${u.persona.cognome[0] ?? ''}`} />
      <div className="pb-20 md:pb-0">{children}</div>
      <BarraInBasso voci={voci} />
    </ProviderSalvataggio>
  );
}
