#!/bin/sh
set -e
# applica solo le migrazioni mancanti: un riavvio non tocca i dati
node /prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
# dati di prova solo se richiesto esplicitamente (SEED_DEMO=1) e solo su database vuoto
if [ "$SEED_DEMO" = "1" ]; then node prisma/seed.mjs; fi
exec node server.js
