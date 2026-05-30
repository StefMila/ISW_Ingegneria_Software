import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import Animale from '../app/models/animale.js';
import Azienda from '../app/models/azienda.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US13 - Add Animale - pagina e script', () => {
  test('GET /add-animale.html restituisce la pagina con form di inserimento', async () => {
    const response = await request(app)
      .get('/add-animale.html')
      .expect(200);

    expect(response.text).toContain('id="add-animale-form"');
    expect(response.text).toContain('id="matricola"');
    expect(response.text).toContain('id="nomeAnimale"');
    expect(response.text).toContain('id="species"');
    expect(response.text).toContain('id="sesso"');
    expect(response.text).toContain('id="addAnimaleMessage"');
  });

  test('Pagina add-animale include script dedicato', async () => {
    const response = await request(app)
      .get('/add-animale.html')
      .expect(200);

    expect(response.text).toContain('<script src="/add-animale.js"></script>');
  });

  test('Script add-animale usa endpoint nested azienda/animali e validazioni base', async () => {
    const response = await request(app)
      .get('/add-animale.js')
      .expect(200);

    expect(response.text).toContain('/api/aziende/${aziendaId}/animali');
    expect(response.text).toContain('La matricola è obbligatoria');
    expect(response.text).toContain('Il nome è obbligatorio');
    expect(response.text).toContain('Errore di connessione al server');
  });
});

describe('US13 - Add Animale - registrazione animale', () => {
  let token;

  // Prima imposta il JWT.
  beforeAll(() => {
    process.env.JWT_SECRET = 'chiave_segreta_per_test';
  });

  beforeEach(() => {
    jest.spyOn(Animale, 'findOne').mockResolvedValue(null);
    jest.spyOn(Animale.prototype, 'save').mockResolvedValue({
      _id: 'mocked_animale_id',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '665f8fd8ad8f8c0012f9c123',
        ownerUserId: 'mocked_user_id'
      })
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
  test('POST /api/aziende/:aziendaId/animali registra un nuovo animale (201)', async () => {
    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .set('Authorization', `Bearer ${token}`)
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toBe('Animale registrato con successo');
        expect(res.body.animale).toBeDefined();
      });
  });

  // Caso animale gia esistente - 409.
  test('POST /api/aziende/:aziendaId/animali - errore: Animale gia esistente (409)', async () => {
    jest.spyOn(Animale, 'findOne').mockResolvedValue({ matricola: 'ITA00001' });

    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .set('Authorization', `Bearer ${token}`)
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe('Esiste già un animale con questa matricola');
      });
  });

  // Caso campi mancanti - 400.
  test('POST /api/aziende/:aziendaId/animali - errore: campi obbligatori mancanti (400)', async () => {
    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .set('Authorization', `Bearer ${token}`)
      .send({
        matricola: 'ITA00001',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Matricola, name, species, dataNascita, sesso e aziendaId sono obbligatori');
      });
  });

  // Caso senza token - 401.
  test('POST /api/aziende/:aziendaId/animali - errore: tentativo senza token (401)', async () => {
    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/animali/azienda/:aziendaId/animali senza token restituisce 401', async () => {
    await request(app)
      .get('/api/animali/azienda/665f8fd8ad8f8c0012f9c123/animali')
      .expect(401);
  });

  // Caso token non valido - 403.
  test('POST /api/aziende/:aziendaId/animali - errore: token non valido (403)', async () => {
    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .set('Authorization', 'Bearer token_non_valido')
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  // Caso 403 - utente non autorizzato (azienda non di sua proprieta).
  test('POST /api/aziende/:aziendaId/animali - errore: utente non autorizzato (403)', async () => {
    const tokenNonAutorizzato = jwt.sign(
      { userId: 'altro_user_id', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .set('Authorization', `Bearer ${tokenNonAutorizzato}`)
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  // Caso 404 - azienda non trovata.
  test('POST /api/aziende/:aziendaId/animali - errore: azienda non trovata (404)', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .set('Authorization', `Bearer ${token}`)
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Azienda non trovata');
      });
  });
});