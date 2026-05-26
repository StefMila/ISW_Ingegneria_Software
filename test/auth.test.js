import request from 'supertest';
import app from '../app/app.js';
import { jest, describe, beforeEach, afterEach, afterAll, it, expect } from '@jest/globals';
import User from '../app/models/user.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';  

describe('US7 - US69 - Registrazione utente', () => {

    beforeEach(() => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null); // Simulo che l'utente non esista già
        jest.spyOn(User.prototype, 'save').mockResolvedValue({
            _id: 'mocked_id',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
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
    test( 'POST /api/auth/signup - errore: Utente già esistente', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ email: 'testuser@muccapp.it' });
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
            .expect(409)
            .expect(res => {
                expect(res.body.message).toBe('Utente già esistente');
            });
    });
    test( 'POST /api/auth/signup - errore: Nome mancante', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                surname: 'User',
                email: 'testuser@muccapp.it',
                password: 'Password123!',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Nome, cognome, email, password e ruolo sono obbligatori');
            });
    });
    test( 'POST /api/auth/signup - errore: Cognome mancante', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                email: 'testuser@muccapp.it',
                password: 'Password123!',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Nome, cognome, email, password e ruolo sono obbligatori');
            });
    });
    test( 'POST /api/auth/signup - errore: Email mancante', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                password: 'Password123!',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Nome, cognome, email, password e ruolo sono obbligatori');
            });
    });
    test( 'POST /api/auth/signup - errore: Password mancante', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'testuser@muccapp.it',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Nome, cognome, email, password e ruolo sono obbligatori');
            });
    });
    test( 'POST /api/auth/signup - errore: Ruolo mancante', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'testuser@muccapp.it',
                password: 'Password123!',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Nome, cognome, email, password e ruolo sono obbligatori');
            });
    });
    test( 'POST /api/auth/signup - errore: Ruolo non valido', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'testuser@muccapp.it',
                password: 'Password123!',
                userType: 'invalid',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Ruolo non valido.');
            });
    });
    test( 'POST /api/auth/signup - errore: Email non valida', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'invalid-email',
                password: 'Password123!',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Email non valida.');
            });
    });
    test( 'POST /api/auth/signup - errore: Password non conforme', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test',
                surname: 'User',
                email: 'testuser@muccapp.it',
                password: 'pw',
                userType: 'consumatore',
                acceptedTerms: true
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('La password deve essere lunga almeno 8 caratteri.');
            });
    });
    test( 'POST /api/auth/signup - errore: Errore interno del server', async () => {
        jest.spyOn(User.prototype, 'save').mockRejectedValue(new Error('Database error'));
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
            .expect(500)
            .expect(res => {
                expect(res.body.message).toBe('Errore interno del server');
            });
    });
});

// Test suite per il login utente (US8)
describe('US8 - Login utente', () => {

    beforeAll(() => {
        process.env.JWT_SECRET = 'chiave_segreta_per_test'; // Imposto una chiave segreta per i test del token JWT, visto che Jest non carica le variabili d'ambiente da .env
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test( 'POST /api/auth/login - esegue il login di un utente esistente', async () => { //Manca il token
        jest.spyOn(User, 'findOne').mockResolvedValue({
            _id: 'mocked_id',
            email: 'testuser@muccapp.it',
            password: 'hashedpassword',
            userType: 'consumatore'
        });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser@muccapp.it',
                password: 'Password123!'
            })
            .expect(200)
            .expect(res => {
                expect(res.body.message).toBe('Login effettuato con successo');
                expect(res.body.token).toBeDefined();
            });
    });
    test( 'POST /api/auth/login - errore: Email mancante', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                password: 'Password123!'
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Email e password sono obbligatori');
            });
    });
    test( 'POST /api/auth/login - errore: Password mancante', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser@muccapp.it'
            })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Email e password sono obbligatori');
            });
    });
    test( 'POST /api/auth/login - errore: Email non valida', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser@muccapp.it',
                password: 'Password123!'
            })
            .expect(401)
            .expect(res => {
                expect(res.body.message).toBe('Email non valida');
            });
    });
    test( 'POST /api/auth/login - errore: Password non valida', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ email: 'testuser@muccapp.it', password: 'hashedpassword' });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser@muccapp.it',
                password: 'WrongPassword123!'
            })
            .expect(401)
            .expect(res => {
                expect(res.body.message).toBe('Password non valida');
            });
    });
});