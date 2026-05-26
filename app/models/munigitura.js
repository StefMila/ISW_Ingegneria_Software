import mongoose from 'mongoose';
const mungituraSchema = new mongoose.Schema({
    // Questo campo è una Foreign Key che fa riferimento al modello Azienda
    aziendaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Azienda',
        required: true,
        index: true
    },
    animaleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animale',
        required: true,
        index: true
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endedAt: {
        type: Date,
        required: false,
    },
    quantity: {
        type: Number,
        required: false,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ['litri', 'kg', 'pezzi'], // Esempio di unità di misura
        default: 'litri'
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
    }
}, {
    timestamps: true // Aggiunge automaticamente createdAt e updatedAt
});

mungituraSchema.path('endedAt').validate(function (value) {
    if (!value) {
        return true;
    }
    return value >= this.startedAt;
}, 'endedAt deve essere maggiore o uguale a startedAt');

mungituraSchema.path('quantity').validate(function (value) {
    if (this.status !== 'completata') {
        return true;
    }
    return typeof value === 'number' && value >= 0;
}, 'quantity è obbligatoria e deve essere >= 0 quando la mungitura è completata');

const Mungitura = mongoose.model('Mungitura', mungituraSchema);
export default Mungitura;