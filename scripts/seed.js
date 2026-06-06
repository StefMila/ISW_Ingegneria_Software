/**
 * Script di seeding del database.
 * Popola MongoDB con dati di test: 4 utenti, 3 aziende per l'allevatore, 20 animali su 1 azienda.
 *
 * Uso:
 *   node scripts/seed.js
 *
 * ATTENZIONE: cancella i documenti esistenti con gli stessi identificatori
 * prima di inserirne di nuovi (idempotente).
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import User from '../app/models/user.js';
import azienda from '../app/models/azienda.js';
import PuntoVendita from '../app/models/puntoVendita.js';
import Animale from '../app/models/animale.js';
import Sensore from '../app/models/sensore.js';
import Mungitura from '../app/models/munigitura.js';
import Lavorazione from '../app/models/lavorazione.js';
import LottoProdotto from '../app/models/lottoProdotto.js';
import Evento from '../app/models/evento.js';

// Carica le variabili d'ambiente dallo stesso .env usato dal server
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO_URI = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('  Variabile DB_URL non trovata nel file server/.env');
  process.exit(1);
}

// ─── Dati di test ────────────────────────────────────────────────────────────

const seedUsers = [
  {
    name: 'Mario',
    surname: 'Rossi',
    email: 'allevatore@muccapp.it',
    userType: 'allevatore',
    acceptedTerms: true ,
  },
  {
    name: 'Sara',
    surname: 'Bianchi',
    email: 'distributore@muccapp.it',
    userType: 'distributore',
    acceptedTerms: true ,
  },
  {
    name: 'Luca',
    surname: 'Verdi',
    email: 'veterinario@muccapp.it',
    userType: 'veterinario',
    acceptedTerms: true ,
  },
  {
    name: 'Giulia',
    surname: 'Neri',
    email: 'consumatore@muccapp.it',
    userType: 'consumatore',
    acceptedTerms: true ,
  },
];

const seedAziendeAllevatore = [
  {
    companyName: 'Azienda Agricola Test',
    vatNumber: 'IT12345678901',
    address: 'Via della Campagna 1, 24100 Bergamo BG',
    geo: { lat: 45.6983, lng: 9.6773 },
    emailAzienda: 'info@agricolatest.it',
    phoneNumber: '035 123456',
    city: 'Bergamo',
    province: 'BG',
    country: 'Italia',
    categories: ['latte', 'formaggi'],
  },
  {
    companyName: 'Fattoria Pianura',
    vatNumber: 'IT12345678902',
    address: 'Via dei Prati 12, 24100 Bergamo BG',
    geo: { lat: 45.6892, lng: 9.7016 },
    emailAzienda: 'contatti@fattoriapianura.it',
    phoneNumber: '035 654321',
    city: 'Bergamo',
    province: 'BG',
    country: 'Italia',
    categories: ['carne', 'salumi'],
  },
  {
    companyName: 'Cascina Colle Verde',
    vatNumber: 'IT12345678903',
    address: 'Strada del Colle 7, 24100 Bergamo BG',
    geo: { lat: 45.7081, lng: 9.6594 },
    emailAzienda: 'info@colleverde.it',
    phoneNumber: '035 987654',
    city: 'Bergamo',
    province: 'BG',
    country: 'Italia',
    categories: ['uova', 'yogurt'],
  },
];

const seedPuntiVendita = [
  {
    nomePunto: 'Caseificio Centro Bergamo',
    indirizzo: 'Via XX Settembre 45, 24122 Bergamo BG',
    geo: { lat: 45.6958, lng: 9.6688 },
    city: 'Bergamo',
    province: 'BG',
    categories: ['formaggio', 'latte'],
    description: 'Punto vendita seed in centro citta con prodotti caseari locali.',
    emailPunto: 'centro.bergamo@muccapp.it',
    phoneNumber: '035 110011',
    website: 'https://example.com/pv-centro-bergamo'
  },
  {
    nomePunto: 'Bottega Latte Alta',
    indirizzo: 'Via Borgo Santa Caterina 88, 24124 Bergamo BG',
    geo: { lat: 45.7037, lng: 9.6862 },
    city: 'Bergamo',
    province: 'BG',
    categories: ['latte', 'yogurt'],
    description: 'Negozio seed specializzato in latte fresco e yogurt.',
    emailPunto: 'latte.alta@muccapp.it',
    phoneNumber: '035 220022',
    website: 'https://example.com/pv-latte-alta'
  },
  {
    nomePunto: 'Emporio Formaggi Colle',
    indirizzo: 'Via Sant\'Alessandro 29, 24122 Bergamo BG',
    geo: { lat: 45.6951, lng: 9.6598 },
    city: 'Bergamo',
    province: 'BG',
    categories: ['formaggio', 'salumi'],
    description: 'Emporio seed con selezione di formaggi e salumi del territorio.',
    emailPunto: 'formaggi.colle@muccapp.it',
    phoneNumber: '035 330033',
    website: 'https://example.com/pv-formaggi-colle'
  },
  {
    nomePunto: 'Mercato Verde Sud',
    indirizzo: 'Via Zanica 101, 24126 Bergamo BG',
    geo: { lat: 45.6769, lng: 9.6764 },
    city: 'Bergamo',
    province: 'BG',
    categories: ['uova', 'yogurt'],
    description: 'Mercato seed con prodotti freschi e filiera tracciata.',
    emailPunto: 'mercato.sud@muccapp.it',
    phoneNumber: '035 440044',
    website: 'https://example.com/pv-mercato-verde-sud'
  }
];

// Animali associati all'azienda dell'allevatore di test
const animaliData = [
  { matricola: 'IT002BG001', name: 'Luna',      species: 'mucca',    dataNascita: '2020-04-10', sesso: 'femmina', razza: 'Frisona',       note: 'Produzione elevata' },
  { matricola: 'IT002BG002', name: 'Sole',      species: 'mucca',    dataNascita: '2021-08-22', sesso: 'femmina', razza: 'Pezzata Rossa', note: '' },
  { matricola: 'IT002BG003', name: 'Tempesta',  species: 'mucca',    dataNascita: '2019-06-15', sesso: 'maschio', razza: 'Charolais',     note: 'Riproduttore' },
  { matricola: 'IT002OV001', name: 'Fiocchino', species: 'mucca',    dataNascita: '2022-01-30', sesso: 'maschio', razza: 'Suffolk',       note: '' },
  { matricola: 'IT002OV002', name: 'Rosa',      species: 'mucca',    dataNascita: '2021-09-12', sesso: 'femmina', razza: 'Sarda',         note: 'Produzione latte' },
  { matricola: 'IT002CP001', name: 'Nuvoletta', species: 'mucca',    dataNascita: '2023-02-18', sesso: 'femmina', razza: 'Saanen',        note: '' },
  { matricola: 'IT002PL001', name: 'Pluma',     species: 'mucca',    dataNascita: '2024-05-01', sesso: 'femmina', razza: 'Livornese',     note: '' },
  { matricola: 'IT001BG001', name: 'Margherita', species: 'mucca',    dataNascita: '2019-03-12', sesso: 'femmina', razza: 'Frisona',       note: 'Alta produzione di latte' },
  { matricola: 'IT001BG002', name: 'Fiocco',     species: 'mucca',    dataNascita: '2020-07-04', sesso: 'maschio', razza: 'Charolais',     note: '' },
  { matricola: 'IT001BG003', name: 'Rossella',   species: 'mucca',    dataNascita: '2018-11-20', sesso: 'femmina', razza: 'Simmental',     figliaDi: 'IT001BG001' },
  { matricola: 'IT001BG004', name: 'Bianca',     species: 'mucca',    dataNascita: '2021-01-15', sesso: 'femmina', razza: 'Frisona',       note: 'In gestazione' },
  { matricola: 'IT001BG005', name: 'Bruno',      species: 'mucca',    dataNascita: '2022-05-30', sesso: 'maschio', razza: 'Limousine',     figliaDi: 'IT001BG003' },
  { matricola: 'IT001OV001', name: 'Lana',       species: 'mucca',    dataNascita: '2020-02-10', sesso: 'femmina', razza: 'Merino',        note: 'Ottima produzione di lana' },
  { matricola: 'IT001OV002', name: 'Neve',       species: 'mucca',    dataNascita: '2021-04-22', sesso: 'femmina', razza: 'Suffolk',       note: '' },
  { matricola: 'IT001OV003', name: 'Ariete',     species: 'mucca',    dataNascita: '2019-09-08', sesso: 'maschio', razza: 'Bergamasca',   note: '' },
  { matricola: 'IT001CP001', name: 'Camoscio',   species: 'mucca',    dataNascita: '2020-06-17', sesso: 'maschio', razza: 'Camosciata',    note: '' },
  { matricola: 'IT001CP002', name: 'Stella',     species: 'mucca',    dataNascita: '2021-03-05', sesso: 'femmina', razza: 'Saanen',        note: 'Produzione latte di capra' },
  { matricola: 'IT001CP003', name: 'Diana',      species: 'mucca',    dataNascita: '2022-08-14', sesso: 'femmina', razza: 'Nera Verzasca', figliaDi: 'IT001CP002' },
  { matricola: 'IT001BG006', name: 'Tornado',    species: 'mucca',    dataNascita: '2017-12-01', sesso: 'maschio', razza: 'Chianina',      note: 'Riproduttore' },
  { matricola: 'IT001BG007', name: 'Primavera',  species: 'mucca',    dataNascita: '2023-03-21', sesso: 'femmina', razza: 'Pezzata Rossa', figliaDi: 'IT001BG001' },
  { matricola: 'IT001BG008', name: 'Forza',      species: 'mucca',    dataNascita: '2023-06-10', sesso: 'maschio', razza: 'Charolais',     note: '' },
  { matricola: 'IT001OV004', name: 'Pecorino',   species: 'mucca',    dataNascita: '2022-11-03', sesso: 'maschio', razza: 'Sarda',         note: 'Razza da formaggio' },
  { matricola: 'IT001OV005', name: 'Fiorella',   species: 'mucca',    dataNascita: '2021-07-19', sesso: 'femmina', razza: 'Lacaune',       note: 'Produzione latte ovino' },
  { matricola: 'IT001PL001', name: 'Rosso',      species: 'mucca',    dataNascita: '2024-01-05', sesso: 'maschio', razza: 'Livornese',     note: 'Gallo riproduttore' },
  { matricola: 'IT001PL002', name: 'Chiara',     species: 'mucca',    dataNascita: '2024-01-05', sesso: 'femmina', razza: 'Livornese',     note: '' },
  { matricola: 'IT001CN001', name: 'Fiocco',     species: 'mucca',    dataNascita: '2024-03-15', sesso: 'maschio', razza: 'Neozelanese',   note: '' },
  { matricola: 'IT001CN002', name: 'Pallina',    species: 'mucca',    dataNascita: '2024-03-15', sesso: 'femmina', razza: 'Gigante Bianco',note: '' },
];

const buildAnimaleFoto = ({ matricola, species }) => {
  const normalizedSpecies = String(species || '').trim().toLowerCase();
  if (normalizedSpecies !== 'mucca') {
    return undefined;
  }

  const text = encodeURIComponent(`Mucca ${matricola}`);
  return `https://placehold.co/640x480?text=${text}`;
};

const CAPACITA_INDOSSABILE = [
  { tipoDato: 'temperatura', unitaMisura: '°C' },
  { tipoDato: 'frequenza_cardiaca', unitaMisura: 'bpm' },
  { tipoDato: 'livello_passi', unitaMisura: 'passi' },
  { tipoDato: 'esposizione_solare', unitaMisura: 'ore' }
];

const CAPACITA_AMBIENTALE = [
  { tipoDato: 'temperatura', unitaMisura: '°C' },
  { tipoDato: 'posizione_gps', unitaMisura: 'coordinate' }
];

const CAPACITA_MUNGITURA = [
  { tipoDato: 'peso', unitaMisura: 'litri' }
];

const CAPACITA_LAVORAZIONE = [
  { tipoDato: 'peso', unitaMisura: 'chilogrammi' }
];

const sameCapacita = (left = [], right = []) => {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;

  const normalize = (items) => items
    .map((item) => `${item.tipoDato}:${item.unitaMisura}`)
    .sort();

  const a = normalize(left);
  const b = normalize(right);
  return a.every((value, index) => value === b[index]);
};

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
const EVENTI_SEED_MARKER = '[seed-eventi-main-v1]';

const sanitizeLotToken = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 16) || 'LOTTO';

const buildSeedLotNumber = ({ lavorazione, index }) => {
  const rawToken = lavorazione?.outputName || lavorazione?.nomeTemplate || lavorazione?.tipoLavorazione || 'lotto';
  const token = sanitizeLotToken(rawToken);
  return `LOT-${token}-${String(index + 1).padStart(3, '0')}`;
};

const asDateShifted = ({ daysAgo = 0, hour = 6, minute = 0 } = {}) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const sumMungitureQuantity = (items = []) => Number(items
  .reduce((acc, item) => acc + (Number(item?.quantity) || 0), 0)
  .toFixed(2));

const cloneInputs = (inputs = []) => inputs.map((input) => ({
  type: input.type,
  name: input.name,
  quantity: input.quantity,
  unit: input.unit,
  mungituraIds: Array.isArray(input.mungituraIds) ? input.mungituraIds : []
}));

const defaultFasiByTipo = {
  'primo-sale': [
    { name: 'Ricevimento', completed: true },
    { name: 'Coagulazione', completed: true },
    { name: 'Formatura', completed: true },
    { name: 'Confezionamento', completed: true }
  ],
  formaggio: [
    { name: 'Ricevimento', completed: true },
    { name: 'Coagulazione', completed: true },
    { name: 'Salatura', completed: true },
    { name: 'Stagionatura', completed: true }
  ],
  yogurt: [
    { name: 'Ricevimento', completed: true },
    { name: 'Inoculo', completed: true },
    { name: 'Fermentazione', completed: true },
    { name: 'Confezionamento', completed: true }
  ]
};

const buildEventsForYear = ({ year, ownerUserId, aziendaId, companyName }) => {
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
      location: companyName,
      locationAddress: 'Via della Campagna 1, Bergamo',
      description: `${EVENTI_SEED_MARKER} Evento demo per calendario e filtri`,
      reminderMinutes: 60,
      visibility: month % 3 === 0 ? 'public' : 'private',
      recurrenceType: 'single',
      recurrenceInterval: 1
    };
  });
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🔌  Connessione a MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connesso.');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 1. Utenti di test
  const usersByType = {};
  for (const userData of seedUsers) {
    let user = await User.findOne({ email: userData.email });
    if (user) {
      console.log(`ℹ️   Utente "${userData.email}" già esistente, riutilizzato.`);
    } else {
      user = await User.create({
        ...userData,
        passwordHash,
      });
      console.log(`👤  Utente creato: ${user.email}  (${user.userType}, password: Password123!)`);
    }
    usersByType[userData.userType] = user;
  }

  // 2. Tre aziende dell'allevatore
  const user = usersByType.allevatore;
  const aziendeAllevatore = [];
  for (const aziendaSeed of seedAziendeAllevatore) {
    let aziendaItem = await azienda.findOne({ vatNumber: aziendaSeed.vatNumber });
    if (aziendaItem) {
      let aziendaUpdated = false;

      if (String(aziendaItem.ownerUserId) !== String(user._id)) {
        aziendaItem.ownerUserId = user._id;
        aziendaUpdated = true;
        console.log(`ℹ️   Azienda "${aziendaItem.companyName}" riassegnata all'allevatore ${user.email}.`);
      }

      const seedCategories = Array.isArray(aziendaSeed.categories)
        ? [...new Set(aziendaSeed.categories.map((c) => String(c).trim().toLowerCase()).filter(Boolean))]
        : [];
      const currentCategories = Array.isArray(aziendaItem.categories)
        ? aziendaItem.categories.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
        : [];
      const mergedCategories = [...new Set([...currentCategories, ...seedCategories])];

      if (mergedCategories.length !== currentCategories.length) {
        aziendaItem.categories = mergedCategories;
        aziendaUpdated = true;
      }

      const seedLat = Number(aziendaSeed?.geo?.lat);
      const seedLng = Number(aziendaSeed?.geo?.lng);
      if (Number.isFinite(seedLat) && Number.isFinite(seedLng)) {
        if (!aziendaItem.geo || Number(aziendaItem.geo.lat) !== seedLat || Number(aziendaItem.geo.lng) !== seedLng) {
          aziendaItem.geo = { lat: seedLat, lng: seedLng };
          aziendaUpdated = true;
        }

        const currentCoords = Array.isArray(aziendaItem.location?.coordinates)
          ? aziendaItem.location.coordinates
          : [];
        if (
          aziendaItem.location?.type !== 'Point' ||
          currentCoords.length !== 2 ||
          Number(currentCoords[0]) !== seedLng ||
          Number(currentCoords[1]) !== seedLat
        ) {
          aziendaItem.location = {
            type: 'Point',
            coordinates: [seedLng, seedLat]
          };
          aziendaUpdated = true;
        }
      }

      if (aziendaSeed.city && aziendaItem.city !== aziendaSeed.city) {
        aziendaItem.city = aziendaSeed.city;
        aziendaUpdated = true;
      }
      if (aziendaSeed.province && aziendaItem.province !== aziendaSeed.province) {
        aziendaItem.province = aziendaSeed.province;
        aziendaUpdated = true;
      }
      if (aziendaSeed.country && aziendaItem.country !== aziendaSeed.country) {
        aziendaItem.country = aziendaSeed.country;
        aziendaUpdated = true;
      }

      if (aziendaUpdated) {
        await aziendaItem.save();
      }

      console.log(`ℹ️   Azienda "${aziendaItem.companyName}" già esistente, riutilizzata.`);
    } else {
      aziendaItem = await azienda.create({
        ...aziendaSeed,
        location: {
          type: 'Point',
          coordinates: [aziendaSeed.geo.lng, aziendaSeed.geo.lat]
        },
        ownerUserId: user._id,
      });
      console.log(`🏡  Azienda creata: ${aziendaItem.companyName} (${aziendaItem._id})`);
    }
    aziendeAllevatore.push(aziendaItem);
  }

  // 2b. Punti vendita demo pubblici per esplora (idempotente)
  let puntiVenditaCreati = 0;
  let puntiVenditaAggiornati = 0;
  let puntiVenditaRiutilizzati = 0;

  for (const puntoSeed of seedPuntiVendita) {
    const query = {
      ownerUserId: user._id,
      nomePunto: puntoSeed.nomePunto
    };

    let punto = await PuntoVendita.findOne(query);
    if (!punto) {
      punto = await PuntoVendita.create({
        ownerUserId: user._id,
        isActive: true,
        nomePunto: puntoSeed.nomePunto,
        indirizzo: puntoSeed.indirizzo,
        formattedAddress: puntoSeed.indirizzo,
        geo: puntoSeed.geo,
        city: puntoSeed.city,
        province: puntoSeed.province,
        categories: puntoSeed.categories,
        description: puntoSeed.description,
        emailPunto: puntoSeed.emailPunto,
        phoneNumber: puntoSeed.phoneNumber,
        website: puntoSeed.website
      });
      puntiVenditaCreati += 1;
      continue;
    }

    let changed = false;
    const fieldsToSync = [
      'indirizzo',
      'city',
      'province',
      'description',
      'emailPunto',
      'phoneNumber',
      'website'
    ];

    for (const field of fieldsToSync) {
      if (String(punto[field] || '') !== String(puntoSeed[field] || '')) {
        punto[field] = puntoSeed[field];
        changed = true;
      }
    }

    const currentCategories = Array.isArray(punto.categories) ? punto.categories : [];
    if (JSON.stringify(currentCategories) !== JSON.stringify(puntoSeed.categories)) {
      punto.categories = puntoSeed.categories;
      changed = true;
    }

    if (!punto.isActive) {
      punto.isActive = true;
      changed = true;
    }

    const lat = Number(puntoSeed.geo?.lat);
    const lng = Number(puntoSeed.geo?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (!punto.geo || Number(punto.geo.lat) !== lat || Number(punto.geo.lng) !== lng) {
        punto.geo = { lat, lng };
        changed = true;
      }
    }

    if (String(punto.formattedAddress || '') !== String(puntoSeed.indirizzo || '')) {
      punto.formattedAddress = puntoSeed.indirizzo;
      changed = true;
    }

    if (changed) {
      await punto.save();
      puntiVenditaAggiornati += 1;
    } else {
      puntiVenditaRiutilizzati += 1;
    }
  }

  console.log(`🏬  Punti vendita seed: creati ${puntiVenditaCreati}  |  aggiornati: ${puntiVenditaAggiornati}  |  già presenti (riutilizzati): ${puntiVenditaRiutilizzati}`);

  // Solo la prima azienda avrà la mandria seed.
  const aziendaMandria = aziendeAllevatore[0];

  // Reset dei contatori lavorazione per l'azienda seedata, così i codici restano deterministici.
  await mongoose.model('Counter').deleteMany({
    _id: { $regex: `^counter_${String(aziendaMandria._id)}_` }
  });

  // 3. Animali — salta quelli con matricola già presente
  let inseriti = 0;
  let saltati = 0;
  let aggiornatiFoto = 0;
  for (const dati of animaliData) {
    const esiste = await Animale.findOne({ matricola: dati.matricola });
    if (esiste) {
      const fotoSeed = dati.foto || buildAnimaleFoto({ matricola: dati.matricola, species: dati.species });
      if (!esiste.foto && fotoSeed) {
        esiste.foto = fotoSeed;
        await esiste.save();
        aggiornatiFoto++;
      } else {
        saltati++;
      }
      continue;
    }

    await Animale.create({
      ...dati,
      aziendaId: aziendaMandria._id,
      note: dati.note || undefined,
      figliaDi: dati.figliaDi || undefined,
      foto: dati.foto || buildAnimaleFoto({ matricola: dati.matricola, species: dati.species }),
    });
    inseriti++;
  }
  console.log(`🐄  Animali inseriti: ${inseriti}  |  foto aggiornate: ${aggiornatiFoto}  |  già presenti (saltati): ${saltati}`);

  // 4. Sensori IoT: un indossabile per ogni mucca + sensori aziendali per produzione/ambientale
  const muccheAzienda = await Animale.find({
    aziendaId: aziendaMandria._id,
    species: 'mucca'
  }).select('_id matricola name');

  let sensoriCreati = 0;
  let sensoriAggiornati = 0;
  let sensoriRiutilizzati = 0;

  for (const mucca of muccheAzienda) {
    const nomeSensore = `Collare IoT - ${mucca.matricola}`;
    const existing = await Sensore.findOne({ nome: nomeSensore, aziendaId: aziendaMandria._id });

    if (existing) {
      let changed = false;

      if (existing.tipoDispositivo !== 'indossabile') {
        existing.tipoDispositivo = 'indossabile';
        changed = true;
      }

      if (String(existing.animaleId || '') !== String(mucca._id)) {
        existing.animaleId = mucca._id;
        changed = true;
      }

      if (existing.stato !== 'attivo') {
        existing.stato = 'attivo';
        changed = true;
      }

      if (!sameCapacita(existing.capacita, CAPACITA_INDOSSABILE)) {
        existing.capacita = CAPACITA_INDOSSABILE;
        changed = true;
      }

      if (changed) {
        await existing.save();
        sensoriAggiornati++;
      } else {
        sensoriRiutilizzati++;
      }
      continue;
    }

    await Sensore.create({
      nome: nomeSensore,
      tipoDispositivo: 'indossabile',
      capacita: CAPACITA_INDOSSABILE,
      stato: 'attivo',
      aziendaId: aziendaMandria._id,
      animaleId: mucca._id
    });
    sensoriCreati++;
  }

  const sensoriAziendaliSeed = [
    {
      nome: `Stazione Meteo - ${aziendaMandria.companyName}`,
      tipoDispositivo: 'ambientale',
      capacita: CAPACITA_AMBIENTALE,
      animaleId: null
    },
    {
      nome: `Misuratore Tank Latte - ${aziendaMandria.companyName}`,
      tipoDispositivo: 'mungitura',
      capacita: CAPACITA_MUNGITURA,
      animaleId: null
    },
    {
      nome: `Bilancia Lavorazione - ${aziendaMandria.companyName}`,
      tipoDispositivo: 'lavorazione',
      capacita: CAPACITA_LAVORAZIONE,
      animaleId: null
    }
  ];

  for (const payload of sensoriAziendaliSeed) {
    const existing = await Sensore.findOne({ nome: payload.nome, aziendaId: aziendaMandria._id });

    if (existing) {
      let changed = false;

      if (existing.tipoDispositivo !== payload.tipoDispositivo) {
        existing.tipoDispositivo = payload.tipoDispositivo;
        changed = true;
      }

      if (existing.stato !== 'attivo') {
        existing.stato = 'attivo';
        changed = true;
      }

      if (!sameCapacita(existing.capacita, payload.capacita)) {
        existing.capacita = payload.capacita;
        changed = true;
      }

      if (String(existing.animaleId || '') !== String(payload.animaleId || '')) {
        existing.animaleId = payload.animaleId;
        changed = true;
      }

      if (changed) {
        await existing.save();
        sensoriAggiornati++;
      } else {
        sensoriRiutilizzati++;
      }
      continue;
    }

    await Sensore.create({
      ...payload,
      stato: 'attivo',
      aziendaId: aziendaMandria._id
    });
    sensoriCreati++;
  }

  console.log(`📡  Sensori IoT creati: ${sensoriCreati}  |  aggiornati: ${sensoriAggiornati}  |  già presenti (riutilizzati): ${sensoriRiutilizzati}`);

  // 5. Mungiture demo (idempotente): prerequisito per legare il latte alle lavorazioni.
  let mungiturePool = await Mungitura.find({
    aziendaId: aziendaMandria._id,
    status: 'completata'
  })
    .sort({ startedAt: -1, createdAt: -1 })
    .limit(240)
    .select('_id animaleId quantity unit status startedAt endedAt');

  let mungitureCreateCount = 0;
  if (mungiturePool.length === 0) {
    const mucchePerMungiture = muccheAzienda.slice(0, 10);
    const docs = [];
    for (const [index, mucca] of mucchePerMungiture.entries()) {
      for (let monthOffset = 0; monthOffset < 3; monthOffset += 1) {
        const startedAt = asDateShifted({
          daysAgo: (monthOffset * 14) + (index % 6) + 1,
          hour: 5 + (index % 4),
          minute: 10 + (monthOffset * 7)
        });
        const endedAt = new Date(startedAt.getTime() + (70 + (index % 5) * 8) * 60000);
        docs.push({
          aziendaId: aziendaMandria._id,
          animaleId: mucca._id,
          startedAt,
          endedAt,
          quantity: Number((16 + (index * 1.25) + (monthOffset * 0.9)).toFixed(2)),
          unit: 'litri',
          status: 'completata',
          notes: '[seed] Mungitura demo per filiera latte'
        });
      }
    }

    if (docs.length > 0) {
      await Mungitura.insertMany(docs, { ordered: true });
      mungitureCreateCount = docs.length;
    }

    mungiturePool = await Mungitura.find({
      aziendaId: aziendaMandria._id,
      status: 'completata'
    })
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(240)
      .select('_id animaleId quantity unit status startedAt endedAt');
  }

  console.log(`🥛  Mungiture disponibili per la filiera: ${mungiturePool.length}  |  create ora: ${mungitureCreateCount}`);

  // 6. Lavorazioni operative demo (idempotente) e collegamento latte -> mungitureIds.
  let lavorazioniOperative = await Lavorazione.find({
    aziendaId: aziendaMandria._id,
    isTemplate: false,
    status: 'completata'
  })
    .sort({ startedAt: -1, createdAt: -1 })
    .limit(24);

  let lavorazioniCreateCount = 0;
  if (lavorazioniOperative.length === 0 && mungiturePool.length > 0) {
    let template = await Lavorazione.findOne({
      aziendaId: aziendaMandria._id,
      isTemplate: true,
      nomeTemplate: 'Template seed filiera latte'
    });

    if (!template) {
      template = await Lavorazione.create({
        aziendaId: aziendaMandria._id,
        tipoLavorazione: 'formaggio',
        codiceTipoLav: 'B',
        nomeTemplate: 'Template seed filiera latte',
        isTemplate: true,
        status: 'in_corso',
        startedAt: asDateShifted({ daysAgo: 120, hour: 8, minute: 0 }),
        notes: '[seed] Template per creare lavorazioni legate alle mungiture',
        inputs: [
          { type: 'latte', name: 'Latte crudo', quantity: 120, unit: 'litri' },
          { type: 'additivo', name: 'Fermenti lattici', quantity: 0.8, unit: 'kg' }
        ],
        fasi: defaultFasiByTipo.formaggio,
        outputName: 'Formaggio fresco seed',
        outputUnit: 'kg'
      });
    }

    const runsToCreate = Math.min(12, Math.floor(mungiturePool.length / 2) || 1);
    for (let index = 0; index < runsToCreate; index += 1) {
      const m1 = mungiturePool[index * 2] || mungiturePool[index] || null;
      const m2 = mungiturePool[(index * 2) + 1] || null;
      const linkedMungiture = [m1, m2].filter(Boolean);
      if (!linkedMungiture.length) continue;

      const latteQuantity = sumMungitureQuantity(linkedMungiture);
      const startedAt = asDateShifted({ daysAgo: 20 - index, hour: 6 + (index % 5), minute: 20 });
      const endedAt = new Date(startedAt.getTime() + (6 * 60 * 60000));

      await Lavorazione.create({
        aziendaId: aziendaMandria._id,
        tipoLavorazione: template.tipoLavorazione,
        codiceTipoLav: template.codiceTipoLav,
        isTemplate: false,
        templateId: template._id,
        startedAt,
        endedAt,
        status: 'completata',
        notes: '[seed] Lavorazione demo collegata a mungiture reali',
        inputs: [
          {
            type: 'latte',
            name: 'Latte da mungiture aziendali',
            quantity: latteQuantity,
            unit: 'litri',
            mungituraIds: linkedMungiture.map((item) => item._id)
          },
          {
            type: 'additivo',
            name: 'Fermenti lattici',
            quantity: 0.6,
            unit: 'kg'
          }
        ],
        fasi: defaultFasiByTipo.formaggio,
        outputName: `Formaggio fresco batch ${String(index + 1).padStart(2, '0')}`,
        outputQuantity: Number((latteQuantity * 0.23).toFixed(2)),
        outputUnit: 'kg'
      });

      lavorazioniCreateCount += 1;
    }

    lavorazioniOperative = await Lavorazione.find({
      aziendaId: aziendaMandria._id,
      isTemplate: false,
      status: 'completata'
    })
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(24);
  }

  let lavorazioniLinkedCount = 0;
  if (mungiturePool.length > 0) {
    for (const [index, lavorazione] of lavorazioniOperative.entries()) {
      const inputs = cloneInputs(Array.isArray(lavorazione.inputs) ? lavorazione.inputs : []);
      let changed = false;

      let latteInput = inputs.find((item) => item.type === 'latte');
      if (!latteInput) {
        latteInput = {
          type: 'latte',
          name: 'Latte da mungiture aziendali',
          quantity: 0,
          unit: 'litri',
          mungituraIds: []
        };
        inputs.unshift(latteInput);
        changed = true;
      }

      if (!Array.isArray(latteInput.mungituraIds) || latteInput.mungituraIds.length === 0) {
        const base = (index * 2) % mungiturePool.length;
        const linked = [
          mungiturePool[base],
          mungiturePool[(base + 1) % mungiturePool.length]
        ].filter(Boolean);

        latteInput.mungituraIds = linked.map((item) => item._id);
        latteInput.quantity = sumMungitureQuantity(linked);
        latteInput.unit = 'litri';
        latteInput.name = latteInput.name || 'Latte da mungiture aziendali';
        changed = true;
      }

      if (changed) {
        lavorazione.inputs = inputs;
        await lavorazione.save();
        lavorazioniLinkedCount += 1;
      }
    }
  }

  console.log(`🧀  Lavorazioni operative completate: ${lavorazioniOperative.length}  |  create ora: ${lavorazioniCreateCount}  |  collegate a mungiture ora: ${lavorazioniLinkedCount}`);

  // 7. Lotti prodotto demo per tracciabilità allevatore (idempotente)
  lavorazioniOperative = await Lavorazione.find({
    aziendaId: aziendaMandria._id,
    isTemplate: false,
    status: 'completata'
  })
    .sort({ startedAt: -1, createdAt: -1 })
    .limit(12)
    .select('_id outputName outputQuantity outputUnit status nomeTemplate tipoLavorazione');

  let lottiCreati = 0;
  let lottiAggiornati = 0;
  let lottiRiutilizzati = 0;

  for (const [index, lavorazione] of lavorazioniOperative.entries()) {
    const lotNumber = buildSeedLotNumber({ lavorazione, index });
    const nomeProdotto = String(lavorazione.outputName || lavorazione.nomeTemplate || `Prodotto ${index + 1}`).trim();
    const quantity = Number.isFinite(lavorazione.outputQuantity) ? lavorazione.outputQuantity : (120 + index * 15);
    const unit = String(lavorazione.outputUnit || 'kg').trim() || 'kg';
    const qrCodeValue = `${PUBLIC_BASE_URL}/tracciabilita.html?lotto=${encodeURIComponent(lotNumber)}`;

    let existing = await LottoProdotto.findOne({ lotNumber });
    if (!existing) {
      existing = await LottoProdotto.findOne({ aziendaId: aziendaMandria._id, lavorazioneId: lavorazione._id });
    }

    if (existing) {
      let changed = false;
      if (String(existing.aziendaId) !== String(aziendaMandria._id)) {
        existing.aziendaId = aziendaMandria._id;
        changed = true;
      }
      if (String(existing.lavorazioneId) !== String(lavorazione._id)) {
        existing.lavorazioneId = lavorazione._id;
        changed = true;
      }
      if (existing.nomeProdotto !== nomeProdotto) {
        existing.nomeProdotto = nomeProdotto;
        changed = true;
      }
      if (existing.quantity !== quantity) {
        existing.quantity = quantity;
        changed = true;
      }
      if (existing.unit !== unit) {
        existing.unit = unit;
        changed = true;
      }
      if (existing.lotNumber !== lotNumber) {
        existing.lotNumber = lotNumber;
        changed = true;
      }
      if (existing.qrCodeValue !== qrCodeValue) {
        existing.qrCodeValue = qrCodeValue;
        changed = true;
      }

      if (changed) {
        await existing.save();
        lottiAggiornati++;
      } else {
        lottiRiutilizzati++;
      }
      continue;
    }

    await LottoProdotto.create({
      aziendaId: aziendaMandria._id,
      lavorazioneId: lavorazione._id,
      nomeProdotto,
      quantity,
      unit,
      lotNumber,
      qrCodeValue,
      qrCodeImage: ''
    });
    lottiCreati++;
  }

  console.log(`📦  Lotti demo creati: ${lottiCreati}  |  aggiornati: ${lottiAggiornati}  |  già presenti (riutilizzati): ${lottiRiutilizzati}`);

  // 8. Eventi demo calendario (idempotente) nello stesso seed principale.
  try {
    const indexes = await Evento.collection.indexes();
    const legacyGeoIndex = indexes.find(
      (idx) => idx?.name === 'location_2dsphere' || idx?.key?.location === '2dsphere'
    );
    if (legacyGeoIndex?.name) {
      await Evento.collection.dropIndex(legacyGeoIndex.name);
      console.log(`🧹  Indice legacy rimosso: ${legacyGeoIndex.name}`);
    }
  } catch (indexError) {
    console.warn('⚠️  Impossibile verificare/rimuovere indice legacy eventi:', indexError.message || indexError);
  }

  const deletedEventi = await Evento.deleteMany({
    ownerUserId: user._id,
    aziendaId: aziendaMandria._id,
    description: { $regex: `^${EVENTI_SEED_MARKER}` }
  });

  const eventiDocs = [
    ...buildEventsForYear({ year: 2024, ownerUserId: user._id, aziendaId: aziendaMandria._id, companyName: aziendaMandria.companyName }),
    ...buildEventsForYear({ year: 2025, ownerUserId: user._id, aziendaId: aziendaMandria._id, companyName: aziendaMandria.companyName }),
    ...buildEventsForYear({ year: 2026, ownerUserId: user._id, aziendaId: aziendaMandria._id, companyName: aziendaMandria.companyName })
  ];

  await Evento.insertMany(eventiDocs, { ordered: true });
  console.log(`📅  Eventi demo inseriti: ${eventiDocs.length}  |  precedenti rimossi: ${deletedEventi.deletedCount}`);

  // ── Riepilogo credenziali ──────────────────────────────────────────────────
  console.log('\n📋  Riepilogo dati di test:');
  for (const [index, userData] of seedUsers.entries()) {
    const seededUser = usersByType[userData.userType];
    console.log(`    [${index + 1}] Email:    ${userData.email}`);
    console.log(`        Password: Password123!`);
    console.log(`        Ruolo:    ${userData.userType}`);
    if (userData.userType === 'allevatore') {
      console.log('        Aziende:');
      for (const az of aziendeAllevatore) {
        const suffix = String(az._id) === String(aziendaMandria._id) ? ' [mandria]' : '';
        console.log(`          - ${az.companyName}  (id: ${az._id})${suffix}`);
      }
    } else {
      console.log(`        Utente:   ${seededUser._id}`);
    }
  }
  console.log('');

  await mongoose.disconnect();
  console.log('🔌  Disconnesso. Seeding completato.');
}

seed().catch((err) => {
  console.error('❌  Errore durante il seeding:', err);
  mongoose.disconnect();
  process.exit(1);
});
