import { FormAzione } from './FormAzione';
import { rispondiDesignazione } from '@/actions/arbitri';

/** Accetta o rifiuta (con motivo) una designazione arbitrale. */
export function RispostaDesignazione({ arbitroEventoId }: { arbitroEventoId: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <FormAzione azione={rispondiDesignazione} nascosti={{ arbitroEventoId, risposta: 'ACCETTA' }} etichetta="Accetto" classe="" />
      <FormAzione azione={rispondiDesignazione} nascosti={{ arbitroEventoId, risposta: 'RIFIUTA' }} etichetta="Rifiuto" secondario classe="flex flex-wrap items-end gap-2">
        <input name="motivo" required className="campo w-64" placeholder="Motivo del rifiuto" />
      </FormAzione>
    </div>
  );
}
