import request from 'supertest';
import app from '../app/app.js';

describe('US40 - Integrazione mappa', () => {
  test('GET /esplora.html restituisce la pagina esplora', async () => {
    const response = await request(app)
      .get('/esplora.html')
      .expect(200);

    expect(response.text).toContain('<gmp-map');
  });

  test('GET /api/config restituisce configurazione client', async () => {
    const response = await request(app)
      .get('/api/config')
      .expect(200);

    expect(typeof response.body).toBe('object');
  });

  test('Pagina esplora integra endpoint mappa previsti', async () => {
    const response = await request(app)
      .get('/esplora.html')
      .expect(200);

    expect(response.text).toContain("fetch('/api/config')");
    expect(response.text).toContain("fetch('/api/azienda/public')");
  });
});
