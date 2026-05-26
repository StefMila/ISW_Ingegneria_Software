import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import Azienda from '../models/azienda.js';
import Lavorazione from '../models/lavorazione.js';
import LottoProdotto from '../models/lottoProdotto.js';

const router = express.Router();
router.use(checkAuth);
router.use(checkUserType(['allevatore']));
// helper per validare ObjectId di MongoDB
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
// genera un numero per il codice del lotto prodotto basato sulla data corrente
export const createLottoProdotto = async (req, res) => {
	try {
		const {
			aziendaId,
			lavorazioneId,
			nomeProdotto,
			quantity,
			unit,
			lotNumber,
			qrCodeValue
		} = req.body;

		if (!aziendaId || !lavorazioneId || !nomeProdotto || quantity === undefined || !unit || !qrCodeValue) {
			return res.status(400).json({
				message: 'aziendaId, lavorazioneId, nomeProdotto, quantity, unit e qrCodeValue sono obbligatori'
			});
		}

		const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		if (!isValidObjectId(lavorazioneId)) {
			return res.status(400).json({ message: 'lavorazioneId non valido' });
		}

		const existingLavorazione = await Lavorazione.findOne({ _id: lavorazioneId, aziendaId }).select('_id aziendaId isTemplate');
		if (!existingLavorazione) {
			return res.status(404).json({ message: 'Lavorazione non trovata per questa azienda' });
		}

		if (existingLavorazione.isTemplate === true) {
			return res.status(400).json({ message: 'La lavorazione selezionata è un template e non può essere usata per creare un lotto prodotto' });
		}

		const newLottoProdotto = new LottoProdotto({
			aziendaId,
			lavorazioneId,
			nomeProdotto: String(nomeProdotto).trim(),
			quantity,
			unit: String(unit).trim(),
			lotNumber: typeof lotNumber === 'string' && lotNumber.trim() ? lotNumber.trim() : undefined,
			qrCodeValue: String(qrCodeValue).trim()
		});

		await newLottoProdotto.save();

		return res.status(201).json({
			message: 'Lotto prodotto creato con successo',
			lottoProdotto: newLottoProdotto
		});
	} catch (error) {
		if (error.name === 'ValidationError') {
			return res.status(400).json({ message: 'dati lotto prodotto non validi' });
		}

		if (error.code === 11000) {
			return res.status(409).json({ message: 'lotNumber o qrCodeValue già esistente' });
		}

		return res.status(500).json({ message: 'Errore del server' });
	}
};
// PATCH /api/lottiProdotto/:id - aggiorna un lotto prodotto esistente, con validazione dei campi e controllo di proprietà
export const updateLottoProdotto = async (req, res) => {
	try {
		const { id } = req.params;
		const {
			lavorazioneId,
			nomeProdotto,
			quantity,
			unit,
			lotNumber,
			qrCodeValue
		} = req.body;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ message: 'ID lotto prodotto non valido' });
		}

		const existingLottoProdotto = await LottoProdotto.findById(id);
		if (!existingLottoProdotto) {
			return res.status(404).json({ message: 'Lotto prodotto non trovato' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(existingLottoProdotto.aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		if (lavorazioneId !== undefined) {
			if (!isValidObjectId(lavorazioneId)) {
				return res.status(400).json({ message: 'lavorazioneId non valido' });
			}

			const existingLavorazione = await Lavorazione.findOne({
				_id: lavorazioneId,
				aziendaId: existingLottoProdotto.aziendaId
			}).select('_id isTemplate');

			if (!existingLavorazione) {
				return res.status(404).json({ message: 'Lavorazione non trovata per questa azienda' });
			}

			if (existingLavorazione.isTemplate === true) {
				return res.status(400).json({ message: 'La lavorazione selezionata è un template e non può essere usata per creare un lotto prodotto' });
			}

			existingLottoProdotto.lavorazioneId = lavorazioneId;
		}

		if (nomeProdotto !== undefined) existingLottoProdotto.nomeProdotto = String(nomeProdotto).trim();
		if (quantity !== undefined) existingLottoProdotto.quantity = quantity;
		if (unit !== undefined) existingLottoProdotto.unit = String(unit).trim();
		if (lotNumber !== undefined) existingLottoProdotto.lotNumber = String(lotNumber).trim();
		if (qrCodeValue !== undefined) existingLottoProdotto.qrCodeValue = String(qrCodeValue).trim();

		await existingLottoProdotto.save();

		return res.status(200).json({
			message: 'Lotto prodotto aggiornato con successo',
			lottoProdotto: existingLottoProdotto
		});
	} catch (error) {
		if (error.name === 'ValidationError') {
			return res.status(400).json({ message: 'dati lotto prodotto non validi' });
		}

		if (error.code === 11000) {
			return res.status(409).json({ message: 'lotNumber o qrCodeValue già esistente' });
		}

		return res.status(500).json({ message: 'Errore del server' });
	}
};
// GET /api/lottiProdotto - recupera i lotti prodotto dell'azienda con filtri opzionali per lavorazione e numero di lotto
export const getLottiProdotto = async (req, res) => {
	try {
		const { aziendaId, lavorazioneId, lotNumber } = req.query;

		if (!aziendaId) {
			return res.status(400).json({ message: 'aziendaId è obbligatorio' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		const filter = { aziendaId };

		if (lavorazioneId) {
			if (!isValidObjectId(lavorazioneId)) {
				return res.status(400).json({ message: 'lavorazioneId non valido' });
			}
			filter.lavorazioneId = lavorazioneId;
		}

		if (lotNumber) {
			filter.lotNumber = String(lotNumber).trim();
		}

		const items = await LottoProdotto.find(filter).sort({ createdAt: -1 });
		return res.status(200).json(items);
	} catch (error) {
		return res.status(500).json({ message: 'Errore del server' });
	}
};

// DELETE /api/lotti-prodotto/:id - elimina un lotto prodotto esistente, con controllo di proprietà
export const deleteLottoProdotto = async (req, res) => {
	try {
		const { id } = req.params;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ message: 'ID lotto prodotto non valido' });
		}

		const existingLottoProdotto = await LottoProdotto.findById(id);
		if (!existingLottoProdotto) {
			return res.status(404).json({ message: 'Lotto prodotto non trovato' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(existingLottoProdotto.aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		await LottoProdotto.deleteOne({ _id: id });

		return res.status(200).json({ message: 'Lotto prodotto eliminato con successo' });
	} catch (error) {
		return res.status(500).json({ message: 'Errore del server' });
	}
};

router.post('/', createLottoProdotto);
router.patch('/:id', updateLottoProdotto);
router.get('/', getLottiProdotto);
router.delete('/:id', deleteLottoProdotto);

export default router;

