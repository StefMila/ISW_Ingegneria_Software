import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventoSchema = new Schema({
  ownerUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  aziendaId: {
    type: Schema.Types.ObjectId,
    ref: 'Azienda',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  startAt: {
    type: Date,
    required: true,
    index: true
  },
  endAt: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: false,
    trim: true
  },
  locationAddress: {
    type: String,
    required: false,
    trim: true
  },
  lat: {
    type: Number,
    required: false
  },
  lng: {
    type: Number,
    required: false
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  link: {
    type: String,
    required: false,
    trim: true
  },
  reminderMinutes: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
    max: 10080
  },
  visibility: {
    type: String,
    required: true,
    enum: ['private', 'public'],
    default: 'private'
  },
  recurrenceType: {
    type: String,
    required: true,
    enum: ['single', 'weekly', 'monthly'],
    default: 'single'
  },
  recurrenceInterval: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 52
  },
  recurrenceUntil: {
    type: Date,
    required: false
  },
  googleCalendarEventId: {
    type: String,
    required: false,
    trim: true
  },
  googleSyncedAt: {
    type: Date,
    required: false
  }
}, { timestamps: true });

eventoSchema.pre('validate', function() {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'L\'orario di fine deve essere successivo all\'orario di inizio');
  }

  if (this.recurrenceType === 'single') {
    this.recurrenceUntil = undefined;
    this.recurrenceInterval = 1;
  }

  if (this.recurrenceType !== 'single') {
    if (this.recurrenceUntil && this.startAt && this.recurrenceUntil < this.startAt) {
      this.invalidate('recurrenceUntil', 'La data fine ricorrenza deve essere successiva alla data di inizio');
    }
  }
});

eventoSchema.index({ ownerUserId: 1, aziendaId: 1, startAt: 1 });

const Evento = mongoose.model('Evento', eventoSchema);
export default Evento;
