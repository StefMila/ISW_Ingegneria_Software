import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import Azienda from '../app/models/azienda.js';
import GoogleCalendarIntegration from '../app/models/googleCalendarIntegration.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US73 Impostazioni Calendario - pagina e script', () => {
  test('GET /impostazioni-calendario.html restituisce la pagina con i controlli principali', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.html')
      .expect(200);

    expect(response.text).toContain('id="calendarSettingsForm"');
    expect(response.text).toContain('id="connectionBadge"');
    expect(response.text).toContain('id="connectGoogleButton"');
    expect(response.text).toContain('id="disconnectButton"');
    expect(response.text).toContain('id="privateCalendarId"');
    expect(response.text).toContain('id="publicCalendarId"');
  });

  test('Pagina impostazioni calendario include script dedicato e link agli eventi', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.html')
      .expect(200);

    expect(response.text).toContain('<script src="/impostazioni-calendario.js"></script>');
    expect(response.text).toContain('href="/eventi-allevatore.html"');
  });

  test('Script impostazioni calendario usa gli endpoint Google Calendar previsti', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.js')
      .expect(200);

    expect(response.text).toContain('/api/google-calendar/status?aziendaId=');
    expect(response.text).toContain('/api/google-calendar/disconnect');
    expect(response.text).toContain('/api/google-calendar/auth-url?aziendaId=');
  });

  test('Script gestisce esito OAuth da querystring e refresh su cambio azienda', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.js')
      .expect(200);

    expect(response.text).toContain("params.get('gcal')");
    expect(response.text).toContain("if (gcal === 'connected')");
    expect(response.text).toContain("if (gcal === 'error')");
    expect(response.text).toContain("window.addEventListener('aziendaChanged'");
  });
});

describe('US73 Impostazioni Calendario - integrazione Google Calendar', () => {
  const aziendaId = '665f8fd8ad8f8c0012f9c123';
  const ownedAzienda = {
    _id: aziendaId,
    ownerUserId: 'mocked_user_id'
  };

  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = 'chiave_segreta_per_test';
  });

  beforeEach(() => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(ownedAzienda)
    });
    jest.spyOn(GoogleCalendarIntegration, 'findOne').mockResolvedValue(null);
    jest.spyOn(GoogleCalendarIntegration.prototype, 'save').mockImplementation(async function saveIntegration() {
      if (!this._id) this._id = '665f8fd8ad8f8c0012f9c555';
      if (!this.updatedAt) this.updatedAt = new Date('2026-05-28T10:00:00.000Z');
      return this;
    });

    token = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
  });

  // Caso OK.
  test('GET /api/google-calendar/status restituisce lo stato integrazione (200)', async () => {
    jest.spyOn(GoogleCalendarIntegration, 'findOne').mockResolvedValue({
      connected: true,
      accountEmail: 'allevatore@example.com',
      calendarId: 'primary',
      privateCalendarId: 'private-muccapp',
      publicCalendarId: 'public-muccapp',
      syncMode: 'manuale',
      defaultReminderMinutes: 30,
      updatedAt: new Date('2026-05-28T10:00:00.000Z')
    });

    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.settings).toBeDefined();
        expect(res.body.settings.connected).toBe(true);
        expect(res.body.settings.accountEmail).toBe('allevatore@example.com');
      });
  });

  test('GET /api/google-calendar/status - nessuna integrazione restituisce default settings (200)', async () => {
    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.settings).toBeDefined();
        expect(res.body.settings.connected).toBe(false);
        expect(res.body.settings.calendarId).toBe('primary');
      });
  });

  // Caso senza token - 401.
  test('GET /api/google-calendar/status - errore: tentativo senza token (401)', async () => {
    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/google-calendar/status - errore: token non valido (403)', async () => {
    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .set('Authorization', 'Bearer token_non_valido')
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('GET /api/google-calendar/status - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });

  test('GET /api/google-calendar/status - errore: aziendaId non valido (400)', async () => {
    await request(app)
      .get('/api/google-calendar/status?aziendaId=id-non-valido')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('aziendaId non è un ObjectId valido');
      });
  });

  test('GET /api/google-calendar/status - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('GET /api/google-calendar/status - errore: azienda non trovata (404)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    await request(app)
      .get(`/api/google-calendar/status?aziendaId=${aziendaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Azienda non trovata');
      });
  });


  // Caso OK.
  test('GET /api/google-calendar/auth-url genera auth URL Google (200)', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id-test';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret-test';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/google-calendar/oauth/callback';

    await request(app)
      .get(`/api/google-calendar/auth-url?aziendaId=${aziendaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
        expect(res.body.authUrl).toContain('client_id=client-id-test');
      });
  });

  test('GET /api/google-calendar/auth-url senza token restituisce 401', async () => {
    await request(app)
      .get(`/api/google-calendar/auth-url?aziendaId=${aziendaId}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  

  // Caso OK.
  test('POST /api/google-calendar/disconnect - nessuna integrazione da disconnettere (200)', async () => {
    await request(app)
      .post('/api/google-calendar/disconnect')
      .set('Authorization', `Bearer ${token}`)
      .send({ aziendaId })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Nessuna integrazione da disconnettere');
      });
  });

  test('POST /api/google-calendar/disconnect - disconnette integrazione esistente (200)', async () => {
    jest.spyOn(GoogleCalendarIntegration, 'findOne').mockResolvedValue({
      connected: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiryDate: new Date('2026-06-01T10:00:00.000Z'),
      scope: 'openid email',
      tokenType: 'Bearer',
      save: jest.fn().mockResolvedValue(true)
    });

    await request(app)
      .post('/api/google-calendar/disconnect')
      .set('Authorization', `Bearer ${token}`)
      .send({ aziendaId })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Google Calendar disconnesso con successo');
      });
  });

  test('POST /api/google-calendar/disconnect senza token restituisce 401', async () => {
    await request(app)
      .post('/api/google-calendar/disconnect')
      .send({ aziendaId })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('POST /api/google-calendar/disconnect - errore interno del server (500)', async () => {
    jest.spyOn(GoogleCalendarIntegration, 'findOne').mockRejectedValue(new Error('db down'));

    await request(app)
      .post('/api/google-calendar/disconnect')
      .set('Authorization', `Bearer ${token}`)
      .send({ aziendaId })
      .expect(500)
      .expect((res) => {
        expect(res.body.message).toBe('Errore interno del server');
      });
  });

  // Caso OK.
  test('PATCH /api/google-calendar/settings aggiorna impostazioni calendario (200)', async () => {
    await request(app)
      .patch('/api/google-calendar/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        aziendaId,
        calendarId: 'primary',
        syncMode: 'automatica',
        defaultReminderMinutes: 45
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Impostazioni Google Calendar aggiornate');
        expect(res.body.settings.defaultReminderMinutes).toBe(45);
        expect(res.body.settings.syncMode).toBe('automatica');
      });
  });

  test('PATCH /api/google-calendar/settings - errore: defaultReminderMinutes non valido (400)', async () => {
    await request(app)
      .patch('/api/google-calendar/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        aziendaId,
        defaultReminderMinutes: 20000
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('defaultReminderMinutes non valido');
      });
  });

});
