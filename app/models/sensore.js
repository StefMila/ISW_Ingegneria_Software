import mongoose from 'mongoose';

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
        values: ['ambientale', 'indossabile', 'stoccaggio', 'pesatura'],
        message: '{VALUE} non è un tipo di dispositivo valido'
      }
    },
    tipoDatoRaccolto: {
      type: String,
      required: [true, 'Il tipo di dato raccolto è obbligatorio'],
      enum: {
        values: ['temperatura', 'frequenza_cardiaca', 'livello_passi', 'esposizione_solare', 'posizione_gps'],
        message: '{VALUE} non è un tipo di dato valido'
      }
    },
    unitaMisura: {
      type: String,
      required: [true, "L'unità di misura è obbligatoria"],
      enum: {
        values: ['°C', 'bpm', 'passi', 'ore', 'coordinate'],
        message: '{VALUE} non è un\'unità di misura valida'
      }
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