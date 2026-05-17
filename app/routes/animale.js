import express from 'express';
import mongoose from 'mongoose';
import animale from '../models/animale.js';
import azienda from '../models/azienda.js';
import { checkAuth, checkUserType } from './auth.js';


const router = express.Router();

// Implemento il controllo dell'autenticazione e del ruolo per tutte le rotte di questo routerrouter.use(checkAuth);
router.use(checkUserType(['allevatore']));

// Funzione di utilità per risolvere l'aziendaId da parametri o body, con validazione di base
const resolveAziendaIdFromRequest = (req) => {
    const pathAziendaId = typeof req.params?.aziendaId === 'string' ? req.params.aziendaId.trim() : '';
    const bodyAziendaId = typeof req.body?.aziendaId === 'string' ? req.body.aziendaId.trim() : '';
    return pathAziendaId || bodyAziendaId;
};
// Funzione di utilità per verificare che l'azienda esista e sia di proprietà dell'utente autenticato
const assertAziendaOwnedByUser = async (aziendaId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
        return { ok: false, status: 400, message: 'aziendaId non è un ObjectId valido' };
    }

    const existingAzienda = await Azienda.findById(aziendaId).select('_id ownerUserId');
    if (!existingAzienda) {
        return { ok: false, status: 404, message: 'Azienda non trovata' };
    }

    if (String(existingAzienda.ownerUserId) !== String(userId)) {
        return { ok: false, status: 403, message: 'Non hai i permessi per questa azienda' };
    }

    return { ok: true };
};

//handler per la registrazione di un nuovo animale --> risponde a POST su /api/animali/register
export const registerAnimale = async (req, res) => {
    try {
        const { matricola, name, species, dataNascita, sesso, razza, figliaDi, aziendaId, note } = req.body;

        if (req.user.userType !== 'allevatore') {
            return res.status(403).json({
                message: 'Solo gli allevatori possono registrare un\'azienda'
            });
        }
        // Normalizzazione e validazione dei campi di input per prevenire errori e garantire coerenza
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
// controllo ownership dell'azienda prima di procedere con la creazione dell'animale
        const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
        if (!ownershipCheck.ok) {
            return res.status(ownershipCheck.status).json({
                message: ownershipCheck.message
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
export const getAnimali = async (req, res) => {
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

export const deleteAnimale = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: 'ID della mucca è obbligatorio'
            });
        }
        
        // Verifico che la mucca faccia parte dell'azienda posseduta dall'utente.
        const az = await azienda.findOne({ ownerUserId: req.user.userId, _id: req.params.aziendaId });

        if (!az) {
            return res.status(403).json({
                message: 'Questo animale non appartiene alla tua azienda'
            });
        }
        //TODO: controllare se l'animale è associato a lotti prodotto/cartelle cliniche/dati IoT: in caso affermativo, applicare soft delete.
        const deletedAnimale = await animale.findByIdAndDelete(id);
        
        if (!deletedAnimale) {
            return res.status(404).json({
                message: 'Animale non trovato'
            });
        }

        res.status(200).json({
            message: 'Animale eliminato con successo'
        });
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'animale:', error);
        
        //cast error per id non valido
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(400).json({
                message: 'ID dell\'animale non valido'
            });
        }
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
}; 


// Endpoint legacy: mantenuti per compatibilita' con frontend/consumer esistenti.
router.post('/register', registerAnimale);
router.get('/azienda/:aziendaId', getAnimali);

// Endpoint consigliati in stile nested resource.
router.post('/azienda/:aziendaId/animali', registerAnimale);
router.get('/azienda/:aziendaId/animali', getAnimali);
router.delete('/azienda/:aziendaId/animali/:id', deleteAnimale);
export default router;






        
