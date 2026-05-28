import express from 'express';
import azienda from '../models/azienda.js';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import { registerAnimale, getAnimali, deleteAnimale, updateAnimale } from './animali.js';

const router = express.Router();
// Funzione di utilità per verificare che l'azienda esista e sia di proprietà dell'utente autenticato
export const assertAziendaOwnedByUser = async (aziendaId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
        return { ok: false, status: 400, message: 'aziendaId non è un ObjectId valido' };
    }

    const existingAzienda = await azienda.findById(aziendaId).select('_id ownerUserId');
    if (!existingAzienda) {
        return { ok: false, status: 404, message: 'Azienda non trovata' };
    }

    if (String(existingAzienda.ownerUserId) !== String(userId)) {
        return { ok: false, status: 403, message: 'Non hai i permessi per questa azienda' };
    }

    return { ok: true };
};
// Funzione di normalizzazione per le categorie prodotto accettando sia array che stringa separata da virgole
function normalizeCategories(input) {
    const rawValues = Array.isArray(input)
        ? input
        : (typeof input === 'string' ? input.split(',') : []);

    const normalized = rawValues
        .map((value) => typeof value === 'string' ? value.trim().toLowerCase() : '')
        .filter(Boolean);

    return [...new Set(normalized)];
}

// Rotta pubblica: restituisce tutte le aziende con nome, indirizzo e coordinate
router.get('/public', async (req, res) => {
    try {
        // Solo i campi pubblici
        const items = await azienda.find({})
            .select('_id companyName address geo location categories emailAzienda phoneNumber website')
            .sort({ createdAt: 1 });
        return res.status(200).json({ items });
    } catch (error) {
        console.error("Errore durante il recupero delle aziende pubbliche:", error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
});

// Implemento il controllo dell'autenticazione e del ruolo per tutte le altre rotte
router.use(checkAuth);
router.use(checkUserType('allevatore'));

// Handler per la registrazione di una nuova azienda
const registerAzienda = async (req, res) => {
    try {
        const { vatNumber, companyName, address, emailAzienda, phoneNumber, website, lat, lng, categories, productCategories } = req.body;

        if (req.user.userType !== 'allevatore') {
            return res.status(403).json({
                message: 'Solo gli allevatori possono registrare un\'azienda'
            });
        }
        // trasformazione del numero di partita IVA in maiuscolo e rimozione degli spazi
        const normalizedVatNumber = typeof vatNumber === 'string' ? vatNumber.trim().toUpperCase() : '';
        const normalizedCompanyName = typeof companyName === 'string' ? companyName.trim() : '';
        const normalizedEmailAzienda = typeof emailAzienda === 'string' ? emailAzienda.trim().toLowerCase() : '';
        const normalizedAddress = typeof address === 'string' ? address.trim() : '';
        const normalizedPhoneNumber = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';
        const normalizedWebsite = typeof website === 'string' ? website.trim() : '';
        const normalizedCategories = normalizeCategories(productCategories ?? categories);
        const latitude = Number(lat);
        const longitude = Number(lng);
        // Controllo che tutti i campi obbligatori siano presenti
        if (!normalizedVatNumber || !normalizedCompanyName || !normalizedEmailAzienda) {
            return res.status(400).json({
                message: 'Partita IVA, nome azienda e email azienda sono obbligatori'
            });
        }
        // Per la posizione salviamo solo coordinate numeriche valide
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({
                message: 'Coordinate non valide: latitudine e longitudine sono obbligatorie'
            });
        }
        // controllo che la email azienda sia valida
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmailAzienda)) {
            return res.status(400).json({
                message: 'Email azienda non valida.'
            });
        }
        // Controllo se esiste già un'azienda con la stessa partita IVA
        const existingAzienda = await azienda.findOne({ vatNumber: normalizedVatNumber });

        if (existingAzienda) {
            return res.status(409).json({
                message: 'Esiste già un\'azienda con questa partita IVA'
            });
        }

        // Creazione della nuova azienda
        const newAzienda = new azienda({
            ownerUserId: req.user.userId,
            vatNumber: normalizedVatNumber,
            companyName: normalizedCompanyName,
            emailAzienda: normalizedEmailAzienda,
            address: normalizedAddress || undefined,
            phoneNumber: normalizedPhoneNumber,
            website: normalizedWebsite || undefined,
            categories: normalizedCategories,
            // Copia semplice per usi applicativi
            geo: {
                lat: latitude,
                lng: longitude
            },
            // Formato GeoJSON per query geospaziali MongoDB (ordine: [lng, lat])
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            }
        });
        
        // Salvataggio della nuova azienda nel database
        await newAzienda.save();
        res.status(201).json({
            message: 'Azienda registrata con successo',
            company: {
                id: newAzienda._id,
                ownerUserId: newAzienda.ownerUserId,
                vatNumber: newAzienda.vatNumber,
                companyName: newAzienda.companyName,
                emailAzienda: newAzienda.emailAzienda,
                address: newAzienda.address,
                phoneNumber: newAzienda.phoneNumber,
                website: newAzienda.website,
                categories: newAzienda.categories,
                geo: newAzienda.geo,
                location: newAzienda.location
            },
        });
    }catch (error) {
        console.error('Errore durante la registrazione dell\'azienda:', error);
        if (error?.code === 11000) {
            return res.status(409).json({
                message: 'Esiste già un\'azienda con questa partita IVA'
            });
        }
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
};


// Routes per la gestione delle aziende. Tutte le rotte puntano a /api/aziende
router.post('/create', checkAuth, checkUserType(['allevatore']), registerAzienda);
router.post('/signup', checkAuth, checkUserType(['allevatore']), registerAzienda);
router.post('/', checkAuth, checkUserType(['allevatore']), registerAzienda);

// Endpoint annidati consigliati per la gestione animali per azienda.
router.post('/:aziendaId/animali', registerAnimale);
router.get('/:aziendaId/animali', getAnimali);
router.delete('/:aziendaId/animali/:id', deleteAnimale);
router.patch('/:aziendaId/animali/:id', updateAnimale);

// // Route per ottenere le aziende dell'utente autenticato (allevatore)
// // Rotta pubblica: restituisce tutte le aziende con nome, indirizzo e coordinate
// router.get('/public', async (req, res) => {
//     try {
//         // Solo i campi pubblici
//         const items = await azienda.find({})
//             .select('_id companyName address geo location categories emailAzienda phoneNumber website')
//             .sort({ createdAt: 1 });
//         return res.status(200).json({ items });
//     } catch (error) {
//         console.error("Errore durante il recupero delle aziende pubbliche:", error);
//         return res.status(500).json({ message: 'Errore interno del server' });
//     }
// });

router.get('/mine', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const items = await azienda.find({ ownerUserId: req.user.userId })
            .select('_id companyName vatNumber address emailAzienda')
            .sort({ createdAt: 1 })

        const itemsId = items.map(az => {
            const azObj = az.toObject();
            return {
                ...azObj,
                links: {
                    self: `/api/aziende/${azObj._id}`
                }
            };
        });

        return res.status(200).json({ itemsId });
    } catch (error) {
        console.error('Errore durante il recupero delle aziende dell\'utente:', error);
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
});

// Richiede l'id come parametro del percorso e restituisce i dettagli completi della azienda
router.get('/:id', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const {id} = req.params;
        const ownership = await assertAziendaOwnedByUser(id, req.user.userId);
        if(!ownership.ok) {
            return res.status(ownership.status).json({ message: ownership.message });
        }

        const item = await azienda.findById(req.params.id);
        const itemInfo = {
            ...item.toObject(),
            links: {
                self: `/api/aziende/${item._id}`,
                collection: '/api/aziende/mine'
            }
        };

        return res.status(200).json({ itemInfo });
    } catch (error) {
        console.error('Errore durante il recupero delle informazioni dell\'azienda selezionata:', error);
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
});

// Aggiunge nuove categorie prodotto all'azienda senza perdere quelle esistenti
router.patch('/:id/categories', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const { id } = req.params;
        const inputCategories = req.body?.productCategories ?? req.body?.categories;
        const categoriesToAdd = normalizeCategories(inputCategories);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID dell\'azienda non valido' });
        }

        if (!categoriesToAdd.length) {
            return res.status(400).json({
                message: 'Passa almeno una categoria valida in categories o productCategories'
            });
        }

        const existingAzienda = await azienda.findById(id).select('_id ownerUserId');
        if (!existingAzienda) {
            return res.status(404).json({ message: 'Azienda non trovata' });
        }

        if (String(existingAzienda.ownerUserId) !== String(req.user.userId)) {
            return res.status(403).json({
                message: 'Non sei il proprietario di questa azienda'
            });
        }

        const updatedAzienda = await azienda.findByIdAndUpdate(
            id,
            { $addToSet: { categories: { $each: categoriesToAdd } } },
            { new: true, runValidators: true }
        ).select('_id companyName categories');

        return res.status(200).json({
            message: 'Categorie aggiornate con successo',
            company: updatedAzienda
        });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento delle categorie azienda:', error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
});

// Route per eliminare un'azienda 
router.delete('/:id', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: 'ID dell\'azienda è obbligatorio'
            });
        }
        // Verifico che l'utente sia il proprietario dell'azienda
        if (req.user._id !== req.ownerUserId) {
            return res.status(403).json({
                message: 'Non sei il proprietario di questa azienda'
            });
        }
        // TODO (relations): Prima di eliminare l'azienda, verificare che non ci siano mandrie o documenti associati ad essa, o implementare una cancellazione a cascata
        const deletedAzienda = await azienda.findByIdAndDelete(id);

        if (!deletedAzienda) {
            return res.status(404).json({
                message: 'Azienda non trovata'
            });
        }
        res.status(200).json({
            message: 'Azienda eliminata con successo'
        });
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'azienda:', error);
        
        //cast error per id non valido
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(400).json({
                message: 'ID dell\'azienda non valido'
            });
        }
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
});

export default router;