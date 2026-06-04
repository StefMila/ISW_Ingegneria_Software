import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import Animale from '../app/models/animale.js';
import Azienda from '../app/models/azienda.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US49 - View Animali - pagina e script', () => {
	test('GET /view-animali.html restituisce la tabella con filtri e paginazione', async () => {
		const response = await request(app)
			.get('/view-animali.html')
			.expect(200);

		expect(response.text).toContain('id="animaliTable"');
		expect(response.text).toContain('id="filter-matricola"');
		expect(response.text).toContain('id="filter-name"');
		expect(response.text).toContain('id="filter-species"');
		expect(response.text).toContain('id="filter-sesso"');
		expect(response.text).toContain('id="paginationBar"');
		expect(response.text).toContain('id="animaliBody"');
	});

	test('Pagina view-animali include script dedicato', async () => {
		const response = await request(app)
			.get('/view-animali.html')
			.expect(200);

		expect(response.text).toContain('<script src="/view-animali.js"></script>');
	});

	test('Script view-animali usa endpoint nested e messaggi principali', async () => {
		const response = await request(app)
			.get('/view-animali.js')
			.expect(200);

		expect(response.text).toContain('/api/aziende/${aziendaId}/animali?');
		expect(response.text).toContain('/api/aziende/${aziendaId}/animali/${animaleId}');
		expect(response.text).toContain('Nessuna azienda selezionata. Torna alla home e seleziona un\\\'azienda.');
		expect(response.text).toContain('Animale modificato con successo!');
		expect(response.text).toContain('Errore di connessione al server.');
	});
});

describe('US49 - View Animali - gestione animali', () => {
	const aziendaId = '665f8fd8ad8f8c0012f9c123';
	const animaleId = '665f8fd8ad8f8c0012f9c456';
	const ownerUserId = 'mocked_user_id';
	let token;

	beforeAll(() => {
		process.env.JWT_SECRET = 'chiave_segreta_per_test';
	});

	beforeEach(() => {
		token = jwt.sign(
			{ userId: ownerUserId, userType: 'allevatore' },
			process.env.JWT_SECRET,
			{ expiresIn: '30m' }
		);

		jest.spyOn(Azienda, 'findById').mockReturnValue({
			select: jest.fn().mockResolvedValue({
				_id: aziendaId,
				ownerUserId
			})
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	// Caso OK.
	test('GET /api/aziende/:aziendaId/animali restituisce la lista animali (200)', async () => {
		jest.spyOn(Animale, 'countDocuments').mockResolvedValue(1);
		jest.spyOn(Animale, 'find').mockReturnValue({
			sort: jest.fn().mockReturnValue({
				skip: jest.fn().mockReturnValue({
					limit: jest.fn().mockResolvedValue([
						{
							_id: animaleId,
							matricola: 'ITA00001',
							name: 'Bruna',
							species: 'mucca',
							sesso: 'femmina',
							aziendaId
						}
					])
				})
			})
		});

		await request(app)
			.get(`/api/aziende/${aziendaId}/animali`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
			.expect((res) => {
				expect(Array.isArray(res.body.items)).toBe(true);
				expect(res.body.items[0].matricola).toBe('ITA00001');
				expect(res.body.pagination).toBeDefined();
			});
	});

	// Caso senza token - 401.
	test('GET /api/aziende/:aziendaId/animali senza token restituisce 401', async () => {
		await request(app)
			.get(`/api/aziende/${aziendaId}/animali`)
			.expect(401)
			.expect((res) => {
				expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
			});
	});

	// Caso token non valido - 403.
	test('GET /api/aziende/:aziendaId/animali - errore: token non valido (403)', async () => {
		await request(app)
			.get(`/api/aziende/${aziendaId}/animali`)
			.set('Authorization', 'Bearer token_non_valido')
			.expect(403)
			.expect((res) => {
				expect(res.body.message).toBe('Token non valido: Accesso negato');
			});
	});

	test('GET /api/aziende/:aziendaId/animali - errore: aziendaId non valido (400)', async () => {
		await request(app)
			.get('/api/aziende/id-non-valido/animali')
			.set('Authorization', `Bearer ${token}`)
			.expect(400)
			.expect((res) => {
				expect(res.body.message).toBe('aziendaId non è un ObjectId valido');
			});
	});

	test('GET /api/aziende/:aziendaId/animali - errore: azienda non trovata (404)', async () => {
		jest.spyOn(Azienda, 'findById').mockReturnValue({
			select: jest.fn().mockResolvedValue(null)
		});

		await request(app)
			.get(`/api/aziende/${aziendaId}/animali`)
			.set('Authorization', `Bearer ${token}`)
			.expect(404)
			.expect((res) => {
				expect(res.body.message).toBe('Azienda non trovata');
			});
	});

	test('GET /api/aziende/:aziendaId/animali - errore: azienda non di proprieta (403)', async () => {
		jest.spyOn(Azienda, 'findById').mockReturnValue({
			select: jest.fn().mockResolvedValue({
				_id: aziendaId,
				ownerUserId: 'altro_user_id'
			})
		});

		await request(app)
			.get(`/api/aziende/${aziendaId}/animali`)
			.set('Authorization', `Bearer ${token}`)
			.expect(403)
			.expect((res) => {
				expect(res.body.message).toBe('Non hai i permessi per questa azienda');
			});
	});

	// Caso OK.
	test('PATCH /api/aziende/:aziendaId/animali/:id aggiorna un animale (200)', async () => {
		const animaleDaAggiornare = {
			_id: animaleId,
			aziendaId,
			name: 'Bruna',
			species: 'mucca',
			save: jest.fn().mockResolvedValue(true)
		};

		jest.spyOn(Animale, 'findById').mockResolvedValue(animaleDaAggiornare);

		await request(app)
			.patch(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'Stella' })
			.expect(200)
			.expect((res) => {
				expect(res.body.message).toBe('Animale aggiornato con successo');
				expect(res.body.animale).toBeDefined();
			});
	});

	test('PATCH /api/aziende/:aziendaId/animali/:id - errore: nessun campo valido da aggiornare (400)', async () => {
		const animaleDaAggiornare = {
			_id: animaleId,
			aziendaId,
			name: 'Bruna',
			species: 'mucca',
			save: jest.fn().mockResolvedValue(true)
		};

		jest.spyOn(Animale, 'findById').mockResolvedValue(animaleDaAggiornare);

		await request(app)
			.patch(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.send({})
			.expect(400)
			.expect((res) => {
				expect(res.body.message).toBe('Nessun campo valido da aggiornare');
			});
	});

	test('PATCH /api/aziende/:aziendaId/animali/:id - errore: animale non trovato (404)', async () => {
		jest.spyOn(Animale, 'findById').mockResolvedValue(null);

		await request(app)
			.patch(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'Stella' })
			.expect(404)
			.expect((res) => {
				expect(res.body.message).toBe('Animale non trovato');
			});
	});

	test('PATCH /api/aziende/:aziendaId/animali/:id - errore: utente non autorizzato (403)', async () => {
		jest.spyOn(Azienda, 'findById').mockReturnValue({
			select: jest.fn().mockResolvedValue({
				_id: aziendaId,
				ownerUserId: 'altro_user_id'
			})
		});

		await request(app)
			.patch(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'Stella' })
			.expect(403)
			.expect((res) => {
				expect(res.body.message).toBe('Non hai i permessi per questa azienda');
			});
	});

	// Caso OK.
	test('DELETE /api/aziende/:aziendaId/animali/:id elimina un animale (200)', async () => {
		jest.spyOn(Azienda, 'findOne').mockResolvedValue({
			_id: aziendaId,
			ownerUserId
		});
		jest.spyOn(Animale, 'findByIdAndDelete').mockResolvedValue({
			_id: animaleId
		});

		await request(app)
			.delete(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
			.expect((res) => {
				expect(res.body.message).toBe('Animale eliminato con successo');
			});
	});

	test('DELETE /api/aziende/:aziendaId/animali/:id - errore: animale non trovato (404)', async () => {
		jest.spyOn(Azienda, 'findOne').mockResolvedValue({
			_id: aziendaId,
			ownerUserId
		});
		jest.spyOn(Animale, 'findByIdAndDelete').mockResolvedValue(null);

		await request(app)
			.delete(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(404)
			.expect((res) => {
				expect(res.body.message).toBe('Animale non trovato');
			});
	});

	test('DELETE /api/aziende/:aziendaId/animali/:id - errore: utente non autorizzato (403)', async () => {
		jest.spyOn(Azienda, 'findOne').mockResolvedValue(null);

		await request(app)
			.delete(`/api/aziende/${aziendaId}/animali/${animaleId}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(403)
			.expect((res) => {
				expect(res.body.message).toBe('Questo animale non appartiene alla tua azienda');
			});
	});

	test('DELETE /api/aziende/:aziendaId/animali/:id - errore: ID animale non valido (400)', async () => {
		jest.spyOn(Azienda, 'findOne').mockResolvedValue({
			_id: aziendaId,
			ownerUserId
		});

		const castError = new Error('Cast to ObjectId failed');
		castError.name = 'CastError';
		castError.kind = 'ObjectId';
		jest.spyOn(Animale, 'findByIdAndDelete').mockRejectedValue(castError);

		await request(app)
			.delete(`/api/aziende/${aziendaId}/animali/id-non-valido`)
			.set('Authorization', `Bearer ${token}`)
			.expect(400)
			.expect((res) => {
				expect(res.body.message).toBe('ID dell\'animale non valido');
			});
	});
});
