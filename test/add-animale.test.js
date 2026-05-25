import request from 'supertest';
import app from '../app/app.js';

// Test di regressione per la pagina add-animale:
// validano markup, script collegato e protezione API.
describe('Add Animale - pagina e script', () => {
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

describe('Add Animale - protezione endpoint API', () => {
  test('POST /api/aziende/:aziendaId/animali senza token restituisce 401', async () => {
    // Senza autenticazione non deve essere possibile registrare animali.
    await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/animali')
      .send({
        matricola: 'ITA00001',
        name: 'Bruna',
        species: 'mucca',
        dataNascita: '2022-01-10',
        sesso: 'femmina'
      })
      .expect(401);
  });
});
