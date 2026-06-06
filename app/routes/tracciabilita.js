import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import Animale from '../models/animale.js';
import Azienda from '../models/azienda.js';
import IotDailyStat from '../models/iotDailyStat.js';
import Lavorazione from '../models/lavorazione.js';
import LottoProdotto from '../models/lottoProdotto.js';
import Mungitura from '../models/munigitura.js';
import { checkAuth, checkUserType } from './auth.js';
import { assertAziendaOwnedByUser } from './aziende.js';

const router = express.Router();
const publicRouter = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// genera token basato su data 
const parseDateStrict = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};
// In questo contesto, consideriamo "giorno" come intervallo UTC dalle 00:00:00 alle 23:59:59
const startOfUtcDay = (date) => {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);
    return day;
};

const endOfUtcDay = (date) => {
    const day = new Date(date);
    day.setUTCHours(23, 59, 59, 999);
    return day;
};
// Calcola la media in modo sicuro, restituendo null se i dati non sono validi
const computeAverage = (sum, count) => {
    if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) {
        return null;
    }
    return Number((sum / count).toFixed(2));
};
// Calcola la differenza tra first e last, restituendo null se i dati non sono validi
const metricDelta = (metricWindow) => {
    if (!metricWindow || !Number.isFinite(metricWindow.last) || !Number.isFinite(metricWindow.first)) {
        return null;
    }
    return Number(Math.max(metricWindow.last - metricWindow.first, 0).toFixed(2));
};
// Funzione per pseudonimizzare l'ID dell'animale combinandolo con il numero del lotto
const summarizeDailyStat = (item) => ({
    day: item.day,
    phase: item.processPhase,
    steps: metricDelta(item.metrics?.steps),
    outdoorHours: metricDelta(item.metrics?.outdoor),
    temperature: {
        min: Number.isFinite(item.metrics?.temperature?.min) ? item.metrics.temperature.min : null,
        max: Number.isFinite(item.metrics?.temperature?.max) ? item.metrics.temperature.max : null,
        avg: computeAverage(item.metrics?.temperature?.sum, item.metrics?.temperature?.count)
    },
    bpm: {
        min: Number.isFinite(item.metrics?.bpm?.min) ? item.metrics.bpm.min : null,
        max: Number.isFinite(item.metrics?.bpm?.max) ? item.metrics.bpm.max : null,
        avg: computeAverage(item.metrics?.bpm?.sum, item.metrics?.bpm?.count)
    },
    alerts: {
        lowActivityCount: item.alerts?.lowActivityCount || 0,
        highTemperatureCount: item.alerts?.highTemperatureCount || 0,
        highBpmCount: item.alerts?.highBpmCount || 0
    }
});
// Funzione per aggregare più giorni di statistiche in un unico riepilogo
const aggregateSummary = (items) => {
    const totals = {
        days: items.length,
        stepsTotal: 0,
        outdoorHoursTotal: 0,
        temperatureMin: null,
        temperatureMax: null,
        temperatureAvg: null,
        bpmMin: null,
        bpmMax: null,
        bpmAvg: null,
        alerts: {
            lowActivityCount: 0,
            highTemperatureCount: 0,
            highBpmCount: 0
        }
    };

    let tempSum = 0;
    let tempCount = 0;
    let bpmSum = 0;
    let bpmCount = 0;

    for (const item of items) {
        const daily = summarizeDailyStat(item);

        if (Number.isFinite(daily.steps)) {
            totals.stepsTotal += daily.steps;
        }
        if (Number.isFinite(daily.outdoorHours)) {
            totals.outdoorHoursTotal += daily.outdoorHours;
        }

        if (Number.isFinite(daily.temperature.min)) {
            totals.temperatureMin = totals.temperatureMin === null
                ? daily.temperature.min
                : Math.min(totals.temperatureMin, daily.temperature.min);
        }
        if (Number.isFinite(daily.temperature.max)) {
            totals.temperatureMax = totals.temperatureMax === null
                ? daily.temperature.max
                : Math.max(totals.temperatureMax, daily.temperature.max);
        }
        if (Number.isFinite(daily.temperature.avg)) {
            tempSum += daily.temperature.avg;
            tempCount += 1;
        }

        if (Number.isFinite(daily.bpm.min)) {
            totals.bpmMin = totals.bpmMin === null
                ? daily.bpm.min
                : Math.min(totals.bpmMin, daily.bpm.min);
        }
        if (Number.isFinite(daily.bpm.max)) {
            totals.bpmMax = totals.bpmMax === null
                ? daily.bpm.max
                : Math.max(totals.bpmMax, daily.bpm.max);
        }
        if (Number.isFinite(daily.bpm.avg)) {
            bpmSum += daily.bpm.avg;
            bpmCount += 1;
        }

        totals.alerts.lowActivityCount += daily.alerts.lowActivityCount;
        totals.alerts.highTemperatureCount += daily.alerts.highTemperatureCount;
        totals.alerts.highBpmCount += daily.alerts.highBpmCount;
    }

    totals.stepsTotal = Number(totals.stepsTotal.toFixed(2));
    totals.outdoorHoursTotal = Number(totals.outdoorHoursTotal.toFixed(2));
    totals.temperatureAvg = tempCount > 0 ? Number((tempSum / tempCount).toFixed(2)) : null;
    totals.bpmAvg = bpmCount > 0 ? Number((bpmSum / bpmCount).toFixed(2)) : null;
    return totals;
};
// Funzione per pseudonimizzare l'ID dell'animale combinandolo con il numero del lotto
const pseudonymizeAnimalId = (animalId, lotNumber) => {
    const source = `${animalId}:${lotNumber}:muccapp-traceability`;
    return crypto.createHash('sha256').update(source).digest('hex').slice(0, 12).toUpperCase();
};

const roundTo = (value, decimals = 2) => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};
// Controlla se l'utente ha accesso in lettura all'azienda, considerando sia i proprietari che i veterinari autorizzati
const assertAziendaReadableByUser = async (req, aziendaId) => {
    if (req.user.userType === 'allevatore') {
        return assertAziendaOwnedByUser(aziendaId, req.user.userId);
    }

    if (req.user.userType === 'veterinario') {
        const item = await Azienda.findById(aziendaId)
            .select('_id authorizedVeterinarianIds ownerUserId');
        if (!item) {
            return { ok: false, status: 404, message: 'Azienda non trovata' };
        }

        const allowed = Array.isArray(item.authorizedVeterinarianIds)
            && item.authorizedVeterinarianIds.some((id) => String(id) === String(req.user.userId));

        if (!allowed) {
            return { ok: false, status: 403, message: 'Veterinario non autorizzato su questa azienda' };
        }

        return { ok: true };
    }

    return { ok: false, status: 403, message: 'Ruolo non autorizzato' };
};
// Funzione per caricare la tracciabilità di un lotto prodotto a partire dal suo numero di lotto, con opzione per includere più giorni di statistiche
const loadTraceabilityByLotNumber = async (lotNumber, { statsDays = 7 } = {}) => {
    const lotto = await LottoProdotto.findOne({ lotNumber })
        .select('_id lotNumber nomeProdotto quantity unit createdAt lavorazioneId aziendaId qrCodeValue qrCodeImage');

    if (!lotto) {
        return null;
    }

    const lavorazione = await Lavorazione.findById(lotto.lavorazioneId)
        .select('_id startedAt endedAt status outputName outputQuantity outputUnit inputs notes fasi');

    const mungituraIds = (lavorazione?.inputs || [])
        .flatMap((input) => Array.isArray(input.mungituraIds) ? input.mungituraIds : [])
        .filter(Boolean);

    const mungiture = mungituraIds.length
        ? await Mungitura.find({ _id: { $in: mungituraIds } })
            .select('_id animaleId startedAt endedAt quantity unit status notes semiLavoratoId')
            .sort({ startedAt: 1 })
        : [];

    const animaleIds = [...new Set(mungiture.map((item) => String(item.animaleId)))].filter(Boolean);
    const animali = animaleIds.length
        ? await Animale.find({ _id: { $in: animaleIds } }).select('_id name matricola species sesso')
        : [];

    const animaleById = new Map(animali.map((item) => [String(item._id), item]));

    const statsByAnimale = new Map();
    for (const animaleId of animaleIds) {
        const rows = await IotDailyStat.find({ animaleId })
            .sort({ day: -1 })
            .limit(statsDays);
        statsByAnimale.set(animaleId, {
            summary: aggregateSummary(rows),
            daysCount: rows.length
        });
    }

    const timeline = [];
    for (const mungitura of mungiture) {
        timeline.push({
            type: 'mungitura',
            at: mungitura.startedAt,
            status: mungitura.status,
            quantity: mungitura.quantity,
            unit: mungitura.unit,
            mungituraId: mungitura._id,
            animaleId: mungitura.animaleId
        });
    }

    if (lavorazione) {
        timeline.push({
            type: 'lavorazione',
            at: lavorazione.startedAt,
            status: lavorazione.status,
            outputQuantity: lavorazione.outputQuantity,
            outputUnit: lavorazione.outputUnit,
            lavorazioneId: lavorazione._id
        });
    }

    timeline.push({
        type: 'lotto',
        at: lotto.createdAt,
        status: 'completato',
        quantity: lotto.quantity,
        unit: lotto.unit,
        lottoId: lotto._id
    });

    timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return {
        lotto,
        lavorazione,
        mungiture,
        animaleIds,
        animaleById,
        statsByAnimale,
        timeline
    };
};

router.use(checkAuth);
router.use(checkUserType(['allevatore', 'veterinario']));

// GET /api/tracciabilita/lotti?aziendaId=... - elenco lotti per vista master-detail allevatore/veterinario.
router.get('/lotti', async (req, res) => {
    try {
        const aziendaId = typeof req.query.aziendaId === 'string' ? req.query.aziendaId.trim() : '';
        if (!aziendaId) {
            return res.status(400).json({ message: 'aziendaId obbligatorio' });
        }

        if (!isValidObjectId(aziendaId)) {
            return res.status(400).json({ message: 'aziendaId non valido' });
        }

        const auth = await assertAziendaReadableByUser(req, aziendaId);
        if (!auth.ok) {
            return res.status(auth.status || 403).json({ message: auth.message });
        }

        const lotti = await LottoProdotto.find({ aziendaId })
            .select('_id lotNumber nomeProdotto quantity unit createdAt lavorazioneId')
            .sort({ createdAt: -1 })
            .limit(200);

        const lavorazioneIds = [...new Set(lotti.map((item) => String(item.lavorazioneId || '')).filter(Boolean))];
        const lavorazioni = lavorazioneIds.length
            ? await Lavorazione.find({ _id: { $in: lavorazioneIds } }).select('_id status')
            : [];

        const lavorazioneById = new Map(lavorazioni.map((item) => [String(item._id), item]));

        const items = lotti.map((lotto) => {
            const lavorazione = lavorazioneById.get(String(lotto.lavorazioneId || ''));
            return {
                id: lotto._id,
                lotNumber: lotto.lotNumber,
                nomeProdotto: lotto.nomeProdotto,
                quantity: lotto.quantity,
                unit: lotto.unit,
                createdAt: lotto.createdAt,
                status: lavorazione?.status || 'n/d'
            };
        });

        return res.status(200).json({ items });
    } catch (error) {
        console.error('Errore elenco lotti tracciabilità privata:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

router.get('/animali/:animaleId/stats', async (req, res) => {
    try {
        const { animaleId } = req.params;
        const fromDate = parseDateStrict(req.query.from);
        const toDate = parseDateStrict(req.query.to);

        if (!isValidObjectId(animaleId)) {
            return res.status(400).json({ message: 'animaleId non valido' });
        }

        if (!fromDate || !toDate) {
            return res.status(400).json({ message: 'from e to sono obbligatori e devono essere date valide' });
        }

        if (fromDate.getTime() > toDate.getTime()) {
            return res.status(400).json({ message: 'from deve essere minore o uguale a to' });
        }

        const animale = await Animale.findById(animaleId).select('_id aziendaId name matricola');
        if (!animale) {
            return res.status(404).json({ message: 'Animale non trovato' });
        }

        const auth = await assertAziendaReadableByUser(req, animale.aziendaId);
        if (!auth.ok) {
            return res.status(auth.status || 403).json({ message: auth.message });
        }

        const dayFrom = startOfUtcDay(fromDate);
        const dayTo = endOfUtcDay(toDate);

        const items = await IotDailyStat.find({
            animaleId: animale._id,
            day: { $gte: dayFrom, $lte: dayTo }
        }).sort({ day: 1 });

        return res.status(200).json({
            animale: {
                id: animale._id,
                name: animale.name,
                matricola: animale.matricola,
                aziendaId: animale.aziendaId
            },
            range: {
                from: dayFrom.toISOString(),
                to: dayTo.toISOString()
            },
            summary: aggregateSummary(items),
            days: items.map(summarizeDailyStat)
        });
    } catch (error) {
        console.error('Errore stats storico IoT animale:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

// GET /api/tracciabilita/lotti/:lotNumber - endpoint privato per allevatore/veterinario autorizzato.
router.get('/lotti/:lotNumber', async (req, res) => {
    try {
        const lotNumber = typeof req.params.lotNumber === 'string' ? req.params.lotNumber.trim() : '';
        if (!lotNumber) {
            return res.status(400).json({ message: 'lotNumber obbligatorio' });
        }

        const trace = await loadTraceabilityByLotNumber(lotNumber, { statsDays: 30 });
        if (!trace?.lotto) {
            return res.status(404).json({ message: 'Lotto non trovato' });
        }

        const auth = await assertAziendaReadableByUser(req, trace.lotto.aziendaId);
        if (!auth.ok) {
            return res.status(auth.status || 403).json({ message: auth.message });
        }

        const animalsPrivate = trace.animaleIds.map((animaleId) => {
            const animale = trace.animaleById.get(animaleId);
            const stats = trace.statsByAnimale.get(animaleId) || { summary: aggregateSummary([]), daysCount: 0 };
            const summary = stats.summary;
            return {
                id: animale?._id || animaleId,
                name: animale?.name || 'Animale',
                matricola: animale?.matricola || null,
                species: animale?.species || null,
                sesso: animale?.sesso || null,
                benessere: {
                    steps30d: summary.stepsTotal,
                    outdoorHours30d: summary.outdoorHoursTotal,
                    temperature: {
                        min: summary.temperatureMin,
                        max: summary.temperatureMax,
                        avg: summary.temperatureAvg
                    },
                    bpm: {
                        min: summary.bpmMin,
                        max: summary.bpmMax,
                        avg: summary.bpmAvg
                    },
                    alerts: summary.alerts
                }
            };
        });

        return res.status(200).json({
            lotto: {
                id: trace.lotto._id,
                aziendaId: trace.lotto.aziendaId,
                lotNumber: trace.lotto.lotNumber,
                nomeProdotto: trace.lotto.nomeProdotto,
                quantity: trace.lotto.quantity,
                unit: trace.lotto.unit,
                createdAt: trace.lotto.createdAt,
                lavorazioneId: trace.lotto.lavorazioneId,
                qrCodeValue: trace.lotto.qrCodeValue || null,
                qrCodeImage: trace.lotto.qrCodeImage || null
            },
            lavorazione: trace.lavorazione,
            mungiture: trace.mungiture,
            timeline: trace.timeline,
            animals: animalsPrivate
        });
    } catch (error) {
        console.error('Errore tracciabilità privata lotto:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

// GET /api/tracciabilita/public/lotti/:lotNumber - endpoint pubblico per il consumatore.
publicRouter.get('/lotti/:lotNumber', async (req, res) => {
    try {
        const lotNumber = typeof req.params.lotNumber === 'string' ? req.params.lotNumber.trim() : '';
        if (!lotNumber) {
            return res.status(400).json({ message: 'lotNumber obbligatorio' });
        }

        const trace = await loadTraceabilityByLotNumber(lotNumber, { statsDays: 7 });
        if (!trace?.lotto) {
            return res.status(404).json({ message: 'Lotto non trovato' });
        }

        const azienda = await Azienda.findById(trace.lotto.aziendaId).select('_id companyName');

        const animalsPublic = trace.animaleIds.map((animaleId) => {
            const animale = trace.animaleById.get(animaleId);
            const stats = trace.statsByAnimale.get(animaleId) || { summary: aggregateSummary([]), daysCount: 0 };
            const summary = stats.summary;
            const daysCount = Math.max(stats.daysCount || 0, 1);
            const stepsDailyAvg = roundTo(summary.stepsTotal / daysCount, 0);
            const outdoorPercent = roundTo((summary.outdoorHoursTotal / (daysCount * 24)) * 100, 1);
            return {
                label: animale?.name || 'Animale',
                benessere: {
                    stepsDailyAvg,
                    outdoorPercent
                }
            };
        });

        return res.status(200).json({
            lotto: {
                lotNumber: trace.lotto.lotNumber,
                nomeProdotto: trace.lotto.nomeProdotto,
                quantity: trace.lotto.quantity,
                unit: trace.lotto.unit,
                createdAt: trace.lotto.createdAt
            },
            producer: {
                id: azienda?._id || trace.lotto.aziendaId,
                companyName: azienda?.companyName || 'Azienda produttrice'
            },
            timeline: trace.timeline,
            animals: animalsPublic
        });
    } catch (error) {
        console.error('Errore tracciabilità pubblica lotto:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
});

export { publicRouter as publicTracciabilitaRoutes, router as tracciabilitaRoutes };