import request from 'supertest';
import app from '../app/app.js';
import azienda from '../app/models/azienda.js';

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

describe('Routes - Visualizzazione azienda', () => {
    test('GET /api/aziende/mine con campi obbligatori mancanti restituisce 400', async () => {
})