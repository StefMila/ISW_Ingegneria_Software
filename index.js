// Andando su localhost:3000/api-docs avrai una documentazione delle tue API.
// import swaggerUi from 'swagger-ui-express';
// import swaggerDocument from './swagger.json' with { type: 'json' };


// import delle librerie necessarie
import dotenv from 'dotenv';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';

dotenv.config({ path: new URL('./server/.env', import.meta.url) });


// dichiaro le variabili di ambiente per la connessione al database e la porta del server
const port = Number(process.env.PORT) || 3000;
//creo l'app 
const app = express();
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


// Endpoint di test per verificare che il server sia attivo
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server attivo',
    status: 'ok'
  });
});
// Serve i file statici dalla cartella "static"
app.use(express.static('static'));



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


