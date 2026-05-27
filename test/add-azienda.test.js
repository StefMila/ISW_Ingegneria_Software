import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, afterAll, it, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
//import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Verifica end-to-end leggera della view add-azienda (struttura + script + guard API).
describe('Add Azienda - pagina e script', () => {
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

describe('US11 - Registrazione Azienda', () => {

  let token;
  beforeEach(() => {
        process.env.JWT_SECRET = 'chiave_segreta_per_test'; // Imposto una chiave segreta per i test
        jest.spyOn(Azienda, 'findOne').mockResolvedValue(null); // Simulo che l'azienda non esista già
        jest.spyOn(Azienda.prototype, 'save').mockResolvedValue({
            _id: 'mocked_id',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        token = jwt.sign({ userId: 'mocked_id' }, process.env.JWT_SECRET, { expiresIn: '30m' });
        //jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'mocked_id' }); // Simulo la verifica del token JWT
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

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
  //TODO: aggiungere test per token scaduto e token non valido (es. firma errata) -> simulazione metodo jwt.verify() che lancia errori specifici (TokenExpiredError, JsonWebTokenError, ecc.)
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
  //TODO: aggiungere test per lat e lng (es. valori non numerici, valori fuori range, ecc.) -> simulazione metodo Number.isFinite()
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
        expect(res.body.message).toBe('Esiste già un\'azienda con questa partita IVA.');
      });
  });
  //TODO: aggiungere test per errori duplicati nel dB (codice errore MongoDB 11000) -> simulazione metodo save() che lancia un errore con codice 11000
  test('POST /api/aziende - errore: Errore interno del server (403)', async () => {
    jest.spyOn(Azienda.prototype, 'save').mockRejectedValue(new Error('Errore del database')); // Simulo un errore durante il salvataggio
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
      .expect(500)
      .expect(res => {
        expect(res.body.message).toBe('Errore interno del server.');
      });
  });
});
