import mongoose from 'mongoose';

const { Schema } = mongoose;

const googleCalendarIntegrationSchema = new Schema({
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
  accountEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  calendarId: {
    type: String,
    required: true,
    default: 'primary',
    trim: true
  },
  privateCalendarId: {
    type: String,
    required: false,
    trim: true
  },
  publicCalendarId: {
    type: String,
    required: false,
    trim: true
  },
  syncMode: {
    type: String,
    required: true,
    enum: ['manuale', 'automatica'],
    default: 'manuale'
  },
  defaultReminderMinutes: {
    type: Number,
    required: true,
    default: 30,
    min: 0,
    max: 10080
  },
  connected: {
    type: Boolean,
    required: true,
    default: false
  },
  accessToken: {
    type: String,
    required: false
  },
  refreshToken: {
    type: String,
    required: false
  },
  tokenType: {
    type: String,
    required: false
  },
  scope: {
    type: String,
    required: false
  },
  expiryDate: {
    type: Date,
    required: false
  }
}, { timestamps: true });

googleCalendarIntegrationSchema.index({ ownerUserId: 1, aziendaId: 1 }, { unique: true });

const GoogleCalendarIntegration = mongoose.model('GoogleCalendarIntegration', googleCalendarIntegrationSchema);
export default GoogleCalendarIntegration;
