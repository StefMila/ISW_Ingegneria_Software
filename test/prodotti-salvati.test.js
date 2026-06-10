import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, test, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import LottoProdotto from '../app/models/lottoProdotto.js';
import Azienda from '../app/models/azienda.js';
import ProdottoSalvato from '../app/models/prodottoSalvato.js';

const mockMongooseChain = (resolvedValue) => {
    return {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(resolvedValue),
        then: (resolve) => resolve(resolvedValue)
    };
};

describe('US - Prodotti Salvati - Scansione e Storico (Consumatore)', () => {
    const utenteId = '665f8fd8ad8f8c0012f9c999';
    const lottoId = '665f8fd8ad8f8c0012f9c111';
    const aziendaId = '665f8fd8ad8f8c0012f9c222';
    let token;

    beforeAll(() => {
        process.env.JWT_SECRET = 'chiave_segreta_per_test';
    });

    beforeEach(() => {
        token = jwt.sign(
            { userId: utenteId, userType: 'consumatore' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    // --- TEST POST /api/prodotti-salvati/scansiona ---
    test('POST /api/prodotti-salvati/scansiona salva il prodotto e sblocca il primo badge (201)', async () => {
        const mockLotto = {
            _id: lottoId,
            lotNumber: 'L-12345',
            nomeProdotto: 'Miele di Castagno',
            quantity: 500,
            unit: 'g',
            aziendaId: aziendaId
        };

        jest.spyOn(LottoProdotto, 'findOne').mockReturnValue(mockMongooseChain(mockLotto));
        
        // Mockiamo sia il .save() su istanza che il .create() statico per sicurezza
        jest.spyOn(ProdottoSalvato.prototype, 'save').mockResolvedValue(true);
        jest.spyOn(ProdottoSalvato, 'create').mockResolvedValue(true);
        
        jest.spyOn(ProdottoSalvato, 'countDocuments').mockReturnValue(mockMongooseChain(1));
        
        jest.spyOn(Azienda, 'findById').mockReturnValue(mockMongooseChain({
            _id: aziendaId,
            companyName: 'Apicoltura Biologica Test'
        }));

        const response = await request(app)
            .post('/api/prodotti-salvati/scansiona')
            .set('Authorization', `Bearer ${token}`)
            .send({ lotNumber: 'L-12345' })
            .expect(201);

        expect(response.body.message).toBe('Prodotto salvato nel tuo profilo di filiera!');
        expect(response.body.badgeSbloccato).toBeDefined();
        expect(response.body.badgeSbloccato.titolo).toBe('Esploratore di Filiera');
        expect(response.body.prodotto.nomeProdotto).toBe('Miele di Castagno');
        expect(response.body.prodotto.companyName).toBe('Apicoltura Biologica Test');
    });

    test('POST /api/prodotti-salvati/scansiona - errore: lotNumber mancante (400)', async () => {
        const response = await request(app)
            .post('/api/prodotti-salvati/scansiona')
            .set('Authorization', `Bearer ${token}`)
            .send({})
            .expect(400);

        expect(response.body.message).toBe('lotNumber obbligatorio');
    });

    test('POST /api/prodotti-salvati/scansiona - errore: lotto non trovato (404)', async () => {
        jest.spyOn(LottoProdotto, 'findOne').mockReturnValue(mockMongooseChain(null));

        const response = await request(app)
            .post('/api/prodotti-salvati/scansiona')
            .set('Authorization', `Bearer ${token}`)
            .send({ lotNumber: 'LOTTO-INESISTENTE' })
            .expect(404);

        expect(response.body.message).toBe('Prodotto o lotto non trovato nel sistema');
    });

    test('POST /api/prodotti-salvati/scansiona - errore: prodotto già scansionato (409)', async () => {
        jest.spyOn(LottoProdotto, 'findOne').mockReturnValue(mockMongooseChain({ _id: lottoId }));

        const duplicateError = new Error('Duplicate key error');
        duplicateError.code = 11000;
        
        jest.spyOn(ProdottoSalvato.prototype, 'save').mockRejectedValue(duplicateError);
        jest.spyOn(ProdottoSalvato, 'create').mockRejectedValue(duplicateError);

        const response = await request(app)
            .post('/api/prodotti-salvati/scansiona')
            .set('Authorization', `Bearer ${token}`)
            .send({ lotNumber: 'L-GIA-SCANSIONATO' })
            .expect(409);

        expect(response.body.message).toBe('Hai già scansionato e salvato questo specifico lotto di prodotto in passato!');
    });

    // --- TEST GET /api/prodotti-salvati ---
    test('GET /api/prodotti-salvati restituisce lo storico e calcola correttamente i badge (200)', async () => {
        const mockStorico = Array(6).fill().map((_, i) => ({
            _id: `salvataggio_${i}`,
            lottoProdottoId: {
                lotNumber: `L-00${i}`,
                nomeProdotto: 'Prodotto Test',
                quantity: 1,
                unit: 'kg'
            },
            scansionatoAt: new Date()
        }));

        jest.spyOn(ProdottoSalvato, 'find').mockReturnValue(mockMongooseChain(mockStorico));

        const response = await request(app)
            .get('/api/prodotti-salvati')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body.totale).toBe(6);
        expect(Array.isArray(response.body.items)).toBe(true);
        expect(response.body.items.length).toBe(6);
        expect(response.body.badges.length).toBe(2);
        expect(response.body.badges[0].titolo).toBe('Esploratore di Filiera');
        expect(response.body.badges[1].titolo).toBe('Consumatore Consapevole');
    });

    test('GET /api/prodotti-salvati senza token restituisce 401', async () => {
        await request(app)
            .get('/api/prodotti-salvati')
            .expect(401);
    });

    test('GET /api/prodotti-salvati con token di ruolo non consentito restituisce 403', async () => {
        const wrongToken = jwt.sign(
            { userId: utenteId, userType: 'allevatore' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        await request(app)
            .get('/api/prodotti-salvati')
            .set('Authorization', `Bearer ${wrongToken}`)
            .expect(403);
    });
});