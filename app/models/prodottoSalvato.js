import mongoose from 'mongoose';

const prodottoSalvatoSchema = new mongoose.Schema({
    utenteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utente', // Sostituisci con il nome esatto del tuo modello Utente/User
        required: true,
        index: true
    },
    lottoProdottoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LottoProdotto',
        required: true,
        index: true
    },
    scansionatoAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// CRITICO: Indice composto unico. Lo stesso utente NON può salvare lo stesso lotto più di una volta.
prodottoSalvatoSchema.index({ utenteId: 1, lottoProdottoId: 1 }, { unique: true });

const ProdottoSalvato = mongoose.model('ProdottoSalvato', prodottoSalvatoSchema);

export default ProdottoSalvato;