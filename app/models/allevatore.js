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
        required: true, 
        index: true
    },
    // campo obbligatorio 
    vatNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
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

const Allevatore = mongoose.model('Allevatore', allevatoreSchema);
export default Allevatore;
