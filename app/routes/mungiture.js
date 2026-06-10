import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Azienda from '../models/azienda.js';
import Animale from '../models/animale.js';
import Mungitura from '../models/munigitura.js';
import Lavorazione from '../models/lavorazione.js';
import Sensore from '../models/sensore.js';
import { ultimeLettureIot } from '../services/mqttService.js';

const router = express.Router();
router.use(checkAuth);
router.use(checkUserType(['allevatore']));
// helper per validare ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseLiters = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? Number(value.toFixed(2)) : null;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().replace(',', '.');
        if (!normalized) {
            return null;
        }

        if (!/^\d+(\.\d+)?$/.test(normalized)) {
            return null;
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : null;
    }

    return null;
};

const readQuantityFromMqttPayload = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const candidates = [payload.litri_latte, payload.litri, payload.peso];
    for (const candidate of candidates) {
        const parsed = parseLiters(candidate);
        if (parsed !== null) {
            return parsed;
        }
    }

    return null;
};
// router per gestire le mungiture degli animali, con operazioni CRUD e filtri di ricerca
export const createMungitura = async (req, res) => {
    try {
        const {
            aziendaId,
            animaleId,
            quantity,
            unit,
            endedAt,
            status,
            notes
        } = req.body;

        if (!aziendaId || !animaleId) {
            return res.status(400).json({ message: 'aziendaId e animaleId sono obbligatori' });
        }

        if (quantity !== undefined || unit !== undefined || endedAt !== undefined || status !== undefined) {
            return res.status(400).json({
                message: 'In avvio mungitura sono consentiti solo aziendaId, animaleId e note'
            });
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
            startedAt: new Date(),
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
        const {
            aziendaId,
            animaleId,
            startedAt,
            semiLavoratoId,
            quantity,
            unit,
            endedAt,
            notes,
            status
        } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'ID mungitura non valido' });
        }

        if (
            aziendaId !== undefined ||
            animaleId !== undefined ||
            startedAt !== undefined ||
            semiLavoratoId !== undefined
        ) {
            return res.status(400).json({
                message: 'Sono aggiornabili solo endedAt, status, quantity, unit e notes'
            });
        }

        if (endedAt === undefined && notes === undefined && status === undefined && quantity === undefined && unit === undefined) {
            return res.status(400).json({ message: 'Nessun campo aggiornabile fornito' });
        }

        const existingMungitura = await Mungitura.findById(id);
        if (!existingMungitura) {
            return res.status(404).json({ message: 'Mungitura non trovata' });
        }

        const ownershipCheck = await assertAziendaOwnedByUser(existingMungitura.aziendaId, req.user.userId);
        if (!ownershipCheck.ok) {
            return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
        }

        const parsedQuantity = parseLiters(quantity);
        if (quantity !== undefined && parsedQuantity === null) {
            return res.status(400).json({ message: 'quantity deve essere un numero >= 0' });
        }

        if (unit !== undefined && unit !== 'litri') {
            return res.status(400).json({ message: 'Per la mungitura l\'unità consentita è solo litri' });
        }

        const targetStatus = status !== undefined ? status : existingMungitura.status;
        if (parsedQuantity !== null && targetStatus !== 'completata') {
            return res.status(400).json({ message: 'quantity può essere impostata solo quando la mungitura è completata' });
        }

        if (status === 'completata' && parsedQuantity === null && existingMungitura.quantity === undefined) {
            return res.status(400).json({ message: 'quantity (litri) è obbligatoria per completare la mungitura' });
        }

        if (endedAt !== undefined) existingMungitura.endedAt = endedAt;
        if (parsedQuantity !== null) existingMungitura.quantity = parsedQuantity;
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

// GET /api/mungiture/:id/iot-litri - legge litri da sensore MQTT associato alla mungitura
export const getIotLitersReading = async (req, res) => {
    try {
        const { id } = req.params;

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

        const sensoriMungitura = await Sensore.find({
            aziendaId: existingMungitura.aziendaId,
            stato: 'attivo',
            tipoDispositivo: 'mungitura'
        }).sort({ createdAt: -1 });

        if (!sensoriMungitura.length) {
            return res.status(409).json({
                message: 'Nessun sensore di mungitura attivo associato all\'azienda'
            });
        }

        const validReadings = sensoriMungitura
            .map((sensor) => {
                const mqttData = ultimeLettureIot.get(String(sensor._id));
                const quantity = readQuantityFromMqttPayload(mqttData?.dati);
                if (quantity === null) {
                    return null;
                }

                const ts = mqttData?.timestamp ? new Date(mqttData.timestamp).getTime() : 0;
                return {
                    sensor,
                    quantity,
                    timestampMs: Number.isFinite(ts) ? ts : 0,
                    timestampRaw: mqttData?.timestamp
                };
            })
            .filter(Boolean)
            .sort((left, right) => right.timestampMs - left.timestampMs);

        const selectedReading = validReadings[0];
        const selectedSensore = selectedReading?.sensor;

        if (!selectedSensore) {
            return res.status(409).json({
                message: 'Nessuna lettura MQTT valida disponibile per i sensori di mungitura attivi'
            });
        }

        return res.status(200).json({
            source: 'iot',
            quantity: selectedReading.quantity,
            unit: 'litri',
            measuredAt: selectedReading.timestampRaw
                ? new Date(selectedReading.timestampRaw).toISOString()
                : new Date().toISOString(),
            sensoreId: selectedSensore._id
        });
    } catch (error) {
        return res.status(500).json({ message: 'Errore del server' });
    }
};
// GET /api/mungiture - recupera le mungiture dell'azienda con filtri opzionali per animale, stato e intervallo date
export const getMungitura = async (req, res) => {
    try {
        const { aziendaId, animaleId, semiLavoratoId, status, startedAtFrom, startedAtTo } = req.query;
        const startedAtFilter = {};

        if (!aziendaId) {
            return res.status(400).json({ message: 'aziendaId è obbligatorio' });
        }

        if (startedAtFrom) {
            const parsedFrom = new Date(startedAtFrom);
            if (Number.isNaN(parsedFrom.getTime())) {
                return res.status(400).json({ message: 'startedAtFrom non valido' });
            }
            startedAtFilter.$gte = parsedFrom;
        }

        if (startedAtTo) {
            const parsedTo = new Date(startedAtTo);
            if (Number.isNaN(parsedTo.getTime())) {
                return res.status(400).json({ message: 'startedAtTo non valido' });
            }
            startedAtFilter.$lte = parsedTo;
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

        if (semiLavoratoId) {
            const normalizedSemi = String(semiLavoratoId).trim();
            if (!normalizedSemi) {
                return res.status(400).json({ message: 'semiLavoratoId non valido' });
            }
            filter.semiLavoratoId = normalizedSemi;
        }

        if (Object.keys(startedAtFilter).length > 0) {
            filter.startedAt = startedAtFilter;
        }

        const mungiture = await Mungitura.find(filter).sort({ startedAt: -1 });
        return res.status(200).json(mungiture);
    } catch (error) {
        console.error('Errore durante il recupero delle mungiture:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
};

export const deleteMungitura = async (req, res) => {
    try {
        const { id } = req.params;

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

        const usedInLavorazione = await Lavorazione.exists({
            aziendaId: existingMungitura.aziendaId,
            'inputs.mungituraIds': existingMungitura._id
        });

        if (usedInLavorazione) {
            return res.status(409).json({
                message: 'Impossibile eliminare la mungitura: e gia utilizzata in una lavorazione'
            });
        }

        await Mungitura.deleteOne({ _id: id });

        return res.status(200).json({ message: 'Mungitura eliminata con successo' });
    } catch (error) {
        return res.status(500).json({ message: 'Errore del server' });
    }
};
// rotte per la mungitura
router.post('/', createMungitura);
router.patch('/:id', updateMungitura);
router.get('/:id/iot-litri', getIotLitersReading);
router.get('/', getMungitura);
router.delete('/:id', deleteMungitura);

export default router;