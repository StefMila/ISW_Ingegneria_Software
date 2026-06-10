import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, beforeAll, test, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import Azienda from '../app/models/azienda.js';
import mongoose from 'mongoose';

describe('US - Gestione Aziende - Elenco e Dettaglio (Allevatore)', () => {
    const ownerUserId = 'mocked_allevatore_id';
    const aziendaIdValido = '665f8fd8ad8f8c0012f9c123';
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

    test('GET /api/aziende/mine restituisce l\'elenco delle aziende dell\'utente (200)', async () => {
        const mockAziende = [
            {
                _id: aziendaIdValido,
                companyName: 'Azienda Agricola Rossi',
                address: 'Via delle Vacche 1, Bologna',
                ownerUserId,
                createdAt: new Date().toISOString(),
                // Mockiamo il metodo toObject() richiesto dal controller
                toObject: function() { 
                    return { 
                        _id: this._id, 
                        companyName: this.companyName, 
                        address: this.address, 
                        ownerUserId: this.ownerUserId,
                        createdAt: this.createdAt
                    }; 
                }
            }
        ];

        // Mockiamo la catena .find().select().sort()
        jest.spyOn(Azienda, 'find').mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockAziende)
        });

        await request(app)
            .get('/api/aziende/mine')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body.items)).toBe(true);
                expect(res.body.items[0].companyName).toBe('Azienda Agricola Rossi');
            });
    });

    test('GET /api/aziende/:id restituisce il dettaglio di una specifica azienda (200)', async () => {
        const mockDbItem = {
            _id: aziendaIdValido,
            companyName: 'Azienda Agricola Rossi',
            vatNumber: 'IT12345678901',
            emailAzienda: 'rossi@farm.it',
            address: 'Via delle Vacche 1, Bologna',
            ownerUserId,
            toObject: function() { return this; }
        };

        const spyFindById = jest.spyOn(Azienda, 'findById');
        
        // Prima chiamata: dentro assertAziendaOwnedByUser() -> usa .select()
        spyFindById.mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({ _id: aziendaIdValido, ownerUserId })
        });
        // Seconda chiamata: dentro la rotta principale -> ritorna direttamente il documento
        spyFindById.mockReturnValueOnce(Promise.resolve(mockDbItem));

        await request(app)
            .get(`/api/aziende/${aziendaIdValido}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.itemInfo).toBeDefined();
                expect(res.body.itemInfo.companyName).toBe('Azienda Agricola Rossi');
            });
    });

    test('GET /api/aziende/:id - errore: azienda non trovata (404)', async () => {
        // La funzione di controllo assertAziendaOwnedByUser fallisce qui se restituisce null
        jest.spyOn(Azienda, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await request(app)
            .get(`/api/aziende/${aziendaIdValido}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404)
            .expect((res) => {
                // Sincronizzato con il testo del controller "Azienda non trovata"
                expect(res.body.message).toBe('Azienda non trovata');
            });
    });

    test('PATCH /api/aziende/:id aggiorna correttamente i dati aziendali (200)', async () => {
        const fintiDatiAggiornati = {
            companyName: 'Nuovo Nome Srl',
            vatNumber: 'IT12345678901',
            emailAzienda: 'nuovo@email.it',
            address: 'Nuova Via 4, Bologna'
        };

        // Mock per assertAziendaOwnedByUser
        jest.spyOn(Azienda, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: aziendaIdValido, ownerUserId })
        });
        
        // Mock per findByIdAndUpdate
        jest.spyOn(Azienda, 'findByIdAndUpdate').mockResolvedValue({
            _id: aziendaIdValido,
            ownerUserId,
            ...fintiDatiAggiornati
        });

        await request(app)
            .patch(`/api/aziende/${aziendaIdValido}`)
            .set('Authorization', `Bearer ${token}`)
            .send(fintiDatiAggiornati)
            .expect(200)
            .expect((res) => {
                // Sincronizzato con la stringa reale del controller
                expect(res.body.message).toBe('Azienda aggiornata con successo');
                expect(res.body.itemInfo.companyName).toBe('Nuovo Nome Srl');
            });
    });

    test('PATCH /api/aziende/:id - errore: utente non proprietario (403)', async () => {
        jest.spyOn(Azienda, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: aziendaIdValido,
                ownerUserId: 'un_altro_utente_id'
            })
        });

        await request(app)
            .patch(`/api/aziende/${aziendaIdValido}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ companyName: 'Hacker Farm' })
            .expect(403)
            .expect((res) => {
                // Sincronizzato con assertAziendaOwnedByUser
                expect(res.body.message).toBe('Non hai i permessi per questa azienda');
            });
    });

    test('DELETE /api/aziende/:id elimina definitivamente l\'azienda (200)', async () => {
        jest.spyOn(Azienda, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: aziendaIdValido, ownerUserId })
        });
        
        jest.spyOn(mongoose, 'model').mockReturnValue({
            countDocuments: jest.fn().mockResolvedValue(0)
        });

        jest.spyOn(Azienda, 'findByIdAndDelete').mockResolvedValue({ _id: aziendaIdValido });

        await request(app)
            .delete(`/api/aziende/${aziendaIdValido}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.message).toBe('Azienda eliminata con successo');
            });
    });

    test('DELETE /api/aziende/:id - errore: ID non valido o cast error (400)', async () => {
        const castError = new Error('Cast to ObjectId failed');
        castError.name = 'CastError';
        castError.kind = 'ObjectId';
        
        jest.spyOn(Azienda, 'findById').mockRejectedValue(castError);

await request(app)
            .delete('/api/aziende/id-non-valido')
            .set('Authorization', `Bearer ${token}`)
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('aziendaId non è un ObjectId valido');
            });
    });

    // --- TEST INTEGRATO DA ORIGIN/MASTER (Adattato ai mock locali) ---
    test('PATCH /api/aziende/:id aggiorna anche la foto azienda (200)', async () => {
        jest.spyOn(Azienda, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: aziendaIdValido, ownerUserId })
        });
        
        jest.spyOn(Azienda, 'findByIdAndUpdate').mockResolvedValue({
            _id: aziendaIdValido,
            ownerUserId,
            foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
        });

        await request(app)
            .patch(`/api/aziende/${aziendaIdValido}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.itemInfo.foto).toContain('data:image/png;base64');
            });
    });
});