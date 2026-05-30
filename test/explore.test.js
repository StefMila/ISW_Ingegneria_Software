import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, afterEach, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
import PuntoVendita from '../app/models/puntoVendita.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US40 - Esplora - pagina e script', () => {
  test('GET /esplora.html restituisce la pagina esplora', async () => {
    const response = await request(app)
      .get('/esplora.html')
      .expect(200);

    expect(response.text).toContain('id="myMap"');
  });

  test('Pagina esplora integra endpoint mappa previsti', async () => {
    const response = await request(app)
      .get('/esplora.js')
      .expect(200);

    expect(response.text).toContain("fetch('/api/config')");
    expect(response.text).toContain("fetch('/api/aziende/public')");
    expect(response.text).toContain("fetch('/api/punti-vendita/public')");
  });

  test('Pagina esplora gestisce errori di caricamento aziende e punti vendita', async () => {
    const response = await request(app)
      .get('/esplora.js')
      .expect(200);

    expect(response.text).toContain('Errore nel caricamento di aziende e punti vendita:');
  });

  test('Pagina esplora espone messaggi per errori geocoding/geolocalizzazione', async () => {
    const response = await request(app)
      .get('/esplora.js')
      .expect(200);

    expect(response.text).toContain('Luogo non trovato. Prova a selezionare un suggerimento.');
    expect(response.text).toContain('Impossibile accedere alla tua posizione. Controlla i permessi del browser.');
    expect(response.text).toContain('Il tuo browser non supporta la geolocalizzazione.');
  });

  test('Pagina esplora espone il fallback quando non trova aziende', async () => {
    const response = await request(app)
      .get('/esplora.js')
      .expect(200);

    expect(response.text).toContain('<em>nessun risultato</em>');
  });
});

describe('US40 - Esplora - API pubbliche mappa', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // Caso OK.
  test('GET /api/config restituisce configurazione client (200)', async () => {
    const previousValue = process.env.GOOGLE_MAPS_API_KEY;

    try {
      process.env.GOOGLE_MAPS_API_KEY = 'test-google-maps-key';

      const response = await request(app)
        .get('/api/config')
        .expect(200);

      expect(typeof response.body).toBe('object');
      expect(response.body.googleMapsKey).toBe('test-google-maps-key');
    } finally {
      if (typeof previousValue === 'undefined') {
        delete process.env.GOOGLE_MAPS_API_KEY;
      } else {
        process.env.GOOGLE_MAPS_API_KEY = previousValue;
      }
    }
  });

  test('GET /api/config risponde 200 anche senza GOOGLE_MAPS_API_KEY', async () => {
    const previousValue = process.env.GOOGLE_MAPS_API_KEY;

    try {
      delete process.env.GOOGLE_MAPS_API_KEY;

      const response = await request(app)
        .get('/api/config')
        .expect(200);

      expect(typeof response.body).toBe('object');
      expect(response.body.googleMapsKey).toBeUndefined();
    } finally {
      if (typeof previousValue === 'undefined') {
        delete process.env.GOOGLE_MAPS_API_KEY;
      } else {
        process.env.GOOGLE_MAPS_API_KEY = previousValue;
      }
    }
  });

  test('GET /api/aziende/public restituisce aziende pubbliche (200)', async () => {
    jest.spyOn(Azienda, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: '665f8fd8ad8f8c0012f9c123',
            companyName: 'Azienda Test',
            address: 'Via Roma 10, Milano'
          }
        ])
      })
    });

    await request(app)
      .get('/api/aziende/public')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items[0].companyName).toBe('Azienda Test');
      });
  });

  test('GET /api/aziende/public - errore interno del server (500)', async () => {
    jest.spyOn(Azienda, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('db down'))
      })
    });

    await request(app)
      .get('/api/aziende/public')
      .expect(500)
      .expect((res) => {
        expect(res.body.message).toBe('Errore interno del server');
      });
  });

  test('GET /api/punti-vendita/public restituisce punti vendita pubblici (200)', async () => {
    jest.spyOn(PuntoVendita, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: '665f8fd8ad8f8c0012f9c321',
              nomePunto: 'Bottega Test',
              indirizzo: 'Via Torino 5, Milano',
              isActive: true
            }
          ])
        })
      })
    });

    await request(app)
      .get('/api/punti-vendita/public')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items[0].nomePunto).toBe('Bottega Test');
      });
  });

  test('GET /api/punti-vendita/public - errore interno del server (500)', async () => {
    jest.spyOn(PuntoVendita, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('db down'))
        })
      })
    });

    await request(app)
      .get('/api/punti-vendita/public')
      .expect(500)
      .expect((res) => {
        expect(res.body.error).toBe('Errore interno del server');
      });
  });
});
