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



dotenv.config({ path: new URL('./server/.env', import.meta.url) });


// dichiaro le variabili di ambiente per la connessione al database e la porta del server
const port = Number(process.env.PORT) || 3000;
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

// Route per la documentazione Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



// Endpoint di test per verificare che il server sia attivo
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server attivo',
    status: 'ok'
  });
});




// Connessione al database MongoDB tramite Mongoose --> usa l'indirizzo riportato nel file .env
mongoose.connect(process.env.DB_URL)
//se la connessione riesce, stampa messaggio positivo
  .then(() => {
    console.log('Connected to Database');

// Il server parte solo dopo che il database è connesso.
    app.listen(port,'127.0.0.1', () => {
      console.log(`Server in esecuzione su http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Errore di connessione al database:', error);
  });


