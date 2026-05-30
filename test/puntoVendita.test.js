import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import PuntoVendita from '../app/models/puntoVendita.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US81 Punti Vendita - pagina e script', () => {
    test('GET /add-punto-vendita.html restituisce la pagina con mappa e form di inserimento', async () => {
        const response = await request(app)
            .get('/add-punto-vendita.html')
            .expect(200);

        expect(response.text).toContain('id="add-punto-vendita-form"');
        expect(response.text).toContain('id="nomePunto"');
        expect(response.text).toContain('id="indirizzo"');
        expect(response.text).toContain('id="emailPunto"');
        expect(response.text).toContain('id="phoneNumber"');
        expect(response.text).toContain('id="website"');
        expect(response.text).toContain('id="description"');
        expect(response.text).toContain('id="categories"');
        expect(response.text).toContain('id="addPuntoVenditaMessage"');
    });

    test('Pagina punti-vendita integra caricamento config maps e script dedicato', async () => {
        const response = await request(app)
            .get('/add-punto-vendita.html')
            .expect(200);

        expect(response.text).toContain('<script src="/add-punto-vendita.js"></script>');
        expect(response.text).toContain('getLocationBtn');
    });

    test('Script punti-vendita usa endpoint /api/punti-vendita e messaggi di validazione principali', async () => {
        const response = await request(app)
            .get('/add-punto-vendita.js')
            .expect(200);

        expect(response.text).toContain("fetch('/api/punti-vendita'");
        expect(response.text).toContain('Il nome del punto vendita e obbligatorio');
        expect(response.text).toContain("L\\'indirizzo e obbligatorio");
        expect(response.text).toContain('Coordinate geografiche non valide');
        expect(response.text).toContain('Errore di connessione al server');
    });
});

describe('US81 Punti Vendita - creazione punto vendita', () => {
    let token;

    const basePayload = () => ({
        nomePunto: 'Bottega Centro',
        indirizzo: 'Via Roma 10, Milano',
        emailPunto: 'bottega@example.it',
        phoneNumber: '0212345678',
        website: 'https://bottega.example.it',
        description: 'Negozio prodotti caseari',
        categories: ['latte', 'formaggi'],
        lat: 45.4642,
        lng: 9.19
    });

    beforeAll(() => {
        process.env.JWT_SECRET = 'chiave_segreta_per_test';
    });

    beforeEach(() => {
        jest.spyOn(PuntoVendita.prototype, 'save').mockResolvedValue({
            _id: '665f8fd8ad8f8c0012f9c321',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        token = jwt.sign(
            { userId: 'mocked_user_id', userType: 'allevatore' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    // Caso OK.
    test('POST /api/punti-vendita crea un nuovo punto vendita (201)', async () => {
        await request(app)
            .post('/api/punti-vendita')
            .set('Authorization', `Bearer ${token}`)
            .send(basePayload())
            .expect(201)
            .expect((res) => {
                expect(res.body.message).toBe('Punto vendita creato con successo');
                expect(res.body.puntoVendita).toBeDefined();
            });
    });

    // Caso campi mancanti - 400.
    test('POST /api/punti-vendita - errore: nome punto o indirizzo mancanti (400)', async () => {
        const payload = basePayload();
        delete payload.nomePunto;

        await request(app)
            .post('/api/punti-vendita')
            .set('Authorization', `Bearer ${token}`)
            .send(payload)
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('Nome punto e indirizzo sono obbligatori');
            });
    });

    test('POST /api/punti-vendita - errore: coordinate geografiche non valide (400)', async () => {
        await request(app)
            .post('/api/punti-vendita')
            .set('Authorization', `Bearer ${token}`)
            .send({
                ...basePayload(),
                lat: 'abc',
                lng: ''
            })
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('Coordinate geografiche non valide');
            });
    });

    // Caso senza token - 401.
    test('POST /api/punti-vendita - errore: tentativo senza token (401)', async () => {
        await request(app)
            .post('/api/punti-vendita')
            .send(basePayload())
            .expect(401)
            .expect((res) => {
                expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
            });
    });

    test('POST /api/punti-vendita - errore: token scaduto (401)', async () => {
        const expiredToken = jwt.sign(
            { userId: 'mocked_user_id', userType: 'allevatore' },
            process.env.JWT_SECRET,
            { expiresIn: '-1s' }
        );

        await request(app)
            .post('/api/punti-vendita')
            .set('Authorization', `Bearer ${expiredToken}`)
            .send(basePayload())
            .expect(401)
            .expect((res) => {
                expect(res.body.message).toBe('Token scaduto: Accesso negato');
            });
    });

    // Caso token non valido - 403.
    test('POST /api/punti-vendita - errore: token non valido (403)', async () => {
        await request(app)
            .post('/api/punti-vendita')
            .set('Authorization', 'Bearer token_non_valido')
            .send(basePayload())
            .expect(403)
            .expect((res) => {
                expect(res.body.message).toBe('Token non valido: Accesso negato');
            });
    });

    test('POST /api/punti-vendita - errore: ruolo non autorizzato (403)', async () => {
        const tokenConsumatore = jwt.sign(
            { userId: 'mocked_user_id', userType: 'consumatore' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        await request(app)
            .post('/api/punti-vendita')
            .set('Authorization', `Bearer ${tokenConsumatore}`)
            .send(basePayload())
            .expect(403)
            .expect((res) => {
                expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
            });
    });


    test('GET /api/punti-vendita/mine senza token restituisce 401', async () => {
        await request(app)
            .get('/api/punti-vendita/mine')
            .expect(401);
    });
});
