import request from 'supertest';
import app from '../app/app.js';
//test di guardia 401 senza token.
// Suite trasversale sui router backend: qui controlliamo validazioni base
// e comportamenti di sicurezza indipendenti dal database.
describe('Routes - Auth', () => {
  test('POST /api/auth/logout restituisce 200', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    expect(response.body.message).toContain('Logout effettuato con successo');
  });
});

describe('Routes - Azienda e Animali (guard)', () => {
  test('GET /api/aziende/mine senza token restituisce 401', async () => {
    await request(app)
      .get('/api/aziende/mine')
      .expect(401);
  });

  test('GET /api/aziende/:id senza token restituisce 401', async() => {
    await request(app)
      .get('/api/aziende/:id')
      .expect(401);
  })

  test('PATCH /api/aziende/:id senza token restituisce 401', async () => {
    await request(app)
      .patch('/api/aziende/665f8fd8ad8f8c0012f9c123')
      .send({ companyName: 'Nuovo Nome Srl' })
      .expect(401);
  });

  test('DELETE /api/aziende/:id senza token restituisce 401', async () => {
    await request(app)
      .delete('/api/aziende/665f8fd8ad8f8c0012f9c123')
      .expect(401);
  });

  test('PATCH /api/aziende/:id/categories senza token restituisce 401', async () => {
    await request(app)
      .patch('/api/aziende/665f8fd8ad8f8c0012f9c123/categories')
      .send({ categories: ['latte'] })
      .expect(401);
  });

  test('GET /api/animali/azienda/:aziendaId/animali senza token restituisce 401', async () => {
    await request(app)
      .get('/api/animali/azienda/665f8fd8ad8f8c0012f9c123/animali')
      .expect(401);
  });
});

describe('Routes - Punti Vendita', () => {
    test('POST /api/punti-vendita senza token restituisce 401', async () => {
      await request(app)
        .post('/api/punti-vendita')
        .send({
          nomePunto: 'Punto Test',
          indirizzo: 'Via Test 123',
          lat: 45.46,
          lng: 9.19
        })
        .expect(401);
    });

    test('GET /api/punti-vendita/mine senza token restituisce 401', async () => {
      await request(app)
        .get('/api/punti-vendita/mine')
        .expect(401);
    });
});

describe('Routes - Google Calendar', () => {
  test('GET /api/google-calendar/oauth/callback senza code/state fa redirect errore', async () => {
    const response = await request(app)
      .get('/api/google-calendar/oauth/callback')
      .expect(302);

    // In mancanza di parametri OAuth la route deve fare redirect di errore gestito.
    expect(response.headers.location).toContain('/impostazioni-calendario.html?gcal=error&reason=missing_params');
  });

  test('GET /api/google-calendar/status senza token restituisce 401', async () => {
    await request(app)
      .get('/api/google-calendar/status?aziendaId=665f8fd8ad8f8c0012f9c123')
      .expect(401);
  });

  test('GET /api/google-calendar/auth-url senza token restituisce 401', async () => {
    await request(app)
      .get('/api/google-calendar/auth-url?aziendaId=665f8fd8ad8f8c0012f9c123')
      .expect(401);
  });

  test('POST /api/google-calendar/disconnect senza token restituisce 401', async () => {
    await request(app)
      .post('/api/google-calendar/disconnect')
      .send({ aziendaId: '665f8fd8ad8f8c0012f9c123' })
      .expect(401);
  });
});

describe('Routes - IoT Sensori', () => {
  // Test POST: Verifica che non si possa registrare un sensore senza token
  test('POST /api/iot/sensori senza token restituisce 401', async () => {
    await request(app)
      .post('/api/iot/sensori')
      .send({
        nome: "Collare Test",
        tipoDispositivo: "indossabile",
        capacita: [{ tipoDato: "temperatura", unitaMisura: "°C" }],
        aziendaId: "665f8fd8ad8f8c0012f9c123"
      })
      .expect(401);
  });

  // Test GET (Lista): Verifica che non si possa vedere la lista senza token
  test('GET /api/iot/sensori senza token restituisce 401', async () => {
    await request(app)
      .get('/api/iot/sensori?aziendaId=665f8fd8ad8f8c0012f9c123')
      .expect(401);
  });

  // Test GET (Dati live): Verifica che non si possano vedere i dati senza token
  test('GET /api/iot/sensori/dati senza token restituisce 401', async () => {
    await request(app)
      .get('/api/iot/sensori/dati?aziendaId=665f8fd8ad8f8c0012f9c123')
      .expect(401);
  });
});

describe('Routes - Prodotti Salvati (guard)', () => {
  // Test POST: Verifica che un utente non loggato non possa scansionare un lotto
  test('POST /api/prodotti-salvati/scansiona senza token restituisce 401', async () => {
    await request(app)
      .post('/api/prodotti-salvati/scansiona')
      .send({ lotNumber: 'L-12345' })
      .expect(401);
  });

  // Test GET: Verifica che un utente non loggato non possa vedere la collezione di prodotti
  test('GET /api/prodotti-salvati senza token restituisce 401', async () => {
    await request(app)
      .get('/api/prodotti-salvati')
      .expect(401);
  });
});
