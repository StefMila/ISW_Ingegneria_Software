import mongoose from 'mongoose';

const capacitaSchema = new mongoose.Schema({
  tipoDato: {
    type: String,
    required: true,
    enum: ['temperatura', 'frequenza_cardiaca', 'livello_passi', 'esposizione_solare', 'posizione_gps', 'peso']
  },
  unitaMisura: {
    type: String,
    required: true,
    enum: ['°C', 'bpm', 'passi', 'ore', 'coordinate', 'litri']
  }
}, { _id: false }); // _id: false evita che Mongoose crei un ID per ogni singola capacità

const sensoreSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Il nome del dispositivo è obbligatorio'],
      trim: true
    },
    tipoDispositivo: {
      type: String,
      required: [true, 'Il tipo di dispositivo è obbligatorio'],
      enum: {
        values: ['ambientale', 'indossabile', 'stoccaggio', 'mungitura'],
        message: '{VALUE} non è un tipo di dispositivo valido'
      }
    },
    // Array di metriche supportate
    capacita: {
      type: [capacitaSchema],
      validate: [v => v.length > 0, 'Il dispositivo deve avere almeno una capacità di misurazione']
    },
    stato: {
      type: String,
      enum: ['attivo', 'offline'],
      default: 'attivo'
    },
    aziendaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Azienda',
      required: [true, 'L\'associazione all\'azienda è obbligatoria']
    },
    animaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animale',
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model('Sensore', sensoreSchema);