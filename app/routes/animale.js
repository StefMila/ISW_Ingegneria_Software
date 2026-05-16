import express from 'express';
import mongoose from 'mongoose';
import animale from '../models/animale.js';
import azienda from '../models/azienda.js';
import { checkAuth, checkUserType } from './auth.js';

const router = express.Router();

// Implemento il controllo dell'autenticazione e del ruolo per tutte le rotte di questo router
router.use(checkAuth);
router.use(checkUserType('allevatore'));

//handler per la registrazione di un nuovo animale --> risponde a POST su /api/animali/register
const registerAnimale = async (req, res) => {
    try {
        const { matricola, name, species, dataNascita, sesso, razza, figliaDi, aziendaId, note } = req.body;

        if (req.user.userType !== 'allevatore') {
            return res.status(403).json({
                message: 'Solo gli allevatori possono registrare un\'azienda'
            });
        }
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

// visualizza tutti gli animali di un'azienda --> risponde a GET 
// si poteva fare anche inline come handler della rotta, ma per mantenere il codice più pulito e leggibile ho deciso di estrarlo in una funzione a parte
const getAnimali = async (req, res) => {
    try {
        const {
            matricola,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            name,
            species,
            sesso,
            razza,
            figliaDi,
            note,
            dataNascitaDa,
            dataNascitaA,
            page = 1,
            limit = 10
        } = req.query;

        // Inserisco il numero di pagina e il limite di risultati per la paginazione, con valori di default se non specificati
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);
        const skip = (parsedPage - 1) * parsedLimit;

        // Whitelist dei campi ordinabili per evitare injection
        const allowedSortFields = ['matricola', 'name', 'species', 'dataNascita', 'sesso', 'razza', 'createdAt'];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const safeSortOrder = sortOrder === 'asc' ? 1 : -1;

        // Costruisco il filtro combinando tutti i campi forniti + aziendaId obbligatorio
        const filter = { aziendaId: req.params.aziendaId };

        if (matricola) filter.matricola = { $regex: matricola.trim(), $options: 'i' };
        if (name) filter.name = { $regex: name.trim(), $options: 'i' };
        if (species) filter.species = species.trim().toLowerCase();
        if (sesso) filter.sesso = sesso.trim().toLowerCase();
        if (razza) filter.razza = { $regex: razza.trim(), $options: 'i' };
        if (figliaDi) filter.figliaDi = { $regex: figliaDi.trim(), $options: 'i' };
        if (note) filter.note = { $regex: note.trim(), $options: 'i' };

        if (dataNascitaDa || dataNascitaA) {
            filter.dataNascita = {};
            if (dataNascitaDa) filter.dataNascita.$gte = new Date(dataNascitaDa);
            if (dataNascitaA) filter.dataNascita.$lte = new Date(dataNascitaA);
        }

        // Recupero il totale degli animali che corrispondono al filtro per poter calcolare il numero totale di pagine
        const totalItems = await animale.countDocuments(filter);
        const animali = await animale.find(filter)
            .sort({ [safeSortBy]: safeSortOrder })
            .skip(skip)
            .limit(parsedLimit);

        return res.status(200).json({
            items: animali,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                totalItems,
                totalPages: Math.ceil(totalItems / parsedLimit)
            }
        });
    } catch (error) {
        console.error('Errore durante il recupero degli animali:', error);
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
};





router.post('/register', registerAnimale);
router.get('/azienda/:aziendaId', getAnimali);
export default router;
        
