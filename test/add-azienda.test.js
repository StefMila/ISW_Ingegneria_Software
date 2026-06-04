import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeAll, beforeEach, afterEach, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
import jwt from 'jsonwebtoken';

// Verifica end-to-end leggera della view add-azienda (struttura + script + guard API).
describe('US11 - Aggiungi Azienda - pagina e script', () => {
  test('GET /add-azienda.html restituisce la pagina con form di inserimento', async () => {
    const response = await request(app)
      .get('/add-azienda.html')
      .expect(200);

    expect(response.text).toContain('id="add-azienda-form"');
    expect(response.text).toContain('id="nomeAzienda"');
    expect(response.text).toContain('id="indirizzo"');
    expect(response.text).toContain('id="partitaIva"');
    expect(response.text).toContain('id="lat"');
    expect(response.text).toContain('id="lng"');
    expect(response.text).toContain('id="addAziendaMessage"');
  });
//verifica che la pagina includa lo script.
  test('Pagina add-azienda integra caricamento config maps e script dedicato', async () => {
    const response = await request(app)
      .get('/add-azienda.html')
      .expect(200);

    expect(response.text).toContain('<script src="/add-azienda.js"></script>');
    expect(response.text).toContain('getLocationBtn');
  });

  test('Script add-azienda usa endpoint /api/aziende e messaggi di validazione principali', async () => {
    const response = await request(app)
      .get('/add-azienda.js')
      .expect(200);

    expect(response.text).toContain("fetch('/api/config')");
    expect(response.text).toContain("fetch('/api/aziende'");
    expect(response.text).toContain('Il nome dell\\\'azienda è obbligatorio');
    expect(response.text).toContain('La partita IVA è obbligatoria');
    expect(response.text).toContain('Errore di connessione al server');
  });
});

describe('US11 - Aggiungi Azienda', () => {

  let token;
  // imposta JWT prima di ogni test.
  beforeAll(() => {
    process.env.JWT_SECRET = 'chiave_segreta_per_test'; // Imposto una chiave segreta per i test
  });
  
  beforeEach(() => {
        jest.spyOn(Azienda, 'findOne').mockResolvedValue(null); // Simulo che l'azienda non esista già
        jest.spyOn(Azienda.prototype, 'save').mockResolvedValue({
            _id: 'mocked_azienda_id',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        // Genero un token JWT valido per i test
      token = jwt.sign({ userId: 'mocked_user_id', email: 'test@example.com', userType: 'allevatore' }, 
          process.env.JWT_SECRET, 
          { expiresIn: '30m' }
        );

    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });
// caso ok.
  test('POST /api/aziende con token valido crea l\'azienda (201)', async () => {
    const response = await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`) // Simulo l'invio del token JWT
      .send({
        companyName: 'Azienda Test',
        vatNumber: 'IT12345678901',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(201)
      .expect(res => {
        expect(res.body.message).toBe('Azienda registrata con successo');
        expect(res.body.company).toBeDefined(); 
      });
  });
// caso senza token - 401.
  test('POST /api/aziende - errore: tentativo di accesso senza token (401)', async () => {
    // La creazione azienda deve sempre passare dal middleware di autenticazione.
    await request(app)
      .post('/api/aziende')
      .send({
        companyName: 'Azienda Test',
        vatNumber: 'IT12345678901',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });
  test('POST /api/aziende - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
      { userId: 'mocked_user_id', email: 'test@example.com', userType: 'allevatore' },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );

    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({
        companyName: 'Azienda Test',
        vatNumber: 'IT12345678901',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token scaduto: Accesso negato');
      });
  });

  test('POST /api/aziende - errore: token non valido (403)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', 'Bearer token_non_valido')
      .send({
        companyName: 'Azienda Test',
        vatNumber: 'IT12345678901',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(403)
      .expect(res => {
        expect(res.body.message).toBe('Token non valido: Accesso negato');
      });
  });

  test('POST /api/aziende - errore: Nome azienda mancante (400)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toBe('Partita IVA, nome azienda e email azienda sono obbligatori');
      });
  });
  test('POST /api/aziende - errore: Partita IVA mancante (400)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyName: 'Azienda Test',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toBe('Partita IVA, nome azienda e email azienda sono obbligatori');
      });
  });
  test('POST /api/aziende - errore: Email azienda mancante (400)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        companyName: 'Azienda Test',
        lat: 45.46,
        lng: 9.19
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toBe('Partita IVA, nome azienda e email azienda sono obbligatori');
      });
  });
  test('POST /api/aziende - errore: Formato email azienda non valido (400)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        companyName: 'Azienda Test',
        emailAzienda: 'invalid-email', // Email non valida
        lat: 45.46,
        lng: 9.19
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toBe('Email azienda non valida.');
      });
  });

  test('POST /api/aziende - errore: latitudine non numerica (400)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        companyName: 'Azienda Test',
        emailAzienda: 'test@example.com',
        lat: 'lat-non-valida',
        lng: 9.19
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toBe('Coordinate non valide: latitudine e longitudine sono obbligatorie');
      });
  });

  test('POST /api/aziende - errore: longitudine mancante (400)', async () => {
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        companyName: 'Azienda Test',
        emailAzienda: 'test@example.com',
        lat: 45.46
      })
      .expect(400)
      .expect(res => {
        expect(res.body.message).toBe('Coordinate non valide: latitudine e longitudine sono obbligatorie');
      });
  });

  test('POST /api/aziende - errore: Partita IVA già registrata (409)', async () => {
    jest.spyOn(Azienda, 'findOne').mockResolvedValue({ _id: 'mocked_id' }); // Simulo che la partita IVA esista già
    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        companyName: 'Azienda Test',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(409)
      .expect(res => {
        expect(res.body.message).toBe('Esiste già un\'azienda con questa partita IVA');
      });
  });
  test('POST /api/aziende - errore: duplicato MongoDB 11000 (409)', async () => {
    const duplicateError = new Error('Duplicate key');
    duplicateError.code = 11000;
    jest.spyOn(Azienda.prototype, 'save').mockRejectedValue(duplicateError);

    await request(app)
      .post('/api/aziende')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vatNumber: 'IT12345678901',
        companyName: 'Azienda Test',
        emailAzienda: 'test@example.com',
        lat: 45.46,
        lng: 9.19
      })
      .expect(409)
      .expect(res => {
        expect(res.body.message).toBe('Esiste già un\'azienda con questa partita IVA');
      });
  });

  test('GET /api/aziende/mine - errore: token mancante (401)', async () => {
    await request(app)
      .get('/api/aziende/mine')
      .expect(401);
  });

  test('GET /api/aziende/mine - errore: token scaduto (401)', async () => {
    const expiredToken = jwt.sign(
          { userId: 'mocked_user_id', userType: 'allevatore' },
          process.env.JWT_SECRET,
          { expiresIn: '-1s' }
        );
    
    await request(app)
      .get('/api/aziende/mine')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  test('GET /api/aziende/mine - errore: token non valido (403)', async () => {
    await request(app)
      .get('/api/aziende/mine')
      .set('Authorization', 'Bearer token_non_valido')
      .expect(403);
  });

  test('GET /api/aziende/mine - errore: ruolo non autorizzato (403)', async () => {
      const tokenConsumatore = jwt.sign(
        { userId: 'mocked_user_id', userType: 'consumatore' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
  
      await request(app)
        .get('/api/aziende/mine')
        .set('Authorization', `Bearer ${tokenConsumatore}`)
        .expect(403);
    });

  test('PATCH /api/aziende/:id/categories - errore: token mancante (401)', async () => {
    await request(app)
      .patch('/api/aziende/665f8fd8ad8f8c0012f9c123/categories')
      .send({ categories: ['latte'] })
      .expect(401);
  });
});
