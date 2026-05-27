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

    test( 'POST /api/auth/signup - esegue la registrazione di un nuovo utente (200)', async () => {
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
    test( 'POST /api/auth/signup - errore: Termini non accettati (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Utente già esistente (409)', async () => {
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
    test( 'POST /api/auth/signup - errore: Nome mancante (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Cognome mancante (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Email mancante (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Password mancante (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Ruolo mancante (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Ruolo non valido (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Email non valida (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Password non conforme (400)', async () => {
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
    test( 'POST /api/auth/signup - errore: Errore interno del server (500)', async () => {
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

    test( 'POST /api/auth/login - esegue il login di un utente esistente (200)', async () => { //Manca il token
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
    test( 'POST /api/auth/login - errore: Email mancante (400)', async () => {
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
    test( 'POST /api/auth/login - errore: Password mancante (400)', async () => {
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
    test( 'POST /api/auth/login - errore: Email non valida (401)', async () => {
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
    test( 'POST /api/auth/login - errore: Password non valida (401)', async () => {
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
    test( 'POST /api/auth/login - errore: Errore interno del server (500)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValue(new Error('Database error'));
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser@muccapp.it',
                password: 'Password123!'
            })
            .expect(500)
            .expect(res => {
                expect(res.body.message).toBe('Errore interno del server');
            });
    });
});

describe( 'US10 - Reset password', () => {

    beforeAll(() => {
        process.env.JWT_SECRET = 'chiave_segreta_per_test'; 
    });

    beforeEach(() => {
        jest.spyOn(User, 'findOne').mockResolvedValue({
            _id: 'mocked_id',
            email: 'testuser@muccapp.it',
            save: jest.fn().mockResolvedValue({
                _id: 'mocked_id',
                password: 'hashedNewPassword',
                updatedAt: new Date()
            })
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    // /api/auth/forgot-password
    test( 'POST /api/auth/forgot-password verifica l\'email e genera un token di reset (200)', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'testuser@muccapp.it' })
            .expect(200)
            .expect(res => {
                expect(res.body.message).toBe('Email inserita correttamente, riceverai istruzioni per reimpostare la password');
                expect(res.body.token).toBeDefined();
            });
    });
    test( 'POST /api/auth/forgot-password - errore: Email mancante (400)', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({})
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Email è obbligatoria');
            });
    });
    test( 'POST /api/auth/forgot-password - errore: Utente non trovato (404)', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'testuser@muccapp.it' })
            .expect(404)
            .expect(res => {
                expect(res.body.message).toBe('Utente non trovato');
            });
    });
    test( 'POST /api/auth/forgot-password - errore: Errore interno del server (500)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValue(new Error('Database error'));
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'testuser@muccapp.it' })
            .expect(500)
            .expect(res => {
                expect(res.body.message).toBe('Errore interno del server');
            });
    });
    // /api/auth/reset-password
    test( 'POST /api/auth/reset-password reimposta la password (200)', async () => {
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPassword');
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({ email: 'testuser@muccapp.it', newPassword: 'newPassword123!' })
            .expect(200)
            .expect(res => {
                expect(res.body.message).toBe('Password aggiornata con successo');
            });
    });
    test( 'POST /api/auth/reset-password - errore: Email mancante (400)', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({ newPassword: 'newPassword123!' })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Email e newPassword sono obbligatori');
            });
    });
    test( 'POST /api/auth/reset-password - errore: newPassword mancante (400)', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({ email: 'testuser@muccapp.it' })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('Email e newPassword sono obbligatori');
            });
    });
    test( 'POST /api/auth/reset-password - errore: Utente non trovato (404)', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({ email: 'testuser@muccapp.it', newPassword: 'newPassword123!' })
            .expect(404)
            .expect(res => {
                expect(res.body.message).toBe('Utente non trovato');
            });
    });
    test( 'POST /api/auth/reset-password - errore: newPassword non soddisfa i criteri (400)', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({ email: 'testuser@muccapp.it', newPassword: 'pw' })
            .expect(400)
            .expect(res => {
                expect(res.body.message).toBe('La nuova password deve essere lunga almeno 8 caratteri.');
            });
    });
    test( 'POST /api/auth/reset-password - errore: Errore interno del server (500)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValue(new Error('Database error'));
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({ email: 'testuser@muccapp.it', newPassword: 'newPassword123!' })
            .expect(500)
            .expect(res => {
                expect(res.body.message).toBe('Errore interno del server');
            });
    });
});