import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import authRoutes from './routes/auth.js';
import aziendeRoutes from './routes/aziende.js';
import animaliRoutes from './routes/animali.js';
import { publicEventiRoutes, aziendeEventiRoutes } from './routes/eventi.js';
import googleCalendarRoutes from './routes/google-calendar.js';
import puntiVenditaRoutes from './routes/puntiVendita.js';
import mungitureRoutes from './routes/mungiture.js';
import lottiProdottoRoutes from './routes/lottiProdotto.js';
import lavorazioniRoutes from './routes/lavorazioni.js';

import './services/mqttService.js'; // Fa partire la connessione e la simulazione MQTT all'avvio
import iotSensoriRoutes from './routes/sensori.js';

import { avviaSimulatoreHardware } from './services/mqttService.js';

if (process.env.NODE_ENV !== 'test') {
    avviaSimulatoreHardware();
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const swaggerDocument = YAML.load(path.join(projectRoot, 'oas3.yaml'));

// Middleware base
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(projectRoot, 'static')));

// Routing API
app.use('/api/auth', authRoutes);
app.use('/api/aziende', aziendeRoutes);
app.use('/api/animali', animaliRoutes);
app.use('/api/punti-vendita', puntiVenditaRoutes);
app.use('/api/mungiture', mungitureRoutes);
app.use('/api/lotti-prodotto', lottiProdottoRoutes);
app.use('/api/lavorazioni', lavorazioniRoutes);
app.use('/api/iot', iotSensoriRoutes);
app.use('/api/aziende/:aziendaId/eventi', publicEventiRoutes);
app.use('/api/aziende/:aziendaId/eventi', aziendeEventiRoutes);
app.use('/api/eventi', publicEventiRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);

// Swagger
app.get('/api-docs/spec.json', (req, res) => res.json(swaggerDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Config frontend
app.get('/api/config', (req, res) => {
  res.json({ googleMapsKey: process.env.GOOGLE_MAPS_API_KEY });
});

// Health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server attivo',
    status: 'ok'
  });
});

export default app;