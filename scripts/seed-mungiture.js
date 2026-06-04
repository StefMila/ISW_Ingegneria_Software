import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import User from '../app/models/user.js';
import Azienda from '../app/models/azienda.js';
import Animale from '../app/models/animale.js';
import Mungitura from '../app/models/munigitura.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO_URI = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
const SEED_MARKER = '[seed-mungiture-stats-v1]';

if (!MONGO_URI) {
  console.error('Variabile DB_URL non trovata nel file server/.env');
  process.exit(1);
}

const buildMungitureForYear = ({ year, animaleIds, maxDate }) => {
  const records = [];

  for (let month = 0; month < 12; month += 1) {
    animaleIds.forEach((animaleId, animalIndex) => {
      const day = 8 + ((month + animalIndex) % 14);
      const hour = 5 + animalIndex;
      const startedAt = new Date(Date.UTC(year, month, day, hour, 10, 0));
      const endedAt = new Date(startedAt.getTime() + (75 + animalIndex * 10) * 60000);
      const quantity = Number((17.5 + ((month + 1) * 0.85) + animalIndex * 2.15 + (year - 2023) * 0.9).toFixed(2));

      if (startedAt > maxDate) {
        return;
      }

      records.push({
        animaleId,
        startedAt,
        endedAt,
        quantity,
        unit: 'litri',
        status: 'completata'
      });
    });

    if (month % 3 === 0 && animaleIds[0]) {
      const extraStartedAt = new Date(Date.UTC(year, month, 20, 16, 30, 0));
      if (extraStartedAt > maxDate) {
        continue;
      }

      records.push({
        animaleId: animaleIds[0],
        startedAt: extraStartedAt,
        endedAt: new Date(extraStartedAt.getTime() + 50 * 60000),
        quantity: Number((13.25 + month * 0.4 + (year - 2023) * 0.5).toFixed(2)),
        unit: 'litri',
        status: 'completata'
      });
    }
  }

  return records;
};

async function seedMungiture() {
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

  const animali = await Animale.find({ aziendaId: azienda._id }).sort({ matricola: 1 }).limit(3).select('_id matricola name');
  if (animali.length < 2) {
    throw new Error('Servono almeno 2 animali per generare dati statistici. Esegui prima: npm run seed');
  }

  const animaleIds = animali.map((item) => item._id);

  const deleteResult = await Mungitura.deleteMany({ aziendaId: azienda._id });
  console.log(`Mungiture esistenti rimosse per l'azienda: ${deleteResult.deletedCount}`);

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const yearsToSeed = [];
  for (let year = 2024; year <= currentYear; year += 1) {
    yearsToSeed.push(year);
  }

  const seedRecords = yearsToSeed.flatMap((year) =>
    buildMungitureForYear({ year, animaleIds, maxDate: now })
  );

  const docs = seedRecords
    .filter((record) => record.startedAt <= now && record.endedAt <= now)
    .map((record, index) => ({
      aziendaId: azienda._id,
      animaleId: record.animaleId,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      quantity: record.quantity,
      unit: record.unit,
      status: record.status,
      semiLavoratoId: `SL-SEED-${record.startedAt.getUTCFullYear()}-${String(record.startedAt.getUTCMonth() + 1).padStart(2, '0')}-${String(index + 1).padStart(3, '0')}`,
      notes: `${SEED_MARKER} Dato demo per grafici stats mungiture`
    }));

  const inserted = await Mungitura.insertMany(docs, { ordered: true });

  console.log(`Mungiture inserite: ${inserted.length}`);
  console.log(`Azienda target: ${azienda.companyName} (${azienda._id})`);
  console.log('Animali usati per il seed:');
  animali.forEach((item) => {
    console.log(` - ${item.name || 'Animale'} (${item.matricola || item._id})`);
  });

  await mongoose.disconnect();
  console.log('Disconnesso. Seed mungiture completato.');
}

seedMungiture().catch(async (error) => {
  console.error('Errore seed mungiture:', error.message || error);
  await mongoose.disconnect();
  process.exit(1);
});
