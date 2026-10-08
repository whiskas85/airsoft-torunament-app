// Dati iniziali: ente FIGT d'esempio con tipologie PLR e PCR, template, campionati, squadre e
// account di prova, più un evento demo per tipologia.
//
//   npm run db:seed            (non fa nulla se l'ente esiste già)
//   npx prisma migrate reset   (azzera il database e riesegue il seed)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import {
  TEMPLATE, REGOLE_PLR, REGOLE_PCR, PARAMETRI_PLR, PARAMETRI_PCR, TIPI_PLR, TIPI_PCR, REGOLE_CAMPIONATO,
} from './dati/figt.mjs';

const prisma = new PrismaClient();

/** JSON con chiavi ordinate: lo stesso contenuto dà sempre lo stesso codice di controllo */
function canonico(v) {
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonico(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const hash = (v) => createHash('sha256').update(canonico(v)).digest('hex');

async function main() {
  if (await prisma.ente.findUnique({ where: { sigla: 'FIGT' } })) {
    console.log('Dati iniziali già presenti: niente da fare (per ripartire: npx prisma migrate reset).');
    return;
  }
  const password = await bcrypt.hash(process.env.SEED_PASSWORD || 'torneo2026', 10);

  // ── ente e coordinamento
  const ente = await prisma.ente.create({
    data: { nome: 'Federazione Italiana Giochi Tattici (esempio)', sigla: 'FIGT', etichettaTessera: 'Tessera FIGT' },
  });
  const piemonte = await prisma.coordinamento.create({ data: { enteId: ente.id, nome: 'Piemonte' } });

  // ── template (versione 1, pubblicata)
  const versioneTemplate = {};
  for (const t of TEMPLATE) {
    const tpl = await prisma.template.create({ data: { enteId: ente.id, codice: t.codice, nome: t.nome, genere: t.genere } });
    const v = await prisma.versioneTemplate.create({
      data: { templateId: tpl.id, numero: 1, stato: 'PUBBLICATA', campi: t.campi, hash: hash(t.campi) },
    });
    versioneTemplate[t.codice] = v;
  }

  // ── tipologie di gara PLR e PCR
  async function tipologia(codice, nome, parametri, regole, tipi) {
    const tip = await prisma.tipologiaGara.create({ data: { enteId: ente.id, codice, nome } });
    const usati = [...new Set(tipi.map((t) => t.template))].concat(codice === 'PLR' ? ['PLR-CONTRO', 'PLR-ESFILTRAZIONE'] : []).concat(['TEST-ASG']);
    const versione = await prisma.versioneTipologia.create({
      data: {
        tipologiaId: tip.id, numero: 1, stato: 'PUBBLICATA', parametri, regolePredefinite: regole,
        hash: hash({ parametri, regole, tipi }), pubblicataIl: new Date(),
        tipiObiettivo: {
          create: tipi.map((t) => ({
            codice: t.codice, nome: t.nome,
            richiedeArbitro: t.richiedeArbitro ?? true, richiedeFinestra: t.richiedeFinestra ?? true,
            compilatoDa: t.compilatoDa ?? 'ARBITRO', fotoMinime: t.fotoMinime ?? 0,
            abbinabileCon: t.abbinabileCon ?? [], templateId: versioneTemplate[t.template].templateId,
          })),
        },
        template: { create: [...new Set(usati)].map((c) => ({ versioneTemplateId: versioneTemplate[c].id })) },
      },
    });
    return { tip, versione };
  }
  const plr = await tipologia('PLR', 'Pattuglia a Lungo Raggio', PARAMETRI_PLR, REGOLE_PLR, TIPI_PLR);
  const pcr = await tipologia('PCR', 'Pattuglia a Corto Raggio', PARAMETRI_PCR, REGOLE_PCR, TIPI_PCR);

  // ── campionati
  const campPlr = await prisma.campionato.create({
    data: { enteId: ente.id, tipologiaId: plr.tip.id, nome: 'Campionato regionale PLR Piemonte', stagione: '2026-2027',
      regole: REGOLE_CAMPIONATO, coordinamenti: { create: { coordinamentoId: piemonte.id } } },
  });
  const campPcr = await prisma.campionato.create({
    data: { enteId: ente.id, tipologiaId: pcr.tip.id, nome: 'Campionato regionale PCR Piemonte', stagione: '2026-2027',
      regole: REGOLE_CAMPIONATO, coordinamenti: { create: { coordinamentoId: piemonte.id } } },
  });

  // ── persone, tessere, account
  let tessera = 1000;
  async function persona(nome, cognome, email) {
    const p = await prisma.persona.create({ data: { nome, cognome } });
    await prisma.tessera.create({ data: { personaId: p.id, enteId: ente.id, numero: `2026-${tessera++}` } });
    if (email) await prisma.utente.create({ data: { personaId: p.id, email, passwordHash: password } });
    return p;
  }
  const utente = (email) => prisma.utente.findUniqueOrThrow({ where: { email } });

  const admin = await persona('Amministratore', 'Ente', 'admin@demo.torneo');
  await prisma.ruoloEnte.create({ data: { utenteId: (await utente('admin@demo.torneo')).id, enteId: ente.id, ruolo: 'AMMINISTRATORE' } });
  await persona('Direzione', 'Gara', 'direzione@demo.torneo');
  const arbitri = [];
  for (const [i, livello] of ['NAZIONALE', 'REGIONALE', 'REGIONALE', 'AUSILIARE'].entries()) {
    const p = await persona('Arbitro', `${i + 1}`, `arbitro${i + 1}@demo.torneo`);
    await prisma.qualificaArbitro.create({ data: { personaId: p.id, enteId: ente.id, livello, coordinamentoId: piemonte.id } });
    arbitri.push(p);
  }

  // ── squadre (nomi di fantasia, Zero Dark a parte), con capo pattuglia e operatori
  const SQUADRE = [
    { nome: 'Zero Dark Team', sigla: 'ZDT', colori: ['nero', 'arancione'], email: 'zdt@demo.torneo' },
    { nome: 'Squadra Alfa', sigla: 'ALF', colori: ['giallo', 'blu'], email: 'alfa@demo.torneo' },
    { nome: 'Squadra Bravo', sigla: 'BRV', colori: ['rosso', 'bianco'], email: 'bravo@demo.torneo' },
    { nome: 'Squadra Charlie', sigla: 'CHL', colori: ['verde', 'giallo'], email: 'charlie@demo.torneo' },
    { nome: 'Squadra Delta', sigla: 'DLT', colori: ['azzurro', 'arancione'], email: 'delta@demo.torneo' },
  ];
  const squadre = [];
  for (const s of SQUADRE) {
    const sq = await prisma.squadra.create({
      data: { enteId: ente.id, coordinamentoId: piemonte.id, nome: s.nome, sigla: s.sigla, fasce: { colori: s.colori } },
    });
    const membri = [await persona('Capo', s.sigla, s.email)];
    for (let k = 2; k <= 5; k++) membri.push(await persona(`Operatore ${k}`, s.sigla));
    for (const m of membri) await prisma.membroSquadra.create({ data: { squadraId: sq.id, personaId: m.id } });
    squadre.push({ ...sq, membri });
  }
  // la quinta squadra gioca "open": non è iscritta ai campionati
  for (const sq of squadre.slice(0, 4)) {
    await prisma.iscrizioneCampionato.create({ data: { campionatoId: campPlr.id, squadraId: sq.id } });
    await prisma.iscrizioneCampionato.create({ data: { campionatoId: campPcr.id, squadraId: sq.id } });
  }

  // ── eventi demo
  const domani = new Date(); domani.setDate(domani.getDate() + 7); domani.setHours(8, 0, 0, 0);
  const ore = (h) => new Date(domani.getTime() + h * 3600e3);

  async function evento({ codice, nome, tipologia, campionato, obiettivi, regole, organizzatrice }) {
    const ev = await prisma.evento.create({
      data: {
        codice, nome, enteId: ente.id, inizio: ore(0), fine: ore(10), luogo: 'Campo demo (TO)', lat: 45.07, lon: 7.68,
        versioneTipologiaId: tipologia.versione.id,
        opzioni: { puntiVisibiliInGara: false, finestre: { gestione: 'DISLOCATA' }, periodoContestazioniOre: 24, esfiltrazioneMassima: ore(10).toISOString() },
        coordinamenti: { create: { coordinamentoId: piemonte.id } },
        campionati: { create: { campionatoId: campionato.id, tappa: 1 } },
      },
    });
    const creati = [];
    for (const o of obiettivi) {
      creati.push(await prisma.obiettivo.create({
        data: {
          eventoId: ev.id, codice: o.codice, nome: o.nome, tipi: o.tipi, durataMin: o.durata ?? 20, ordine: o.ordine,
          areaDa: ore(0), areaA: ore(9.5), ultimaFinestra: ore(9), fasi: o.fasi ?? [],
          lat: 45.07 + Math.random() / 100, lon: 7.68 + Math.random() / 100,
          geometria: { areaEsecuzioneM: 40, zonaObiettivoM: 60 },
          versioneTemplateId: versioneTemplate[o.template].id,
        },
      }));
    }
    // tabella punteggi: regole della tipologia + valori decisi per ogni obiettivo
    await prisma.tabellaPunteggi.create({ data: { eventoId: ev.id, regole: { ...regole, obiettivi: Object.fromEntries(obiettivi.map((o) => [o.codice, o.punti ?? {}])) } } });

    for (const [i, sq] of squadre.entries()) {
      const organizza = sq.nome === organizzatrice;
      const se = await prisma.squadraEvento.create({
        data: { eventoId: ev.id, squadraId: sq.id, identificativo: sq.sigla, ruolo: organizza ? 'ORGANIZZATRICE' : 'GAREGGIA',
          inCampionato: i < 4, pagato: i % 2 === 0 },
      });
      if (organizza) continue;
      for (const [k, m] of sq.membri.entries()) {
        await prisma.partecipanteEvento.create({
          data: { squadraEventoId: se.id, personaId: m.id, numeroFascia: k, ruolo: k === 0 ? 'CAPO_PATTUGLIA' : k === 1 ? 'VICE' : 'OPERATORE' },
        });
      }
    }
    // arbitri: il primo è capo arbitro, gli altri si dividono gli obiettivi con arbitro
    const conArbitro = creati.filter((o) => !o.tipi.every((t) => ['B', 'C'].includes(t)));
    for (const [i, p] of arbitri.entries()) {
      const ae = await prisma.arbitroEvento.create({
        data: { eventoId: ev.id, personaId: p.id, ruoli: i === 0 ? ['CAPO_ARBITRO', 'COMMISSIONE'] : ['OBIETTIVO'], stato: 'ACCETTATA', rispostaIl: new Date() },
      });
      if (i === 0) continue;
      for (const o of conArbitro.filter((_, k) => k % (arbitri.length - 1) === i - 1)) {
        await prisma.arbitroObiettivo.create({ data: { arbitroEventoId: ae.id, obiettivoId: o.id } });
      }
    }
    await prisma.membroDirezione.create({ data: { eventoId: ev.id, utenteId: (await utente('direzione@demo.torneo')).id, ruolo: 'DIREZIONE' } });
    return ev;
  }

  await evento({
    codice: 'DEMO-PLR-1', nome: 'Tappa demo PLR', tipologia: plr, campionato: campPlr, regole: REGOLE_PLR, organizzatrice: 'Squadra Delta',
    obiettivi: [
      { codice: 'OBJ1', nome: 'Il ponte', tipi: ['A', 'E'], template: 'PLR-OBJ-AD', fasi: [{ codice: 'E1', nome: 'Disinnesca la bomba' }, { codice: 'E2', nome: 'Recupera il documento' }],
        punti: { valorePositivo: 560, fasi: { E1: 200, E2: 150 } } },
      { codice: 'OBJ2', nome: 'Punto di osservazione', tipi: ['B'], template: 'PLR-WAYPOINT-B', punti: { valorePositivo: 50 } },
      { codice: 'OBJ3', nome: 'Il campo base', tipi: ['C'], template: 'PLR-RECON-C', punti: { valorePositivo: 400 } },
      { codice: 'OBJ4', nome: 'Soccorso al pilota', tipi: ['F', 'E'], template: 'PLR-OBJ-FG', fasi: [{ codice: 'E1', nome: 'Porta in salvo il ferito' }],
        punti: { valorePositivo: 500, fasi: { E1: 250 } } },
      { codice: 'OBJ5', nome: 'La fattoria', tipi: ['H'], template: 'PLR-OBJ-H', punti: { valorePositivo: 450 } },
    ],
  });
  await evento({
    codice: 'DEMO-PCR-1', nome: 'Tappa demo PCR', tipologia: pcr, campionato: campPcr, regole: REGOLE_PCR, organizzatrice: 'Squadra Delta',
    obiettivi: [
      { codice: 'OBJ1', nome: 'Posto di blocco', tipi: ['A'], template: 'PCR-OBJ-A', ordine: 1, durata: 15, punti: { valorePositivo: 200 } },
      { codice: 'OBJ2', nome: 'Il laboratorio', tipi: ['E'], template: 'PCR-OBJ-E', ordine: 2, durata: 15, fasi: [{ codice: 'E1', nome: 'Neutralizza il campione' }],
        punti: { valorePositivo: 300, fasi: { E1: 300 } } },
      { codice: 'OBJ3', nome: 'La scorta', tipi: ['G'], template: 'PCR-OBJ-FG', ordine: 3, durata: 20, punti: { valorePositivo: 360 } },
      { codice: 'OBJ4', nome: 'Il casolare', tipi: ['H', 'E'], template: 'PCR-OBJ-H', ordine: 4, durata: 20, fasi: [{ codice: 'E1', nome: 'Libera l\'ostaggio' }],
        punti: { valorePositivo: 600, fasi: { E1: 200 } } },
    ],
  });

  console.log('Dati iniziali creati. Account di prova (password in SEED_PASSWORD):');
  console.log('  admin@demo.torneo · direzione@demo.torneo · arbitro1..4@demo.torneo · zdt/alfa/bravo/charlie/delta@demo.torneo');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
