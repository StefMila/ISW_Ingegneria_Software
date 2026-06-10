import mongoose from 'mongoose';
const { Schema } = mongoose;

const aziendaSchema = new Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    // Questo campo è una Foreign Key che fa riferimento al modello User, indicando quale utente è l'azienda
    ownerUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    authorizedVeterinarianIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    }],
    // campo obbligatorio 
    vatNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Indirizzo testuale (opzionale): la posizione principale e' gestita dalle coordinate
    address: {
        type: String,
        required: false,
        trim: true
    },
    // Dati di geolocalizzazione associati all'indirizzo (longitudine e latitudine)
    geo: {
        // Oggetto con latitudine e longitudine, utile per salvataggio rapido e query
        lng: { type: Number, required: false },
        lat: { type: Number, required: false }
    },
    //email da esporre nel sito
    emailAzienda: {
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
    foto: {
        type: String,
        required: false,
        trim: true,
        default: undefined
    },
    //descrizione da esporre nel sito
    description: {
        type: String,
        required: false,
        trim: true
    },
    //categorie di prodotti offerti dall'azienda.
    categories: [{
        type: String,
        required: false,
        lowercase: true,
        trim: true
    }],
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
    },
    country: {
        type: String,
        required: false,
        trim: true,
        index: true
    },
    // Campo GeoJSON usato come fonte principale della geolocalizzazione
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: false
        },
        coordinates: {
            type: [Number], // [longitudine, latitudine]
            required: false,
            validate: {
                validator: function (value) {
                    return Array.isArray(value) && value.length === 2;
                },
                message: 'Location.coordinate deve contenere [longitudine, latitudine]'
            }
        }
    }
}, { timestamps: true });

// Evita di salvare GeoJSON incompleto: se esiste location, devono esistere entrambe le coordinate
aziendaSchema.pre('validate', function() {
    const hasLocation = !!this.location;
    const hasCoordinates = !!(this.location && Array.isArray(this.location.coordinates));

    if (hasLocation && !hasCoordinates) {
        this.location = undefined;
    }
});

aziendaSchema.index({ location: '2dsphere' });
aziendaSchema.index({ companyName: 'text', description: 'text', categories: 'text', city: 'text', province: 'text', country: 'text' });

const Azienda = mongoose.model('Azienda', aziendaSchema);
export default Azienda;
