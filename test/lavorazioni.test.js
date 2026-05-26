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

// Test specifici per lavorazioni (evitando duplicati dei guard 401 già presenti in routes.test.js).
describe('Routes - Lavorazioni', () => {
    const authHeader = buildAuthHeader();

    test('POST /api/lavorazioni con campi obbligatori mancanti restituisce 400', async () => {
        await request(app)
            .post('/api/lavorazioni')
            .set('Authorization', authHeader)
            .send({})
            .expect(400);
    });

    test('PATCH /api/lavorazioni/:id con id non valido restituisce 400', async () => {
        await request(app)
            .patch('/api/lavorazioni/not-an-object-id')
            .set('Authorization', authHeader)
            .send({ status: 'completata' })
            .expect(400);
    });

    test('GET /api/lavorazioni senza aziendaId restituisce 400', async () => {
        await request(app)
            .get('/api/lavorazioni')
            .set('Authorization', authHeader)
            .expect(400);
    });

    test('DELETE /api/lavorazioni/:id con id non valido restituisce 400', async () => {
      await request(app)
        .delete('/api/lavorazioni/not-an-object-id')
        .set('Authorization', authHeader)
        .expect(400);
    });
});
