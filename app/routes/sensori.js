import express from 'express';
import mongoose from 'mongoose';
import Sensore from '../models/sensore.js';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';

// Importa letture aggiornate da MQTT
import { ultimeLettureIot } from '../services/mqttService.js';

const router = express.Router();

// Ottiene la lista di tutti i sensori per una specifica azienda
router.get('/sensori', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const { aziendaId } = req.query;

        if (!aziendaId) {
            return res.status(400).json({ message: 'Il parametro query aziendaId è obbligatorio' });
        }

        // Controllo preventivo sul formato dell'ID prima di interrogare il DB
        if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
            return res.status(400).json({ message: 'aziendaId non è un ObjectId valido' });
        }

        const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ message: ownership.message });
        }

        const items = await Sensore.find({ aziendaId })
            .sort({ createdAt: 1 });

        return res.status(200).json({ items });
    } catch (error) {
        console.error("Errore durante il recupero dei sensori:", error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
});

// Registra (collega) un nuovo sensore IoT
router.post('/sensori', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const { nome, tipoDispositivo, capacita, aziendaId, animaleId } = req.body;

        if (!nome || !tipoDispositivo || !capacita || capacita.length === 0 || !aziendaId) {
            return res.status(400).json({
                message: 'Nome, tipo dispositivo, capacità (almeno una) e aziendaId sono obbligatori'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
            return res.status(400).json({ message: 'aziendaId non è un ObjectId valido' });
        }

        // Se passano un animaleId, controlliamo che sia valido anche quello
        if (animaleId && !mongoose.Types.ObjectId.isValid(animaleId)) {
            return res.status(400).json({ message: 'animaleId non è un ObjectId valido' });
        }

        const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ message: ownership.message });
        }

        const newSensore = new Sensore({
            nome: nome.trim(),
            tipoDispositivo,
            capacita, // Salviamo l'array
            aziendaId,
            animaleId: tipoDispositivo === 'indossabile' ? animaleId : null
        });
        
        await newSensore.save();

        return res.status(201).json({
            message: 'Sensore collegato con successo',
            item: newSensore
        });
    } catch (error) {
        console.error("Errore durante la registrazione del sensore:", error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
});

// Genera e restituisce le letture dei sensori in tempo reale
// router.get('/sensori/dati', checkAuth, checkUserType(['allevatore']), async (req, res) => {
//     try {
//         const { aziendaId } = req.query;

//         if (!aziendaId) {
//             return res.status(400).json({ message: 'Il parametro query aziendaId è obbligatorio' });
//         }

//         if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
//             return res.status(400).json({ message: 'aziendaId non è un ObjectId valido' });
//         }

//         const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
//         if (!ownership.ok) {
//             return res.status(ownership.status).json({ message: ownership.message });
//         }

//         const sensoriAttivi = await Sensore.find({ aziendaId, stato: 'attivo' });

//         const generaValoreSimulato = (tipoDato) => {
//             switch (tipoDato) {
//                 case 'temperatura':
//                     return parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
//                 case 'umidità':
//                     return parseFloat((Math.random() * (80 - 60) + 60).toFixed(1));
//                 case 'peso_corporeo':
//                     return Math.floor(Math.random() * (650 - 550) + 550);
//                 case 'livello_passi':
//                     return Math.floor(Math.random() * (12000 - 4000) + 4000);
//                 case 'livello_ammoniaca':
//                     return parseFloat((Math.random() * (25 - 10) + 10).toFixed(1));
//                 default:
//                     return 0;
//             }
//         };

//         const items = sensoriAttivi.map(sensore => ({
//             sensoreId: sensore._id,
//             nome: sensore.nome,
//             tipoDispositivo: sensore.tipoDispositivo,
//             tipoDatoRaccolto: sensore.tipoDatoRaccolto,
//             animaleId: sensore.animaleId,
//             valore: generaValoreSimulato(sensore.tipoDatoRaccolto),
//             unitaMisura: sensore.unitaMisura
//         }));

//         return res.status(200).json({ 
//             timestamp: new Date(),
//             items 
//         });
//     } catch (error) {
//         console.error("Errore durante la generazione dei dati IoT:", error);
//         return res.status(500).json({ message: 'Errore interno del server' });
//     }
// });

router.get('/sensori/dati', checkAuth, checkUserType(['allevatore']), async (req, res) => {
    try {
        const { aziendaId } = req.query;

        if (!aziendaId) {
            return res.status(400).json({ message: 'Il parametro query aziendaId è obbligatorio' });
        }

        if (!mongoose.Types.ObjectId.isValid(aziendaId)) {
            return res.status(400).json({ message: 'aziendaId non è un ObjectId valido' });
        }

        const ownership = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({ message: ownership.message });
        }

        // Troviamo i sensori dell'azienda
        const sensoriAttivi = await Sensore.find({ aziendaId, stato: 'attivo' });

        // Costruiamo gli items andando a pescare i dati dalla cache MQTT
        const items = sensoriAttivi.map(sensore => {
            // Cerchiamo se MQTT ha ricevuto dati per questo specifico sensore
            const datiMqtt = ultimeLettureIot.get(String(sensore._id));

            return {
                sensoreId: sensore._id,
                nome: sensore.nome,
                tipoDispositivo: sensore.tipoDispositivo,
                capacita: sensore.capacita,
                animaleId: sensore.animaleId,
                // MQTT restituisce un oggetto JSON intero, lo passiamo al frontend
                valori: datiMqtt ? datiMqtt.dati : null, 
                ultimoAggiornamento: datiMqtt ? datiMqtt.timestamp : null
            };
        });

        return res.status(200).json({ 
            timestamp: new Date(),
            items 
        });
    } catch (error) {
        console.error("Errore durante il recupero dei dati IoT da MQTT:", error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
});

export default router;