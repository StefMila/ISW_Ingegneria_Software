import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Azienda from '../models/azienda.js';
import Animale from '../models/animale.js';
import Mungitura from '../models/munigitura.js';

const router = express.Router();
router.use(checkAuth);
router.use(checkUserType(['allevatore']));
// helper per validare ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// router per gestire le mungiture degli animali, con operazioni CRUD e filtri di ricerca
export const createMungitura = async (req, res) => {
    try {
        const {
            aziendaId,
            animaleId,
            startedAt,
            unit,
            notes,
            quantity,
            status
        } = req.body;

        if (!aziendaId || !animaleId) {
            return res.status(400).json({ message: 'aziendaId e animaleId sono obbligatori' });
        }

        const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
        if (!ownershipCheck.ok) {
            return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
        }

        if (!isValidObjectId(animaleId)) {
            return res.status(400).json({ message: 'ID animale non valido' });
        }

        const existingAnimale = await Animale.findOne({ _id: animaleId, aziendaId });
        if (!existingAnimale) {
            return res.status(404).json({ message: 'Animale non trovato nell\'azienda' });
        }
// validazione dei campi opzionali
        const newMungitura = new Mungitura({
            aziendaId,
            animaleId,
            startedAt: startedAt || undefined,
            quantity: quantity !== undefined ? quantity : undefined,
            unit: unit || undefined,
            status: status || undefined,
            notes: typeof notes === 'string' ? notes.trim() : undefined,
        });

        await newMungitura.save();

        return res.status(201).json({
            message: 'Mungitura avviata con successo',
            mungitura: newMungitura
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'dati mungitura non validi' });
        }
        return res.status(500).json({ message: 'Errore del server' });
    }
};
// PATCH /api/mungiture/:id - aggiorna una mungitura esistente, con validazione dei campi e controllo di proprieta
export const updateMungitura = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, unit, endedAt, notes, status } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'ID mungitura non valido' });
        }

        const existingMungitura = await Mungitura.findById(id);
        if (!existingMungitura) {
            return res.status(404).json({ message: 'Mungitura non trovata' });
        }

        const ownershipCheck = await assertAziendaOwnedByUser(existingMungitura.aziendaId, req.user.userId);
        if (!ownershipCheck.ok) {
            return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
        }

        if (endedAt !== undefined) existingMungitura.endedAt = endedAt;
        if (quantity !== undefined) existingMungitura.quantity = quantity;
        if (unit !== undefined) existingMungitura.unit = unit;
        if (notes !== undefined) existingMungitura.notes = typeof notes === 'string' ? notes.trim() : undefined;
        if (status !== undefined) existingMungitura.status = status;

        await existingMungitura.save();

        return res.status(200).json({
            message: 'Mungitura aggiornata con successo',
            mungitura: existingMungitura
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'dati mungitura non validi' });
        }
        return res.status(500).json({ message: 'Errore del server' });
    }
};
// GET /api/mungiture - recupera le mungiture dell'azienda con filtri opzionali per animale e stato
export const getMungitura = async (req, res) => {
    try {
        const { aziendaId, animaleId, status } = req.query;

        if (!aziendaId) {
            return res.status(400).json({ message: 'aziendaId è obbligatorio' });
        }

        const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
        if (!ownershipCheck.ok) {
            return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
        }

        const filter = { aziendaId };

        if (animaleId) {
            if (!isValidObjectId(animaleId)) {
                return res.status(400).json({ message: 'ID animale non valido' });
            }
            filter.animaleId = animaleId;
        }
        if (status) {
            filter.status = status;
        }

        const mungiture = await Mungitura.find(filter).sort({ startedAt: -1 });
        return res.status(200).json(mungiture);
    } catch (error) {
        console.error('Errore durante il recupero delle mungiture:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
};
// rotte per la mungitura
router.post('/', createMungitura);
router.patch('/:id', updateMungitura);
router.get('/', getMungitura);

export default router;