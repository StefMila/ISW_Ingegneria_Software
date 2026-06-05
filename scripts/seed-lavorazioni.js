import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import User from '../app/models/user.js';
import Azienda from '../app/models/azienda.js';
import Lavorazione from '../app/models/lavorazione.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO_URI = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
const SEED_MARKER = '[seed-lavorazioni-v1]';

if (!MONGO_URI) {
  console.error('Variabile DB_URL non trovata nel file server/.env');
  process.exit(1);
}

const cloneInputs = (inputs) => (inputs || []).map((input) => ({
  type: input.type,
  name: input.name,
  quantity: input.quantity,
  unit: input.unit
}));

const cloneFasi = (fasi) => (fasi || []).map((fase) => ({
  name: fase.name,
  completed: Boolean(fase.completed)
}));

const markFasiProgress = (fasi, completedCount) => fasi.map((fase, index) => ({
  name: fase.name,
  completed: index < completedCount
}));

const daysAgo = (days, hour = 7, minute = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

async function seedLavorazioni() {
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

  const templateSeeds = [
    {
      nomeTemplate: 'Produzione formaggio Riserva',
      tipoLavorazione: 'formaggio',
      codiceTipoLav: 'B',
      outputName: 'Forma stagionata Riserva',
      outputUnit: 'Kg',
      inputs: [
        { type: 'latte', name: 'Latte crudo', quantity: 420, unit: 'L' },
        { type: 'additivo', name: 'Fermenti lattici', quantity: 1.8, unit: 'Kg' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Coagulazione', completed: false },
        { name: 'Rottura cagliata', completed: false },
        { name: 'Formatura', completed: false },
        { name: 'Salatura', completed: false },
        { name: 'Stagionatura', completed: false }
      ],
      notes: `${SEED_MARKER} Template formaggio stagionato tipo riserva`
    },
    {
      nomeTemplate: 'Primo sale fresco',
      tipoLavorazione: 'primo-sale',
      codiceTipoLav: 'A',
      outputName: 'Primo sale fresco porzionato',
      outputUnit: 'Kg',
      inputs: [
        { type: 'latte', name: 'Latte crudo', quantity: 280, unit: 'L' },
        { type: 'additivo', name: 'Fermenti lattici', quantity: 1.1, unit: 'Kg' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Inoculo', completed: false },
        { name: 'Coagulazione', completed: false },
        { name: 'Rottura cagliata', completed: false },
        { name: 'Formatura', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template primo sale pronto vendita`
    },
    {
      nomeTemplate: 'Produzione Crescenza',
      tipoLavorazione: 'formaggio',
      codiceTipoLav: 'B',
      outputName: 'Crescenza fresca vaschetta',
      outputUnit: 'Kg',
      inputs: [
        { type: 'latte', name: 'Latte crudo', quantity: 300, unit: 'L' },
        { type: 'ingrediente', name: 'Acqua', quantity: 12, unit: 'L' },
        { type: 'additivo', name: 'Fermenti lattici', quantity: 0.8, unit: 'Kg' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Inoculo', completed: false },
        { name: 'Coagulazione', completed: false },
        { name: 'Formatura', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template crescenza pronta vendita`
    },
    {
      nomeTemplate: 'Produzione yogurt vaniglia',
      tipoLavorazione: 'yogurt',
      codiceTipoLav: 'C',
      outputName: 'Yogurt vaniglia in vasetti',
      outputUnit: 'pezzi',
      inputs: [
        { type: 'latte', name: 'Latte scremato liquido o crema di latte', quantity: 260, unit: 'L' },
        { type: 'additivo', name: 'Fermenti lattici', quantity: 0.9, unit: 'Kg' },
        { type: 'ingrediente', name: 'Acqua', quantity: 8, unit: 'L' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Inoculo', completed: false },
        { name: 'Coagulazione', completed: false },
        { name: 'Concentrazione', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template yogurt gusto vaniglia`
    },
    {
      nomeTemplate: 'Produzione yogurt greco',
      tipoLavorazione: 'yogurt',
      codiceTipoLav: 'C',
      outputName: 'Yogurt greco colato',
      outputUnit: 'Kg',
      inputs: [
        { type: 'latte', name: 'Latte crudo', quantity: 340, unit: 'L' },
        { type: 'additivo', name: 'Fermenti lattici', quantity: 1.0, unit: 'Kg' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Inoculo', completed: false },
        { name: 'Coagulazione', completed: false },
        { name: 'Concentrazione', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template yogurt greco colato`
    },
    {
      nomeTemplate: 'Latte alimentare',
      tipoLavorazione: 'altro',
      codiceTipoLav: 'D',
      outputName: 'Latte alimentare confezionato',
      outputUnit: 'pezzi',
      inputs: [
        { type: 'latte', name: 'Latte crudo', quantity: 500, unit: 'L' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template latte alimentare confezionato`
    },
    {
      nomeTemplate: 'Produzione burro',
      tipoLavorazione: 'altro',
      codiceTipoLav: 'D',
      outputName: 'Panetti di burro',
      outputUnit: 'pezzi',
      inputs: [
        { type: 'latte', name: 'Latte scremato liquido o crema di latte', quantity: 210, unit: 'L' },
        { type: 'ingrediente', name: 'Acqua', quantity: 22, unit: 'L' },
        { type: 'additivo', name: 'Fermenti lattici', quantity: 0.7, unit: 'Kg' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Omogeneizzazione', completed: false },
        { name: 'Trattamento termico', completed: false },
        { name: 'Concentrazione', completed: false },
        { name: 'Zangolatura', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template burro in panetti`
    },
    {
      nomeTemplate: 'Recupero siero di latte',
      tipoLavorazione: 'altro',
      codiceTipoLav: 'D',
      outputName: 'Siero di latte residuo',
      outputUnit: 'L',
      inputs: [
        { type: 'latte', name: 'Latte crudo', quantity: 180, unit: 'L' },
        { type: 'ingrediente', name: 'Acqua', quantity: 20, unit: 'L' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Concentrazione', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template recupero siero tecnico`
    },
    {
      nomeTemplate: 'Produzione latticello',
      tipoLavorazione: 'altro',
      codiceTipoLav: 'D',
      outputName: 'Latticello',
      outputUnit: 'L',
      inputs: [
        { type: 'latte', name: 'Latte scremato liquido o crema di latte', quantity: 240, unit: 'L' },
        { type: 'ingrediente', name: 'Acqua', quantity: 10, unit: 'L' }
      ],
      fasi: [
        { name: 'Ricevimento', completed: false },
        { name: 'Centrifugazione', completed: false },
        { name: 'Zangolatura', completed: false },
        { name: 'Confezionamento', completed: false }
      ],
      notes: `${SEED_MARKER} Template latticello per industria alimentare`
    }
  ];

  const templateNames = templateSeeds.map((item) => item.nomeTemplate);
  const existingNamedTemplates = await Lavorazione.find({
    aziendaId: azienda._id,
    isTemplate: true,
    nomeTemplate: { $in: templateNames }
  }).select('_id');

  const existingTemplateIds = existingNamedTemplates.map((item) => item._id);
  const deleteResult = await Lavorazione.deleteMany({
    aziendaId: azienda._id,
    $or: [
      { notes: { $regex: `^${SEED_MARKER}` } },
      { _id: { $in: existingTemplateIds } },
      { templateId: { $in: existingTemplateIds } }
    ]
  });

  console.log(`Lavorazioni seed precedenti rimosse: ${deleteResult.deletedCount}`);

  const createdTemplates = [];
  for (const seedItem of templateSeeds) {
    const template = await Lavorazione.create({
      aziendaId: azienda._id,
      tipoLavorazione: seedItem.tipoLavorazione,
      codiceTipoLav: seedItem.codiceTipoLav,
      nomeTemplate: seedItem.nomeTemplate,
      isTemplate: true,
      status: 'in_corso',
      startedAt: daysAgo(120),
      notes: seedItem.notes,
      inputs: cloneInputs(seedItem.inputs),
      fasi: cloneFasi(seedItem.fasi),
      outputName: seedItem.outputName,
      outputUnit: seedItem.outputUnit
    });

    createdTemplates.push(template);
  }

  const byName = Object.fromEntries(createdTemplates.map((tpl) => [tpl.nomeTemplate, tpl]));

  const runSeeds = [
    {
      templateName: 'Produzione formaggio Riserva',
      startedAt: daysAgo(3, 6, 20),
      status: 'completata',
      endedAt: daysAgo(2, 14, 45),
      outputQuantity: 319.76,
      notes: `${SEED_MARKER} Lavorazione completata con rilievo IoT`,
      fasiCompleted: 9
    },
    {
      templateName: 'Produzione formaggio Riserva',
      startedAt: daysAgo(2, 7, 5),
      status: 'completata',
      endedAt: daysAgo(1, 15, 30),
      outputQuantity: 309.42,
      notes: `${SEED_MARKER} Chiusura manuale con controllo qualita`,
      fasiCompleted: 9
    },
    {
      templateName: 'Primo sale fresco',
      startedAt: daysAgo(5, 8, 10),
      status: 'completata',
      endedAt: daysAgo(4, 13, 40),
      outputQuantity: 212.5,
      notes: `${SEED_MARKER} Lotto stabile e conforme`,
      fasiCompleted: 7
    },
    {
      templateName: 'Primo sale fresco',
      startedAt: daysAgo(1, 9, 0),
      status: 'in_corso',
      notes: `${SEED_MARKER} Inoculo avviato, attesa controllo pH`,
      fasiCompleted: 3
    },
    {
      templateName: 'Produzione Crescenza',
      startedAt: daysAgo(1, 12, 30),
      status: 'in_corso',
      notes: `${SEED_MARKER} Batch fresco con monitoraggio temperatura`,
      fasiCompleted: 2
    },
    {
      templateName: 'Produzione yogurt vaniglia',
      startedAt: daysAgo(4, 6, 40),
      status: 'completata',
      endedAt: daysAgo(3, 10, 25),
      outputQuantity: 1180,
      notes: `${SEED_MARKER} Vasetti confezionati e pronti distribuzione`,
      fasiCompleted: 8
    },
    {
      templateName: 'Produzione yogurt vaniglia',
      startedAt: daysAgo(0, 6, 55),
      status: 'in_corso',
      notes: `${SEED_MARKER} Fermentazione in corso`,
      fasiCompleted: 4
    },
    {
      templateName: 'Produzione yogurt greco',
      startedAt: daysAgo(7, 7, 15),
      status: 'completata',
      endedAt: daysAgo(6, 16, 5),
      outputQuantity: 260.8,
      notes: `${SEED_MARKER} Colatura completata e confezionamento finale`,
      fasiCompleted: 7
    },
    {
      templateName: 'Latte alimentare',
      startedAt: daysAgo(2, 5, 45),
      status: 'completata',
      endedAt: daysAgo(2, 9, 15),
      outputQuantity: 980,
      notes: `${SEED_MARKER} Confezionamento completato`,
      fasiCompleted: 5
    },
    {
      templateName: 'Produzione burro',
      startedAt: daysAgo(6, 7, 50),
      status: 'completata',
      endedAt: daysAgo(6, 13, 35),
      outputQuantity: 640,
      notes: `${SEED_MARKER} Panetti pronti per punto vendita`,
      fasiCompleted: 7
    },
    {
      templateName: 'Produzione burro',
      startedAt: daysAgo(0, 10, 15),
      status: 'in_corso',
      notes: `${SEED_MARKER} Zangolatura avviata`,
      fasiCompleted: 5
    },
    {
      templateName: 'Recupero siero di latte',
      startedAt: daysAgo(3, 11, 5),
      status: 'completata',
      endedAt: daysAgo(3, 14, 10),
      outputQuantity: 154.2,
      notes: `${SEED_MARKER} Siero recuperato e stoccato`,
      fasiCompleted: 4
    }
  ];

  let createdRuns = 0;
  for (const run of runSeeds) {
    const template = byName[run.templateName];
    if (!template) {
      throw new Error(`Template non trovato per lavorazione seed: ${run.templateName}`);
    }

    await Lavorazione.create({
      aziendaId: azienda._id,
      tipoLavorazione: template.tipoLavorazione,
      codiceTipoLav: template.codiceTipoLav,
      isTemplate: false,
      templateId: template._id,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      status: run.status,
      notes: run.notes,
      inputs: cloneInputs(template.inputs),
      fasi: markFasiProgress(cloneFasi(template.fasi), run.fasiCompleted),
      outputName: template.outputName,
      outputUnit: template.outputUnit,
      outputQuantity: run.status === 'completata' ? run.outputQuantity : undefined
    });

    createdRuns += 1;
  }

  console.log(`Template creati: ${createdTemplates.length}`);
  createdTemplates.forEach((tpl) => {
    console.log(` - ${tpl.codiceLavorazione} | ${tpl.nomeTemplate}`);
  });
  console.log(`Lavorazioni operative create: ${createdRuns}`);
  console.log(`Azienda target: ${azienda.companyName} (${azienda._id})`);

  await mongoose.disconnect();
  console.log('Disconnesso. Seed lavorazioni completato.');
}

seedLavorazioni().catch(async (error) => {
  console.error('Errore seed lavorazioni:', error.message || error);
  await mongoose.disconnect();
  process.exit(1);
});
