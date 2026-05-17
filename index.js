import swaggerUi from 'swagger-ui-express';
//import swaggerSpec from './docs/swagger.js';
import YAML from 'yamljs';


// import delle librerie necessarie
import dotenv from 'dotenv';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import User from './app/models/user.js';
import authRoutes from './app/routes/auth.js';
import aziendaRoutes from './app/routes/azienda.js';
import AnimaleRoutes from './app/routes/animale.js';


// Carica le variabili d'ambiente dallo stesso .env usato dal server
dotenv.config({ path: new URL('./server/.env', import.meta.url) });


// dichiaro le variabili di ambiente per la connessione al database e la porta del server
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';
//creo l'app 
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const server = http.createServer((req, res) => {
    if (req.url === '/api/health' && req.method === 'GET') {
        const body = JSON.stringify({
            message: 'Server is running',
            status: 'OK'
        });

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        });
        res.end(body);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});
const swaggerDocument = YAML.load('./oas3.yaml');

// Middleware per il parsing del corpo delle richieste in formato JSON
app.use(express.json());
// Serve per pubblicare i file statici dalla cartella "static"
app.use(express.static(path.join(__dirname, 'static')));
// Route per l'autenticazione, login, logout e recupero password, tutte le route sono prefissate da /api/auth
app.use('/api/auth', authRoutes);
// Alias route per compatibilita': consente chiamate su /api/azienda
app.use('/api/azienda', aziendaRoutes);
// Alias route per compatibilita': consente chiamate su /api/animali
app.use('/api/animali', AnimaleRoutes);



// Route per la documentazione Swagger
app.get('/api-docs/spec.json', (req, res) => res.json(swaggerDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));




// Endpoint di test per verificare che il server sia attivo
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server attivo',
    status: 'ok'
  });
});

// Il server HTTP parte subito: Render richiede che il processo resti in ascolto sulla porta assegnata.
app.listen(port, host, () => {
  console.log(`Server in esecuzione su ${host}:${port}`);

  if (host === '0.0.0.0') {
    console.log(`In locale puoi aprire: http://localhost:${port}`);
  }
});

// Connessione al database MongoDB in background.
if (!process.env.DB_URL) {
  console.error('Variabile DB_URL non impostata: connessione al database non avviata');
} else {
  mongoose.connect(process.env.DB_URL)
    .then(() => {
      console.log('Connected to Database');
    })
    .catch((error) => {
      console.error('Errore di connessione al database:', error);
    });
}


