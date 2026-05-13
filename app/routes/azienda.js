import express from 'express';
import Azienda from '../models/azienda.js';
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

// Routes supportate
router.post('/create', registerAzienda);
router.post('/signup', registerAzienda);
router.post('/', registerAzienda);

export default router;