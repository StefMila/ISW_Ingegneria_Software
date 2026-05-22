import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import authRoutes from './routes/auth.js';
import aziendaRoutes from './routes/azienda.js';
import AnimaleRoutes from './routes/animale.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const swaggerDocument = YAML.load(path.join(projectRoot, 'oas3.yaml'));

// Middleware base
app.use(express.json());
app.use(express.static(path.join(projectRoot, 'static')));

// Routing API
app.use('/api/auth', authRoutes);
app.use('/api/azienda', aziendaRoutes);
app.use('/api/animali', AnimaleRoutes);

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