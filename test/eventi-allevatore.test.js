import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import Evento from '../app/models/evento.js';
import Azienda from '../app/models/azienda.js';
import GoogleCalendarIntegration from '../app/models/googleCalendarIntegration.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US79 Eventi Allevatore - pagina e script', () => {
  test('GET /eventi-allevatore.html restituisce la pagina con form e azioni sync', async () => {
    const response = await request(app)
      .get('/eventi-allevatore.html')
      .expect(200);

    expect(response.text).toContain('id="eventoForm"');
    expect(response.text).toContain('id="eventVisibility"');
    expect(response.text).toContain('id="eventRecurrenceType"');
    expect(response.text).toContain('id="eventLink"');
    expect(response.text).toContain('id="syncAllButton"');
    expect(response.text).toContain('/impostazioni-calendario.html');
  });

  test('Pagina eventi-allevatore carica loader maps esterno e bootstrap loader', async () => {
    const response = await request(app)
      .get('/eventi-allevatore.html')
      .expect(200);

    expect(response.text).toContain('<script src="/eventi-maps-loader.js"></script>');
    expect(response.text).toContain('window.loadEventLocationMaps();');
  });

  test('Script eventi-allevatore usa endpoint noun-based e validazioni client principali', async () => {
    const response = await request(app)
      .get('/eventi-allevatore.js')
      .expect(200);

    expect(response.text).toContain('/api/aziende/');
    expect(response.text).toContain('/sincronizzazioni/google');
    expect(response.text).toContain("formData.get('eventLink')");
    expect(response.text).toContain('Inserisci un indirizzo valido nel luogo');
    expect(response.text).toContain('Controlla data e orari');
    expect(response.text).toContain('Errore durante la creazione evento.');
    expect(response.text).toContain('maps:event-location-ready');
  });

  test('Script eventi-consumatore mostra il link evento quando disponibile', async () => {
    const response = await request(app)
      .get('/eventi-consumatore.js')
      .expect(200);

    expect(response.text).toContain('Apri link evento');
    expect(response.text).toContain('item.link');
  });

  test('Loader maps eventi richiede /api/config e inizializza Places API', async () => {
    const response = await request(app)
      .get('/eventi-maps-loader.js')
      .expect(200);

    expect(response.text).toContain("fetch('/api/config')");
    expect(response.text).toContain('libraries=places');
    expect(response.text).toContain('maps:event-location-ready');
  });
});

describe('US79 Eventi Allevatore - creazione evento', () => {
  const aziendaId = '665f8fd8ad8f8c0012f9c123';
  const ownedAzienda = {
    _id: aziendaId,
    ownerUserId: 'mocked_user_id'
  };

  const basePayload = () => ({
    title: 'Open day in stalla',
    type: 'altro',
    startAt: '2026-06-10T09:00:00.000Z',
    endAt: '2026-06-10T11:00:00.000Z',
    location: 'Via Roma 10, Milano',
    description: 'Visita guidata aziendale',
    link: 'https://muccapp.example/eventi/open-day',
    reminderMinutes: 30,
    visibility: 'public',
    recurrenceType: 'single',
    recurrenceInterval: 1,
    recurrenceUntil: ''
  });

  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = 'chiave_segreta_per_test';
  });

  beforeEach(() => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(ownedAzienda)
    });
    jest.spyOn(GoogleCalendarIntegration, 'findOne').mockResolvedValue(null);
    jest.spyOn(Evento.prototype, 'save').mockImplementation(async function saveEvento() {
      if (!this._id) this._id = '665f8fd8ad8f8c0012f9c777';
      if (!this.createdAt) this.createdAt = new Date('2026-05-28T10:00:00.000Z');
      this.updatedAt = new Date('2026-05-28T10:00:00.000Z');
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
  });

  // Caso OK.
  test('POST /api/aziende/:aziendaId/eventi crea un nuovo evento (201)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toBe('Evento creato con successo');
        expect(res.body.item).toBeDefined();
        expect(res.body.item.title).toBe('Open day in stalla');
        expect(res.body.item.location).toBe('Via Roma 10, Milano');
        expect(res.body.item.visibility).toBe('public');
      });
  });

  // Caso campi obbligatori mancanti - 400.
  test('POST /api/aziende/:aziendaId/eventi - errore: campi obbligatori mancanti (400)', async () => {
    const payload = basePayload();
    delete payload.title;

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('aziendaId, title, type, startAt, endAt e location sono obbligatori');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: aziendaId nel body non coincide col path (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        aziendaId: '665f8fd8ad8f8c0012f9c999'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('aziendaId nel path e nel body non coincidono');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: luogo non valido (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        location: 'cortile'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Il luogo deve essere un indirizzo completo (es. Via Roma 10, Milano)');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: link non valido (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        link: 'ftp://evento-non-valido'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Il link deve essere un URL valido che inizi con http:// o https://');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: startAt/endAt non validi (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        startAt: '2026-06-10T11:00:00.000Z',
        endAt: '2026-06-10T09:00:00.000Z'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('startAt e endAt non validi');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: reminderMinutes non valido (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        reminderMinutes: 20000
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('reminderMinutes non valido');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: recurrenceInterval non valido (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        recurrenceType: 'weekly',
        recurrenceInterval: 0,
        recurrenceUntil: '2026-07-10'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('recurrenceInterval non valido');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: recurrenceUntil non valido (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        recurrenceType: 'weekly',
        recurrenceInterval: 2,
        recurrenceUntil: 'data-non-valida'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('recurrenceUntil non valido');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: recurrenceUntil precedente a startAt (400)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...basePayload(),
        recurrenceType: 'monthly',
        recurrenceInterval: 1,
        recurrenceUntil: '2026-06-01'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('recurrenceUntil deve essere successivo a startAt');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: aziendaId non valido (400)', async () => {
    await request(app)
      .post('/api/aziende/id-non-valido/eventi')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('aziendaId non è un ObjectId valido');
      });
  });

  // Caso senza token - 401.
  test('POST /api/aziende/:aziendaId/eventi - errore: tentativo senza token (401)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .send(basePayload())
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .send(basePayload())
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('POST /api/aziende/:aziendaId/eventi - errore: token non valido (403)', async () => {
    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', 'Bearer token_non_valido')
      .send(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .send(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });

  // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('POST /api/aziende/:aziendaId/eventi - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  // Caso 404 - azienda non trovata.
  test('POST /api/aziende/:aziendaId/eventi - errore: azienda non trovata (404)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Azienda non trovata');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: dati evento non validi (400)', async () => {
    const validationError = new Error('validation failed');
    validationError.name = 'ValidationError';
    jest.spyOn(Evento.prototype, 'save').mockRejectedValue(validationError);

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Dati evento non validi');
      });
  });

  test('POST /api/aziende/:aziendaId/eventi - errore: evento duplicato (409)', async () => {
    const duplicateError = new Error('duplicate key');
    duplicateError.code = 11000;
    jest.spyOn(Evento.prototype, 'save').mockRejectedValue(duplicateError);

    await request(app)
      .post(`/api/aziende/${aziendaId}/eventi`)
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe('Evento duplicato');
      });
  });

});
