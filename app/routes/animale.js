import express from 'express';
import mongoose from 'mongoose';
import animale from '../models/animale.js';
import azienda from '../models/azienda.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware per proteggere le route private di qualunque utente autenticato --> controlla la validità del token JWT
const checkAuth = (req, res, next) => {
    let token = req.headers['authorization']; // Recupero il token dall'header Authorization

    if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Token mancante o formato non valido: Accesso negato'
        });
    }

    token = token.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token scaduto: Accesso negato'
            });
        }

        return res.status(403).json({
            message: 'Token non valido: Accesso negato'
        });
    }
};

// Middleware per identificare il ruolo dell'utente e stabilire se ha i permessi per eseguire l'azione richiesta
const checkUserType = (allowedTypes) => (req, res, next) => {
    if (!allowedTypes.includes(req.user.userType)) {
        return res.status(403).json({
            message: 'Permessi insufficienti: Accesso negato'
        });
    }
    next();
};

//handler per la registrazione di un nuovo animale --> risponde a POST su /api/animali/register
const registerAnimale = async (req, res) => {
    try {
        const { matricola, name, species, dataNascita, sesso, razza, figliaDi, aziendaId, note } = req.body;
        const normalizedMatricola = typeof matricola === 'string' ? matricola.trim().toUpperCase() : '';
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        const normalizedSpecies = typeof species === 'string' ? species.trim().toLowerCase() : '';
        const normalizedSesso = typeof sesso === 'string' ? sesso.trim().toLowerCase() : '';
        const normalizedRazza = typeof razza === 'string' ? razza.trim() : '';
        const normalizedFigliaDi = typeof figliaDi === 'string' ? figliaDi.trim() : '';
        const normalizedNote = typeof note === 'string' ? note.trim() : '';
        // Controllo che tutti i campi obbligatori siano presenti
        if (!normalizedMatricola || !normalizedName || !normalizedSpecies || !dataNascita || !normalizedSesso || !aziendaId) {
            return res.status(400).json({
                message: 'Matricola, name, species, dataNascita, sesso e aziendaId sono obbligatori'
            });
        }
        // Controllo unicità matricola
        const existingAnimale = await animale.findOne({ matricola: normalizedMatricola });
        if (existingAnimale) {
            return res.status(409).json({
                message: 'Esiste già un animale con questa matricola'
            });
        }
        // Controllo che aziendaId sia un ObjectId valido
        if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
            return res.status(400).json({
                message: 'aziendaId non è un ObjectId valido'
            });
        }
        //controllo che l'azienda esista
        const existingAzienda = await azienda.findById(aziendaId);
        if (!existingAzienda) {
            return res.status(404).json({
                message: 'Azienda non trovata'
            });
        }
        // Creazione del nuovo animale
        const newAnimale = new animale({
            matricola: normalizedMatricola,
            name: normalizedName,
            species: normalizedSpecies,
            dataNascita,
            sesso: normalizedSesso,
            razza: normalizedRazza || undefined,
            figliaDi: normalizedFigliaDi || undefined,
            aziendaId,
            note: normalizedNote || undefined
        });
        // Salvataggio del nuovo animale nel database
        await newAnimale.save();
        return res.status(201).json({
            message: 'Animale registrato con successo',
            animale: newAnimale
        });
    } catch (error) {
        console.error('Errore durante la registrazione dell\'animale:', error);
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Dati animale non validi'
            });
        }
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
};

router.post('/register', checkAuth, checkUserType(['allevatore']), registerAnimale);
export default router;
        
