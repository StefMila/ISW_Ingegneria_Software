import express from 'express';
import { checkAuth, checkUserType } from './auth.js'; // Il tuo middleware di autenticazione
import LottoProdotto from '../models/lottoProdotto.js';
import Azienda from '../models/azienda.js';
import ProdottoSalvato from '../models/prodottoSalvato.js';

// Importiamo gli stessi helper e modelli che usi in tracciabilita.js se servono
import Animale from '../models/animale.js';
import IotDailyStat from '../models/iotDailyStat.js';

const router = express.Router();

// Applichiamo checkAuth: questa tratta è ESCLUSIVAMENTE per i consumatori loggati
router.use(checkAuth);
router.use(checkUserType(['consumatore']));


// Funzione di utility per arrotondare (identica alla tua in tracciabilita.js)
const roundTo = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

// POST /api/prodotti-salvati/scansiona
router.post('/scansiona', async (req, res) => {
    console.log("UTENTE CONNESSO DI RUOLO:", req.user?.userType);
    try {
        const lotNumber = typeof req.body.lotNumber === 'string' ? req.body.lotNumber.trim() : '';
        const utenteId = req.user.userId; // Preso dal token JWT via checkAuth

        if (!lotNumber) {
            return res.status(400).json({ message: 'lotNumber obbligatorio' });
        }

        // Verifichiamo se il lotto esiste
        const lottoInDb = await LottoProdotto.findOne({ lotNumber });
        if (!lottoInDb) {
            return res.status(404).json({ message: 'Prodotto o lotto non trovato nel sistema' });
        }

        // Registriamo il salvataggio univoco (utenteId + lottoProdottoId)
        // Se l'utente lo ha già scansionato in passato, il blocco catch intercetterà l'errore 11000
        const nuovoSalvataggio = new ProdottoSalvato({
            utenteId,
            lottoProdottoId: lottoInDb._id
        });
        await nuovoSalvataggio.save();

        // Calcolo dei Badge / Gamification progressiva
        const totaleAcquisti = await ProdottoSalvato.countDocuments({ utenteId });
        
        let badgeData = null;
        let isNewBadge = false;

        // Il flag isNewBadge diventa true solo nei momenti esatti del traguardo
        if (totaleAcquisti === 1) {
            badgeData = {
                titolo: "Esploratore di Filiera",
                icona: "🌱",
                descrizione: "Hai scansionato il tuo primo prodotto tracciato!",
                stile: "badge-bronzo"
            };
            isNewBadge = true;
        } else if (totaleAcquisti === 5) {
            badgeData = {
                titolo: "Consumatore Consapevole",
                icona: "🚜",
                descrizione: "5 prodotti salvati. Sostieni attivamente l'agricoltura locale!",
                stile: "badge-argento"
            };
            isNewBadge = true;
        } else if (totaleAcquisti === 10) {
            badgeData = {
                titolo: "Custode della Terra",
                icona: "👑",
                descrizione: "10 scansioni! Sei un pilastro fondamentale della filiera corta.",
                stile: "badge-oro"
            };
            isNewBadge = true;
        }

        // 4. Costruiamo i dati di tracciabilità da rispedire subito al FE
        const azienda = await Azienda.findById(lottoInDb.aziendaId).select('_id companyName');

        return res.status(201).json({
            message: 'Prodotto salvato nel tuo profilo di filiera!',
            // Inviamo esplicitamente se il badge è una novità per far scattare la modale sul frontend
            badgeSbloccato: isNewBadge ? badgeData : null,
            scansione: {
                scansionatoAt: nuovoSalvataggio.scansionatoAt,
                totaleScansioniUtente: totaleAcquisti,
                badgeSbloccato: isNewBadge ? badgeData : null 
            },
            // Restituiamo i dati base del prodotto per la UI del consumatore
            prodotto: {
                lotNumber: lottoInDb.lotNumber,
                nomeProdotto: lottoInDb.nomeProdotto,
                quantity: lottoInDb.quantity,
                unit: lottoInDb.unit,
                companyName: azienda?.companyName || 'Azienda produttrice'
            }
        });

    } catch (error) {
        // Gestione dell'indice unique composto (l'utente ha già scansionato questo lotto)
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'Hai già scansionato e salvato questo specifico lotto di prodotto in passato!' 
            });
        }
        console.error('Errore scansione consumatore:', error);
        return res.status(500).json({ message: 'Errore del server durante il salvataggio' });
    }
});

// GET /api/prodotti-salvati - Per mostrare nel profilo dell'utente la sua "collezione" di prodotti acquistati
router.get('/', async (req, res) => {
    try {
        const utenteId = req.user.userId;
        const storico = await ProdottoSalvato.find({ utenteId })
            .populate({
                path: 'lottoProdottoId',
                select: 'lotNumber nomeProdotto quantity unit createdAt'
            })
            .sort({ scansionatoAt: -1 });
        

        const totaleAcquisti = storico.length;
        const badgesSbloccati = [];

        if (totaleAcquisti >= 1) {
            badgesSbloccati.push({
                titolo: "Esploratore di Filiera",
                icona: "🌱",
                stile: "badge-bronzo"
            });
        }
        if (totaleAcquisti >= 5) {
            badgesSbloccati.push({
                titolo: "Consumatore Consapevole",
                icona: "🚜",
                stile: "badge-argento"
            });
        }
        if (totaleAcquisti >= 10) {
            badgesSbloccati.push({
                titolo: "Custode della Terra",
                icona: "👑",
                stile: "badge-oro"
            });
        }

        return res.status(200).json({ 
            items: storico, 
            badges: badgesSbloccati,
            totale: totaleAcquisti 
        });
    } catch (error) {
        console.error('Errore caricamento storico:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

export default router;