# MuccApp

Web app gestionale per allevamenti, con funzionalita di tracciabilita e gestione azienda/mandria.

## Funzionalita principali
- Autenticazione utenti con JWT (signup, login, logout, reset password).
- Gestione aziende per utenti con ruolo allevatore.
- Registrazione animali associati a un'azienda.
- View mandria con:
	- filtri per colonna
	- ordinamento per colonna
	- paginazione server-side

## Stack tecnologico
- Node.js + Express
- MongoDB + Mongoose
- JSON Web Token (JWT)
- Swagger UI / OpenAPI 3
- Jest + Supertest

## Requisiti
- Node.js 22.x
- MongoDB in esecuzione in locale

## Installazione
1. Clona il repository

```bash
git clone https://github.com/StefMila/ISW_Ingegneria_Software
cd ISW_Ingegneria_Software
```

2. Installa le dipendenze

```bash
npm install
```

3. Configura le variabili ambiente

Il backend legge il file `server/.env`.
Assicurati che siano presenti almeno:
- `DB_URL`
- `JWT_SECRET`

## Avvio applicazione

```bash
npm run dev
```

Server: `http://localhost:3000`

## Script disponibili
- `npm run dev`: avvia il server in sviluppo con nodemon
- `npm start`: avvia il server in modalita produzione
- `npm test`: esegue i test con Jest
- `npm run gen-env`: aggiorna la specifica env
- `npm run seed`: popola il database con dati di test

## Seed database

Esegui:

```bash
npm run seed
```

Lo script crea/riutilizza un utente allevatore di test e popola aziende/animali.
Credenziali principali seed:
- email: `allevatore.test@muccapp.it`
- password: `Password123!`

## Documentazione API

Con server avviato:
- Swagger UI: `http://localhost:3000/api-docs`

Endpoint principale della view mandria documentato:
- `GET /api/animali/azienda/{aziendaId}`
	- supporta filtri, sort e paginazione


## Convenzioni
- Conventional Commits (stile Angular)
- Tracciabilita modelli con `createdAt`, `updatedAt`, `__v`

## Autori
- Alice
- Elena
- Stefania