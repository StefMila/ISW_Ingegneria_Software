import express from 'express';
import mongoose from 'mongoose';

import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Evento from '../models/evento.js';
import Azienda from '../models/azienda.js';
import {
  createGoogleCalendarEvent,
  getGoogleIntegrationForUserAzienda,
  refreshAccessTokenIfNeeded
} from './google-calendar.js';

// Diviso in pubblico e privato. Router per eventi pubblici (accessibili a tutti, senza autenticazione)
const publicRouter = express.Router({ mergeParams: true });
const aziendeRouter = express.Router({ mergeParams: true });
//labels predefinite per i tipi di evento
const EVENT_TYPE_LABEL = {
  'controllo-sanitario': 'Controllo sanitario',
  vaccinazione: 'Vaccinazione',
  'parto-previsto': 'Parto previsto',
  consegna: 'Consegna / logistica',
  'scadenza-documentale': 'Scadenza documentale',
  altro: 'Altro'
};

const EVENT_VISIBILITY_LABEL = {
  private: 'Privato',
  public: 'Pubblico'
};

const EVENT_RECURRENCE_LABEL = {
  single: 'Evento singolo',
  weekly: 'Settimanale',
  monthly: 'Mensile'
};
// converte la data in formato UTC per google calendar RRULE 
const toRRuleUntilUtc = (dateValue) => {
  const date = new Date(dateValue);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}T235959Z`;
};
// Utility per validare ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidExternalLink = (value) => {
  if (!value) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
// risolve l'azienda da path, body o query, con controlli di coerenza e presenza
const resolveAziendaId = (req, { allowBody = false, allowQuery = false, required = true } = {}) => {
  const paramAziendaId = normalizeString(req.params?.aziendaId);
  const bodyAziendaId = allowBody ? normalizeString(req.body?.aziendaId) : '';
  const queryAziendaId = allowQuery ? normalizeString(req.query?.aziendaId) : '';
  const aziendaId = paramAziendaId || bodyAziendaId || queryAziendaId;

  if (!aziendaId) {
    return required
      ? { ok: false, status: 400, message: 'aziendaId obbligatorio' }
      : { ok: true, aziendaId: '' };
  }

  if (paramAziendaId && bodyAziendaId && paramAziendaId !== bodyAziendaId) {
    return { ok: false, status: 400, message: 'aziendaId nel path e nel body non coincidono' };
  }

  if (paramAziendaId && queryAziendaId && paramAziendaId !== queryAziendaId) {
    return { ok: false, status: 400, message: 'aziendaId nel path e nella query non coincidono' };
  }

  if (bodyAziendaId && queryAziendaId && bodyAziendaId !== queryAziendaId) {
    return { ok: false, status: 400, message: 'aziendaId nel body e nella query non coincidono' };
  }

  return { ok: true, aziendaId };
};
// controlla se l'azienda ha l'indirizzo completo e reale. 
const looksLikeAddress = (value) => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (normalized.length < 8) return false;

  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(normalized);
  const hasStreetCue = /(via|viale|piazza|corso|largo|vicolo|strada|avenue|street|road|boulevard|blvd)\b/i.test(normalized);
  const hasNumber = /\d/.test(normalized);
  const hasComma = /,/.test(normalized);

  return hasLetters && (hasStreetCue || (hasNumber && hasComma));
};
// verifica che l'azienda esista 
const assertAziendaExists = async (aziendaId) => {
  if (!isValidObjectId(aziendaId)) {
    return { ok: false, status: 400, message: 'aziendaId non valido' };
  }

  const existingAzienda = await Azienda.findById(aziendaId).select('_id');
  if (!existingAzienda) {
    return { ok: false, status: 404, message: 'Azienda non trovata' };
  }

  return { ok: true };
};
// converte evento in qualcosa di più adatto per il frontend
const toEventDTO = (item) => {
  const startDate = new Date(item.startAt);
  const endDate = new Date(item.endAt);

  return {
    id: item._id,
    aziendaId: item.aziendaId,
    title: item.title,
    type: item.type,
    typeLabel: EVENT_TYPE_LABEL[item.type] || item.type,
    date: startDate.toISOString().slice(0, 10),
    startTime: startDate.toISOString().slice(11, 16),
    endTime: endDate.toISOString().slice(11, 16),
    location: item.locationAddress || item.location || '',
    description: item.description || '',
    link: item.link || '',
    visibility: item.visibility || 'private',
    visibilityLabel: EVENT_VISIBILITY_LABEL[item.visibility] || EVENT_VISIBILITY_LABEL.private,
    recurrenceType: item.recurrenceType || 'single',
    recurrenceInterval: Number(item.recurrenceInterval || 1),
    recurrenceUntil: item.recurrenceUntil || null,
    recurrenceLabel: EVENT_RECURRENCE_LABEL[item.recurrenceType] || EVENT_RECURRENCE_LABEL.single,
    reminderMinutes: Number(item.reminderMinutes || 0),
    reminderLabel: Number(item.reminderMinutes || 0) === 0
      ? 'Nessuno'
      : `${item.reminderMinutes} minuti prima`,
    googleCalendarEventId: item.googleCalendarEventId || '',
    googleSyncedAt: item.googleSyncedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const toPublicEventDTO = (item, aziendaMeta = {}) => ({
  ...toEventDTO(item),
  companyName: aziendaMeta.companyName || '',
  city: aziendaMeta.city || '',
  companyAddress: aziendaMeta.address || '',
  lat: Number.isFinite(Number(aziendaMeta.lat)) ? Number(aziendaMeta.lat) : null,
  lng: Number.isFinite(Number(aziendaMeta.lng)) ? Number(aziendaMeta.lng) : null
});
// converte evento pubblico in qualcosa di visibile lato frontend
const buildGooglePayload = (eventDoc, defaultReminderMinutes = 0) => {
  const reminder = Number.isFinite(Number(eventDoc.reminderMinutes))
    ? Number(eventDoc.reminderMinutes)
    : Number(defaultReminderMinutes || 0);

  const recurrence = [];
  if (eventDoc.recurrenceType && eventDoc.recurrenceType !== 'single') {
    const rruleParts = [
      `FREQ=${String(eventDoc.recurrenceType).toUpperCase()}`,
      `INTERVAL=${Math.max(Number(eventDoc.recurrenceInterval || 1), 1)}`
    ];

    if (eventDoc.recurrenceUntil) {
      rruleParts.push(`UNTIL=${toRRuleUntilUtc(eventDoc.recurrenceUntil)}`);
    }

    recurrence.push(`RRULE:${rruleParts.join(';')}`);
  }

  return {
    visibility: eventDoc.visibility || 'private',
    summary: eventDoc.title,
    description: eventDoc.description || undefined,
    location: eventDoc.locationAddress || eventDoc.location || undefined,
    start: {
      dateTime: new Date(eventDoc.startAt).toISOString(),
      timeZone: 'Europe/Rome'
    },
    end: {
      dateTime: new Date(eventDoc.endAt).toISOString(),
      timeZone: 'Europe/Rome'
    },
    reminders: {
      useDefault: false,
      overrides: reminder > 0 ? [{ method: 'popup', minutes: reminder }] : []
    },
    recurrence: recurrence.length > 0 ? recurrence : undefined
  };
};
// ricerca eventi pubblici
const loadAziendeMetaMap = async (aziendaIds) => {
  if (!aziendaIds.length) {
    return new Map();
  }

  const aziende = await Azienda.find({ _id: { $in: aziendaIds } })
    .select('_id companyName city address geo location');

  return new Map(aziende.map((azienda) => [String(azienda._id), {
    // Supporta sia geo.lat/lng sia location.coordinates GeoJSON.
    lat: Number.isFinite(Number(azienda?.geo?.lat))
      ? Number(azienda.geo.lat)
      : (Array.isArray(azienda?.location?.coordinates) && Number.isFinite(Number(azienda.location.coordinates[1]))
        ? Number(azienda.location.coordinates[1])
        : null),
    lng: Number.isFinite(Number(azienda?.geo?.lng))
      ? Number(azienda.geo.lng)
      : (Array.isArray(azienda?.location?.coordinates) && Number.isFinite(Number(azienda.location.coordinates[0]))
        ? Number(azienda.location.coordinates[0])
        : null),
    companyName: azienda.companyName || '',
    city: azienda.city || '',
    address: azienda.address || ''
  }]));
};
// crea evento su google calendar e restituisce l'id dell'evento creato. Funzione helper di business/filter
const buildPublicEventFilter = async (req) => {
  const scope = resolveAziendaId(req, { allowQuery: true, required: false });
  if (!scope.ok) {
    return scope;
  }

  const scopedAziendaId = scope.aziendaId;
  const city = normalizeString(req.query.city);
  const date = normalizeString(req.query.date);
  const filter = {
    visibility: 'public',
    endAt: { $gte: new Date() }
  };

  if (scopedAziendaId) {
    const aziendaCheck = await assertAziendaExists(scopedAziendaId);
    if (!aziendaCheck.ok) {
      return aziendaCheck;
    }

    filter.aziendaId = scopedAziendaId;
  }

  if (city) {
    const aziendaFilter = {
      city: { $regex: city, $options: 'i' },
      ...(scopedAziendaId ? { _id: scopedAziendaId } : {})
    };
    const aziende = await Azienda.find(aziendaFilter).select('_id');
    const aziendaIds = aziende.map((azienda) => azienda._id);
    if (aziendaIds.length === 0) {
      filter.aziendaId = { $in: [] };
    } else {
      filter.aziendaId = scopedAziendaId ? scopedAziendaId : { $in: aziendaIds };
    }
  }

  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    if (Number.isNaN(startOfDay.getTime()) || Number.isNaN(endOfDay.getTime())) {
      return { ok: false, status: 400, message: 'date non valida' };
    }

    filter.startAt = { $gte: startOfDay, $lte: endOfDay };
  }

  return { ok: true, filter };
};
// Gestione della richiesta HTTP per la lista di eventi pubblici. Controller endpoint completo 
const listPublicEventsHandler = async (req, res) => {
  try {
    const builtFilter = await buildPublicEventFilter(req);
    if (!builtFilter.ok) {
      return res.status(builtFilter.status).json({ message: builtFilter.message });
    }

    const limitRaw = Number(req.query.limit ?? 100);
    const pageRaw = Number(req.query.page ?? 1);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 200);
    const page = Math.max(Number.isFinite(pageRaw) ? pageRaw : 1, 1);
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
      Evento.countDocuments(builtFilter.filter),
      Evento.find(builtFilter.filter).sort({ startAt: 1 }).skip(skip).limit(limit)
    ]);

    const aziendaIds = [...new Set(items.map((item) => String(item.aziendaId)).filter(Boolean))];
    const aziendeMetaMap = await loadAziendeMetaMap(aziendaIds);

    return res.status(200).json({
      items: items.map((item) => toPublicEventDTO(item, aziendeMetaMap.get(String(item.aziendaId)) || {})),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error('Errore recupero eventi pubblici:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
};
// Registrazione dei router per eventi pubblici e privati
publicRouter.get('/pubblici', listPublicEventsHandler);

aziendeRouter.use(checkAuth);
aziendeRouter.use(checkUserType(['allevatore']));

aziendeRouter.post('/', async (req, res) => {
  try {
    const scope = resolveAziendaId(req, { allowBody: true });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const aziendaId = scope.aziendaId;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const type = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : '';
    const startAtRaw = typeof req.body?.startAt === 'string' ? req.body.startAt : '';
    const endAtRaw = typeof req.body?.endAt === 'string' ? req.body.endAt : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const link = typeof req.body?.link === 'string' ? req.body.link.trim() : '';
    const reminderMinutes = Number(req.body?.reminderMinutes ?? 0);
    const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
    const recurrenceType = req.body?.recurrenceType === 'monthly'
      ? 'monthly'
      : req.body?.recurrenceType === 'weekly'
        ? 'weekly'
        : 'single';
    const recurrenceInterval = Number(req.body?.recurrenceInterval ?? 1);
    const recurrenceUntilRaw = typeof req.body?.recurrenceUntil === 'string' ? req.body.recurrenceUntil.trim() : '';

    if (!title || !type || !startAtRaw || !endAtRaw || !location) {
      return res.status(400).json({ message: 'aziendaId, title, type, startAt, endAt e location sono obbligatori' });
    }

    if (!looksLikeAddress(location)) {
      return res.status(400).json({ message: 'Il luogo deve essere un indirizzo completo (es. Via Roma 10, Milano)' });
    }

    if (!isValidExternalLink(link)) {
      return res.status(400).json({ message: 'Il link deve essere un URL valido che inizi con http:// o https://' });
    }

    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return res.status(400).json({ message: 'startAt e endAt non validi' });
    }

    if (!Number.isFinite(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 10080) {
      return res.status(400).json({ message: 'reminderMinutes non valido' });
    }

    if (!Number.isFinite(recurrenceInterval) || recurrenceInterval < 1 || recurrenceInterval > 52) {
      return res.status(400).json({ message: 'recurrenceInterval non valido' });
    }

    let recurrenceUntil;
    if (recurrenceType !== 'single') {
      if (recurrenceUntilRaw) {
        recurrenceUntil = new Date(`${recurrenceUntilRaw}T23:59:59.999Z`);
        if (Number.isNaN(recurrenceUntil.getTime())) {
          return res.status(400).json({ message: 'recurrenceUntil non valido' });
        }

        if (recurrenceUntil < startAt) {
          return res.status(400).json({ message: 'recurrenceUntil deve essere successivo a startAt' });
        }
      }
    }

    const evento = new Evento({
      ownerUserId: req.user.userId,
      aziendaId,
      title,
      type,
      startAt,
      endAt,
      locationAddress: location,
      description: description || undefined,
      link: link || undefined,
      reminderMinutes,
      visibility,
      recurrenceType,
      recurrenceInterval: recurrenceType === 'single' ? 1 : recurrenceInterval,
      recurrenceUntil
    });

    await evento.save();

    const integration = await getGoogleIntegrationForUserAzienda({ userId: req.user.userId, aziendaId });
    if (integration?.connected) {
      try {
        const createdGoogleEvent = await createGoogleCalendarEvent({
          integration,
          eventPayload: buildGooglePayload(evento, integration.defaultReminderMinutes)
        });

        evento.googleCalendarEventId = createdGoogleEvent.id;
        evento.googleSyncedAt = new Date();
        await evento.save();
      } catch (syncError) {
        console.error('Sync automatica Google Calendar fallita:', syncError.message);
      }
    }

    return res.status(201).json({
      message: 'Evento creato con successo',
      item: toEventDTO(evento)
    });
  } catch (error) {
    console.error('Errore creazione evento:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      code: error?.code
    });
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Dati evento non validi' });
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Evento duplicato' });
    }

    return res.status(500).json({
      message: 'Errore interno del server',
      detail: process.env.NODE_ENV === 'development' ? (error?.message || 'Errore sconosciuto') : undefined
    });
  }
});
// restituiscie tutti fle eventi dell'azienda (passati + futuri)
aziendeRouter.get('/', async (req, res) => {
  try {
    const scope = resolveAziendaId(req, { allowQuery: true });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const aziendaId = scope.aziendaId;
    const limitRaw = Number(req.query.limit ?? 100);
    const pageRaw = Number(req.query.page ?? 1);

    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 200);
    const page = Math.max(Number.isFinite(pageRaw) ? pageRaw : 1, 1);
    const skip = (page - 1) * limit;

    const filter = {
      ownerUserId: req.user.userId,
      aziendaId
    };

    const [totalItems, items] = await Promise.all([
      Evento.countDocuments(filter),
      Evento.find(filter).sort({ startAt: 1 }).skip(skip).limit(limit)
    ]);

    return res.status(200).json({
      items: items.map(toEventDTO),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error('Errore recupero eventi:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});
// prossimi eventi per dashboard sotto la sezione eventi in allevatore
aziendeRouter.get('/upcoming', async (req, res) => {
  try {
    const scope = resolveAziendaId(req, { allowQuery: true });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const aziendaId = scope.aziendaId;
    const limitRaw = Number(req.query.limit ?? 3);

    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 3, 1), 10);

    const items = await Evento.find({
      ownerUserId: req.user.userId,
      aziendaId,
      endAt: { $gte: new Date() }
    })
      .sort({ startAt: 1 })
      .limit(limit);

    return res.status(200).json({ items: items.map(toEventDTO) });
  } catch (error) {
    console.error('Errore recupero prossimi eventi:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

const syncAllGoogleEventsHandler = async (req, res) => {
  try {
    const scope = resolveAziendaId(req, { allowBody: true });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const aziendaId = scope.aziendaId;
    const onlyUnsynced = req.body?.onlyUnsynced !== false;

    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const integration = await getGoogleIntegrationForUserAzienda({ userId: req.user.userId, aziendaId });
    if (!integration?.connected) {
      return res.status(400).json({ message: 'Google Calendar non connesso per questa azienda' });
    }

    try {
      await refreshAccessTokenIfNeeded(integration);
    } catch (tokenError) {
      return res.status(400).json({
        message: `Sincronizzazione con Google Calendar non disponibile: ${tokenError?.message || 'errore autenticazione Google'}`
      });
    }

    const filter = {
      ownerUserId: req.user.userId,
      aziendaId
    };

    if (onlyUnsynced) {
      filter.$or = [
        { googleCalendarEventId: { $exists: false } },
        { googleCalendarEventId: null },
        { googleCalendarEventId: '' }
      ];
    }

    const items = await Evento.find(filter).sort({ startAt: 1 });
    if (items.length === 0) {
      return res.status(200).json({
        message: 'Nessun evento da sincronizzare',
        result: {
          total: 0,
          synced: 0,
          failed: 0,
          failures: []
        }
      });
    }

    let synced = 0;
    let failed = 0;
    const failures = [];

    for (const evento of items) {
      try {
        const createdGoogleEvent = await createGoogleCalendarEvent({
          integration,
          eventPayload: buildGooglePayload(evento, integration.defaultReminderMinutes)
        });

        evento.googleCalendarEventId = createdGoogleEvent.id;
        evento.googleSyncedAt = new Date();
        await evento.save();
        synced += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          eventId: String(evento._id),
          title: evento.title,
          message: error?.message || 'Errore sincronizzazione'
        });
      }
    }

    return res.status(200).json({
      message: 'Sincronizzazione massiva completata',
      result: {
        total: items.length,
        synced,
        failed,
        failures
      }
    });
  } catch (error) {
    console.error('Errore sync massiva eventi su Google Calendar:', error);
    return res.status(500).json({
      message: error.message || 'Errore durante sincronizzazione massiva su Google Calendar'
    });
  }
};
// endpoint per sincronizzare tutti gli eventi (o solo quelli non ancora sincronizzati) su google calendar
aziendeRouter.post('/sincronizzazioni/google', syncAllGoogleEventsHandler);

const syncSingleGoogleEventHandler = async (req, res) => {
  try {
    const eventId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!isValidObjectId(eventId)) {
      return res.status(400).json({ message: 'ID evento non valido' });
    }

    const evento = await Evento.findById(eventId);
    if (!evento) {
      return res.status(404).json({ message: 'Evento non trovato' });
    }

    const scopedAziendaId = normalizeString(req.params?.aziendaId);
    if (scopedAziendaId && String(evento.aziendaId) !== scopedAziendaId) {
      return res.status(404).json({ message: 'Evento non trovato per questa azienda' });
    }

    if (String(evento.ownerUserId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Non hai i permessi su questo evento' });
    }

    const integration = await getGoogleIntegrationForUserAzienda({
      userId: req.user.userId,
      aziendaId: String(evento.aziendaId)
    });

    if (!integration?.connected) {
      return res.status(400).json({ message: 'Google Calendar non connesso per questa azienda' });
    }

    const createdGoogleEvent = await createGoogleCalendarEvent({
      integration,
      eventPayload: buildGooglePayload(evento, integration.defaultReminderMinutes)
    });

    evento.googleCalendarEventId = createdGoogleEvent.id;
    evento.googleSyncedAt = new Date();
    await evento.save();

    return res.status(200).json({
      message: 'Evento sincronizzato su Google Calendar',
      item: toEventDTO(evento)
    });
  } catch (error) {
    console.error('Errore sync evento su Google Calendar:', error);
    return res.status(500).json({
      message: error.message || 'Errore durante sincronizzazione su Google Calendar'
    });
  }
};
// endpoint per sincronizzare un singolo evento su google calendar, usato principalmente per correggere eventuali errori di sincronizzazione o per sincronizzare eventi creati prima dell'integrazione con google calendar
aziendeRouter.post('/:id/sincronizzazioni/google', syncSingleGoogleEventHandler);

aziendeRouter.delete('/:id', async (req, res) => {
  try {
    const eventId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!isValidObjectId(eventId)) {
      return res.status(400).json({ message: 'ID evento non valido' });
    }

    const filter = { _id: eventId, ownerUserId: req.user.userId };
    const scopedAziendaId = normalizeString(req.params?.aziendaId);
    if (scopedAziendaId) {
      filter.aziendaId = scopedAziendaId;
    }

    const deleted = await Evento.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: 'Evento non trovato' });
    }

    return res.status(200).json({ message: 'Evento eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione evento:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

export { publicRouter as publicEventiRoutes, aziendeRouter as aziendeEventiRoutes };
export default aziendeRouter;
