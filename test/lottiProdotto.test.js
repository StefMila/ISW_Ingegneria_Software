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

// Test specifici per lotti prodotto (evitando duplicati dei guard 401 già presenti in routes.test.js).
describe('Routes - Lotti Prodotto', () => {
	const authHeader = buildAuthHeader();

	test('POST /api/lotti-prodotto con campi obbligatori mancanti restituisce 400', async () => {
		await request(app)
			.post('/api/lotti-prodotto')
			.set('Authorization', authHeader)
			.send({})
			.expect(400);
	});

	test('PATCH /api/lotti-prodotto/:id con id non valido restituisce 400', async () => {
		await request(app)
			.patch('/api/lotti-prodotto/not-an-object-id')
			.set('Authorization', authHeader)
			.send({ quantity: 5 })
			.expect(400);
	});

	test('GET /api/lotti-prodotto senza aziendaId restituisce 400', async () => {
		await request(app)
			.get('/api/lotti-prodotto')
			.set('Authorization', authHeader)
			.expect(400);
	});

	test('DELETE /api/lotti-prodotto/:id con id non valido restituisce 400', async () => {
		await request(app)
			.delete('/api/lotti-prodotto/not-an-object-id')
			.set('Authorization', authHeader)
			.expect(400);
	});
});
