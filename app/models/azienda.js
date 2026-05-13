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
        required: false, // In attesa del middleware di autenticazione, questo campo può essere opzionale --> poi impostare su true
        index: true
    },
    // campo obbligatorio 
    vatNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
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
}, { timestamps: true });

const Azienda = mongoose.model('Azienda', aziendaSchema);
export default Azienda;
