import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import PuntoVendita from '../app/models/puntoVendita.js';

// Verifica che la pagina sia accessibile e che funzioni lo script.
describe('US80 - View Punti Vendita - pagina e script', () => {
    test('GET /view-punti-vendita.html restituisce la tabella con colonna attivo e filtri corretti', async () => {
        const response = await request(app)
            .get('/view-punti-vendita.html')
            .expect(200);

        expect(response.text).toContain('id="puntiVenditaTable"');
        expect(response.text).toContain('id="filterActivePunto"');
        expect(response.text).toContain('Attivo');
        expect(response.text).toContain('id="filterNomePunto"');
        expect(response.text).toContain('id="filterIndirizzoPunto"');
        expect(response.text).toContain('id="filterCategoriePunto"');
        expect(response.text).toContain('view-punti-vendita.js');
    });

    test('Script view-punti-vendita supporta toggle attivo e modifica/elimina', async () => {
        const response = await request(app)
            .get('/view-punti-vendita.js')
            .expect(200);

        expect(response.text).toContain('toggle-punto-vendita-active');
        expect(response.text).toContain('isActive');
        expect(response.text).toContain('data-field="isActive"');
        expect(response.text).toContain('filterCategoriePunto');
        expect(response.text).toContain("fetch('/api/punti-vendita/mine'");
        expect(response.text).toContain("fetch(`/api/punti-vendita/${puntoVenditaId}`");
        expect(response.text).toContain('delete-animal-btn');
        expect(response.text).toContain('edit-animal-btn');
        expect(response.text).toContain("L\\'indirizzo e obbligatorio.");
        expect(response.text).toContain('Errore nel caricamento dei punti vendita.');
    });
});

describe('US80 - View Punti Vendita - gestione punti vendita', () => {
    const puntoVenditaId = '665f8fd8ad8f8c0012f9c321';
    const ownerUserId = '665f8fd8ad8f8c0012f9c999';
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
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    // Caso OK.
    test('GET /api/punti-vendita/mine restituisce i punti vendita dell utente (200)', async () => {
        jest.spyOn(PuntoVendita, 'find').mockReturnValue({
            select: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([
                    {
                        _id: puntoVenditaId,
                        ownerUserId,
                        nomePunto: 'Bottega Centro',
                        indirizzo: 'Via Roma 10, Milano',
                        isActive: true
                    }
                ])
            })
        });

        await request(app)
            .get('/api/punti-vendita/mine')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body.items)).toBe(true);
                expect(res.body.items[0].nomePunto).toBe('Bottega Centro');
            });
    });


    // Caso senza token - 401.
    test('GET /api/punti-vendita/mine senza token restituisce 401', async () => {
        await request(app)
            .get('/api/punti-vendita/mine')
            .expect(401);
    });

    // Caso OK.
    test('GET /api/punti-vendita/:id restituisce il dettaglio punto vendita (200)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockResolvedValue({
            _id: puntoVenditaId,
            ownerUserId,
            nomePunto: 'Bottega Centro',
            indirizzo: 'Via Roma 10, Milano',
            isActive: true
        });

        await request(app)
            .get(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.item).toBeDefined();
                expect(res.body.item.nomePunto).toBe('Bottega Centro');
            });
    });

    test('GET /api/punti-vendita/:id - errore: ID non valido (400)', async () => {
        await request(app)
            .get('/api/punti-vendita/id-non-valido')
            .set('Authorization', `Bearer ${token}`)
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('ID del punto vendita non valido');
            });
    });

    test('GET /api/punti-vendita/:id - errore: punto vendita non trovato (404)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockResolvedValue(null);

        await request(app)
            .get(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect((res) => {
                expect(res.body.message).toBe('Punto vendita non trovato');
            });
    });

    test('GET /api/punti-vendita/:id - errore: utente non proprietario (403)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockResolvedValue({
            _id: puntoVenditaId,
            ownerUserId: 'other-user-id'
        });

        await request(app)
            .get(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(403)
            .expect((res) => {
                expect(res.body.message).toBe('Non sei il proprietario di questo punto vendita');
            });
    });


    // Caso OK.
    test('PATCH /api/punti-vendita/:id aggiorna punto vendita (200)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: puntoVenditaId,
                ownerUserId
            })
        });
        jest.spyOn(PuntoVendita, 'findByIdAndUpdate').mockResolvedValue({
            _id: puntoVenditaId,
            ownerUserId,
            nomePunto: 'Bottega Aggiornata'
        });

        await request(app)
            .patch(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nomePunto: 'Bottega Aggiornata' })
            .expect(200)
            .expect((res) => {
                expect(res.body.message).toBe('Punto vendita aggiornato con successo');
            });
    });

    test('PATCH /api/punti-vendita/:id - errore: ID non valido (400)', async () => {
        await request(app)
            .patch('/api/punti-vendita/id-non-valido')
            .set('Authorization', `Bearer ${token}`)
            .send({ nomePunto: 'Nuovo nome' })
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('ID del punto vendita non valido');
            });
    });

    test('PATCH /api/punti-vendita/:id - errore: punto vendita non trovato (404)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await request(app)
            .patch(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nomePunto: 'Nuovo nome' })
            .expect(404)
            .expect((res) => {
                expect(res.body.message).toBe('Punto vendita non trovato');
            });
    });

    test('PATCH /api/punti-vendita/:id - errore: utente non proprietario (403)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: puntoVenditaId,
                ownerUserId: 'other-user-id'
            })
        });

        await request(app)
            .patch(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nomePunto: 'Nuovo nome' })
            .expect(403)
            .expect((res) => {
                expect(res.body.message).toBe('Non sei il proprietario di questo punto vendita');
            });
    });

    test('PATCH /api/punti-vendita/:id - errore: coordinate geografiche non valide (400)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: puntoVenditaId,
                ownerUserId
            })
        });

        await request(app)
            .patch(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ lat: 'abc', lng: '' })
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('Coordinate geografiche non valide');
            });
    });


    // Caso OK.
    test('DELETE /api/punti-vendita/:id elimina punto vendita (200)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: puntoVenditaId,
                ownerUserId
            })
        });
        jest.spyOn(PuntoVendita, 'findByIdAndDelete').mockResolvedValue({ _id: puntoVenditaId });

        await request(app)
            .delete(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.message).toBe('Punto vendita eliminato con successo');
            });
    });

    test('DELETE /api/punti-vendita/:id - errore: ID non valido (400)', async () => {
        await request(app)
            .delete('/api/punti-vendita/id-non-valido')
            .set('Authorization', `Bearer ${token}`)
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('ID del punto vendita non valido');
            });
    });

    test('DELETE /api/punti-vendita/:id - errore: punto vendita non trovato (404)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await request(app)
            .delete(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect((res) => {
                expect(res.body.message).toBe('Punto vendita non trovato');
            });
    });

    test('DELETE /api/punti-vendita/:id - errore: utente non proprietario (403)', async () => {
        jest.spyOn(PuntoVendita, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: puntoVenditaId,
                ownerUserId: 'other-user-id'
            })
        });

        await request(app)
            .delete(`/api/punti-vendita/${puntoVenditaId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(403)
            .expect((res) => {
                expect(res.body.message).toBe('Non sei il proprietario di questo punto vendita');
            });
    });

});