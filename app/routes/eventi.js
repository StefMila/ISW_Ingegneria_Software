import express from 'express';
import mongoose from 'mongoose';

import { checkAuth, checkUserType } from './auth.js';
import Evento from '../models/evento.js';
import Azienda from '../models/azienda.js';
import {
  createGoogleCalendarEvent,
  getGoogleIntegrationForUserAzienda
} from './google-calendar.js';

const router = express.Router();

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

const toRRuleUntilUtc = (dateValue) => {
  const date = new Date(dateValue);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}T235959Z`;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

const assertAziendaOwnedByUser = async (aziendaId, userId) => {
  if (!isValidObjectId(aziendaId)) {
    return { ok: false, status: 400, message: 'aziendaId non valido' };
  }

  const existingAzienda = await Azienda.findById(aziendaId).select('_id ownerUserId');
  if (!existingAzienda) {
    return { ok: false, status: 404, message: 'Azienda non trovata' };
  }

  if (String(existingAzienda.ownerUserId) !== String(userId)) {
    return { ok: false, status: 403, message: 'Non hai i permessi per questa azienda' };
  }

  return { ok: true };
};

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

router.use(checkAuth);
router.use(checkUserType(['allevatore']));

router.post('/', async (req, res) => {
  try {
    const aziendaId = typeof req.body?.aziendaId === 'string' ? req.body.aziendaId.trim() : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const type = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : '';
    const startAtRaw = typeof req.body?.startAt === 'string' ? req.body.startAt : '';
    const endAtRaw = typeof req.body?.endAt === 'string' ? req.body.endAt : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const reminderMinutes = Number(req.body?.reminderMinutes ?? 0);
    const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
    const recurrenceType = req.body?.recurrenceType === 'monthly'
      ? 'monthly'
      : req.body?.recurrenceType === 'weekly'
        ? 'weekly'
        : 'single';
    const recurrenceInterval = Number(req.body?.recurrenceInterval ?? 1);
    const recurrenceUntilRaw = typeof req.body?.recurrenceUntil === 'string' ? req.body.recurrenceUntil.trim() : '';

    if (!aziendaId || !title || !type || !startAtRaw || !endAtRaw || !location) {
      return res.status(400).json({ message: 'aziendaId, title, type, startAt, endAt e location sono obbligatori' });
    }

    if (!looksLikeAddress(location)) {
      return res.status(400).json({ message: 'Il luogo deve essere un indirizzo completo (es. Via Roma 10, Milano)' });
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

router.get('/', async (req, res) => {
  try {
    const aziendaId = typeof req.query.aziendaId === 'string' ? req.query.aziendaId.trim() : '';
    const limitRaw = Number(req.query.limit ?? 100);
    const pageRaw = Number(req.query.page ?? 1);

    if (!aziendaId) {
      return res.status(400).json({ message: 'aziendaId obbligatorio' });
    }

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

router.get('/upcoming', async (req, res) => {
  try {
    const aziendaId = typeof req.query.aziendaId === 'string' ? req.query.aziendaId.trim() : '';
    const limitRaw = Number(req.query.limit ?? 3);

    if (!aziendaId) {
      return res.status(400).json({ message: 'aziendaId obbligatorio' });
    }

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
    const aziendaId = typeof req.body?.aziendaId === 'string' ? req.body.aziendaId.trim() : '';
    const onlyUnsynced = req.body?.onlyUnsynced !== false;

    if (!aziendaId) {
      return res.status(400).json({ message: 'aziendaId obbligatorio' });
    }

    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const integration = await getGoogleIntegrationForUserAzienda({ userId: req.user.userId, aziendaId });
    if (!integration?.connected) {
      return res.status(400).json({ message: 'Google Calendar non connesso per questa azienda' });
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

router.post('/sincronizzazioni/google', syncAllGoogleEventsHandler);
// Alias legacy mantenuto per compatibilita retroattiva
router.post('/google-sync-all', syncAllGoogleEventsHandler);

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

router.post('/:id/sincronizzazioni/google', syncSingleGoogleEventHandler);
// Alias legacy mantenuto per compatibilita retroattiva
router.post('/:id/google-sync', syncSingleGoogleEventHandler);

router.delete('/:id', async (req, res) => {
  try {
    const eventId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!isValidObjectId(eventId)) {
      return res.status(400).json({ message: 'ID evento non valido' });
    }

    const deleted = await Evento.findOneAndDelete({ _id: eventId, ownerUserId: req.user.userId });
    if (!deleted) {
      return res.status(404).json({ message: 'Evento non trovato' });
    }

    return res.status(200).json({ message: 'Evento eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione evento:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

export default router;
