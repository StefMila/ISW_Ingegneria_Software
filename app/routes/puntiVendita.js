import express from 'express';
import mongoose from 'mongoose';
import PuntoVendita from '../models/puntoVendita.js';
import { checkAuth, checkUserType } from './auth.js';

const router = express.Router();

function normalizeCategories(input) {
    const rawValues = Array.isArray(input)
        ? input
        : (typeof input === 'string' ? input.split(',') : []);

    const normalized = rawValues
        .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
        .filter(Boolean);

    return [...new Set(normalized)];
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes'].includes(normalized)) {
            return true;
        }

        if (['false', '0', 'off', 'no'].includes(normalized)) {
            return false;
        }
    }

    return Boolean(value);
}

function normalizeGeo({ lat, lng, geo }) {
    const latitude = Number(lat ?? geo?.lat);
    const longitude = Number(lng ?? geo?.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        lat: latitude,
        lng: longitude
    };
}

// Endpoint pubblico per ottenere tutti i punti vendita (senza dati sensibili)
router.get('/public', async (req, res) => {
    try {
        const items = await PuntoVendita.find({ isActive: true })
            .select('_id isActive nomePunto indirizzo geo emailPunto phoneNumber website description categories formattedAddress placeId city province')
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({ items });
    } catch (error) {
        console.error('Errore nel recupero dei punti vendita:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Tutte le altre route richiedono autenticazione e ruolo allevatore
router.use(checkAuth);
router.use(checkUserType(['allevatore']));

// Crea un nuovo punto vendita
router.post('/', async (req, res) => {
    try {
        const nomePunto = normalizeString(req.body?.nomePunto);
        const indirizzo = normalizeString(req.body?.indirizzo);
        const emailPunto = normalizeString(req.body?.emailPunto).toLowerCase();
        const phoneNumber = normalizeString(req.body?.phoneNumber);
        const website = normalizeString(req.body?.website);
        const description = normalizeString(req.body?.description);
        const formattedAddress = normalizeString(req.body?.formattedAddress);
        const placeId = normalizeString(req.body?.placeId);
        const city = normalizeString(req.body?.city);
        const province = normalizeString(req.body?.province);
        const categories = normalizeCategories(req.body?.categories);
        const isActive = req.body?.isActive === undefined ? true : normalizeBoolean(req.body.isActive);
        const geo = normalizeGeo(req.body || {});

        if (!nomePunto || !indirizzo) {
            return res.status(400).json({ message: 'Nome punto e indirizzo sono obbligatori' });
        }

        if (!geo) {
            return res.status(400).json({ message: 'Coordinate geografiche non valide' });
        }

        const nuovoPuntoVendita = new PuntoVendita({
            ownerUserId: req.user.userId,
            nomePunto,
            indirizzo,
            geo,
            emailPunto: emailPunto || undefined,
            phoneNumber: phoneNumber || undefined,
            website: website || undefined,
            description: description || undefined,
            categories,
            isActive,
            formattedAddress: formattedAddress || undefined,
            placeId: placeId || undefined,
            city: city || undefined,
            province: province || undefined
        });

        await nuovoPuntoVendita.save();

        return res.status(201).json({
            message: 'Punto vendita creato con successo',
            puntoVendita: nuovoPuntoVendita
        });
    } catch (error) {
        console.error('Errore nella creazione del punto vendita:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Elenco punti vendita dell'utente autenticato
router.get('/mine', async (req, res) => {
    try {
        const items = await PuntoVendita.find({ ownerUserId: req.user.userId })
            .select('_id isActive nomePunto indirizzo geo emailPunto phoneNumber website description categories formattedAddress placeId city province')
            .sort({ createdAt: 1 });

        return res.status(200).json({ items });
    } catch (error) {
        console.error('Errore nel recupero dei punti vendita dell\'utente:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Dettaglio punto vendita
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID del punto vendita non valido' });
        }

        const item = await PuntoVendita.findById(id);
        if (!item) {
            return res.status(404).json({ message: 'Punto vendita non trovato' });
        }

        if (String(item.ownerUserId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Non sei il proprietario di questo punto vendita' });
        }

        return res.status(200).json({ item });
    } catch (error) {
        console.error('Errore nel recupero del punto vendita:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Aggiorna un punto vendita
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID del punto vendita non valido' });
        }

        const existing = await PuntoVendita.findById(id).select('_id ownerUserId');
        if (!existing) {
            return res.status(404).json({ message: 'Punto vendita non trovato' });
        }

        if (String(existing.ownerUserId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Non sei il proprietario di questo punto vendita' });
        }

        const update = {};
        const nomePunto = normalizeString(req.body?.nomePunto);
        const indirizzo = normalizeString(req.body?.indirizzo);
        const emailPunto = normalizeString(req.body?.emailPunto).toLowerCase();
        const phoneNumber = normalizeString(req.body?.phoneNumber);
        const website = normalizeString(req.body?.website);
        const description = normalizeString(req.body?.description);
        const formattedAddress = normalizeString(req.body?.formattedAddress);
        const placeId = normalizeString(req.body?.placeId);
        const city = normalizeString(req.body?.city);
        const province = normalizeString(req.body?.province);
        const isActive = req.body?.isActive === undefined ? undefined : normalizeBoolean(req.body.isActive);

        if (req.body?.nomePunto !== undefined) update.nomePunto = nomePunto;
        if (req.body?.indirizzo !== undefined) update.indirizzo = indirizzo;
        if (req.body?.emailPunto !== undefined) update.emailPunto = emailPunto || undefined;
        if (req.body?.phoneNumber !== undefined) update.phoneNumber = phoneNumber || undefined;
        if (req.body?.website !== undefined) update.website = website || undefined;
        if (req.body?.description !== undefined) update.description = description || undefined;
        if (req.body?.formattedAddress !== undefined) update.formattedAddress = formattedAddress || undefined;
        if (req.body?.placeId !== undefined) update.placeId = placeId || undefined;
        if (req.body?.city !== undefined) update.city = city || undefined;
        if (req.body?.province !== undefined) update.province = province || undefined;
        if (req.body?.isActive !== undefined) update.isActive = isActive;
        if (req.body?.categories !== undefined) update.categories = normalizeCategories(req.body.categories);

        const geo = normalizeGeo(req.body || {});
        if (req.body?.geo !== undefined || req.body?.lat !== undefined || req.body?.lng !== undefined) {
            if (!geo) {
                return res.status(400).json({ message: 'Coordinate geografiche non valide' });
            }
            update.geo = geo;
        }

        const updated = await PuntoVendita.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true
        });

        return res.status(200).json({
            message: 'Punto vendita aggiornato con successo',
            puntoVendita: updated
        });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del punto vendita:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Elimina un punto vendita
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID del punto vendita non valido' });
        }

        const existing = await PuntoVendita.findById(id).select('_id ownerUserId');
        if (!existing) {
            return res.status(404).json({ message: 'Punto vendita non trovato' });
        }

        if (String(existing.ownerUserId) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Non sei il proprietario di questo punto vendita' });
        }

        await PuntoVendita.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Punto vendita eliminato con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione del punto vendita:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

export default router;
