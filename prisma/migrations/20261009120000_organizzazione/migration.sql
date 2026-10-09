-- AlterEnum
ALTER TYPE "TipoRuoloEnte" ADD VALUE 'RESPONSABILE';

-- DropIndex
DROP INDEX "RuoloEnte_utenteId_enteId_ruolo_key";

-- AlterTable
ALTER TABLE "TipologiaGara" ADD COLUMN     "archiviata" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "RuoloEnte_utenteId_enteId_ruolo_coordinamentoId_key" ON "RuoloEnte"("utenteId", "enteId", "ruolo", "coordinamentoId");

-- AddForeignKey
ALTER TABLE "RuoloEnte" ADD CONSTRAINT "RuoloEnte_coordinamentoId_fkey" FOREIGN KEY ("coordinamentoId") REFERENCES "Coordinamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

