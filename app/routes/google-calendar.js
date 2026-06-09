import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Azienda from '../models/azienda.js';
import GoogleCalendarIntegration from '../models/googleCalendarIntegration.js';

const router = express.Router();

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email'
];

const getGoogleConfig = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
};

const requireGoogleConfig = (res) => {
  const config = getGoogleConfig();

  if (!config) {
    res.status(500).json({
      message: 'Configurazione Google OAuth incompleta. Imposta GOOGLE_OAUTH_CLIENT_ID/GOOGLE_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET/GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI/GOOGLE_REDIRECT_URI.'
    });
    return null;
  }

  return config;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeIntegration = (doc) => ({
  connected: Boolean(doc?.connected),
  accountEmail: doc?.accountEmail || '',
  calendarId: doc?.calendarId || 'primary',
  privateCalendarId: doc?.privateCalendarId || '',
  publicCalendarId: doc?.publicCalendarId || '',
  syncMode: doc?.syncMode || 'manuale',
  defaultReminderMinutes: Number(doc?.defaultReminderMinutes ?? 30),
  updatedAt: doc?.updatedAt || null
});

const encodeState = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
};

const decodeState = (stateToken) => {
  return jwt.verify(stateToken, process.env.JWT_SECRET);
};

const exchangeCodeForToken = async ({ code, config }) => {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    const errorDescription = data?.error_description || data?.error || 'Errore durante lo scambio codice OAuth';
    throw new Error(errorDescription);
  }

  return data;
};

const fetchGoogleUserInfo = async (accessToken) => {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { email: '' };

  return { email: typeof data.email === 'string' ? data.email.toLowerCase() : '' };
};

const googleApiRequest = async ({ accessToken, url, method = 'GET', body }) => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.error_description || data?.error || 'Errore API Google';
    throw new Error(errorMessage);
  }

  return data;
};

const createSecondaryCalendar = async ({ accessToken, summary, description }) => {
  return googleApiRequest({
    accessToken,
    url: 'https://www.googleapis.com/calendar/v3/calendars',
    method: 'POST',
    body: {
      summary,
      description,
      timeZone: 'Europe/Rome'
    }
  });
};

const setCalendarPublicReadAccess = async ({ accessToken, calendarId }) => {
  return googleApiRequest({
    accessToken,
    url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`,
    method: 'POST',
    body: {
      role: 'reader',
      scope: { type: 'default' }
    }
  });
};

const normalizeOAuthErrorReason = (message) => {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('must be signed up for google calendar')) {
    return 'google_calendar_not_enabled';
  }

  return message || 'unknown';
};

const calendarExists = async ({ accessToken, calendarId }) => {
  if (!calendarId) return false;

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return response.ok;
};

const getOrCreateCalendarByName = async ({ accessToken, desiredCalendarId, summary, description, isPublic }) => {
  if (await calendarExists({ accessToken, calendarId: desiredCalendarId })) {
    return desiredCalendarId;
  }

  const createdCalendar = await createSecondaryCalendar({ accessToken, summary, description });
  const createdCalendarId = createdCalendar?.id;
  if (!createdCalendarId) {
    throw new Error(`Calendario ${summary} non creato correttamente`);
  }

  if (isPublic) {
    try {
      await setCalendarPublicReadAccess({ accessToken, calendarId: createdCalendarId });
    } catch (error) {
      console.warn('Impossibile impostare ACL pubblico sul calendario MuccApp:', error.message);
    }
  }

  return createdCalendarId;
};

const ensureMuccAppCalendars = async ({ accessToken, integration }) => {
  const privateCalendarId = await getOrCreateCalendarByName({
    accessToken,
    desiredCalendarId: integration?.privateCalendarId,
    summary: 'MuccApp - Privato',
    description: 'Calendario privato eventi interni MuccApp',
    isPublic: false
  });

  const publicCalendarId = await getOrCreateCalendarByName({
    accessToken,
    desiredCalendarId: integration?.publicCalendarId,
    summary: 'MuccApp - Pubblico',
    description: 'Calendario pubblico eventi condivisibili MuccApp',
    isPublic: true
  });

  return { privateCalendarId, publicCalendarId };
};

router.get('/oauth/callback', async (req, res) => {
  const frontendRedirect = '/impostazioni-calendario.html';

  try {
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
    if (oauthError) {
      return res.redirect(`${frontendRedirect}?gcal=error&reason=${encodeURIComponent(oauthError)}`);
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';

    if (!code || !state) {
      return res.redirect(`${frontendRedirect}?gcal=error&reason=missing_params`);
    }

    const statePayload = decodeState(state);
    const config = getGoogleConfig();
    if (!config) {
      return res.redirect(`${frontendRedirect}?gcal=error&reason=missing_config`);
    }

    const ownership = await assertAziendaOwnedByUser(statePayload.aziendaId, statePayload.userId);
    if (!ownership.ok) {
      return res.redirect(`${frontendRedirect}?gcal=error&reason=ownership_failed`);
    }

    const tokenData = await exchangeCodeForToken({ code, config });
    const userInfo = await fetchGoogleUserInfo(tokenData.access_token);
    const existingIntegration = await GoogleCalendarIntegration.findOne({
      ownerUserId: statePayload.userId,
      aziendaId: statePayload.aziendaId
    });
    const muccAppCalendars = await ensureMuccAppCalendars({
      accessToken: tokenData.access_token,
      integration: existingIntegration
    });

    const setPayload = {
      connected: true,
      accountEmail: userInfo.email,
      privateCalendarId: muccAppCalendars.privateCalendarId,
      publicCalendarId: muccAppCalendars.publicCalendarId,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      expiryDate: tokenData.expires_in
        ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
        : undefined
    };

    if (tokenData.refresh_token) {
      setPayload.refreshToken = tokenData.refresh_token;
    }

    await GoogleCalendarIntegration.findOneAndUpdate(
      {
        ownerUserId: statePayload.userId,
        aziendaId: statePayload.aziendaId
      },
      {
        $set: setPayload,
        $setOnInsert: {
          calendarId: 'primary',
          syncMode: 'manuale',
          defaultReminderMinutes: 30
        }
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true
      }
    );

    return res.redirect(`${frontendRedirect}?gcal=connected`);
  } catch (error) {
    console.error('Errore callback OAuth Google Calendar:', error);
    const normalizedReason = normalizeOAuthErrorReason(error?.message);
    return res.redirect(`${frontendRedirect}?gcal=error&reason=${encodeURIComponent(normalizedReason)}`);
  }
});

router.use(checkAuth);
router.use(checkUserType(['allevatore']));

router.get('/status', async (req, res) => {
  try {
    const aziendaId = typeof req.query.aziendaId === 'string' ? req.query.aziendaId.trim() : '';
    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const integration = await GoogleCalendarIntegration.findOne({
      ownerUserId: req.user.userId,
      aziendaId
    });

    return res.status(200).json({ settings: sanitizeIntegration(integration) });
  } catch (error) {
    console.error('Errore durante il recupero dello stato Google Calendar:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const aziendaId = typeof req.body?.aziendaId === 'string' ? req.body.aziendaId.trim() : '';
    const calendarId = typeof req.body?.calendarId === 'string' ? req.body.calendarId.trim() : 'primary';
    const syncMode = req.body?.syncMode === 'automatica' ? 'automatica' : 'manuale';
    const defaultReminderMinutes = Number(req.body?.defaultReminderMinutes ?? 30);

    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    if (!Number.isFinite(defaultReminderMinutes) || defaultReminderMinutes < 0 || defaultReminderMinutes > 10080) {
      return res.status(400).json({ message: 'defaultReminderMinutes non valido' });
    }

    const existing = await GoogleCalendarIntegration.findOne({ ownerUserId: req.user.userId, aziendaId });
    const integration = existing || new GoogleCalendarIntegration({ ownerUserId: req.user.userId, aziendaId });

    integration.calendarId = calendarId || 'primary';
    integration.syncMode = syncMode;
    integration.defaultReminderMinutes = defaultReminderMinutes;

    await integration.save();

    return res.status(200).json({
      message: 'Impostazioni Google Calendar aggiornate',
      settings: sanitizeIntegration(integration)
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento impostazioni Google Calendar:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

router.get('/auth-url', async (req, res) => {
  try {
    const config = requireGoogleConfig(res);
    if (!config) return;

    const aziendaId = typeof req.query.aziendaId === 'string' ? req.query.aziendaId.trim() : '';
    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const state = encodeState({
      userId: req.user.userId,
      aziendaId,
      nonce: crypto.randomUUID()
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_OAUTH_SCOPES.join(' '),
      state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Errore durante la generazione auth URL Google:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    const aziendaId = typeof req.body?.aziendaId === 'string' ? req.body.aziendaId.trim() : '';
    const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const integration = await GoogleCalendarIntegration.findOne({ ownerUserId: req.user.userId, aziendaId });
    if (!integration) {
      return res.status(200).json({ message: 'Nessuna integrazione da disconnettere' });
    }

    integration.connected = false;
    integration.accessToken = undefined;
    integration.refreshToken = undefined;
    integration.expiryDate = undefined;
    integration.scope = undefined;
    integration.tokenType = undefined;
    await integration.save();

    return res.status(200).json({ message: 'Google Calendar disconnesso con successo' });
  } catch (error) {
    console.error('Errore durante la disconnessione Google Calendar:', error);
    return res.status(500).json({ message: 'Errore interno del server' });
  }
});

export const refreshAccessTokenIfNeeded = async (integration) => {
  const config = getGoogleConfig();

  if (!config || !config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error('Configurazione OAuth Google mancante');
  }

  const hasToken = integration?.accessToken;
  const hasExpiry = integration?.expiryDate instanceof Date;
  const isStillValid = hasToken && hasExpiry && integration.expiryDate.getTime() > Date.now() + 60_000;

  if (isStillValid) {
    return integration.accessToken;
  }

  if (!integration?.refreshToken) {
    throw new Error('Refresh token Google non disponibile. Riconnetti Google Calendar.');
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: integration.refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error_description || data?.error || 'Impossibile aggiornare access token Google';
    throw new Error(errorMessage);
  }

  integration.accessToken = data.access_token;
  integration.tokenType = data.token_type;
  integration.scope = data.scope;
  integration.expiryDate = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000)
    : integration.expiryDate;

  await integration.save();
  return integration.accessToken;
};

export const createGoogleCalendarEvent = async ({ integration, eventPayload }) => {
  const accessToken = await refreshAccessTokenIfNeeded(integration);
  const normalizedVisibility = eventPayload?.visibility === 'public' ? 'public' : 'private';
  const targetCalendarId = normalizedVisibility === 'public'
    ? (integration.publicCalendarId || integration.calendarId || 'primary')
    : (integration.privateCalendarId || integration.calendarId || 'primary');
  const calendarId = encodeURIComponent(targetCalendarId);
  const payloadForGoogle = { ...eventPayload };
  delete payloadForGoogle.visibility;

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadForGoogle)
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Errore creazione evento su Google Calendar';
    throw new Error(errorMessage);
  }

  return data;
};

export const updateGoogleCalendarEvent = async ({ integration, googleEventId, eventPayload }) => {
  const accessToken = await refreshAccessTokenIfNeeded(integration);
  const normalizedVisibility = eventPayload?.visibility === 'public' ? 'public' : 'private';
  const targetCalendarId = normalizedVisibility === 'public'
    ? (integration.publicCalendarId || integration.calendarId || 'primary')
    : (integration.privateCalendarId || integration.calendarId || 'primary');
  const calendarId = encodeURIComponent(targetCalendarId);
  const encodedEventId = encodeURIComponent(String(googleEventId || '').trim());
  const payloadForGoogle = { ...eventPayload };
  delete payloadForGoogle.visibility;

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodedEventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadForGoogle)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorMessage = data?.error?.message || 'Errore aggiornamento evento su Google Calendar';
    throw new Error(errorMessage);
  }

  return data;
};

export const upsertGoogleCalendarEvent = async ({ integration, eventPayload, existingGoogleEventId }) => {
  const normalizedExistingId = typeof existingGoogleEventId === 'string'
    ? existingGoogleEventId.trim()
    : '';

  if (normalizedExistingId) {
    const updated = await updateGoogleCalendarEvent({
      integration,
      googleEventId: normalizedExistingId,
      eventPayload
    });

    if (updated?.id) {
      return updated;
    }
  }

  return createGoogleCalendarEvent({ integration, eventPayload });
};

export const getGoogleIntegrationForUserAzienda = async ({ userId, aziendaId }) => {
  return GoogleCalendarIntegration.findOne({ ownerUserId: userId, aziendaId });
};

export default router;
