import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import User from '../app/models/user.js';
import Azienda from '../app/models/azienda.js';
import Evento from '../app/models/evento.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO_URI = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
const SEED_MARKER = '[seed-eventi-stats-v1]';

if (!MONGO_URI) {
  console.error('Variabile DB_URL non trovata nel file server/.env');
  process.exit(1);
}

const buildEventsForYear = ({ year, ownerUserId, aziendaId }) => {
  const monthLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  return monthLabels.map((label, month) => {
    const startAt = new Date(Date.UTC(year, month, 12 + (month % 5), 8 + (month % 3), 0, 0));
    const endAt = new Date(startAt.getTime() + (90 + (month % 2) * 30) * 60000);

    return {
      ownerUserId,
      aziendaId,
      title: `Controllo produzione ${label} ${year}`,
      type: month % 2 === 0 ? 'produzione' : 'sanitario',
      startAt,
      endAt,
      location: 'Azienda Agricola Test',
      locationAddress: 'Via della Campagna 1, Bergamo',
      description: `${SEED_MARKER} Evento demo per calendario e filtri`,
      reminderMinutes: 60,
      visibility: month % 3 === 0 ? 'public' : 'private',
      recurrenceType: 'single',
      recurrenceInterval: 1
    };
  });
};

async function seedEventi() {
  console.log('Connessione a MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connesso.');

  const allevatore = await User.findOne({ email: 'allevatore@muccapp.it' }).select('_id email');
  if (!allevatore) {
    throw new Error('Utente allevatore@muccapp.it non trovato. Esegui prima: npm run seed');
  }

  const azienda = await Azienda.findOne({ ownerUserId: allevatore._id }).sort({ createdAt: 1 }).select('_id companyName');
  if (!azienda) {
    throw new Error('Nessuna azienda trovata per l\'allevatore di test. Esegui prima: npm run seed');
  }

  const deleteResult = await Evento.deleteMany({
    ownerUserId: allevatore._id,
    aziendaId: azienda._id,
    description: { $regex: `^${SEED_MARKER}` }
  });
  console.log(`Eventi seed precedenti rimossi: ${deleteResult.deletedCount}`);

  const docs = [
    ...buildEventsForYear({ year: 2024, ownerUserId: allevatore._id, aziendaId: azienda._id }),
    ...buildEventsForYear({ year: 2025, ownerUserId: allevatore._id, aziendaId: azienda._id }),
    ...buildEventsForYear({ year: 2026, ownerUserId: allevatore._id, aziendaId: azienda._id })
  ];

  const inserted = await Evento.insertMany(docs, { ordered: true });

  console.log(`Eventi inseriti: ${inserted.length}`);
  console.log(`Azienda target: ${azienda.companyName} (${azienda._id})`);

  await mongoose.disconnect();
  console.log('Disconnesso. Seed eventi completato.');
}

seedEventi().catch(async (error) => {
  console.error('Errore seed eventi:', error.message || error);
  await mongoose.disconnect();
  process.exit(1);
});
