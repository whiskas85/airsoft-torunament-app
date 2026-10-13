-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "parcheggi" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "prefissoSquadre" TEXT;

-- AlterTable
ALTER TABLE "Obiettivo" ADD COLUMN     "capoUtenteId" TEXT,
ADD COLUMN     "dipendeDa" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "Obiettivo" ADD CONSTRAINT "Obiettivo_capoUtenteId_fkey" FOREIGN KEY ("capoUtenteId") REFERENCES "Utente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

