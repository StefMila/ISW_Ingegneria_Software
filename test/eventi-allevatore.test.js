import request from 'supertest';
import app from '../app/app.js';

// Suite di test black-box della pagina eventi allevatore:
// controlla struttura HTML minima e dipendenze script lato client.
describe('Eventi Allevatore - pagina e script', () => {
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

  test('Script eventi-allevatore usa endpoint noun-based per sincronizzazione Google', async () => {
    const response = await request(app)
      .get('/eventi-allevatore.js')
      .expect(200);

    // Confermiamo i nuovi endpoint REST senza verbi nel path.
    expect(response.text).toContain('/api/aziende/');
    expect(response.text).toContain('/sincronizzazioni/google');
    expect(response.text).toContain("formData.get('eventLink')");
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
