import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, afterAll, it, expect } from '@jest/globals';
import User from '../app/models/user.js';
import mongoose from 'mongoose';

describe('US7 - US69 - Registrazione utente', () => {

    let userSpy;
    beforeAll(() => {
        userSpy = jest.spyOn(User, 'create');
    });

    beforeEach(() => {
        userSpy.mockImplementation( async (userData) => {
            return await { 
                id: 'mock-test-id',
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date(),
                __v: 0
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll( async () => {
        if (userSpy) {
            userSpy.mockRestore();
        }
        await mongoose.connection.close();
    });

    test( 'POST /api/auth/signup - esegue la registrazione di un nuovo utente', async () => { //problema: non va (500 errore interno) --> probabilmente c'è da configurare il db di test
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'testuser@muccapp.it',
                password: 'Password123!',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(201)
            .expect(res => {                
                expect(res.body.message).toBe('Utente registrato con successo');
                expect(res.body.user).toBeDefined();
                expect(res.body.user.email).toBe('testuser@muccapp.it');
            });
    }, 15000); // Aumento il timeout a 15 secondi perché la registrazione richiede più tempo viste le numerose operazioni coinvolte (hashing password, salvataggio su DB, ecc.)

    test( 'POST /api/auth/signup - errore: Termini non accettati', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'testuser@muccapp.it',
                password: 'Password123!',
                userType: 'consumatore',
                acceptedTerms: false
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('È necessario accettare i Termini e Condizioni per proseguire.')
                expect(res.body.user).toBeUndefined()
            });
    });
});