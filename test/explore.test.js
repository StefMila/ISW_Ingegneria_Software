import request from 'supertest';
import app from '../app/app.js';

// Questa suite verifica che la vista mappa e la configurazione client
// espongano i punti minimi necessari al funzionamento lato browser.
describe('US40 - Integrazione mappa', () => {
  test('GET /esplora.html restituisce la pagina esplora', async () => {
    const response = await request(app)
      .get('/esplora.html')
      .expect(200);

    expect(response.text).toContain('id="myMap"');
  });

  test('GET /api/config restituisce configurazione client', async () => {
    const response = await request(app)
      .get('/api/config')
      .expect(200);

    expect(typeof response.body).toBe('object');
  });

  test('Pagina esplora integra endpoint mappa previsti', async () => {
    const response = await request(app)
      .get('/esplora.js')
      .expect(200);

    // Verifica contrattuale: la pagina deve usare questi endpoint backend.
    expect(response.text).toContain("fetch('/api/config')");
    expect(response.text).toContain("fetch('/api/aziende/public')");
  });

  test('Pagina esplora gestisce errori di caricamento aziende', async () => {
    const response = await request(app)
      .get('/esplora.js')
      .expect(200);

    expect(response.text).toContain('Errore nel caricamento delle aziende:');
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

describe('US40 - Config client mappa', () => {
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
});
