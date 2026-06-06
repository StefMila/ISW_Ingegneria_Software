import mongoose from 'mongoose';
// schema per generare il codice del lotto prodotto, con riferimento alla lavorazione e all'azienda
const toSlugToken = (value, maxLen = 10) => {
    if (!value || typeof value !== 'string') {
        return 'PROD';
    }

    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!normalized) {
        return 'PROD';
    }

    return normalized.slice(0, maxLen);
};

const formatDateToken = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const lottoProdottoSchema = new mongoose.Schema({
    aziendaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Azienda',
        required: true,
        index: true
    },
    lavorazioneId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lavorazione',
        required: true,
        index: true
    },
    nomeProdotto: {
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
    lotNumber: {
        type: String,
        required: false,
        trim: true,
        index: true,
        unique: true
    },
    qrCodeValue: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    qrCodeImage: {
        type: String,
        required: false,
        trim: true
    },
    labelsPrinted: {
        type: Boolean,
        required: true,
        default: false,
        index: true
    },
    labelsPrintedCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    labelsLastPrintedAt: {
        type: Date,
        required: false
    },
    labelsLastExpiryDate: {
        type: Date,
        required: false
    },
    labelsLastPrintCopies: {
        type: Number,
        required: false,
        min: 1
    }
}, {
    timestamps: true
});
lottoProdottoSchema.pre('validate', async function () {
    if (this.lotNumber) {
        return;
    }

    const dateToken = formatDateToken(new Date());
    const productToken = toSlugToken(this.nomeProdotto, 10);
    const prefix = `LOT-${productToken}-${dateToken}`;

    let sequence = await this.constructor.countDocuments({
        lotNumber: new RegExp(`^${prefix}-`) 
    }) + 1;

    let candidate = `${prefix}-${String(sequence).padStart(3, '0')}`;

    while (await this.constructor.exists({ lotNumber: candidate })) {
        sequence += 1;
        candidate = `${prefix}-${String(sequence).padStart(3, '0')}`;
    }
    this.lotNumber = candidate; 
});

const LottoProdotto = mongoose.model('LottoProdotto', lottoProdottoSchema);

export default LottoProdotto;