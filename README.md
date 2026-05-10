# MuccApp
> [github mmarkdown guide] (https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#what)

## Descrizione
Web app gestionale per allevamenti con sistema per tracciabilità lungo la filiera. Include sistemi di integrità dei dati e tracciabilità GDPR.

## Tecnologie Utilizzate
- Node.js e Express (Framework backend)
- MongoDB e Mongoose (Database NoSQL e ODM )
- JSON Web Tokens (JWT) (Autenticazione sicura)
- Jest e Supertest (Testing automatizzato)
- Swagger (Documentazione API)

### Frontend o output di Swagger
> Inserire qui uno screenshot

## Installazione e configurazione
1. Clona il repository
```git clone https://github.com/StefMila/ISW_Ingegneria_Software```
2. Installa le dipendenze
```npm install```
3. Configura le variabili d'ambiente
```cp .env.example .env```

## Script
> da revisionare
- (```npm run dev```: Avvia il server in modalità sviluppo con Nodemon (auto-reload))
- ```npm start```: Avvia il server in modalità produzione
- ```npm test```: Esegue la suite di test con Jest
-( ```npm run gen-dev```: Aggiorna il file .env.example in base al codice)

## Documentazione API
Una volta avviato il server, la documentazione interattiva Swagger è disponibile all'indirizzo
http://localhost:3000/api-docs

### Esempi APi
> (inserire qui come fare es una chiamata POST per aggiungere una mucca)

## Convenzioni di qualità e integrità
Il progetto segue queste convenzioni:
- **Integrità Ambientale**: Utilizzo di dotenv-safe per prevenire l'avvio dell'app in mancanza di configurazioni essenziali
- **Conventional Commits**: I messaggi di commit seguono lo standard Angular (fes, fix, chore, etc.) validato da ```commitlint``` e ```husky```
- **Tracciabilità**: Ogni modello nel database include timestamp (```createdAt```, ```updatedAt```) e controllo della concorrenza tramite ```__v``` (versionKey)

# Autori
- Alice
- Elena
- Stefania