# Immagine di produzione dell'app tornei: Next.js in modalità standalone + Prisma per le migrazioni.
FROM node:22-alpine AS dipendenze
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=dipendenze /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build
# CLI di Prisma con tutte le sue dipendenze, a parte: serve solo per `migrate deploy` all'avvio
RUN npm install --prefix /prisma-cli --no-audit --no-fund prisma@$(node -p "require('prisma/package.json').version")

FROM node:22-alpine AS esecuzione
WORKDIR /app
RUN apk add --no-cache openssl tini && addgroup -S app && adduser -S app -G app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
# server standalone e file statici
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Prisma: schema, migrazioni, seed (client e motore servono anche al seed)
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /prisma-cli /prisma-cli
COPY --from=build --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=app:app /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --chown=app:app docker-entrypoint.sh ./
# se il file arriva da Windows con gli a capo CRLF, la shell non lo esegue
RUN sed -i 's/\r$//' docker-entrypoint.sh
USER app
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:3100/api/salute || exit 1
ENTRYPOINT ["/sbin/tini", "--", "sh", "./docker-entrypoint.sh"]
