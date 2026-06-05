import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
import Lavorazione from '../app/models/lavorazione.js';
import { normalizeInputs, normalizeFasi, parseBooleanLike } from '../app/routes/lavorazioni.js';
import Sensore from '../app/models/sensore.js';
import { ultimeLettureIot } from '../app/services/mqttService.js';

describe('US72 - US74 - US75 Lavorazioni', () => {
  
  let token;
  const lavorazioneId = '6a17701bfeff8409a15f8cc5';
      const aziendaId = '665f8fd8ad8f8c0012f9c123';
      const ownedAzienda = {
        _id: aziendaId,
        ownerUserId: 'mocked_user_id'
      };

  const input = () => ({
    type: 'latte',
    name: 'Latte crudo',
    quantity: NumberInt('1'),
    unit: 'L'
  });
  const fase = () => ({
    name: 'Ricevimento',
    completed: false
  });
  const isTemplate = true;

  const normalizedInputs = normalizeInputs(input);
  const normalizedFasi = normalizeFasi(fase);
  const parsedIsTemplate = parseBooleanLike(isTemplate);

  const basePayload = () => ({
    aziendaId,
		tipoLavorazione: 'yogurt',
		codiceTipoLav: 'C',
    codiceLavorazione: 'AC001',
		nomeTemplate: 'test_template',
		isTemplate: parsedIsTemplate ?? false,
    templateId: '665bc7c569f4b52b2c8a1234',
		startedAt: '2026-05-29T09:00:00.000Z',
    endedAt: undefined,
    notes: undefined,
		status: 'in_corso',
    inputs: normalizedInputs.value,
    fasi: normalizedFasi.value,
    outputName: 'Vasetti di yogurt',
		outputQuantity: '20',
		outputUnit: 'pezzi'
  });

  beforeAll(() => {
    process.env.JWT_SECRET = 'chiave_segreta_per_test';
  });

  beforeEach(() => {
    token = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(ownedAzienda)
    });
    jest.spyOn(Lavorazione, 'findById').mockResolvedValue({
      _id: lavorazioneId,
      ...basePayload(),
      save: jest.fn().mockResolvedValue(undefined)
    });
    jest.spyOn(Lavorazione, 'findOne').mockResolvedValue(basePayload());
    jest.spyOn(Lavorazione.prototype, 'save').mockResolvedValue({
      _id: lavorazioneId,
      ...basePayload(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    jest.spyOn(Sensore, 'find').mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: '665f8fd8ad8f8c0012f9c777',
        }
      ])
    });
    ultimeLettureIot.set('665f8fd8ad8f8c0012f9c777', {
      dati: { peso: 34 },
      timestamp: new Date('2026-06-04T10:00:00.000Z')
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    ultimeLettureIot.clear();
  });

  test('POST /api/lavorazioni crea una nuova lavorazione (200)', async () => {
    await request(app)
        .post('/api/lavorazioni')
        .set('Authorization', `Bearer ${token}`)
        .send(basePayload())
        .expect(201)
        .expect(res => {
          expect(res.body.message).toBe('Template lavorazione creato con successo' || 'Lavorazione creata con successo');
          expect(res.body.lavorazione).toBeDefined();
        });
  });

  test('POST /api/lavorazioni - errore: aziendaId mancante (400)', async () => {
    const payload = basePayload();
    delete payload.aziendaId;
    await request(app)
        .post('/api/lavorazioni')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(400)
        .expect(res => {
          expect(res.body.message).toBe('aziendaId, tipoLavorazione e codiceTipoLav sono obbligatori');
        });
    });

  test('POST /api/lavorazioni - errore: tipoLavorazione mancante (400)', async () => {
    const payload = basePayload();
    delete payload.tipoLavorazione;
    await request(app)
        .post('/api/lavorazioni')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(400)
        .expect(res => {
          expect(res.body.message).toBe('aziendaId, tipoLavorazione e codiceTipoLav sono obbligatori');
        });
  });

  test('POST /api/lavorazioni - errore: codiceTipoLav mancante (400)', async () => {
    const payload = basePayload();
    delete payload.codiceTipoLav;
    await request(app)
        .post('/api/lavorazioni')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(400)
        .expect(res => {
          expect(res.body.message).toBe('aziendaId, tipoLavorazione e codiceTipoLav sono obbligatori');
        });
  });

  test('POST /api/lavorazioni - errore: tentativo senza token (401)', async () => {
    await request(app)
      .post(`/api/lavorazioni`)
      .send(basePayload())
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('POST /api/lavorazioni - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .post(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .send(basePayload())
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('POST /api/lavorazioni - errore: token non valido (403)', async () => {
    await request(app)
      .post(`/api/lavorazioni`)
      .set('Authorization', 'Bearer token_non_valido')
      .send(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('POST /api/lavorazioni - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .post(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .send(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });
    // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('POST /api/lavorazioni - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .post(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('POST /api/lavorazioni/:id - errore: Lavorazione non template con templateId mancante (400)', async () => {
    const payload = basePayload();
    delete payload.isTemplate;
    delete payload.templateId;
    
    await request(app)
      .post(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${token}`)
      .send( payload )
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Se la lavorazione non è un template, deve riferirsi ad un template esistente');
      });
  });

  test('PATCH /api/lavorazioni/:id aggiorna una lavorazione esistente (200)', async () => {
    await request(app)
        .patch(`/api/lavorazioni/${lavorazioneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ outputQuantity: '20' })
        .expect(200)
        .expect(res => {
          expect(res.body.message).toBe('Lavorazione aggiornata con successo');
          expect(res.body.lavorazione).toBeDefined();
        });
  });

  test('PATCH /api/lavorazioni/:id - errore: lavorazioneId non valido (400)', async () => {
      await request(app)
          .patch('/api/lavorazioni/not-an-object-id')
          .set('Authorization', `Bearer ${token}`)
          .send({ outputQuantity: '20' })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBe('ID lavorazione non valido');
          });
  });

  test('PATCH /api/lavorazioni/:id - errore: aziendaId non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aziendaId: aziendaId })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: tipoLavorazione non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipoLavorazione: basePayload().tipoLavorazione })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: codiceTipoLav non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ codiceTipoLav: basePayload().codiceTipoLav })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: codiceLavorazione non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ codiceLavorazione: basePayload().codiceLavorazione })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: isTemplate non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isTemplate: basePayload().isTemplate })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: templateId non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ templateId: basePayload().templateId })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: startedAt non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startedAt: basePayload().startedAt })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: inputs non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ inputs: 'defined' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: outputName non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outputName: basePayload().outputName })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: outputUnit non è modificabile (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outputUnit: basePayload().outputUnit })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: nessun campo modificabile (400)', async () => {
      await request(app)
          .patch(`/api/lavorazioni/${lavorazioneId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBe('Nessun campo aggiornabile fornito');
          });
  });

  test('PATCH /api/lavorazioni/:id - errore: tentativo senza token (401)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .send({ status: 'completata' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({ status: 'completata' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: token non valido (403)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', 'Bearer token_non_valido')
      .send({ status: 'completata' })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('PATCH /api/lavorazioni/:id - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .send({ status: 'completata' })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });
    // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('PATCH /api/lavorazioni/:id - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completata' })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

    // Caso lavorazione non trovata - 404.
  test('PATCH /api/lavorazioni/:id - errore: lavorazione non trovata (404)', async () => {
    jest.spyOn(Lavorazione, 'findById').mockResolvedValue(null);

    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outputQuantity: basePayload().outputQuantity })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Lavorazione non trovata');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: status template non è modificabile (422)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: basePayload().status })
      .expect(422)
      .expect((res) => {
        expect(res.body.message).toBe('Lo status di un template di lavorazione non può essere modificato');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: fasi template non modificabili (422)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fasi: [{ name: 'Ricevimento', completed: true }] })
      .expect(422)
      .expect((res) => {
        expect(res.body.message).toBe('Le fasi di un template di lavorazione non possono essere modificate');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: nomeTemplate non è modificabile da una lavorazione non template (422)', async () => {
    const payload = basePayload();
    delete payload.isTemplate;
    jest.spyOn(Lavorazione, 'findById').mockResolvedValue({
      _id: lavorazioneId,
      ...payload,
      save: jest.fn().mockResolvedValue(undefined)
    });
    
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nomeTemplate: basePayload().nomeTemplate })
      .expect(422)
      .expect((res) => {
        expect(res.body.message).toBe('Il nome di un template non può essere modificato da una lavorazione non template');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: fasi non consentite (400)', async () => {
    const payload = basePayload();
    delete payload.isTemplate;
    jest.spyOn(Lavorazione, 'findById').mockResolvedValue({
      _id: lavorazioneId,
      ...payload,
      save: jest.fn().mockResolvedValue(undefined)
    });

    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fasi: [{ name: 'Fase inventata', completed: false }] })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Le fasi consentite sono: Ricevimento, Centrifugazione, Omogeneizzazione, Trattamento termico, Inoculo, Coagulazione, Rottura cagliata, Formatura, Salatura, Stagionatura, Concentrazione, Zangolatura, Confezionamento');
      });
  });

  test('GET /api/lavorazioni ritorna le informazioni sulle lavorazioni interessate (200)', async () => {
    jest.spyOn(Lavorazione, 'find').mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          aziendaId: aziendaId,
          isTemplate: basePayload().isTemplate,
          tipoLavorazione: basePayload().tipoLavorazione,
          status: basePayload().status
        }
      ])
    });
    await request(app)
      .get('/api/lavorazioni')
      .set('Authorization', `Bearer ${token}`)
      .query({
        aziendaId: aziendaId,
        ...basePayload()
      })
      .expect(200);
  });

  test('GET /api/lavorazioni - errore: isTemplate non Boolean (400)', async () => {
    const payload = basePayload();
    delete payload.isTemplate;

    await request(app)
      .get('/api/lavorazioni')
      .set('Authorization', `Bearer ${token}`)
      .query({
        aziendaId: aziendaId,
        ...basePayload(),
        isTemplate: 'not_boolean'
      })
      .expect(400);
  });

  test('GET /api/lavorazioni - errore: aziendaId mancante (400)', async () => {
      await request(app)
          .get('/api/lavorazioni')
          .set('Authorization', `Bearer ${token}`)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBe('aziendaId è obbligatorio');
          });
  });

  test('GET /api/lavorazioni - errore: tentativo senza token (401)', async () => {
    await request(app)
      .get(`/api/lavorazioni`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/lavorazioni - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .get(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('GET /api/lavorazioni - errore: token non valido (403)', async () => {
    await request(app)
      .get(`/api/lavorazioni`)
      .set('Authorization', 'Bearer token_non_valido')
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('GET /api/lavorazioni - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .get(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });
    // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('GET /api/lavorazioni - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .get(`/api/lavorazioni`)
      .set('Authorization', `Bearer ${token}`)
      .query(basePayload())
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('GET /api/lavorazioni/:id/iot restituisce una misurazione valida da sensore MQTT (200)', async () => {
    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(res => {
        expect(res.body.source).toBe('iot');
        expect(res.body.unit).toBe('pezzi');
        expect(res.body.quantity).toBe(34);
        expect(res.body.sensoreId).toBe('665f8fd8ad8f8c0012f9c777');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: nessun sensore di lavorazione attivo trovato (409)', async () => {
    jest.spyOn(Sensore, 'find').mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        });

    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409)
      .expect(res => {
        expect(res.body.message).toBe('Nessun sensore di lavorazione attivo associato all\'azienda');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: lavorazioneId non valido (400)', async () => {
    await request(app)
      .get('/api/lavorazioni/not_an_id/iot')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('ID lavorazione non valido');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: tentativo senza token (401)', async () => {
    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('GET /api/lavorazioni/:id/iot - errore: token non valido (403)', async () => {
    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', 'Bearer token_non_valido')
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });
    // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('GET /api/lavorazioni/:id/iot - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: lavorazione non trovata (404)', async () => {
    jest.spyOn(Lavorazione, 'findById').mockResolvedValue(null);

    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Lavorazione non trovata');
      });
  });

  test('GET /api/lavorazioni/:id/iot - errore: Nessuna misurazione MQTT valida disponibile (409)', async () => {
    ultimeLettureIot.set('665f8fd8ad8f8c0012f9c777', {
      dati: { campo_invalido: 'nessun_valore_valido' },
      timestamp: new Date('2026-06-04T10:00:00.000Z')
    });

    await request(app)
      .get(`/api/lavorazioni/${lavorazioneId}/iot`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe('Nessuna lettura MQTT valida disponibile per i sensori di lavorazione attivi');
      });
  });

  test('GET /api/lavorazioni/search visualizza correttamente il template lavorazione richiesto (200)', async () => {
    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  test('GET /api/lavorazioni/search - errore: codiceLavorazione non valido (400)', async () => {
    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=invalid`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Codice template non valido');
      });
  });

  test('GET /api/lavorazioni/search - errore: codiceLavorazione mancante (400)', async () => {
    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Il codice del template è obbligatorio');
      });
  });

  test('GET /api/lavorazioni/search - errore: tentativo senza token (401)', async () => {
    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/lavorazioni/search - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('GET /api/lavorazioni/search - errore: token non valido (403)', async () => {
    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', 'Bearer token_non_valido')
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('GET /api/lavorazioni/search - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });

  test('GET /api/lavorazioni/search - errore: Nessuna lavorazione trovata (404)', async () => {
    jest.spyOn(Lavorazione, 'findOne').mockResolvedValue(null);

    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Nessun template corrispondente trovato');
      });
  });

  test('GET /api/lavorazioni/search - errore: Nessun template trovato (isTemplate == false) (404)', async () => {
    const payload = basePayload();
    delete payload.isTemplate;
    jest.spyOn(Lavorazione, 'findOne').mockResolvedValue(payload);

    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Nessun template corrispondente trovato');
      });
  });

    // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('GET /api/lavorazioni/search - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .get(`/api/lavorazioni/search?codiceLavorazione=${basePayload().codiceLavorazione}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

    // Caso lavorazione eliminata con successo - 200.
  test('DELETE /api/lavorazioni/:id elimina lavorazione con successo (200)', async () => {
    jest.spyOn(Lavorazione, 'deleteOne').mockResolvedValue({ acknowledged: true, deletedCount: 1 });

    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Lavorazione eliminata con successo');
      });
  });

  test('DELETE /api/lavorazioni/:id - errore: lavorazioneId non valido (400)', async () => {
    await request(app)
      .delete('/api/lavorazioni/not-an-object-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('ID lavorazione non valido');
      });
  });

  test('DELETE /api/lavorazioni/:id - errore: tentativo senza token (401)', async () => {
    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('DELETE /api/lavorazioni/:id - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  // Caso token non valido - 403.
  test('DELETE /api/lavorazioni/:id - errore: token non valido (403)', async () => {
    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', 'Bearer token_non_valido')
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('DELETE /api/lavorazioni/:id - errore: ruolo non autorizzato (403)', async () => {
    const tokenConsumatore = jwt.sign(
      { userId: 'mocked_user_id', userType: 'consumatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${tokenConsumatore}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });
    // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('DELETE /api/lavorazioni/:id - errore: utente non autorizzato (403)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: aziendaId,
        ownerUserId: 'altro_user_id'
      })
    });

    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  // Caso lavorazione non trovata - 404.
  test('DELETE /api/lavorazioni/:id - errore: lavorazione non trovata (404)', async () => {
    jest.spyOn(Lavorazione, 'findById').mockResolvedValue(null);

    await request(app)
      .delete(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Lavorazione non trovata');
      });
  });
});
