/**
 * Script di seeding del database.
 * Popola MongoDB con dati di test: 1 utente allevatore, 1 azienda, 20 animali.
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
import Azienda from '../app/models/azienda.js';
import Animale from '../app/models/animale.js';

// Carica le variabili d'ambiente dallo stesso .env usato dal server
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO_URI = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  Variabile DB_URL non trovata nel file server/.env');
  process.exit(1);
}

// ─── Dati di test ────────────────────────────────────────────────────────────

const TEST_USER_EMAIL = 'allevatore.test@muccapp.it';
const EXTRA_USER_EMAIL = 'test1@example.it';

// Animali assegnati a test1@example.it (sottoinsieme con matricole distinte)
const animaliDataExtra = [
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🔌  Connessione a MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connesso.');

  // 1. Utente allevatore
  let user = await User.findOne({ email: TEST_USER_EMAIL });
  if (user) {
    console.log(`ℹ️   Utente "${TEST_USER_EMAIL}" già esistente, riutilizzato.`);
  } else {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    user = await User.create({
      name: 'Mario',
      surname: 'Rossi',
      email: TEST_USER_EMAIL,
      passwordHash,
      userType: 'allevatore',
    });
    console.log(`👤  Utente creato: ${user.email}  (password: Password123!)`);
  }

  // 2. Azienda
  let azienda = await Azienda.findOne({ ownerUserId: user._id });
  if (azienda) {
    console.log(`ℹ️   Azienda "${azienda.companyName}" già esistente, riutilizzata.`);
  } else {
    azienda = await Azienda.create({
      companyName: 'Azienda Agricola Test',
      ownerUserId: user._id,
      vatNumber: 'IT12345678901',
      address: 'Via della Campagna 1, 24100 Bergamo BG',
      emailAzienda: 'info@agricolatest.it',
      phoneNumber: '035 123456',
    });
    console.log(`🏡  Azienda creata: ${azienda.companyName} (${azienda._id})`);
  }

  // 3. Animali — salta quelli con matricola già presente
  let inseriti = 0;
  let saltati = 0;
  for (const dati of animaliData) {
    const esiste = await Animale.findOne({ matricola: dati.matricola });
    if (esiste) { saltati++; continue; }

    await Animale.create({
      ...dati,
      aziendaId: azienda._id,
      note: dati.note || undefined,
      figliaDi: dati.figliaDi || undefined,
    });
    inseriti++;
  }
  console.log(`🐄  Animali inseriti: ${inseriti}  |  già presenti (saltati): ${saltati}`);

  // 4. Utente test1@example.it
  console.log(`\n── Seeding utente extra: ${EXTRA_USER_EMAIL} ──`);
  let userExtra = await User.findOne({ email: EXTRA_USER_EMAIL });
  if (!userExtra) {
    console.log(`⚠️   Utente "${EXTRA_USER_EMAIL}" non trovato nel database. Crealo prima tramite signup oppure aggiungi la logica di creazione nello script.`);
  } else {
    // Trova o crea l'azienda per questo utente
    let aziendaExtra = await Azienda.findOne({ ownerUserId: userExtra._id });
    if (aziendaExtra) {
      console.log(`ℹ️   Azienda "${aziendaExtra.companyName}" già esistente per ${EXTRA_USER_EMAIL}, riutilizzata.`);
    } else {
      aziendaExtra = await Azienda.create({
        companyName: 'Azienda di Test1',
        ownerUserId: userExtra._id,
        vatNumber: 'IT98765432101',
        address: 'Via del Prato 5, 20100 Milano MI',
        emailAzienda: 'info@test1azienda.it',
      });
      console.log(`🏡  Azienda creata: ${aziendaExtra.companyName} (${aziendaExtra._id})`);
    }

    let inseritiExtra = 0;
    let saltatiExtra = 0;
    for (const dati of animaliDataExtra) {
      const esiste = await Animale.findOne({ matricola: dati.matricola });
      if (esiste) { saltatiExtra++; continue; }
      await Animale.create({
        ...dati,
        aziendaId: aziendaExtra._id,
        note: dati.note || undefined,
        figliaDi: dati.figliaDi || undefined,
      });
      inseritiExtra++;
    }
    console.log(`🐄  Animali per ${EXTRA_USER_EMAIL} — inseriti: ${inseritiExtra}  |  saltati: ${saltatiExtra}`);
  }

  // ── Riepilogo credenziali ──────────────────────────────────────────────────
  console.log('\n📋  Riepilogo dati di test:');
  console.log(`    [1] Email:    ${TEST_USER_EMAIL}`);
  console.log(`        Password: Password123!`);
  console.log(`        Ruolo:    allevatore`);
  console.log(`        Azienda:  ${azienda.companyName}  (id: ${azienda._id})`);
  if (userExtra) {
    const az = await Azienda.findOne({ ownerUserId: userExtra._id });
    console.log(`    [2] Email:    ${EXTRA_USER_EMAIL}  (utente esistente)`);
    if (az) console.log(`        Azienda:  ${az.companyName}  (id: ${az._id})`);
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
