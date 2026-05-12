import mongoose from 'mongoose';
const { Schema } = mongoose;

const allevatoreSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Questo campo è una Foreign Key che fa riferimento al modello User, indicando quale utente è l'allevatore
    ownerUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // campo obbligatorio 
    vatNumber: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    emailAzienda: {
        type: String,
        trim: true,
        lowercase: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },
}, { timestamps: true });

const Allevatore = mongoose.model('Allevatore', allevatoreSchema);
export default Allevatore;
