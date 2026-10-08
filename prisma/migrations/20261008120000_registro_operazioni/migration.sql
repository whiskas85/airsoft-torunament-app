-- DropIndex
DROP INDEX "Operazione_eventoId_ricevutaIl_idx";

-- AlterTable
ALTER TABLE "Operazione" ADD COLUMN     "obiettivoId" TEXT,
ADD COLUMN     "seq" BIGSERIAL NOT NULL,
ADD COLUMN     "squadraEventoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Operazione_seq_key" ON "Operazione"("seq");

-- CreateIndex
CREATE INDEX "Operazione_eventoId_seq_idx" ON "Operazione"("eventoId", "seq");

