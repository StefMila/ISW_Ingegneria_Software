import mongoose from 'mongoose';
const { Schema } = mongoose;

const puntoVenditaSchema = new Schema({
    // Questo campo è una Foreign Key che fa riferimento al modello User, indicando quale utente è il punto vendita
    ownerUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    },
    nomePunto: {
        type: String,
        required: true,
        trim: true
    },
    //indirizzo testuale, da geocodificare per ottenere latitudine e longitudine
    indirizzo: {
        type: String,
        required: true,
        trim: true
    },
    geo: {
        // Oggetto con latitudine e longitudine, utile per salvataggio rapido e query
        lat: { type: Number, required: false },
        lng: { type: Number, required: false }
    },
    emailPunto: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    phoneNumber: {
        type: String,
        required: false,
        trim: true
    },
    website: {
        type: String,
        required: false,
        trim: true
    },
    description: {
        type: String,
        required: false,
        trim: true
    },
    categories: [{
        type: String,
        required: false,
        lowercase: true,
        trim: true
    }],
    // Dati di geolocalizzazione associati all'indirizzo (longitudine e latitudine)
    formattedAddress: {
        type: String,
        required: false,
        trim: true
    },
    placeId: {
        type: String,
        required: false,
        trim: true,
        index: true
    },
    // Campi per facilitare ricerche e filtri
    city: {
        type: String,
        required: false,
        trim: true,
        index: true
    },
    province: {
        type: String,
        required: false,
        trim: true,
        index: true
    }
}, { timestamps: true });

const PuntoVendita = mongoose.model('PuntoVendita', puntoVenditaSchema);
export default PuntoVendita;
