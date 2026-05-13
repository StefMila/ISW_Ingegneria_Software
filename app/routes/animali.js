import express from 'express';
import animale from '../models/animale.js';
import azienda from '../models/azienda.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();
// importazione del middleware di autenticazione per proteggere le rotte che richiedono l'autenticazione

//handler per la registrazione di un nuovo animale --> risponde a POST su /api/animali/register
const registerAnimale = async (req, res) => {
    try {
        const { matricola, name, species, dataNascita, sesso, razza, figliaDi, aziendaId, note } = req.body;
        const normalizedMatricola = typeof matricola === 'string' ? matricola.trim().toUpperCase() : '';
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        const normalizedSpecies = typeof species === 'string' ? species.trim().toUpperCase() : '';
        const normalizedSesso = typeof sesso === 'string' ? sesso.trim().toUpperCase() : '';
        const normalizedRazza = typeof razza === 'string' ? razza.trim().toUpperCase() : '';
        const normalizedFigliaDi = typeof figliaDi === 'string' ? figliaDi.trim().toUpperCase() : '';
        const normalizedNote = typeof note === 'string' ? note.trim().toUpperCase() : '';
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
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
};

router.post('/register', registerAnimale);
export default router;
        
