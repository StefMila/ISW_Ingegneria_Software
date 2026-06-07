import express from 'express';
import mongoose from 'mongoose';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';
import Azienda from '../models/azienda.js';
import Lavorazione from '../models/lavorazione.js';
import LottoProdotto from '../models/lottoProdotto.js';
import QRcode from 'qrcode';

const router = express.Router();
router.use(checkAuth);
router.use(checkUserType(['allevatore']));
// helper per validare ObjectId di MongoDB
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// URL base pubblica per generazione QR code
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
// genera un numero per il codice del lotto prodotto basato sulla data corrente
export const createLottoProdotto = async (req, res) => {
	try {
		const {
			aziendaId,
			lavorazioneId,
			nomeProdotto,
			quantity,
			unit,
			lotNumber
		} = req.body;

		if (!aziendaId || !lavorazioneId || !nomeProdotto || quantity === undefined || !unit) {
			return res.status(400).json({
				message: 'aziendaId, lavorazioneId, nomeProdotto, quantity e unit sono obbligatori'
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
			qrCodeValue: 'PENDING'
		});

		await newLottoProdotto.validate();

		const qrCodeValue = `${PUBLIC_BASE_URL}/tracciabilita.html?lotto=${encodeURIComponent(newLottoProdotto.lotNumber)}`;
		const qrCodeImage = await QRcode.toDataURL(qrCodeValue);

		newLottoProdotto.qrCodeValue = qrCodeValue;
		newLottoProdotto.qrCodeImage = qrCodeImage;
		
		await newLottoProdotto.save();

		// collegamento bilaterale lavorazione <--> lotto
		existingLavorazione.lottoId = newLottoProdotto._id;
		await existingLavorazione.save();

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
		// campi aggiornabili: lavorazioneId, nomeProdotto, quantity, unit, lotNumber. No QrCode, che viene rigenerato se cambia il lotNumber
		const {
			lavorazioneId,
			nomeProdotto,
			quantity,
			unit,
			lotNumber
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

		if (lotNumber !== undefined) {
			const normalizedLotNumber = String(lotNumber).trim();
			existingLottoProdotto.lotNumber = normalizedLotNumber;
			existingLottoProdotto.qrCodeValue = `${PUBLIC_BASE_URL}/tracciabilita.html?lotto=${encodeURIComponent(normalizedLotNumber)}`;
			existingLottoProdotto.qrCodeImage = await QRcode.toDataURL(existingLottoProdotto.qrCodeValue);
		}

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

		for (const item of items) {
			let changed = false;

			if (!item.qrCodeValue && item.lotNumber) {
				item.qrCodeValue = `${PUBLIC_BASE_URL}/tracciabilita.html?lotto=${encodeURIComponent(item.lotNumber)}`;
				changed = true;
			}

			if (!item.qrCodeImage && item.qrCodeValue) {
				item.qrCodeImage = await QRcode.toDataURL(item.qrCodeValue);
				changed = true;
			}

			if (changed) {
				await item.save();
			}
		}

		return res.status(200).json(items);
	} catch (error) {
		return res.status(500).json({ message: 'Errore del server' });
	}
};

// POST /api/lotti-prodotto/mark-printed - registra a DB le etichette stampate per uno o più lotti.
export const markLottiProdottoPrinted = async (req, res) => {
	try {
		const { aziendaId, prints } = req.body || {};

		if (!aziendaId || !isValidObjectId(aziendaId)) {
			return res.status(400).json({ message: 'aziendaId non valido' });
		}

		const ownershipCheck = await assertAziendaOwnedByUser(aziendaId, req.user.userId);
		if (!ownershipCheck.ok) {
			return res.status(ownershipCheck.status || 403).json({ message: ownershipCheck.message });
		}

		if (!Array.isArray(prints) || prints.length === 0) {
			return res.status(400).json({ message: 'prints deve essere un array non vuoto' });
		}

		const normalized = [];
		for (const item of prints) {
			const lottoId = typeof item?.lottoId === 'string' ? item.lottoId.trim() : '';
			const copies = Number(item?.copies);
			const expiryDateRaw = typeof item?.expiryDate === 'string' ? item.expiryDate.trim() : '';
			const parsedExpiryDate = expiryDateRaw ? new Date(`${expiryDateRaw}T00:00:00`) : null;

			if (!isValidObjectId(lottoId)) {
				return res.status(400).json({ message: 'lottoId non valido' });
			}

			if (!Number.isFinite(copies) || copies <= 0) {
				return res.status(400).json({ message: 'copies deve essere un numero positivo' });
			}

			if (parsedExpiryDate && Number.isNaN(parsedExpiryDate.getTime())) {
				return res.status(400).json({ message: 'expiryDate non valida' });
			}

			normalized.push({
				lottoId,
				copies: Math.floor(copies),
				expiryDate: parsedExpiryDate
			});
		}

		const lotIds = [...new Set(normalized.map((item) => item.lottoId))];
		const existingLots = await LottoProdotto.find({
			_id: { $in: lotIds },
			aziendaId
		}).select('_id');

		if (existingLots.length !== lotIds.length) {
			return res.status(404).json({ message: 'Uno o più lotti non trovati per questa azienda' });
		}

		const now = new Date();
		for (const item of normalized) {
			const setPayload = {
				labelsPrinted: true,
				labelsLastPrintedAt: now,
				labelsLastPrintCopies: item.copies
			};

			if (item.expiryDate) {
				setPayload.labelsLastExpiryDate = item.expiryDate;
			}

			await LottoProdotto.updateOne(
				{ _id: item.lottoId, aziendaId },
				{
					$set: setPayload,
					$inc: {
						labelsPrintedCount: item.copies
					}
				}
			);
		}

		return res.status(200).json({
			message: 'Stato etichette stampate aggiornato',
			updatedLots: lotIds.length
		});
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
router.post('/mark-printed', markLottiProdottoPrinted);
router.patch('/:id', updateLottoProdotto);
router.get('/', getLottiProdotto);
router.delete('/:id', deleteLottoProdotto);

export default router;

