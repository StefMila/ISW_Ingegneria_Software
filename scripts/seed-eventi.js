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
const DEFAULT_EVENT_CENTER = { lat: 45.6983, lng: 9.6773 };

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

const resolveEventPosition = ({ baseLat, baseLng, seed }) => {
  // Micro-offset per evitare marker completamente sovrapposti.
  const latOffset = (((seed % 9) - 4) * 0.0012);
  const lngOffset = ((((seed * 3) % 11) - 5) * 0.0014);

  return {
    lat: Number((baseLat + latOffset).toFixed(6)),
    lng: Number((baseLng + lngOffset).toFixed(6))
  };
};

const resolveUpcomingSummerYear = () => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11

  // Se siamo gia oltre luglio, pianifica il prossimo ciclo estivo sull'anno successivo.
  if (currentMonth > 6) {
    return currentYear + 1;
  }

  return currentYear;
};

const buildDenseEventsForMonth = ({ year, month, count, ownerUserId, aziendaId, titlePrefix, type, baseLat, baseLng }) => {
  return Array.from({ length: count }, (_, idx) => {
    // Distribuisce gli eventi nel mese, evitando date non valide oltre il giorno 28.
    const day = 1 + ((idx * 3) % 28);
    const startHour = 8 + (idx % 9);
    const minute = idx % 2 === 0 ? 0 : 30;
    const startAt = new Date(Date.UTC(year, month, day, startHour, minute, 0));
    const endAt = new Date(startAt.getTime() + (75 + (idx % 3) * 15) * 60000);
    const coords = resolveEventPosition({ baseLat, baseLng, seed: year * 100 + month * 10 + idx });

    return {
      ownerUserId,
      aziendaId,
      title: `${titlePrefix} #${idx + 1}`,
      type,
      startAt,
      endAt,
      location: `Area evento ${idx + 1}`,
      locationAddress: `Via della Campagna 1, Bergamo`,
      lat: coords.lat,
      lng: coords.lng,
      description: `${SEED_MARKER} Evento extra per prossimi mesi (densita calendario)`,
      reminderMinutes: 60,
      visibility: idx % 2 === 0 ? 'public' : 'private',
      recurrenceType: 'single',
      recurrenceInterval: 1
    };
  });
};

const buildUpcomingDenseEvents = ({ ownerUserId, aziendaId, baseLat, baseLng }) => {
  const targetYear = resolveUpcomingSummerYear();

  const juneEvents = buildDenseEventsForMonth({
    year: targetYear,
    month: 5, // giugno
    count: 10,
    ownerUserId,
    aziendaId,
    baseLat,
    baseLng,
    titlePrefix: `Open Day e degustazioni Giugno ${targetYear}`,
    type: 'pubblico'
  });

  const julyEvents = buildDenseEventsForMonth({
    year: targetYear,
    month: 6, // luglio
    count: 4,
    ownerUserId,
    aziendaId,
    baseLat,
    baseLng,
    titlePrefix: `Tour in fattoria Luglio ${targetYear}`,
    type: 'pubblico'
  });

  return [...juneEvents, ...julyEvents];
};

async function seedEventi() {
  console.log('Connessione a MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connesso.');

  // Compatibilita con vecchi DB: rimuove l'indice geospaziale legacy su `location`.
  // Oggi `location` e' una stringa, quindi un 2dsphere causa errori in inserimento.
  try {
    const indexes = await Evento.collection.indexes();
    const legacyGeoIndex = indexes.find(
      (idx) => idx?.name === 'location_2dsphere' || idx?.key?.location === '2dsphere'
    );
    if (legacyGeoIndex?.name) {
      await Evento.collection.dropIndex(legacyGeoIndex.name);
      console.log(`Indice legacy rimosso: ${legacyGeoIndex.name}`);
    }
  } catch (indexError) {
    console.warn('Impossibile verificare/rimuovere indice legacy su location:', indexError.message || indexError);
  }

  const allevatore = await User.findOne({ email: 'allevatore@muccapp.it' }).select('_id email');
  if (!allevatore) {
    throw new Error('Utente allevatore@muccapp.it non trovato. Esegui prima: npm run seed');
  }

  const azienda = await Azienda.findOne({ ownerUserId: allevatore._id }).sort({ createdAt: 1 }).select('_id companyName geo location address');
  if (!azienda) {
    throw new Error('Nessuna azienda trovata per l\'allevatore di test. Esegui prima: npm run seed');
  }

  const baseLat = Number.isFinite(Number(azienda?.geo?.lat))
    ? Number(azienda.geo.lat)
    : (Array.isArray(azienda?.location?.coordinates) && Number.isFinite(Number(azienda.location.coordinates[1]))
      ? Number(azienda.location.coordinates[1])
      : DEFAULT_EVENT_CENTER.lat);

  const baseLng = Number.isFinite(Number(azienda?.geo?.lng))
    ? Number(azienda.geo.lng)
    : (Array.isArray(azienda?.location?.coordinates) && Number.isFinite(Number(azienda.location.coordinates[0]))
      ? Number(azienda.location.coordinates[0])
      : DEFAULT_EVENT_CENTER.lng);

  const deleteResult = await Evento.deleteMany({
    ownerUserId: allevatore._id,
    aziendaId: azienda._id,
    description: { $regex: `^${SEED_MARKER}` }
  });
  console.log(`Eventi seed precedenti rimossi: ${deleteResult.deletedCount}`);

  const docs = [
    ...buildEventsForYear({ year: 2024, ownerUserId: allevatore._id, aziendaId: azienda._id }).map((event, idx) => {
      const coords = resolveEventPosition({ baseLat, baseLng, seed: 2024 * 100 + idx });
      return { ...event, lat: coords.lat, lng: coords.lng };
    }),
    ...buildEventsForYear({ year: 2025, ownerUserId: allevatore._id, aziendaId: azienda._id }).map((event, idx) => {
      const coords = resolveEventPosition({ baseLat, baseLng, seed: 2025 * 100 + idx });
      return { ...event, lat: coords.lat, lng: coords.lng };
    }),
    ...buildEventsForYear({ year: 2026, ownerUserId: allevatore._id, aziendaId: azienda._id }).map((event, idx) => {
      const coords = resolveEventPosition({ baseLat, baseLng, seed: 2026 * 100 + idx });
      return { ...event, lat: coords.lat, lng: coords.lng };
    }),
    ...buildUpcomingDenseEvents({ ownerUserId: allevatore._id, aziendaId: azienda._id, baseLat, baseLng })
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
