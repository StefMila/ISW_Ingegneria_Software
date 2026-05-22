import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app/app.js';


// Carica le variabili d'ambiente dallo stesso .env usato dal server
dotenv.config({ path: new URL('./server/.env', import.meta.url) });


// Variabili ambiente per avvio server.
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

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


