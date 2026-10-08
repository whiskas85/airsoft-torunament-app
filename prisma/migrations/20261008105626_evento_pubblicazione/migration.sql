-- AlterTable
ALTER TABLE "ArbitroEvento" ADD COLUMN     "propostoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "hashTabella" TEXT,
ADD COLUMN     "pubblicatoIl" TIMESTAMP(3);
