import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app/app.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_SECRET = JWT_SECRET;

const buildAuthHeader = () => {
  const token = jwt.sign(
    {
      userId: '665f8fd8ad8f8c0012f9c999',
      email: 'allevatore@test.it',
      userType: 'allevatore'
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return `Bearer ${token}`;
};

// Test specifici per mungiture (evitando duplicati dei guard 401 già presenti in routes.test.js).
describe('Routes - Mungitura', () => {
  const authHeader = buildAuthHeader();

  test('POST /api/mungiture con campi obbligatori mancanti restituisce 400', async () => {
    await request(app)
      .post('/api/mungiture')
      .set('Authorization', authHeader)
      .send({})
      .expect(400);
  });

  test('PATCH /api/mungiture/:id con id non valido restituisce 400', async () => {
    await request(app)
      .patch('/api/mungiture/not-an-object-id')
      .set('Authorization', authHeader)
      .send({
        endedAt: '2024-01-01T08:30:00Z',
        status: 'completata'
      })
      .expect(400);
  });

  test('POST /api/mungiture rifiuta campi non consentiti in fase di avvio', async () => {
    await request(app)
      .post('/api/mungiture')
      .set('Authorization', authHeader)
      .send({
        aziendaId: '665f8fd8ad8f8c0012f9c111',
        animaleId: '665f8fd8ad8f8c0012f9c222',
        quantity: 10
      })
      .expect(400);
  });

  test('PATCH /api/mungiture/:id rifiuta campi non aggiornabili', async () => {
    await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({
        startedAt: '2024-01-01T07:30:00Z'
      })
      .expect(400);
  });

  test('GET /api/mungiture/:id/iot-litri con id non valido restituisce 400', async () => {
    await request(app)
      .get('/api/mungiture/not-an-object-id/iot-litri')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('DELETE /api/mungiture/:id con id non valido restituisce 400', async () => {
    await request(app)
      .delete('/api/mungiture/not-an-object-id')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('PATCH /api/mungiture/:id senza campi aggiornabili restituisce 400', async () => {
    await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({})
      .expect(400);
  });

  test('GET /api/mungiture senza aziendaId restituisce 400', async () => {
    await request(app)
      .get('/api/mungiture')
      .set('Authorization', authHeader)
      .expect(400);
  });
});

