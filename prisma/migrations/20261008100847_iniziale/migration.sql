-- CreateEnum
CREATE TYPE "TipoRuoloEnte" AS ENUM ('AMMINISTRATORE', 'RESP_ARBITRI', 'SEGRETERIA');

-- CreateEnum
CREATE TYPE "StatoVersione" AS ENUM ('BOZZA', 'PUBBLICATA', 'RITIRATA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('REGOLAMENTO', 'BOOK', 'MODULO', 'MAPPA', 'ALTRO');

-- CreateEnum
CREATE TYPE "CompilatoDa" AS ENUM ('ARBITRO', 'SQUADRA', 'DIREZIONE');

-- CreateEnum
CREATE TYPE "GenereTemplate" AS ENUM ('OBIETTIVO', 'CONTRO', 'ESFILTRAZIONE', 'RECON', 'CONTROLLO', 'REGISTRAZIONE', 'TEST_ASG');

-- CreateEnum
CREATE TYPE "StatoEvento" AS ENUM ('BOZZA', 'PUBBLICATO', 'IN_CORSO', 'DEBRIEFING', 'TERMINATO', 'UFFICIALE', 'ANNULLATO');

-- CreateEnum
CREATE TYPE "StatoObiettivo" AS ENUM ('ATTIVO', 'SOSPESO', 'CHIUSO');

-- CreateEnum
CREATE TYPE "StatoSquadraEvento" AS ENUM ('ISCRITTA', 'IN_GARA', 'ESFILTRATA', 'IN_DEBRIEFING', 'TERMINATA', 'SQUALIFICATA', 'NON_CLASSIFICATA');

-- CreateEnum
CREATE TYPE "RuoloSquadraEvento" AS ENUM ('GAREGGIA', 'ORGANIZZATRICE', 'AIUTO');

-- CreateEnum
CREATE TYPE "RuoloPartecipante" AS ENUM ('CAPO_PATTUGLIA', 'VICE', 'OPERATORE');

-- CreateEnum
CREATE TYPE "StatoDesignazione" AS ENUM ('PROPOSTA', 'ACCETTATA', 'RIFIUTATA');

-- CreateEnum
CREATE TYPE "TipoClassifica" AS ENUM ('PROVVISORIA', 'UFFICIALE');

-- CreateTable
CREATE TABLE "Ente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "logoUrl" TEXT,
    "etichettaTessera" TEXT NOT NULL DEFAULT 'Tessera',
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coordinamento" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Coordinamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "nascita" TIMESTAMP(3),
    "telefono" TEXT,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tessera" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "validaDal" TIMESTAMP(3),
    "validaAl" TIMESTAMP(3),

    CONSTRAINT "Tessera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utente" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAccesso" TIMESTAMP(3),

    CONSTRAINT "Utente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispositivo" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "chiavePubblica" TEXT NOT NULL,
    "nome" TEXT,
    "versioneApp" TEXT,
    "scartoOrologioMs" INTEGER NOT NULL DEFAULT 0,
    "registratoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoSync" TIMESTAMP(3),
    "revocato" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuoloEnte" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "ruolo" "TipoRuoloEnte" NOT NULL,
    "coordinamentoId" TEXT,

    CONSTRAINT "RuoloEnte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificaArbitro" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "livello" TEXT NOT NULL,
    "dal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "al" TIMESTAMP(3),
    "coordinamentoId" TEXT,

    CONSTRAINT "QualificaArbitro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squadra" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "coordinamentoId" TEXT,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "logoUrl" TEXT,
    "fasce" JSONB,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Squadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroSquadra" (
    "id" TEXT NOT NULL,
    "squadraId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "dal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "al" TIMESTAMP(3),

    CONSTRAINT "MembroSquadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipologiaGara" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "TipologiaGara_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersioneTipologia" (
    "id" TEXT NOT NULL,
    "tipologiaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "stato" "StatoVersione" NOT NULL DEFAULT 'BOZZA',
    "parametri" JSONB NOT NULL,
    "regolePredefinite" JSONB NOT NULL,
    "hash" TEXT,
    "pubblicataIl" TIMESTAMP(3),

    CONSTRAINT "VersioneTipologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "file" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "byte" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "caricatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersioneTipologiaDocumento" (
    "versioneId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,

    CONSTRAINT "VersioneTipologiaDocumento_pkey" PRIMARY KEY ("versioneId","documentoId")
);

-- CreateTable
CREATE TABLE "TipoObiettivo" (
    "id" TEXT NOT NULL,
    "versioneId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "richiedeArbitro" BOOLEAN NOT NULL DEFAULT true,
    "richiedeFinestra" BOOLEAN NOT NULL DEFAULT true,
    "compilatoDa" "CompilatoDa" NOT NULL DEFAULT 'ARBITRO',
    "fotoMinime" INTEGER NOT NULL DEFAULT 0,
    "abbinabileCon" TEXT[],
    "templateId" TEXT,

    CONSTRAINT "TipoObiettivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "genere" "GenereTemplate" NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersioneTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "stato" "StatoVersione" NOT NULL DEFAULT 'BOZZA',
    "campi" JSONB NOT NULL,
    "derivataDaId" TEXT,
    "preimpostati" JSONB,
    "hash" TEXT,

    CONSTRAINT "VersioneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersioneTipologiaTemplate" (
    "versioneTipologiaId" TEXT NOT NULL,
    "versioneTemplateId" TEXT NOT NULL,

    CONSTRAINT "VersioneTipologiaTemplate_pkey" PRIMARY KEY ("versioneTipologiaId","versioneTemplateId")
);

-- CreateTable
CREATE TABLE "Campionato" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "tipologiaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "stagione" TEXT NOT NULL,
    "regole" JSONB NOT NULL,

    CONSTRAINT "Campionato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampionatoCoordinamento" (
    "campionatoId" TEXT NOT NULL,
    "coordinamentoId" TEXT NOT NULL,

    CONSTRAINT "CampionatoCoordinamento_pkey" PRIMARY KEY ("campionatoId","coordinamentoId")
);

-- CreateTable
CREATE TABLE "IscrizioneCampionato" (
    "campionatoId" TEXT NOT NULL,
    "squadraId" TEXT NOT NULL,
    "dal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IscrizioneCampionato_pkey" PRIMARY KEY ("campionatoId","squadraId")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "locandinaUrl" TEXT,
    "inizio" TIMESTAMP(3) NOT NULL,
    "fine" TIMESTAMP(3) NOT NULL,
    "luogo" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "versioneTipologiaId" TEXT NOT NULL,
    "stato" "StatoEvento" NOT NULL DEFAULT 'BOZZA',
    "opzioni" JSONB NOT NULL,
    "configurazioneCongelata" JSONB,
    "hashConfigurazione" TEXT,
    "avviatoIl" TIMESTAMP(3),
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoCoordinamento" (
    "eventoId" TEXT NOT NULL,
    "coordinamentoId" TEXT NOT NULL,

    CONSTRAINT "EventoCoordinamento_pkey" PRIMARY KEY ("eventoId","coordinamentoId")
);

-- CreateTable
CREATE TABLE "EventoCampionato" (
    "eventoId" TEXT NOT NULL,
    "campionatoId" TEXT NOT NULL,
    "tappa" INTEGER,

    CONSTRAINT "EventoCampionato_pkey" PRIMARY KEY ("eventoId","campionatoId")
);

-- CreateTable
CREATE TABLE "EventoDocumento" (
    "eventoId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "ruolo" "TipoDocumento" NOT NULL,

    CONSTRAINT "EventoDocumento_pkey" PRIMARY KEY ("eventoId","documentoId")
);

-- CreateTable
CREATE TABLE "Obiettivo" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipi" TEXT[],
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "geometria" JSONB,
    "durataMin" INTEGER NOT NULL,
    "areaDa" TIMESTAMP(3),
    "areaA" TIMESTAMP(3),
    "ultimaFinestra" TIMESTAMP(3),
    "ordine" INTEGER,
    "fasi" JSONB NOT NULL DEFAULT '[]',
    "versioneTemplateId" TEXT,
    "stato" "StatoObiettivo" NOT NULL DEFAULT 'ATTIVO',

    CONSTRAINT "Obiettivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabellaPunteggi" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "regole" JSONB NOT NULL,
    "versione" INTEGER NOT NULL DEFAULT 1,
    "aggiornataIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TabellaPunteggi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadraEvento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "squadraId" TEXT NOT NULL,
    "identificativo" TEXT NOT NULL,
    "stato" "StatoSquadraEvento" NOT NULL DEFAULT 'ISCRITTA',
    "ruolo" "RuoloSquadraEvento" NOT NULL DEFAULT 'GAREGGIA',
    "inCampionato" BOOLEAN NOT NULL DEFAULT true,
    "pagato" BOOLEAN NOT NULL DEFAULT false,
    "iscrittaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadraEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartecipanteEvento" (
    "id" TEXT NOT NULL,
    "squadraEventoId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "ruolo" "RuoloPartecipante" NOT NULL DEFAULT 'OPERATORE',
    "numeroFascia" INTEGER,
    "prestitoDaId" TEXT,

    CONSTRAINT "PartecipanteEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArbitroEvento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "ruoli" TEXT[],
    "stato" "StatoDesignazione" NOT NULL DEFAULT 'PROPOSTA',
    "motivoRifiuto" TEXT,
    "rispostaIl" TIMESTAMP(3),

    CONSTRAINT "ArbitroEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArbitroObiettivo" (
    "arbitroEventoId" TEXT NOT NULL,
    "obiettivoId" TEXT NOT NULL,

    CONSTRAINT "ArbitroObiettivo_pkey" PRIMARY KEY ("arbitroEventoId","obiettivoId")
);

-- CreateTable
CREATE TABLE "MembroDirezione" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "ruolo" TEXT NOT NULL,

    CONSTRAINT "MembroDirezione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAsg" (
    "id" TEXT NOT NULL,
    "partecipanteId" TEXT NOT NULL,
    "modelloAsg" TEXT NOT NULL,
    "velocitaMs" DOUBLE PRECISION,
    "pesoPallinoG" DOUBLE PRECISION,
    "joule" DOUBLE PRECISION,
    "strumento" TEXT,
    "esito" TEXT NOT NULL,
    "marcatore" TEXT,
    "trattenuta" BOOLEAN NOT NULL DEFAULT false,
    "ritestareAllaFine" BOOLEAN NOT NULL DEFAULT false,
    "misuratoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAsg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operazione" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "autoreUtenteId" TEXT NOT NULL,
    "dispositivoId" TEXT NOT NULL,
    "oraDispositivo" TIMESTAMP(3) NOT NULL,
    "scartoOrologioMs" INTEGER NOT NULL,
    "oraUfficiale" TIMESTAMP(3) NOT NULL,
    "gps" JSONB,
    "rif" TEXT[],
    "dati" JSONB NOT NULL,
    "firma" TEXT NOT NULL,
    "firmaValida" BOOLEAN NOT NULL DEFAULT false,
    "ricevutaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consegnataDa" TEXT,

    CONSTRAINT "Operazione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "hash" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "file" TEXT,
    "mime" TEXT,
    "byte" INTEGER,
    "caricataIl" TIMESTAMP(3),

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "ClassificaEvento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipo" "TipoClassifica" NOT NULL,
    "campionatoId" TEXT,
    "dati" JSONB NOT NULL,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ente_sigla_key" ON "Ente"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Coordinamento_enteId_nome_key" ON "Coordinamento"("enteId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Tessera_enteId_numero_key" ON "Tessera"("enteId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Utente_personaId_key" ON "Utente"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "Utente_email_key" ON "Utente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RuoloEnte_utenteId_enteId_ruolo_key" ON "RuoloEnte"("utenteId", "enteId", "ruolo");

-- CreateIndex
CREATE UNIQUE INDEX "Squadra_enteId_nome_key" ON "Squadra"("enteId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "MembroSquadra_squadraId_personaId_key" ON "MembroSquadra"("squadraId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "TipologiaGara_enteId_codice_key" ON "TipologiaGara"("enteId", "codice");

-- CreateIndex
CREATE UNIQUE INDEX "VersioneTipologia_tipologiaId_numero_key" ON "VersioneTipologia"("tipologiaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "TipoObiettivo_versioneId_codice_key" ON "TipoObiettivo"("versioneId", "codice");

-- CreateIndex
CREATE UNIQUE INDEX "Template_enteId_codice_key" ON "Template"("enteId", "codice");

-- CreateIndex
CREATE UNIQUE INDEX "VersioneTemplate_templateId_numero_key" ON "VersioneTemplate"("templateId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Evento_codice_key" ON "Evento"("codice");

-- CreateIndex
CREATE UNIQUE INDEX "Obiettivo_eventoId_codice_key" ON "Obiettivo"("eventoId", "codice");

-- CreateIndex
CREATE UNIQUE INDEX "TabellaPunteggi_eventoId_key" ON "TabellaPunteggi"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadraEvento_eventoId_squadraId_key" ON "SquadraEvento"("eventoId", "squadraId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadraEvento_eventoId_identificativo_key" ON "SquadraEvento"("eventoId", "identificativo");

-- CreateIndex
CREATE UNIQUE INDEX "PartecipanteEvento_squadraEventoId_personaId_key" ON "PartecipanteEvento"("squadraEventoId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "ArbitroEvento_eventoId_personaId_key" ON "ArbitroEvento"("eventoId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "MembroDirezione_eventoId_utenteId_ruolo_key" ON "MembroDirezione"("eventoId", "utenteId", "ruolo");

-- CreateIndex
CREATE INDEX "Operazione_eventoId_tipo_idx" ON "Operazione"("eventoId", "tipo");

-- CreateIndex
CREATE INDEX "Operazione_eventoId_oraUfficiale_idx" ON "Operazione"("eventoId", "oraUfficiale");

-- CreateIndex
CREATE INDEX "Operazione_eventoId_ricevutaIl_idx" ON "Operazione"("eventoId", "ricevutaIl");

-- AddForeignKey
ALTER TABLE "Coordinamento" ADD CONSTRAINT "Coordinamento_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tessera" ADD CONSTRAINT "Tessera_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tessera" ADD CONSTRAINT "Tessera_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utente" ADD CONSTRAINT "Utente_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispositivo" ADD CONSTRAINT "Dispositivo_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuoloEnte" ADD CONSTRAINT "RuoloEnte_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuoloEnte" ADD CONSTRAINT "RuoloEnte_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificaArbitro" ADD CONSTRAINT "QualificaArbitro_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificaArbitro" ADD CONSTRAINT "QualificaArbitro_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificaArbitro" ADD CONSTRAINT "QualificaArbitro_coordinamentoId_fkey" FOREIGN KEY ("coordinamentoId") REFERENCES "Coordinamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squadra" ADD CONSTRAINT "Squadra_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squadra" ADD CONSTRAINT "Squadra_coordinamentoId_fkey" FOREIGN KEY ("coordinamentoId") REFERENCES "Coordinamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroSquadra" ADD CONSTRAINT "MembroSquadra_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "Squadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroSquadra" ADD CONSTRAINT "MembroSquadra_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipologiaGara" ADD CONSTRAINT "TipologiaGara_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTipologia" ADD CONSTRAINT "VersioneTipologia_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "TipologiaGara"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTipologiaDocumento" ADD CONSTRAINT "VersioneTipologiaDocumento_versioneId_fkey" FOREIGN KEY ("versioneId") REFERENCES "VersioneTipologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTipologiaDocumento" ADD CONSTRAINT "VersioneTipologiaDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoObiettivo" ADD CONSTRAINT "TipoObiettivo_versioneId_fkey" FOREIGN KEY ("versioneId") REFERENCES "VersioneTipologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTemplate" ADD CONSTRAINT "VersioneTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTemplate" ADD CONSTRAINT "VersioneTemplate_derivataDaId_fkey" FOREIGN KEY ("derivataDaId") REFERENCES "VersioneTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTipologiaTemplate" ADD CONSTRAINT "VersioneTipologiaTemplate_versioneTipologiaId_fkey" FOREIGN KEY ("versioneTipologiaId") REFERENCES "VersioneTipologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersioneTipologiaTemplate" ADD CONSTRAINT "VersioneTipologiaTemplate_versioneTemplateId_fkey" FOREIGN KEY ("versioneTemplateId") REFERENCES "VersioneTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campionato" ADD CONSTRAINT "Campionato_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campionato" ADD CONSTRAINT "Campionato_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "TipologiaGara"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampionatoCoordinamento" ADD CONSTRAINT "CampionatoCoordinamento_campionatoId_fkey" FOREIGN KEY ("campionatoId") REFERENCES "Campionato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampionatoCoordinamento" ADD CONSTRAINT "CampionatoCoordinamento_coordinamentoId_fkey" FOREIGN KEY ("coordinamentoId") REFERENCES "Coordinamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IscrizioneCampionato" ADD CONSTRAINT "IscrizioneCampionato_campionatoId_fkey" FOREIGN KEY ("campionatoId") REFERENCES "Campionato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IscrizioneCampionato" ADD CONSTRAINT "IscrizioneCampionato_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "Squadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "Ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_versioneTipologiaId_fkey" FOREIGN KEY ("versioneTipologiaId") REFERENCES "VersioneTipologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCoordinamento" ADD CONSTRAINT "EventoCoordinamento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCoordinamento" ADD CONSTRAINT "EventoCoordinamento_coordinamentoId_fkey" FOREIGN KEY ("coordinamentoId") REFERENCES "Coordinamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCampionato" ADD CONSTRAINT "EventoCampionato_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCampionato" ADD CONSTRAINT "EventoCampionato_campionatoId_fkey" FOREIGN KEY ("campionatoId") REFERENCES "Campionato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDocumento" ADD CONSTRAINT "EventoDocumento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoDocumento" ADD CONSTRAINT "EventoDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obiettivo" ADD CONSTRAINT "Obiettivo_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obiettivo" ADD CONSTRAINT "Obiettivo_versioneTemplateId_fkey" FOREIGN KEY ("versioneTemplateId") REFERENCES "VersioneTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabellaPunteggi" ADD CONSTRAINT "TabellaPunteggi_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadraEvento" ADD CONSTRAINT "SquadraEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadraEvento" ADD CONSTRAINT "SquadraEvento_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "Squadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartecipanteEvento" ADD CONSTRAINT "PartecipanteEvento_squadraEventoId_fkey" FOREIGN KEY ("squadraEventoId") REFERENCES "SquadraEvento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartecipanteEvento" ADD CONSTRAINT "PartecipanteEvento_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartecipanteEvento" ADD CONSTRAINT "PartecipanteEvento_prestitoDaId_fkey" FOREIGN KEY ("prestitoDaId") REFERENCES "Squadra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitroEvento" ADD CONSTRAINT "ArbitroEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitroEvento" ADD CONSTRAINT "ArbitroEvento_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitroObiettivo" ADD CONSTRAINT "ArbitroObiettivo_arbitroEventoId_fkey" FOREIGN KEY ("arbitroEventoId") REFERENCES "ArbitroEvento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitroObiettivo" ADD CONSTRAINT "ArbitroObiettivo_obiettivoId_fkey" FOREIGN KEY ("obiettivoId") REFERENCES "Obiettivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroDirezione" ADD CONSTRAINT "MembroDirezione_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroDirezione" ADD CONSTRAINT "MembroDirezione_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAsg" ADD CONSTRAINT "TestAsg_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES "PartecipanteEvento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operazione" ADD CONSTRAINT "Operazione_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operazione" ADD CONSTRAINT "Operazione_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificaEvento" ADD CONSTRAINT "ClassificaEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
