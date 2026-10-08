import 'server-only';
import { prisma } from './db';
import { hashCanonico } from './canonico';

/**
 * Fotografia della configurazione al momento dell'avvio (§6bis): è ciò che scaricano i telefoni.
 * Contiene tutto ciò che serve in campo TRANNE la tabella punteggi, che resta sul server e alla direzione:
 * di quella si salva solo il codice di controllo, così nessuno può cambiarla a gara in corso senza che si veda.
 */
export async function costruisciConfigurazione(eventoId: string) {
  const ev = await prisma.evento.findUniqueOrThrow({
    where: { id: eventoId },
    include: {
      ente: true,
      versioneTipologia: { include: { tipologia: true, tipiObiettivo: true } },
      obiettivi: { include: { versioneTemplate: { include: { template: true } }, arbitri: true }, orderBy: [{ ordine: 'asc' }, { codice: 'asc' }] },
      squadre: { include: { squadra: true, partecipanti: { include: { persona: true } } } },
      arbitri: { where: { stato: 'ACCETTATA' }, include: { persona: true, obiettivi: true } },
      documenti: { include: { documento: true } },
      campionati: true,
      coordinamenti: true,
      tabella: true,
    },
  });

  // i template usati: dagli obiettivi e dalla tipologia (contro, esfiltrazione, test ASG…)
  const tpl = await prisma.versioneTipologiaTemplate.findMany({
    where: { versioneTipologiaId: ev.versioneTipologiaId },
    include: { versioneTemplate: { include: { template: true } } },
  });
  const template = new Map<string, { id: string; codice: string; nome: string; genere: string; numero: number; campi: unknown; hash: string | null }>();
  for (const v of [...tpl.map((t) => t.versioneTemplate), ...ev.obiettivi.flatMap((o) => (o.versioneTemplate ? [o.versioneTemplate] : []))]) {
    template.set(v.id, { id: v.id, codice: v.template.codice, nome: v.template.nome, genere: v.template.genere, numero: v.numero, campi: v.campi, hash: v.hash });
  }

  const configurazione = {
    formato: 1,
    evento: {
      id: ev.id, codice: ev.codice, nome: ev.nome, ente: { id: ev.ente.id, nome: ev.ente.nome, etichettaTessera: ev.ente.etichettaTessera },
      inizio: ev.inizio, fine: ev.fine, luogo: ev.luogo, lat: ev.lat, lon: ev.lon, opzioni: ev.opzioni,
      campionati: ev.campionati.map((c) => ({ campionatoId: c.campionatoId, tappa: c.tappa })),
    },
    tipologia: {
      codice: ev.versioneTipologia.tipologia.codice, nome: ev.versioneTipologia.tipologia.nome,
      versione: ev.versioneTipologia.numero, hash: ev.versioneTipologia.hash, parametri: ev.versioneTipologia.parametri,
      tipiObiettivo: ev.versioneTipologia.tipiObiettivo.map((t) => ({
        codice: t.codice, nome: t.nome, richiedeArbitro: t.richiedeArbitro, richiedeFinestra: t.richiedeFinestra,
        compilatoDa: t.compilatoDa, fotoMinime: t.fotoMinime,
      })),
    },
    template: [...template.values()],
    obiettivi: ev.obiettivi.map((o) => ({
      id: o.id, codice: o.codice, nome: o.nome, tipi: o.tipi, lat: o.lat, lon: o.lon, geometria: o.geometria,
      durataMin: o.durataMin, areaDa: o.areaDa, areaA: o.areaA, ultimaFinestra: o.ultimaFinestra, ordine: o.ordine,
      fasi: o.fasi, versioneTemplateId: o.versioneTemplateId,
      arbitri: o.arbitri.map((a) => a.arbitroEventoId),
    })),
    squadre: ev.squadre.map((s) => ({
      id: s.id, identificativo: s.identificativo, nome: s.squadra.nome, fasce: s.squadra.fasce, ruolo: s.ruolo, inCampionato: s.inCampionato,
      partecipanti: s.partecipanti.map((p) => ({
        id: p.id, personaId: p.personaId, nome: `${p.persona.nome} ${p.persona.cognome}`, ruolo: p.ruolo, numeroFascia: p.numeroFascia, prestitoDaId: p.prestitoDaId,
      })),
    })),
    arbitri: ev.arbitri.map((a) => ({
      id: a.id, personaId: a.personaId, nome: `${a.persona.nome} ${a.persona.cognome}`, ruoli: a.ruoli, obiettivi: a.obiettivi.map((o) => o.obiettivoId),
    })),
    documenti: ev.documenti.map((d) => ({ id: d.documento.id, titolo: d.documento.titolo, ruolo: d.ruolo, mime: d.documento.mime, byte: d.documento.byte, hash: d.documento.hash })),
  };

  return { configurazione, hash: hashCanonico(configurazione), hashTabella: hashCanonico(ev.tabella?.regole ?? null) };
}
