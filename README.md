# MuccApp

Web app gestionale per allevamenti, con funzionalita di tracciabilita e gestione azienda/mandria.

## Funzionalita principali
- Autenticazione utenti con JWT (signup, login, logout, reset password).
- Gestione aziende per utenti con ruolo allevatore.
- Registrazione animali associati a un'azienda (endpoint annidati su azienda).
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
- `npm run seed:mungiture`: popola mungiture demo distribuite su piu anni (2024-2026)
- `npm run seed:eventi`: popola eventi demo distribuiti su piu anni (2024-2026)

## Seed database

Esegui:

```bash
npm run seed
```

Lo script crea/riutilizza un utente allevatore di test e popola aziende/animali.
Credenziali principali seed:
| Tipo         | Email                       | Password     |
|--------------|-----------------------------|--------------|
| allevatore   | allevatore@muccapp.it       | Password123! |
| distributore | distributore@muccapp.it     | Password123! |
| veterinario  | veterinario@muccapp.it      | Password123! |
| consumatore  | consumatore@muccapp.it      | Password123! |

### Seed modulari per dominio

Per avere dati realistici e verificare grafici/filtri, sono disponibili seed separati:

- `npm run seed:mungiture`
	- inserisce mungiture `completata` con date distribuite sui mesi e su piu anni
	- utile per testare dashboard statistiche giornaliere/mensili/annuali
- `npm run seed:eventi`
	- inserisce eventi distribuiti sui mesi e su piu anni
	- utile per testare calendario e filtri eventi

Entrambi i seed sono idempotenti: rimuovono prima i dati demo creati da seed precedenti e poi li reinseriscono.

Ordine consigliato:

```bash
npm run seed
npm run seed:mungiture
npm run seed:eventi
```

Nota: `seed:mungiture` e `seed:eventi` richiedono che il seed base (`npm run seed`) sia gia stato eseguito almeno una volta.

## Documentazione API

Con server avviato:
- Swagger UI: `http://localhost:3000/api-docs`

Endpoint ufficiali (consigliati):
- `POST /api/azienda/{aziendaId}/animali`
- `GET /api/azienda/{aziendaId}/animali`
	- supporta filtri, sort e paginazione
- `POST /api/mungiture`
	- avvia una mungitura per un animale dell'azienda autenticata
- `GET /api/mungiture`
	- lista mungiture con filtri per azienda, animale e stato
- `PATCH /api/mungiture/{id}`
	- chiude o aggiorna una mungitura con `status`, `endedAt`, `quantity`, `unit=litri` e `notes`
- `GET /api/mungiture/{id}/iot-litri`
	- lettura simulata dei litri dalla bilancia IoT

Endpoint legacy (deprecati ma ancora supportati per compatibilita):
- `POST /api/animali/register`
- `GET /api/animali/azienda/{aziendaId}`

Nota: nel modello corrente gli animali sono risorse dell'azienda; i controlli autorizzativi verificano che l'utente possa operare solo sulle proprie aziende.


## Convenzioni
- Conventional Commits (stile Angular)
- Tracciabilita modelli con `createdAt`, `updatedAt`, `__v`

## Autori
- Alice
- Elena
- Stefania