import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
import Lavorazione from '../app/models/lavorazione.js';
import { normalizeInputs, normalizeFasi, parseBooleanLike } from '../app/routes/lavorazioni.js';


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
		nomeTemplate: 'test_template',
		isTemplate: parsedIsTemplate ?? false,
		startedAt: '2026-05-29T09:00:00.000Z',
    notes: undefined,
		status: 'in_corso',
    inputs: normalizedInputs.value,
    fasi: normalizedFasi.value,
    outputName: undefined,
		outputQuantity: undefined,
		outputUnit: undefined
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
    jest.spyOn(Lavorazione.prototype, 'save').mockResolvedValue({
      _id: lavorazioneId,
      ...basePayload(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

  test('PATCH /api/lavorazioni/:id aggiorna una lavorazione esistente (200)', async () => {
    await request(app)
        .patch(`/api/lavorazioni/${lavorazioneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completata' })
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
          .send({ status: 'completata' })
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toBe('ID lavorazione non valido');
          });
  });

  test('PATCH /api/lavorazioni/:id - errore: fasi non valide (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fasi: [{ name: 'Fase inventata', completed: false }] })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Le fasi consentite sono: Ricevimento, Centrifugazione, Omogeneizzazione, Trattamento termico, Inoculo, Coagulazione, Rottura cagliata, Formatura, Salatura, Stagionatura, Concentrazione, Zangolatura, Confezionamento');
      });
  });

  test('PATCH /api/lavorazioni/:id - errore: isTemplate non Boolean (400)', async () => {
    await request(app)
      .patch(`/api/lavorazioni/${lavorazioneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isTemplate: 'not_boolean' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('isTemplate deve essere true o false');
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
      .send({ status: 'completata' })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Lavorazione non trovata');
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
