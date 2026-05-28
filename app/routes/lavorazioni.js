import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Azienda from '../models/azienda.js';
import Lavorazione from '../models/lavorazione.js';

const router = express.Router();
router.use(checkAuth);
router.use(checkUserType(['allevatore']));

const ALLOWED_FASI = [
	'Ricevimento',
	'Centrifugazione',
	'Omogeneizzazione',
	'Trattamento termico',
	'Inoculo',
	'Coagulazione',
	'Rottura cagliata',
	'Formatura',
	'Salatura',
	'Stagionatura',
	'Concentrazione',
	'Zangolatura',
	'Confezionamento'
];

const ALLOWED_FASI_SET = new Set(ALLOWED_FASI);
//valida ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
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

	const hasInvalidFase = normalizedFasi.some((fase) => !ALLOWED_FASI_SET.has(fase.name));
	if (hasInvalidFase) {
		return { ok: false, status: 400, message: `Le fasi consentite sono: ${ALLOWED_FASI.join(', ')}` };
	}

	return { ok: true, value: normalizedFasi };
};

const parseBooleanLike = (value) => {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return null;
};
// POST /api/lavorazioni - crea una nuova lavorazione, con validazione dei campi e controllo di proprietà
export const createLavorazione = async (req, res) => {
	try {
		const {
			aziendaId,
			tipoLavorazione,
			codiceTipoLav,
			nomeTemplate,
			isTemplate,
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

		if (!aziendaId || !tipoLavorazione || !codiceTipoLav) {
			return res.status(400).json({ message: 'aziendaId, tipoLavorazione e codiceTipoLav sono obbligatori' });
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

		const parsedIsTemplate = parseBooleanLike(isTemplate);
		if (isTemplate !== undefined && parsedIsTemplate === null) {
			return res.status(400).json({ message: 'isTemplate deve essere true o false' });
		}

		const newLavorazione = new Lavorazione({
			aziendaId,
			tipoLavorazione: String(tipoLavorazione).trim(),
			codiceTipoLav: String(codiceTipoLav).trim(),
			nomeTemplate: typeof nomeTemplate === 'string' ? nomeTemplate.trim() : undefined,
			isTemplate: parsedIsTemplate ?? false,
			startedAt: startedAt || undefined,
			endedAt: endedAt || undefined,
			status: status || 'in_corso',
			notes: typeof notes === 'string' ? notes.trim() : undefined,
			inputs: normalizedInputs.value,
			fasi: normalizedFasi.value,
			outputName: typeof outputName === 'string' ? outputName.trim() : undefined,
			outputQuantity: outputQuantity !== undefined ? outputQuantity : undefined,
			outputUnit: typeof outputUnit === 'string' ? outputUnit.trim() : undefined
		});

		await newLavorazione.save();
		const creationMessage = newLavorazione.isTemplate
			? 'Template lavorazione creato con successo'
			: 'Lavorazione creata con successo';

		return res.status(201).json({
			message: creationMessage,
			lavorazione: newLavorazione
		});
	} catch (error) {
		if (error.name === 'ValidationError') {
			console.error('Errore del server:', error);
			return res.status(400).json({ message: 'dati lavorazione non validi' });
		}
		console.error('Errore del server:', error);
		return res.status(500).json({ message: 'Errore del server:' });
	}
};
// PATCH /api/lavorazioni/:id - aggiorna una lavorazione esistente, con validazione dei campi e controllo di proprietà
export const updateLavorazione = async (req, res) => {
	try {
		const { id } = req.params;
		const {
			tipoLavorazione,
			codiceTipoLav,
			nomeTemplate,
			isTemplate,
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

		const parsedIsTemplate = parseBooleanLike(isTemplate);
		if (isTemplate !== undefined && parsedIsTemplate === null) {
			return res.status(400).json({ message: 'isTemplate deve essere true o false' });
		}

		if (tipoLavorazione !== undefined) existingLavorazione.tipoLavorazione = String(tipoLavorazione).trim();
		if (codiceTipoLav !== undefined) existingLavorazione.codiceTipoLav = String(codiceTipoLav).trim();
		if (nomeTemplate !== undefined) existingLavorazione.nomeTemplate = typeof nomeTemplate === 'string' ? nomeTemplate.trim() : undefined;
		if (parsedIsTemplate !== null) existingLavorazione.isTemplate = parsedIsTemplate;
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
		const { aziendaId, tipoLavorazione, status, isTemplate } = req.query;

		if (!aziendaId) {
			return res.status(400).json({ message: 'aziendaId è obbligatorio' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		const filter = { aziendaId };
		const parsedIsTemplate = parseBooleanLike(isTemplate);
		if (isTemplate !== undefined && parsedIsTemplate === null) {
			return res.status(400).json({ message: 'isTemplate deve essere true o false' });
		}

		if (parsedIsTemplate === null) {
			filter.isTemplate = { $ne: true };
		} else {
			filter.isTemplate = parsedIsTemplate;
		}

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

//TODO US75: GET /api/lavorazioni/:id - visualizzazione del singolo template a partire dal codiceLavorazione

// DELETE /api/lavorazioni/:id - elimina una lavorazione esistente, con controllo di proprietà
export const deleteLavorazione = async (req, res) => {
	try {
		const { id } = req.params;

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

		await Lavorazione.deleteOne({ _id: id });

		return res.status(200).json({ message: 'Lavorazione eliminata con successo' });
	} catch (error) {
		return res.status(500).json({ message: 'Errore del server' });
	}
};

router.post('/', createLavorazione);
router.patch('/:id', updateLavorazione);
router.get('/', getLavorazioni);
router.delete('/:id', deleteLavorazione);

export default router;
