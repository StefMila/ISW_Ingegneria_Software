import mongoose from "mongoose";
const { Schema } = mongoose;

const animaleSchema = new Schema({
    matricola: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    //questo campo fatto in ottica futura che potrebbe essere usato per altre specie animale.
    species: {
        type: String,
        required: true,
        trim: true,
        enum: ['mucca', 'pecora', 'capra', 'pollo', 'coniglio'] , // esempio di specie comuni in un'azienda agricola
        default: 'mucca' // valore di default se non specificato
    },
    dataNascita: {
        type: Date,
        required: true
    },
    sesso: {
        type: String,
        required: true,
        enum: ['maschio', 'femmina']
    },
    razza: {
        type: String,
        required: false,
        trim: true
    },
    figliaDi: {
        type: String,
        required: false,
        trim: true
    },
    //campo che indica a quale azienda appartiene l'animale, è una Foreign Key che fa riferimento al modello Azienda
    aziendaId: {
        type: Schema.Types.ObjectId,
        ref: 'Azienda',
        required: true,
        index: true
    },
    note: {
        type: String,
        required: false,
        trim: true
    }
}, { timestamps: true });

const animale = mongoose.model('Animale', animaleSchema);
export default animale;