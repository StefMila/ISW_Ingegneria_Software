import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Azienda from '../models/azienda.js';
import Lavorazione from '../models/lavorazione.js';
import Sensore from '../models/sensore.js';
import { ultimeLettureIot } from '../services/mqttService.js';

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

const UNIT_TO_SENSORE = {
	'L': 'litri',
	'Kg': 'chilogrammi'
};

const ALLOWED_FASI_SET = new Set(ALLOWED_FASI);
//valida ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// normalizza l'input degli array di lavorazione. Rimuove spazi, converte in minuscolo e filtra ID non validi
export const normalizeInputs = (inputs) => {
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
export const normalizeFasi = (fasi) => {
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

export const parseBooleanLike = (value) => {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return null;
};

const parseQuantity = (value) => {
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

const readQuantityFromMqttPayload = (lavorazione, payload) => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    let candidates = [payload.litri_latte, payload.litri, payload.peso];
	if (lavorazione && lavorazione.outputUnit === 'L'){
		candidates = [payload.litri_latte, payload.litri, payload.peso];
	} else if (lavorazione && lavorazione.outputUnit === 'Kg') {
		candidates = [payload.peso, payload.litri_latte, payload.litri];
	}
	
    for (const candidate of candidates) {
        const parsed = parseQuantity(candidate);
        if (parsed !== null) {
            return parsed;
        }
    }

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
			templateId,
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

		if(!parsedIsTemplate && !templateId) {
			return res.status(400).json({ message: 'Se la lavorazione non è un template, deve riferirsi ad un template esistente' });
		}

		const newLavorazione = new Lavorazione({
			aziendaId,
			tipoLavorazione: String(tipoLavorazione).trim(),
			codiceTipoLav: String(codiceTipoLav).trim(),
			nomeTemplate: typeof nomeTemplate === 'string' ? nomeTemplate.trim() : undefined,
			isTemplate: parsedIsTemplate ?? false,
			templateId: templateId || undefined,
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
			aziendaId,
			tipoLavorazione,
			codiceTipoLav,
			codiceLavorazione,
			nomeTemplate,
			isTemplate,
			templateId,
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
		// escludo tutti i campi che non possono essere modificati, a prescindere dal fatto che la lavorazione interessata sia un template o meno
		if (
			aziendaId !== undefined ||
			tipoLavorazione !== undefined ||
			codiceTipoLav !== undefined ||
			codiceLavorazione !== undefined ||
			isTemplate !== undefined ||
			templateId !== undefined ||
			startedAt !== undefined ||
			inputs !== undefined ||
			outputName !== undefined ||
			outputUnit !== undefined
		) {
			return res.status(400).json({ message: 'I campi aziendaId, tipoLavorazione, codiceTipoLav, codiceLavorazione, isTemplate, templateId, startedAt, inputs, outputName e outputUnit non sono modificabili' });
		}

		if (nomeTemplate === undefined && endedAt === undefined && notes === undefined && status === undefined && fasi === undefined && outputQuantity === undefined) {
            return res.status(400).json({ message: 'Nessun campo aggiornabile fornito' });
        }

		const existingLavorazione = await Lavorazione.findById(id);
		if (!existingLavorazione) {
			return res.status(404).json({ message: 'Lavorazione non trovata' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(existingLavorazione.aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		if (existingLavorazione.isTemplate && status !== undefined) {
			return res.status(422).json({ message: 'Lo status di un template di lavorazione non può essere modificato' });
		}

		if (existingLavorazione.isTemplate && fasi !== undefined) {
			return res.status(422).json({ message: 'Le fasi di un template di lavorazione non possono essere modificate' });
		}

		if(!existingLavorazione.isTemplate && nomeTemplate !== undefined) {
			return res.status(422).json({ message: 'Il nome di un template non può essere modificato da una lavorazione non template' });
		}

		const normalizedFasi = normalizeFasi(fasi);
		if (!normalizedFasi.ok) {
			return res.status(normalizedFasi.status || 400).json({ message: normalizedFasi.message });
		}

		if (nomeTemplate !== undefined) existingLavorazione.nomeTemplate = typeof nomeTemplate === 'string' ? nomeTemplate.trim() : undefined;
		if (templateId !== undefined) existingLavorazione.templateId = templateId;
		if (endedAt !== undefined) existingLavorazione.endedAt = endedAt;
		if (status !== undefined) existingLavorazione.status = status;
		if (notes !== undefined) existingLavorazione.notes = typeof notes === 'string' ? notes.trim() : undefined;
		if (normalizedFasi.value !== undefined) existingLavorazione.fasi = normalizedFasi.value;
		if (outputQuantity !== undefined) existingLavorazione.outputQuantity = outputQuantity;

		await existingLavorazione.save();

		return res.status(200).json({
			message: 'Lavorazione aggiornata con successo',
			lavorazione: existingLavorazione
		});
	} catch (error) {
		if (error.name === 'ValidationError') {
			return res.status(400).json({ message: 'dati lavorazione non validi' });
		}
		console.error('Errore del server:', error);
		return res.status(500).json({ message: 'Errore del server' });
	}
};
// GET /api/lavorazioni/:id/iot - legge la quantità (in Kg o litri) misurata da sensore MQTT associato alla lavorazione
export const getIotReading = async (req, res) => {
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

		const sensoriLavorazione = await Sensore.find({ 
			aziendaId: existingLavorazione.aziendaId,
			stato: 'attivo',
			tipoDispositivo: 'lavorazione',
			capacita: {
				tipoDato: 'peso',
				unitaMisura: UNIT_TO_SENSORE[(existingLavorazione.outputUnit).trim()] || 'chilogrammi'
			}
		}).sort({ createdAt: -1 });

		if (!sensoriLavorazione.length) {
			return res.status(409).json({
				message: 'Nessun sensore di lavorazione attivo associato all\'azienda'
			});
		}

		const selectedSensore = sensoriLavorazione.find((sensor) => {
			const mqttData = ultimeLettureIot.get(String(sensor._id));	
			const quantity = readQuantityFromMqttPayload(existingLavorazione, mqttData?.dati);
			return quantity !== null;
		});

		if (!selectedSensore) {
			return res.status(409).json({
				message: 'Nessuna lettura MQTT valida disponibile per i sensori di lavorazione attivi'
			});
		}

		const mqttData = ultimeLettureIot.get(String(selectedSensore._id));
		const measuredQuantity = readQuantityFromMqttPayload(existingLavorazione, mqttData?.dati);
		return res.status(200).json({
			source: 'iot',
			quantity: measuredQuantity,
			unit: existingLavorazione.outputUnit || 'Kg', 
			measuredAt: mqttData?.timestamp ? new Date(mqttData.timestamp).toISOString() : new Date().toISOString(),
			sensoreId: selectedSensore._id
		});
	} catch (error) {
		console.error('Errore del server:', error);
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

//GET /api/lavorazioni/search - visualizzazione del singolo template a partire dal suo codiceLavorazione
export const getTemplateByCodiceLavorazione = async (req, res) => {
	try {
		const { codiceLavorazione } = req.query;

		if (!codiceLavorazione) {
			return res.status(400).json({ message: 'Il codice del template è obbligatorio' });
		}

		const standardCodiceLavorazione = /^[A][A-D]\d{3}$/;
		if(!standardCodiceLavorazione.test(codiceLavorazione)){
			return res.status(400).json({ message: 'Codice template non valido'});
		}

		const existingTemplate = await Lavorazione.findOne({
			codiceLavorazione: codiceLavorazione,
			isTemplate: true
		});
		if (!existingTemplate || !existingTemplate.isTemplate) {
			return res.status(404).json({ message: 'Nessun template corrispondente trovato'});
		}

		const ownershipCheck = await assertAziendaOwnedByUser(existingTemplate.aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		return res.status(200).json(existingTemplate);
	} catch (error) {
		console.error('Errore del server:', error);
		return res.status(500).json({ message: 'Errore del server' });
	}
};

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
router.get('/:id/iot', getIotReading);
router.get('/', getLavorazioni);
router.get('/search', getTemplateByCodiceLavorazione);
router.delete('/:id', deleteLavorazione);

export default router;
