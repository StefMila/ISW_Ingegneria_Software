import express from 'express';
import Azienda from '../models/azienda.js';
import mongoose from 'mongoose';
//TODO(security) importazione del middleware di autenticazione per proteggere le rotte che richiedono l'autenticazione
//import authenticate from '../middleware/authenticate.js';

const router = express.Router();

// Handler per la registrazione di una nuova azienda
const registerAzienda = async (req, res) => {
    try {
        const { vatNumber, companyName, address, emailAzienda, phoneNumber, website } = req.body;

        // TODO(security): Verificare che l'utente sia un allevatore quando il middleware di autenticazione sarà implementato
        // if (req.user.userType !== 'allevatore') {
        //     return res.status(403).json({
        //         message: 'Solo gli allevatori possono registrare un\'azienda'
        //     });
        // }
        // trasformazione del numero di partita IVA in maiuscolo e rimozione degli spazi
        const normalizedVatNumber = typeof vatNumber === 'string' ? vatNumber.trim().toUpperCase() : '';
        const normalizedCompanyName = typeof companyName === 'string' ? companyName.trim() : '';
        const normalizedEmailAzienda = typeof emailAzienda === 'string' ? emailAzienda.trim().toLowerCase() : '';
        const normalizedAddress = typeof address === 'string' ? address.trim() : '';
        const normalizedPhoneNumber = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';
        const normalizedWebsite = typeof website === 'string' ? website.trim() : '';
        // Controllo che tutti i campi obbligatori siano presenti
        if (!normalizedVatNumber || !normalizedCompanyName || !normalizedEmailAzienda || !normalizedAddress) {
            return res.status(400).json({
                message: 'Partita IVA, nome azienda, email azienda e indirizzo sono obbligatori'
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
        const existingAzienda = await Azienda.findOne({ vatNumber: normalizedVatNumber });

        if (existingAzienda) {
            return res.status(409).json({
                message: 'Esiste già un’azienda con questa partita IVA'
            });
        }

        // Creazione della nuova azienda
        // TODO(security): req.user._id sarà valorizzato quando il middleware di autenticazione sarà implementato
        const newAzienda = new Azienda({
            ownerUserId: req.user?._id || null, // In attesa del middleware di autenticazione, impostiamo ownerUserId a null
            vatNumber: normalizedVatNumber,
            companyName: normalizedCompanyName,
            emailAzienda: normalizedEmailAzienda,
            address: normalizedAddress,
            phoneNumber: normalizedPhoneNumber,
            website: normalizedWebsite || undefined
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
                website: newAzienda.website
            },
        });
    }catch (error) {
        console.error('Errore durante la registrazione dell\'azienda:', error);
        if (error?.code === 11000) {
            return res.status(409).json({
                message: 'Esiste già un’azienda con questa partita IVA'
            });
        }
        return res.status(500).json({
            message: 'Errore interno del server'
        });
    }
};


// Routes per la gestione delle aziende. Tutte le rotte puntano a /api/azienda --> alias
router.post('/create', registerAzienda);
router.post('/signup', registerAzienda);
router.post('/', registerAzienda);
// Route per eliminare un'azienda 
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message: 'ID dell\'azienda è obbligatorio'
            });
        }
// TODO(security): Verificare che l'utente sia un allevatore e proprietario dell'azienda quando il middleware di autenticazione sarà implementato
// TODO (relations): Prima di eliminare l'azienda, verificare che non ci siano mandrie o documenti associati ad essa, o implementare una cancellazione a cascata
        const deletedAzienda = await Azienda.findByIdAndDelete(id);

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
