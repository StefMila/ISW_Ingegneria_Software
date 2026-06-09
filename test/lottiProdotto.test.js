import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
import Lavorazione from '../app/models/lavorazione.js';
import LottoProdotto from '../app/models/lottoProdotto.js';
import QRcode from 'qrcode';

// Test specifici per lotti prodotto (evitando duplicati dei guard 401 già presenti in routes.test.js).
describe('Routes - Lotti Prodotto', () => {
	let token;

	const aziendaId = '665f8fd8ad8f8c0012f9c123';
	const ownedAzienda = {
		_id: aziendaId,
		ownerUserId: 'mocked_user_id'
	};
	const lavorazioneId = '6a17701bfeff8409a15f8cc5';
	const lottoId = '6a17701bfeff8409a15f8cc8'

	const basePayload = () => ({
		aziendaId: aziendaId,
		lavorazioneId: lavorazioneId,
		nomeProdotto: 'Vasetti di yogurt',
		quantity: '20',
		unit: 'pezzi',
		lotNumber: 'LOT-YOGURT-FRAGOLA--001'
	});

	beforeAll(() => {
		process.env.JWT_SECRET = 'chiave_segreta_per_test';
	});

	beforeEach(() => {
		token = jwt.sign(
			  { userId: 'mocked_user_id', userType: 'allevatore' },
			  process.env.JWT_SECRET,
			  { expiresIn: '30m' }
			);
		jest.spyOn(Azienda, 'findById').mockReturnValue({
			select: jest.fn().mockResolvedValue(ownedAzienda)
			});
		jest.spyOn(Lavorazione, 'findOne').mockReturnValue({
			select: jest.fn().mockResolvedValue({
				_id: lavorazioneId,
				aziendaId: aziendaId,
				isTemplate: false,
				save: jest.fn().mockResolvedValue(true) 
			})
		});
		jest.spyOn(QRcode, 'toDataURL').mockResolvedValue('data:image/png;base64,mockedbase64string');
		jest.spyOn(LottoProdotto.prototype, 'save').mockResolvedValue({
			  _id: lottoId,
			  ...basePayload(),
			  createdAt: new Date(),
			  updatedAt: new Date()
			});
		jest.spyOn(Lavorazione.prototype, 'save').mockResolvedValue(true);
		jest.spyOn(LottoProdotto, 'findById').mockResolvedValue({
			  _id: lottoId,
			  ...basePayload(),
			  save: jest.fn().mockResolvedValue(undefined)
		});
		jest.spyOn(LottoProdotto, 'find').mockReturnValue({
			sort: jest.fn().mockResolvedValue([
				{
					...basePayload(),
					save: jest.fn().mockResolvedValue(true)
				}
			])
		});
		jest.spyOn(LottoProdotto, 'deleteOne').mockResolvedValue(true);
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	test('POST /api/lotti-prodotto crea un nuovo lotto prodotto (201)', async () => {
		await request(app)
			.post('/api/lotti-prodotto')
			.set('Authorization', `Bearer ${token}`)
			.send(basePayload())
			.expect(201)
			.expect((res) => {
				expect(res.body.message).toBe('Lotto prodotto creato con successo');
				expect(res.body.lottoProdotto).toBeDefined();
			});
	});

	test('POST /api/lotti-prodotto con campi obbligatori mancanti restituisce 400', async () => {
		await request(app)
			.post('/api/lotti-prodotto')
			.set('Authorization', `Bearer ${token}`)
			.send({})
			.expect(400)
			.expect((res) => {
				expect(res.body.message).toBe('aziendaId, lavorazioneId, nomeProdotto, quantity e unit sono obbligatori');
			});
	});

	test('PATCH /api/lotti-prodotto/:id modifica con successo il lotto prodotto (200)', async () => {
		jest.spyOn(Lavorazione, 'findOne').mockReturnValue({
			select: jest.fn().mockResolvedValue({
				_id: lavorazioneId,
				isTemplate: false,
				save: jest.fn().mockResolvedValue(true) 
			})
		});

		await request(app)
			.patch(`/api/lotti-prodotto/${lottoId}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ quantity: 5 })
			.expect(200)
			.expect((res) => {
				expect(res.body.message).toBe('Lotto prodotto aggiornato con successo');
				expect(res.body.lottoProdotto).toBeDefined();
			});
	});

	test('PATCH /api/lotti-prodotto/:id con id non valido restituisce 400', async () => {
		await request(app)
			.patch('/api/lotti-prodotto/not-an-object-id')
			.set('Authorization', `Bearer ${token}`)
			.send({ quantity: 5 })
			.expect(400);
	});

	test('GET /api/lotti-prodotto visualizza tutti i lotti salvati (200)', async () => {
		await request(app)
			.get('/api/lotti-prodotto')
			.set('Authorization', `Bearer ${token}`)
			.query(basePayload())
			.expect(200);
	});

	test('GET /api/lotti-prodotto senza aziendaId restituisce 400', async () => {
		await request(app)
			.get('/api/lotti-prodotto')
			.set('Authorization', `Bearer ${token}`)
			.expect(400);
	});

	test('POST /api/lotti-prodotto/mark-printed con aziendaId non valido restituisce 400', async () => {
		await request(app)
			.post('/api/lotti-prodotto/mark-printed')
			.set('Authorization', `Bearer ${token}`)
			.send({
				aziendaId: 'not-an-object-id',
				prints: [{ lottoId: '665f8fd8ad8f8c0012f9c124', copies: 1 }]
			})
			.expect(400);
	});

	test('DELETE /api/lotti-prodotto/:id con id non valido restituisce 400', async () => {
		await request(app)
			.delete('/api/lotti-prodotto/not-an-object-id')
			.set('Authorization', `Bearer ${token}`)
			.expect(400);
	});

	test('DELETE /api/lotti-prodotto/:id elimina definitivamente il lotto specificato (200)', async () => {
		await request(app)
			.delete(`/api/lotti-prodotto/${lottoId}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
			.expect((res) => {
				expect(res.body.message).toBe('Lotto prodotto eliminato con successo');
			});
	});
});
