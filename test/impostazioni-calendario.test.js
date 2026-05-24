import request from 'supertest';
import app from '../app/app.js';

// Questa suite assicura che la pagina di configurazione Google Calendar
// esponga i controlli necessari e i corretti endpoint di integrazione.
describe('Impostazioni Calendario - pagina e script', () => {
  test('GET /impostazioni-calendario.html restituisce la pagina con i controlli principali', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.html')
      .expect(200);

    expect(response.text).toContain('id="calendarSettingsForm"');
    expect(response.text).toContain('id="connectionBadge"');
    expect(response.text).toContain('id="connectGoogleButton"');
    expect(response.text).toContain('id="disconnectButton"');
    expect(response.text).toContain('id="privateCalendarId"');
    expect(response.text).toContain('id="publicCalendarId"');
  });

  test('Pagina impostazioni calendario include script dedicato e link agli eventi', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.html')
      .expect(200);

    expect(response.text).toContain('<script src="/impostazioni-calendario.js"></script>');
    expect(response.text).toContain('href="/eventi-allevatore.html"');
  });

  test('Script impostazioni calendario usa gli endpoint Google Calendar previsti', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.js')
      .expect(200);

    expect(response.text).toContain('/api/google-calendar/status?aziendaId=');
    expect(response.text).toContain('/api/google-calendar/disconnect');
    expect(response.text).toContain('/api/google-calendar/auth-url?aziendaId=');
  });

  test('Script gestisce esito OAuth da querystring e refresh su cambio azienda', async () => {
    const response = await request(app)
      .get('/impostazioni-calendario.js')
      .expect(200);

    // Dopo la callback OAuth, la UI deve leggere i parametri e aggiornarsi.
    expect(response.text).toContain("params.get('gcal')");
    expect(response.text).toContain("if (gcal === 'connected')");
    expect(response.text).toContain("if (gcal === 'error')");
    expect(response.text).toContain("window.addEventListener('aziendaChanged'");
  });
});
