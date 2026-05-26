import mongoose from 'mongoose';
const { Schema } = mongoose;
// definisce l'input di una lavorazione
const lavorazioneInputSchema = new Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    mungituraIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Mungitura'
    }]
}, { _id: false });
// definisce una fase di lavorazione, ad esempio "salatura", "stagionatura", ecc.
const lavorazioneFaseSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        required: true,
        default: false
    }
}, { _id: false });
// schema principale per la lavorazione del latte
const lavorazioneSchema = new Schema({
    // riferimento all'azienda che esegue la lavorazione
    aziendaId: {
        type: Schema.Types.ObjectId,
        ref: 'Azienda',
        required: true,
        index: true
    },
    tipoLavorazione: {
        type: String,
        required: true,
        enum: ['primo-sale', 'formaggio', 'yogurt', 'altro'],
        trim: true,
        index: true
    },
    nomeTemplate: {
        type: String,
        required: false,
        trim: true
    },
    isTemplate: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    endedAt: {
        type: Date,
        required: false
    },
    notes: {
        type: String,
        required: false,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['in_corso', 'completata', 'annullata'],
        default: 'in_corso',
        index: true
    },
    inputs: {
        type: [lavorazioneInputSchema],
        default: []
    },
    fasi: {
        type: [lavorazioneFaseSchema],
        default: []
    },
    outputName: {
        type: String,
        required: false,
        trim: true
    },
    outputQuantity: {
        type: Number,
        required: false,
        min: 0
    },
    outputUnit: {
        type: String,
        required: false,
        trim: true
    }
}, {
    timestamps: true
});

lavorazioneSchema.path('endedAt').validate(function (value) {
    if (!value) {
        return true;
    }
    return value >= this.startedAt;
}, 'endedAt deve essere maggiore o uguale a startedAt');

lavorazioneSchema.path('outputQuantity').validate(function (value) {
    if (this.status !== 'completata') {
        return true;
    }
    return typeof value === 'number' && value >= 0;
}, 'outputQuantity deve essere un numero maggiore o uguale a 0 quando lo status è completata');

const Lavorazione = mongoose.model('Lavorazione', lavorazioneSchema);

export default Lavorazione;