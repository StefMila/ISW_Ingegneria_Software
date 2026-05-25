import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, afterAll, it, expect } from '@jest/globals';
import User from '../app/models/user.js';
import mongoose from 'mongoose';

describe('US7 - US69 - Registrazione utente', () => {

    beforeEach(() => {
        User.findOne = jest.fn().mockResolvedValue(null); // Simula che l'utente non esista già
        User.prototype.save = jest.fn( function() {
            if (!this._id) {
                this._id = 'mocked_id';
            }

            this.createdAt = new Date();
            this.updatedAt = new Date();

            return Promise.resolve(this);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test( 'POST /api/auth/signup - esegue la registrazione di un nuovo utente', async () => {
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
            .set('Accept', 'application/json')
            .expect(201)
            .expect(res => {                
                expect(res.body.message).toBe('Utente registrato con successo');
            });
    });
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
            });
    });
});