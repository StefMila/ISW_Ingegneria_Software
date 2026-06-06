import mongoose from 'mongoose';

const metricWindowSchema = new mongoose.Schema({
	first: { type: Number, required: false },
	last: { type: Number, required: false },
	min: { type: Number, required: false },
	max: { type: Number, required: false },
	sum: { type: Number, required: false, default: 0 },
	count: { type: Number, required: false, default: 0 }
}, { _id: false });

// Statistiche giornaliere aggregate per sensore e animale (se applicabile)
const iotDailyStatSchema = new mongoose.Schema({
	aziendaId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Azienda',
		required: true,
		index: true
	},
	animaleId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Animale',
		required: false,
		index: true
	},
	sensoreId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Sensore',
		required: true,
		index: true
	},
	day: {
		type: Date,
		required: true,
		index: true
	},
	processPhase: {
		type: String,
		enum: ['benessere', 'mungitura', 'lavorazione', 'ambientale', 'stoccaggio', 'lotto', 'sconosciuta'],
		default: 'sconosciuta',
		required: true
	},
	metrics: {
		steps: { type: metricWindowSchema, default: () => ({}) },
		outdoor: { type: metricWindowSchema, default: () => ({}) },
		temperature: { type: metricWindowSchema, default: () => ({}) },
		bpm: { type: metricWindowSchema, default: () => ({}) }
	},
	alerts: {
		lowActivityCount: { type: Number, default: 0 },
		highTemperatureCount: { type: Number, default: 0 },
		highBpmCount: { type: Number, default: 0 }
	}
}, {
	timestamps: true
});

iotDailyStatSchema.index({ sensoreId: 1, day: 1 }, { unique: true });
iotDailyStatSchema.index({ animaleId: 1, day: 1 });
iotDailyStatSchema.index({ aziendaId: 1, day: 1 });

const IotDailyStat = mongoose.model('IotDailyStat', iotDailyStatSchema);

export default IotDailyStat;