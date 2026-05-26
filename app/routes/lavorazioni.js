import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import Azienda from '../models/azienda.js';
import Lavorazione from '../models/lavorazione.js';

const router = express.Router();
router.use(checkAuth);
router.use(checkUserType(['allevatore']));
//valida ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// verifica che l'azienda appartenga all'utente autenticato
const assertAziendaOwnedByUser = async (aziendaId, userId) => {
	if (!isValidObjectId(aziendaId)) {
		return { ok: false, status: 400, message: 'aziendaId non valido' };
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
// normalizza l'input degli array di lavorazione. Rimuove spazi, converte in minuscolo e filtra ID non validi
const normalizeInputs = (inputs) => {
	if (inputs === undefined) {
		return { ok: true, value: undefined };
	}

	if (!Array.isArray(inputs)) {
		return { ok: false, status: 400, message: 'inputs deve essere un array' };
	}

	const normalizedInputs = inputs.map((item) => ({
		type: typeof item?.type === 'string' ? item.type.trim().toLowerCase() : item?.type,
		name: typeof item?.name === 'string' ? item.name.trim() : item?.name,
		quantity: item?.quantity,
		unit: typeof item?.unit === 'string' ? item.unit.trim() : item?.unit,
		mungituraIds: Array.isArray(item?.mungituraIds)
			? item.mungituraIds.filter((id) => isValidObjectId(String(id)))
			: undefined
	}));

	return { ok: true, value: normalizedInputs };
};
// normalizza l'input delle fasi di lavorazione, rimuovendo spazi e convertendo in booleano i campi completed
const normalizeFasi = (fasi) => {
	if (fasi === undefined) {
		return { ok: true, value: undefined };
	}

	if (!Array.isArray(fasi)) {
		return { ok: false, status: 400, message: 'fasi deve essere un array' };
	}

	const normalizedFasi = fasi.map((fase) => ({
		name: typeof fase?.name === 'string' ? fase.name.trim() : fase?.name,
		completed: fase?.completed === undefined ? false : Boolean(fase.completed)
	}));

	return { ok: true, value: normalizedFasi };
};
// POST /api/lavorazioni - crea una nuova lavorazione, con validazione dei campi e controllo di proprietà
export const createLavorazione = async (req, res) => {
	try {
		const {
			aziendaId,
			tipoLavorazione,
			startedAt,
			endedAt,
			status,
			notes,
			inputs,
			fasi,
			outputName,
			outputQuantity,
			outputUnit
		} = req.body;

		if (!aziendaId || !tipoLavorazione) {
			return res.status(400).json({ message: 'aziendaId e tipoLavorazione sono obbligatori' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		const normalizedInputs = normalizeInputs(inputs);
		if (!normalizedInputs.ok) {
			return res.status(normalizedInputs.status || 400).json({ message: normalizedInputs.message });
		}

		const normalizedFasi = normalizeFasi(fasi);
		if (!normalizedFasi.ok) {
			return res.status(normalizedFasi.status || 400).json({ message: normalizedFasi.message });
		}

		const newLavorazione = new Lavorazione({
			aziendaId,
			tipoLavorazione: String(tipoLavorazione).trim(),
			startedAt: startedAt || undefined,
			endedAt: endedAt || undefined,
			status: status || undefined,
			notes: typeof notes === 'string' ? notes.trim() : undefined,
			inputs: normalizedInputs.value,
			fasi: normalizedFasi.value,
			outputName: typeof outputName === 'string' ? outputName.trim() : undefined,
			outputQuantity: outputQuantity !== undefined ? outputQuantity : undefined,
			outputUnit: typeof outputUnit === 'string' ? outputUnit.trim() : undefined
		});

		await newLavorazione.save();

		return res.status(201).json({
			message: 'Lavorazione creata con successo',
			lavorazione: newLavorazione
		});
	} catch (error) {
		if (error.name === 'ValidationError') {
			return res.status(400).json({ message: 'dati lavorazione non validi' });
		}
		return res.status(500).json({ message: 'Errore del server' });
	}
};
// PATCH /api/lavorazioni/:id - aggiorna una lavorazione esistente, con validazione dei campi e controllo di proprietà
export const updateLavorazione = async (req, res) => {
	try {
		const { id } = req.params;
		const {
			tipoLavorazione,
			startedAt,
			endedAt,
			status,
			notes,
			inputs,
			fasi,
			outputName,
			outputQuantity,
			outputUnit
		} = req.body;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ message: 'ID lavorazione non valido' });
		}

		const existingLavorazione = await Lavorazione.findById(id);
		if (!existingLavorazione) {
			return res.status(404).json({ message: 'Lavorazione non trovata' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(existingLavorazione.aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		const normalizedInputs = normalizeInputs(inputs);
		if (!normalizedInputs.ok) {
			return res.status(normalizedInputs.status || 400).json({ message: normalizedInputs.message });
		}

		const normalizedFasi = normalizeFasi(fasi);
		if (!normalizedFasi.ok) {
			return res.status(normalizedFasi.status || 400).json({ message: normalizedFasi.message });
		}

		if (tipoLavorazione !== undefined) existingLavorazione.tipoLavorazione = String(tipoLavorazione).trim();
		if (startedAt !== undefined) existingLavorazione.startedAt = startedAt;
		if (endedAt !== undefined) existingLavorazione.endedAt = endedAt;
		if (status !== undefined) existingLavorazione.status = status;
		if (notes !== undefined) existingLavorazione.notes = typeof notes === 'string' ? notes.trim() : undefined;
		if (normalizedInputs.value !== undefined) existingLavorazione.inputs = normalizedInputs.value;
		if (normalizedFasi.value !== undefined) existingLavorazione.fasi = normalizedFasi.value;
		if (outputName !== undefined) existingLavorazione.outputName = typeof outputName === 'string' ? outputName.trim() : undefined;
		if (outputQuantity !== undefined) existingLavorazione.outputQuantity = outputQuantity;
		if (outputUnit !== undefined) existingLavorazione.outputUnit = typeof outputUnit === 'string' ? outputUnit.trim() : undefined;

		await existingLavorazione.save();

		return res.status(200).json({
			message: 'Lavorazione aggiornata con successo',
			lavorazione: existingLavorazione
		});
	} catch (error) {
		if (error.name === 'ValidationError') {
			return res.status(400).json({ message: 'dati lavorazione non validi' });
		}
		return res.status(500).json({ message: 'Errore del server' });
	}
};
// GET /api/lavorazioni - recupera le lavorazioni dell'azienda con filtri opzionali per tipo di lavorazione e stato
export const getLavorazioni = async (req, res) => {
	try {
		const { aziendaId, tipoLavorazione, status } = req.query;

		if (!aziendaId) {
			return res.status(400).json({ message: 'aziendaId è obbligatorio' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		const filter = { aziendaId };

		if (tipoLavorazione) {
			filter.tipoLavorazione = String(tipoLavorazione).trim();
		}

		if (status) {
			filter.status = String(status).trim();
		}

		const items = await Lavorazione.find(filter).sort({ startedAt: -1 });
		return res.status(200).json(items);
	} catch (error) {
		return res.status(500).json({ message: 'Errore del server' });
	}
};

router.post('/', createLavorazione);
router.patch('/:id', updateLavorazione);
router.get('/', getLavorazioni);

export default router;
