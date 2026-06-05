import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import Sensore from '../app/models/sensore.js';

// Mockiamo le letture MQTT come Map fittizia
const mockUltimeLetture = new Map();
jest.unstable_mockModule('../app/services/mqttService.js', () => ({
    ultimeLettureIot: mockUltimeLetture
}));

// Mockiamo i middleware di autenticazione per far passare sempre le richieste
jest.unstable_mockModule('../app/routes/auth.js', () => ({
    checkAuth: (req, res, next) => {
        req.user = { userId: 'utente-mock-123' };
        next();
    },
    checkUserType: () => (req, res, next) => next()
}));

// Mockiamo il controllo di proprietà dell'azienda
const mockAssertAzienda = jest.fn();
jest.unstable_mockModule('../app/routes/aziende.js', () => ({
    assertAziendaOwnedByUser: mockAssertAzienda
}));

// Importiamo la rotta DOPO aver registrato i mock
const { default: sensoriRouter } = await import('../app/routes/sensori.js');

// Prepariamo l'app Express fittizia per Supertest
const app = express();
app.use(express.json());
app.use('/api', sensoriRouter);

describe('Router Sensori', () => {
    const validAziendaId = new mongoose.Types.ObjectId().toString();
    const validAnimaleId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
        mockUltimeLetture.clear();
        
        // Silenziamo i log di errore previsti dai test per tenere la console pulita
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('GET /sensori', () => {
        test('Restituisce 400 se manca aziendaId', async () => {
            const res = await request(app).get('/api/sensori');
            expect(res.status).toBe(400);
        });

        test('Restituisce 400 se aziendaId non è un ObjectId valido', async () => {
            const res = await request(app).get('/api/sensori').query({ aziendaId: 'id-falso' });
            expect(res.status).toBe(400);
        });

        test('Restituisce l\'errore di ownership se l\'azienda non appartiene all\'utente (403)', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: false, status: 403, message: 'Non autorizzato' });
            const res = await request(app).get('/api/sensori').query({ aziendaId: validAziendaId });
            expect(res.status).toBe(403);
        });

        test('Restituisce 200 e la lista dei sensori (Successo)', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: true });
            
            // Mockiamo .find().sort() di Mongoose
            jest.spyOn(Sensore, 'find').mockReturnValueOnce({
                sort: jest.fn().mockResolvedValueOnce([{ nome: 'Sensore Alpha' }])
            });

            const res = await request(app).get('/api/sensori').query({ aziendaId: validAziendaId });
            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].nome).toBe('Sensore Alpha');
        });

        test('Restituisce 500 se il DB va in errore', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: true });
            jest.spyOn(Sensore, 'find').mockImplementationOnce(() => {
                throw new Error('Errore DB Fake');
            });

            const res = await request(app).get('/api/sensori').query({ aziendaId: validAziendaId });
            expect(res.status).toBe(500);
        });
    });

    // --- TEST PER: POST /sensori ---
    describe('POST /sensori', () => {
        const payloadValido = {
            nome: 'Sensore Nuovo',
            tipoDispositivo: 'ambientale',
            capacita: [{ tipoDato: 'temperatura' }],
            aziendaId: validAziendaId
        };

        test('Restituisce 400 se mancano campi obbligatori', async () => {
            const res = await request(app).post('/api/sensori').send({});
            expect(res.status).toBe(400);
        });

        test('Restituisce 400 se animaleId non è valido', async () => {
            const res = await request(app).post('/api/sensori').send({
                ...payloadValido,
                tipoDispositivo: 'indossabile',
                animaleId: 'id-invalido'
            });
            expect(res.status).toBe(400);
        });

        test('Restituisce 201 e crea il sensore (Successo)', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: true });
            jest.spyOn(Sensore.prototype, 'save').mockResolvedValueOnce(true);

            const res = await request(app).post('/api/sensori').send(payloadValido);
            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Sensore collegato con successo');
        });

        // QUESTO TEST COPRE LE RIGHE 81-83: Il blocco catch() della POST
        test('Restituisce 500 se il salvataggio fallisce', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: true });
            jest.spyOn(Sensore.prototype, 'save').mockRejectedValueOnce(new Error('Salvataggio Fallito'));

            const res = await request(app).post('/api/sensori').send(payloadValido);
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Errore interno del server');
        });
    });

    // --- TEST PER: GET /sensori/dati (RIGHE 144-187) ---
    describe('GET /sensori/dati', () => {
        test('Restituisce 400 se manca aziendaId', async () => {
            const res = await request(app).get('/api/sensori/dati');
            expect(res.status).toBe(400);
        });

        test('Restituisce 400 se aziendaId non è un ObjectId valido', async () => {
            const res = await request(app).get('/api/sensori/dati').query({ aziendaId: 'invalid-id' });
            expect(res.status).toBe(400);
        });

        test('Restituisce errore di ownership se controllo fallisce', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: false, status: 403, message: 'Non autorizzato' });
            const res = await request(app).get('/api/sensori/dati').query({ aziendaId: validAziendaId });
            expect(res.status).toBe(403);
        });

        test('Restituisce 200 unendo i sensori del DB con la cache MQTT', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: true });

            const mockSensoriDB = [
                { _id: 'SENS-1', nome: 'S1', tipoDispositivo: 'ambientale', capacita: [], animaleId: null },
                { _id: 'SENS-2', nome: 'S2', tipoDispositivo: 'indossabile', capacita: [], animaleId: validAnimaleId }
            ];
            jest.spyOn(Sensore, 'find').mockResolvedValueOnce(mockSensoriDB);

            // Simuliamo che MQTT abbia dati solo per il sensore SENS-1
            const now = new Date();
            mockUltimeLetture.set('SENS-1', {
                timestamp: now,
                dati: { temperatura: 24.5 }
            });

            const res = await request(app).get('/api/sensori/dati').query({ aziendaId: validAziendaId });

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(2);

            // Verifica incrocio dati: SENS-1 deve avere i valori, SENS-2 no
            expect(res.body.items[0].valori.temperatura).toBe(24.5);
            expect(res.body.items[0].ultimoAggiornamento).toBe(now.toISOString());
            expect(res.body.items[1].valori).toBeNull();
            expect(res.body.items[1].ultimoAggiornamento).toBeNull();
        });

        test('Restituisce 500 se il DB o la logica interna vanno in errore', async () => {
            mockAssertAzienda.mockResolvedValueOnce({ ok: true });
            jest.spyOn(Sensore, 'find').mockRejectedValueOnce(new Error('Crash Recupero Dati'));

            const res = await request(app).get('/api/sensori/dati').query({ aziendaId: validAziendaId });
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Errore interno del server');
        });
    });
});