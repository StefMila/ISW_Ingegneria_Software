import request from 'supertest';
import app from '../app/app.js';

// Suite trasversale sui router backend: qui controlliamo validazioni base
// e comportamenti di sicurezza indipendenti dal database.
describe('Routes - Auth', () => {
  test('POST /api/auth/login con body vuoto restituisce 400', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);

    expect(response.body.message).toContain('Email e password sono obbligatori');
  });

  test('POST /api/auth/signup con campi mancanti restituisce 400', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Mario' })
      .expect(400);

    expect(response.body.message).toContain('Nome, cognome, email, password e ruolo sono obbligatori');
  });

  test('POST /api/auth/forgot-password senza email restituisce 400', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({})
      .expect(400);

    expect(response.body.message).toContain('Email è obbligatoria');
  });

  test('POST /api/auth/reset-password senza campi obbligatori restituisce 400', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: '' })
      .expect(400);

    expect(response.body.message).toContain('Email e newPassword sono obbligatori');
  });

  test('POST /api/auth/logout restituisce 200', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    expect(response.body.message).toContain('Logout effettuato con successo');
  });
});

describe('Routes - Azienda e Animali (guard)', () => {
  test('GET /api/azienda/mine senza token restituisce 401', async () => {
    await request(app)
      .get('/api/azienda/mine')
      .expect(401);
  });

  test('PATCH /api/azienda/:id/categories senza token restituisce 401', async () => {
    await request(app)
      .patch('/api/azienda/665f8fd8ad8f8c0012f9c123/categories')
      .send({ categories: ['latte'] })
      .expect(401);
  });

  test('GET /api/animali/azienda/:aziendaId/animali senza token restituisce 401', async () => {
    await request(app)
      .get('/api/animali/azienda/665f8fd8ad8f8c0012f9c123/animali')
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
