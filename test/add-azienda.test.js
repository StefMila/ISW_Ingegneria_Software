import request from 'supertest';
import app from '../app/app.js';

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

describe('Add Azienda - protezione endpoint API', () => {
  test('POST /api/aziende senza token restituisce 401', async () => {
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
      .expect(401);
  });
});
