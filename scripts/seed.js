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
import Animale from '../app/models/animale.js';

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
  },
  {
    name: 'Sara',
    surname: 'Bianchi',
    email: 'distributore@muccapp.it',
    userType: 'distributore',
  },
  {
    name: 'Luca',
    surname: 'Verdi',
    email: 'veterinario@muccapp.it',
    userType: 'veterinario',
  },
  {
    name: 'Giulia',
    surname: 'Neri',
    email: 'consumatore@muccapp.it',
    userType: 'consumatore',
  },
];

const seedAziendeAllevatore = [
  {
    companyName: 'Azienda Agricola Test',
    vatNumber: 'IT12345678901',
    address: 'Via della Campagna 1, 24100 Bergamo BG',
    emailAzienda: 'info@agricolatest.it',
    phoneNumber: '035 123456',
  },
  {
    companyName: 'Fattoria Pianura',
    vatNumber: 'IT12345678902',
    address: 'Via dei Prati 12, 24100 Bergamo BG',
    emailAzienda: 'contatti@fattoriapianura.it',
    phoneNumber: '035 654321',
  },
  {
    companyName: 'Cascina Colle Verde',
    vatNumber: 'IT12345678903',
    address: 'Strada del Colle 7, 24100 Bergamo BG',
    emailAzienda: 'info@colleverde.it',
    phoneNumber: '035 987654',
  },
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
      if (String(aziendaItem.ownerUserId) !== String(user._id)) {
        aziendaItem.ownerUserId = user._id;
        await aziendaItem.save();
        console.log(`ℹ️   Azienda "${aziendaItem.companyName}" riassegnata all'allevatore ${user.email}.`);
      }
      console.log(`ℹ️   Azienda "${aziendaItem.companyName}" già esistente, riutilizzata.`);
    } else {
      aziendaItem = await azienda.create({
        ...aziendaSeed,
        ownerUserId: user._id,
      });
      console.log(`🏡  Azienda creata: ${aziendaItem.companyName} (${aziendaItem._id})`);
    }
    aziendeAllevatore.push(aziendaItem);
  }

  // Solo la prima azienda avrà la mandria seed.
  const aziendaMandria = aziendeAllevatore[0];

  // 3. Animali — salta quelli con matricola già presente
  let inseriti = 0;
  let saltati = 0;
  for (const dati of animaliData) {
    const esiste = await Animale.findOne({ matricola: dati.matricola });
    if (esiste) { saltati++; continue; }

    await Animale.create({
      ...dati,
      aziendaId: aziendaMandria._id,
      note: dati.note || undefined,
      figliaDi: dati.figliaDi || undefined,
    });
    inseriti++;
  }
  console.log(`🐄  Animali inseriti: ${inseriti}  |  già presenti (saltati): ${saltati}`);

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
