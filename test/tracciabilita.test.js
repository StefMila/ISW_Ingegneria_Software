import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import app from '../app/app.js';
import Animale from '../app/models/animale.js';
import Azienda from '../app/models/azienda.js';
import IotDailyStat from '../app/models/iotDailyStat.js';
import Lavorazione from '../app/models/lavorazione.js';
import LottoProdotto from '../app/models/lottoProdotto.js';
import Mungitura from '../app/models/munigitura.js';

const USER_ID = '665f8fd8ad8f8c0012f9c999';
const ALT_USER_ID = '665f8fd8ad8f8c0012f9c998';
const VET_ID = '665f8fd8ad8f8c0012f9c997';
const ANIMALE_ID = '665f8fd8ad8f8c0012f9c111';
const AZIENDA_ID = '665f8fd8ad8f8c0012f9c123';
const LOTTO_ID = '665f8fd8ad8f8c0012f9c124';
const LAVORAZIONE_ID = '665f8fd8ad8f8c0012f9c125';
const MUNGITURA_ID = '665f8fd8ad8f8c0012f9c126';

const makeSelectable = (value) => ({
	select: jest.fn().mockResolvedValue(value)
});

const makeSorted = (value) => ({
	sort: jest.fn().mockResolvedValue(value)
});

const makeSortedLimited = (value) => ({
	sort: jest.fn().mockReturnValue({
		limit: jest.fn().mockResolvedValue(value)
	})
});

describe('US - Tracciabilita - endpoint privati e pubblici', () => {
	let allevatoreToken;
	let allevatoreNonAutorizzatoToken;
	let veterinarioToken;
	let consumatoreToken;

	beforeAll(() => {
		process.env.JWT_SECRET = 'chiave_segreta_per_test_tracciabilita';
	});

	beforeEach(() => {
		allevatoreToken = jwt.sign(
			{ userId: USER_ID, userType: 'allevatore' },
			process.env.JWT_SECRET,
			{ expiresIn: '30m' }
		);

		allevatoreNonAutorizzatoToken = jwt.sign(
			{ userId: ALT_USER_ID, userType: 'allevatore' },
			process.env.JWT_SECRET,
			{ expiresIn: '30m' }
		);

		veterinarioToken = jwt.sign(
			{ userId: VET_ID, userType: 'veterinario' },
			process.env.JWT_SECRET,
			{ expiresIn: '30m' }
		);

		consumatoreToken = jwt.sign(
			{ userId: USER_ID, userType: 'consumatore' },
			process.env.JWT_SECRET,
			{ expiresIn: '30m' }
		);

		jest.spyOn(Animale, 'findById').mockReturnValue(makeSelectable({
			_id: ANIMALE_ID,
			aziendaId: AZIENDA_ID,
			name: 'Bruna',
			matricola: 'ITA00001'
		}));

		jest.spyOn(Animale, 'find').mockReturnValue(makeSelectable([
			{
				_id: ANIMALE_ID,
				name: 'Bruna',
				matricola: 'ITA00001',
				species: 'mucca',
				sesso: 'femmina'
			}
		]));

		jest.spyOn(Azienda, 'findById').mockReturnValue(makeSelectable({
			_id: AZIENDA_ID,
			companyName: 'Fattoria Felice',
			website: 'https://fattoria-felice.example.it',
			geo: { lat: 45.0677, lng: 7.6825 },
			ownerUserId: USER_ID,
			authorizedVeterinarianIds: [VET_ID]
		}));

		jest.spyOn(IotDailyStat, 'find').mockReturnValue(makeSorted([
			{
				day: new Date('2026-05-01T00:00:00.000Z'),
				processPhase: 'pascolo',
				metrics: {
					steps: { first: 10, last: 70, min: 10, max: 70, sum: 80, count: 2 },
					outdoor: { first: 1, last: 3, min: 1, max: 3, sum: 4, count: 2 },
					temperature: { first: 36.4, last: 36.9, min: 36.4, max: 36.9, sum: 73.3, count: 2 },
					bpm: { first: 58, last: 62, min: 58, max: 62, sum: 120, count: 2 }
				},
				alerts: { lowActivityCount: 0, highTemperatureCount: 0, highBpmCount: 0 }
			}
		]));

		jest.spyOn(LottoProdotto, 'findOne').mockReturnValue(makeSelectable({
			_id: LOTTO_ID,
			lotNumber: 'LOT-001',
			nomeProdotto: 'Formaggio Fresco',
			quantity: 20,
			unit: 'kg',
			createdAt: new Date('2026-05-03T08:00:00.000Z'),
			lavorazioneId: LAVORAZIONE_ID,
			aziendaId: AZIENDA_ID,
			qrCodeValue: 'http://localhost:3000/tracciabilita.html?lotto=LOT-001',
			qrCodeImage: 'data:image/png;base64,FAKE_QR'
		}));

		jest.spyOn(Lavorazione, 'findById').mockReturnValue(makeSelectable({
			_id: LAVORAZIONE_ID,
			startedAt: new Date('2026-05-02T08:00:00.000Z'),
			endedAt: new Date('2026-05-02T10:00:00.000Z'),
			status: 'completata',
			outputName: 'Formaggio Fresco',
			outputQuantity: 20,
			outputUnit: 'kg',
			inputs: [
				{ mungituraIds: [MUNGITURA_ID] }
			]
		}));

		jest.spyOn(Mungitura, 'find').mockReturnValue({
			select: jest.fn().mockReturnValue({
				sort: jest.fn().mockResolvedValue([
					{
						_id: MUNGITURA_ID,
						animaleId: ANIMALE_ID,
						startedAt: new Date('2026-05-01T06:00:00.000Z'),
						endedAt: new Date('2026-05-01T06:30:00.000Z'),
						quantity: 16,
						unit: 'L',
						status: 'completata',
						notes: 'Mungitura mattutina',
						semiLavoratoId: '665f8fd8ad8f8c0012f9c127'
					}
				])
			})
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('GET /api/tracciabilita/animali/:animaleId/stats', () => {
		test('restituisce statistiche aggregate per range valido (200)', async () => {
			const response = await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(200);

			expect(response.body.animale.id).toBe(ANIMALE_ID);
			expect(response.body.summary.stepsTotal).toBe(60);
			expect(response.body.days).toHaveLength(1);
			expect(response.body.days[0].phase).toBe('pascolo');
		});

		test('errore: animaleId non valido (400)', async () => {
			await request(app)
				.get('/api/tracciabilita/animali/not-valid/stats?from=2026-05-01&to=2026-05-03')
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(400)
				.expect((res) => {
					expect(res.body.message).toBe('animaleId non valido');
				});
		});

		test('errore: from e to mancanti o non validi (400)', async () => {
			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats`)
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(400)
				.expect((res) => {
					expect(res.body.message).toBe('from e to sono obbligatori e devono essere date valide');
				});
		});

		test('errore: from maggiore di to (400)', async () => {
			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-03&to=2026-05-01`)
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(400)
				.expect((res) => {
					expect(res.body.message).toBe('from deve essere minore o uguale a to');
				});
		});

		test('errore: animale non trovato (404)', async () => {
			Animale.findById.mockReturnValue(makeSelectable(null));

			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(404)
				.expect((res) => {
					expect(res.body.message).toBe('Animale non trovato');
				});
		});

		test('errore: allevatore non proprietario azienda (403)', async () => {
			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.set('Authorization', `Bearer ${allevatoreNonAutorizzatoToken}`)
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Non hai i permessi per questa azienda');
				});
		});

		test('errore: veterinario non autorizzato (403)', async () => {
			Azienda.findById.mockReturnValue(makeSelectable({
				_id: AZIENDA_ID,
				ownerUserId: USER_ID,
				authorizedVeterinarianIds: []
			}));

			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.set('Authorization', `Bearer ${veterinarioToken}`)
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Veterinario non autorizzato su questa azienda');
				});
		});

		test('errore: tentativo senza token (401)', async () => {
			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.expect(401)
				.expect((res) => {
					expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
				});
		});

		test('errore: token non valido (403)', async () => {
			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.set('Authorization', 'Bearer token_non_valido')
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Token non valido: Accesso negato');
				});
		});

		test('errore: ruolo non ammesso sulla route privata (403)', async () => {
			await request(app)
				.get(`/api/tracciabilita/animali/${ANIMALE_ID}/stats?from=2026-05-01&to=2026-05-03`)
				.set('Authorization', `Bearer ${consumatoreToken}`)
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
				});
		});

	});

	describe('GET /api/tracciabilita/lotti/:lotNumber', () => {
		test('restituisce dettagli privati completi del lotto (200)', async () => {
			IotDailyStat.find.mockReturnValue(makeSortedLimited([
				{
					day: new Date('2026-05-01T00:00:00.000Z'),
					processPhase: 'stalla',
					metrics: {
						steps: { first: 20, last: 90, min: 20, max: 90, sum: 110, count: 2 },
						outdoor: { first: 2, last: 4, min: 2, max: 4, sum: 6, count: 2 },
						temperature: { first: 36.5, last: 37.2, min: 36.5, max: 37.2, sum: 73.7, count: 2 },
						bpm: { first: 57, last: 66, min: 57, max: 66, sum: 123, count: 2 }
					},
					alerts: { lowActivityCount: 0, highTemperatureCount: 1, highBpmCount: 0 }
				}
			]));

			const response = await request(app)
				.get('/api/tracciabilita/lotti/LOT-001')
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(200);

			expect(response.body.lotto.lotNumber).toBe('LOT-001');
			expect(response.body.lotto.aziendaId).toBe(AZIENDA_ID);
			expect(response.body.lotto.qrCodeValue).toContain('/tracciabilita.html?lotto=LOT-001');
			expect(response.body.timeline.length).toBeGreaterThan(0);
			expect(response.body.mungiture).toHaveLength(1);
			expect(response.body.animals).toHaveLength(1);
			expect(response.body.animals[0].id).toBe(ANIMALE_ID);
			expect(response.body.animals[0].benessere.steps30d).toBe(70);
		});

		test('errore: lotNumber non valido/vuoto (400)', async () => {
			await request(app)
				.get('/api/tracciabilita/lotti/%20')
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(400)
				.expect((res) => {
					expect(res.body.message).toBe('lotNumber obbligatorio');
				});
		});

		test('errore: lotto non trovato (404)', async () => {
			LottoProdotto.findOne.mockReturnValue(makeSelectable(null));

			await request(app)
				.get('/api/tracciabilita/lotti/LOT-404')
				.set('Authorization', `Bearer ${allevatoreToken}`)
				.expect(404)
				.expect((res) => {
					expect(res.body.message).toBe('Lotto non trovato');
				});
		});

		test('errore: allevatore non proprietario (403)', async () => {
			IotDailyStat.find.mockReturnValue(makeSortedLimited([
				{
					day: new Date('2026-05-01T00:00:00.000Z'),
					processPhase: 'stalla',
					metrics: {
						steps: { first: 20, last: 90, min: 20, max: 90, sum: 110, count: 2 },
						outdoor: { first: 2, last: 4, min: 2, max: 4, sum: 6, count: 2 },
						temperature: { first: 36.5, last: 37.2, min: 36.5, max: 37.2, sum: 73.7, count: 2 },
						bpm: { first: 57, last: 66, min: 57, max: 66, sum: 123, count: 2 }
					},
					alerts: { lowActivityCount: 0, highTemperatureCount: 1, highBpmCount: 0 }
				}
			]));

			await request(app)
				.get('/api/tracciabilita/lotti/LOT-001')
				.set('Authorization', `Bearer ${allevatoreNonAutorizzatoToken}`)
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Non hai i permessi per questa azienda');
				});
		});

		test('errore: veterinario non autorizzato (403)', async () => {
			IotDailyStat.find.mockReturnValue(makeSortedLimited([
				{
					day: new Date('2026-05-01T00:00:00.000Z'),
					processPhase: 'stalla',
					metrics: {
						steps: { first: 20, last: 90, min: 20, max: 90, sum: 110, count: 2 },
						outdoor: { first: 2, last: 4, min: 2, max: 4, sum: 6, count: 2 },
						temperature: { first: 36.5, last: 37.2, min: 36.5, max: 37.2, sum: 73.7, count: 2 },
						bpm: { first: 57, last: 66, min: 57, max: 66, sum: 123, count: 2 }
					},
					alerts: { lowActivityCount: 0, highTemperatureCount: 1, highBpmCount: 0 }
				}
			]));

			Azienda.findById.mockReturnValue(makeSelectable({
				_id: AZIENDA_ID,
				ownerUserId: USER_ID,
				authorizedVeterinarianIds: []
			}));

			await request(app)
				.get('/api/tracciabilita/lotti/LOT-001')
				.set('Authorization', `Bearer ${veterinarioToken}`)
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Veterinario non autorizzato su questa azienda');
				});
		});

		test('errore: tentativo senza token (401)', async () => {
			await request(app)
				.get('/api/tracciabilita/lotti/LOT-001')
				.expect(401)
				.expect((res) => {
					expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
				});
		});

		test('errore: token non valido (403)', async () => {
			await request(app)
				.get('/api/tracciabilita/lotti/LOT-001')
				.set('Authorization', 'Bearer token_non_valido')
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Token non valido: Accesso negato');
				});
		});

		test('errore: ruolo non ammesso sulla route privata (403)', async () => {
			await request(app)
				.get('/api/tracciabilita/lotti/LOT-001')
				.set('Authorization', `Bearer ${consumatoreToken}`)
				.expect(403)
				.expect((res) => {
					expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
				});
		});

	});

	describe('GET /api/tracciabilita/public/lotti/:lotNumber', () => {
		test('restituisce tracciabilità pubblica con azienda produttrice e metriche minimali (200)', async () => {
			IotDailyStat.find.mockReturnValue(makeSortedLimited([
				{
					day: new Date('2026-05-01T00:00:00.000Z'),
					processPhase: 'pascolo',
					metrics: {
						steps: { first: 15, last: 65, min: 15, max: 65, sum: 80, count: 2 },
						outdoor: { first: 1, last: 2, min: 1, max: 2, sum: 3, count: 2 },
						temperature: { first: 36.6, last: 37.0, min: 36.6, max: 37.0, sum: 73.6, count: 2 },
						bpm: { first: 56, last: 60, min: 56, max: 60, sum: 116, count: 2 }
					},
					alerts: { lowActivityCount: 1, highTemperatureCount: 0, highBpmCount: 0 }
				}
			]));

			const response = await request(app)
				.get('/api/tracciabilita/public/lotti/LOT-001')
				.expect(200);

			expect(response.body.lotto.lotNumber).toBe('LOT-001');
			expect(response.body.producer.companyName).toBe('Fattoria Felice');
			expect(response.body.producer.website).toBe('https://fattoria-felice.example.it');
			expect(response.body.producer.map.lat).toBe(45.0677);
			expect(response.body.producer.map.lng).toBe(7.6825);
			expect(response.body.animals).toHaveLength(1);
			expect(response.body.animals[0].label).toBe('Bruna');
			expect(response.body.animals[0].benessere.stepsDailyAvg).toBe(50);
			expect(response.body.animals[0].benessere.outdoorPercent).toBe(4.2);
		});

		test('errore: lotNumber non valido/vuoto (400)', async () => {
			await request(app)
				.get('/api/tracciabilita/public/lotti/%20')
				.expect(400)
				.expect((res) => {
					expect(res.body.message).toBe('lotNumber obbligatorio');
				});
		});

		test('errore: lotto non trovato (404)', async () => {
			LottoProdotto.findOne.mockReturnValue(makeSelectable(null));

			await request(app)
				.get('/api/tracciabilita/public/lotti/LOT-404')
				.expect(404)
				.expect((res) => {
					expect(res.body.message).toBe('Lotto non trovato');
				});
		});

	});
});
