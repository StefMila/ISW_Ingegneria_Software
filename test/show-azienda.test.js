import request from 'supertest';
import app from '../app/app.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server'; // Database in memoria

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_SECRET = JWT_SECRET;

let mongoServer;

// ID di riferimento realistici (coerenti con i formati MongoDB ObjectId)
const idAziendaValidoEsistente = '665f9fd8ad8f8c0012f9d900'; 
const idAllevatoreProprietario = '665f8fd8ad8f8c0012f9c999';

// Avvia un serverMongoDB in memoria
beforeAll(async () => {
  // Avvia il server MongoDB virtuale isolato
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connetti Mongoose a questo database temporaneo
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Inseriamo l'azienda di test nel DB in memoria,
  // così i test 200 e 403 troveranno SEMPRE il dato reale senza configurazioni esterne
  await mongoose.connection.collection('aziendas').insertOne({
    _id: new mongoose.Types.ObjectId(idAziendaValidoEsistente),
    ownerUserId: idAllevatoreProprietario,
    companyName: "Azienda Agricola Rossi Originale",
    vatNumber: "IT12345687901",
    emailAzienda: "rossi@test.it",
    address: "Via Roma 1, Calliano"
  });
});

// Ripristina lo stato del database prima di ogni singolo test per evitare interferenze dal DELETE
beforeEach(async () => {
  await mongoose.connection.collection('aziendas').deleteMany({});
  
  // Inseriamo l'azienda di test nel DB in memoria,
  // così i test troveranno SEMPRE il dato reale e pulito
  await mongoose.connection.collection('aziendas').insertOne({
    _id: new mongoose.Types.ObjectId(idAziendaValidoEsistente),
    ownerUserId: idAllevatoreProprietario,
    companyName: "Azienda Agricola Rossi Originale",
    vatNumber: "IT12345687901",
    emailAzienda: "rossi@test.it",
    address: "Via Roma 1, Calliano"
  });
});

afterAll(async () => {
  // Chiudiamo la connessione per evitare che Jest rimanga appeso alla fine
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Genera un header di autorizzazione valido con un payload reale.
// Permette di differenziare l'utente per testare i permessi di ownership.

const buildAuthHeader = (userId = '665f8fd8ad8f8c0012f9c999') => {
  const token = jwt.sign(
    {
      userId: userId,
      email: 'allevatore@test.it',
      userType: 'allevatore'
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return `Bearer ${token}`;
};


describe('API Aziende - Protezione Endpoint (No Token)', () => {

  test('GET /api/aziende/mine senza token restituisce 401', async () => {
    await request(app)
      .get('/api/aziende/mine')
      .expect(401);
  });

  test('GET /api/aziende/:id senza token restituisce 401', async () => {
    await request(app)
      .get(`/api/aziende/${idAziendaValidoEsistente}`)
      .expect(401);
  });

  test('PATCH /api/aziende/:id senza token restituisce 401', async () => {
    await request(app)
      .patch(`/api/aziende/${idAziendaValidoEsistente}`)
      .send({
        companyName: 'Tentativo Modifica Anonimo Srl'
      })
      .expect(401);
  });

  test('DELETE /api/aziende/:id senza token restituisce 401', async () => {
    await request(app)
      .delete(`/api/aziende/${idAziendaValidoEsistente}`)
      .expect(401);
  });
});


describe('API Aziende - Integrazione e Controllo Accessi', () => {

  test('200 - PATCH /api/aziende/:id con token proprietario aggiorna i dati', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const patchData = {
      companyName: "Nuova Azienda Agricola Rossi",
      vatNumber: "IT12345687901"
    };

    const res = await request(app)
      .patch(`/api/aziende/${idAziendaValidoEsistente}`)
      .set('Authorization', authHeader)
      .send(patchData);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Azienda aggiornata con successo');
    expect(res.body).toHaveProperty('itemInfo');
    expect(res.body.itemInfo.companyName).toBe(patchData.companyName);
  });

  test('400 - PATCH /api/aziende/:id restituisce 400 se l\'id non è un ObjectId valido', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const invalidObjectId = 'id-non-valido-123';

    const res = await request(app)
      .patch(`/api/aziende/${invalidObjectId}`)
      .set('Authorization', authHeader)
      .send({ companyName: "Nome Test" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'aziendaId non è un ObjectId valido');
  });

  test('403 - PATCH /api/aziende/:id restituisce 403 se l\'utente NON è il proprietario', async () => {
    // Generiamo un token associato a un utente differente rispetto al proprietario dell'azienda
    const idAllevatoreEsterno = '665f8fd8ad8f8c0012f9e111';
    const authHeaderNonProprietario = buildAuthHeader(idAllevatoreEsterno);

    const res = await request(app)
      .patch(`/api/aziende/${idAziendaValidoEsistente}`)
      .set('Authorization', authHeaderNonProprietario)
      .send({ companyName: "Tentativo Hacker" });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Non hai i permessi per questa azienda');
  });

  test('404 - PATCH /api/aziende/:id restituisce 404 se l\'ID è valido sintatticamente ma non esiste nel database', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const idInesistente = '665f9fd8ad8f8c0012f90000'; // ObjectId strutturato ma assente nel DB

    const res = await request(app)
      .patch(`/api/aziende/${idInesistente}`)
      .set('Authorization', authHeader)
      .send({ companyName: "Nuovo Nome" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Azienda non trovata');
  });

  test('404 - GET /api/aziende/:id restituisce 404 se l\'azienda non esiste', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const idInesistente = '665f9fd8ad8f8c0012f90000';

    const res = await request(app)
      .get(`/api/aziende/${idInesistente}`)
      .set('Authorization', authHeader)
      .expect(404);

    expect(res.body).toHaveProperty('message', 'Azienda non trovata');
  });
});

describe('API Aziende - Integrazione e Controllo Accessi (DELETE)', () => {

  test('200 - DELETE /api/aziende/:id con token proprietario elimina l\'azienda con successo', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);

    const res = await request(app)
      .delete(`/api/aziende/${idAziendaValidoEsistente}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Azienda eliminata con successo');

    // Verifica di avvenuta cancellazione: provando a cercarla deve dare 404
    const checkRes = await request(app)
      .get(`/api/aziende/${idAziendaValidoEsistente}`)
      .set('Authorization', authHeader);
    expect(checkRes.status).toBe(404);
  });

  test('400 - DELETE /api/aziende/:id restituisce 400 se l\'id non è un ObjectId valido', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const invalidObjectId = 'id-non-valido-123';

    const res = await request(app)
      .delete(`/api/aziende/${invalidObjectId}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'aziendaId non è un ObjectId valido');
  });

  test('403 - DELETE /api/aziende/:id restituisce 403 se l\'utente NON è il proprietario', async () => {
    const idAllevatoreEsterno = '665f8fd8ad8f8c0012f9e111';
    const authHeaderNonProprietario = buildAuthHeader(idAllevatoreEsterno);

    const res = await request(app)
      .delete(`/api/aziende/${idAziendaValidoEsistente}`)
      .set('Authorization', authHeaderNonProprietario);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Non hai i permessi per questa azienda');
  });

  test('404 - DELETE /api/aziende/:id restituisce 404 se l\'ID è valido ma l\'azienda non esiste', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const idInesistente = '665f9fd8ad8f8c0012f90000'; 

    const res = await request(app)
      .delete(`/api/aziende/${idInesistente}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Azienda non trovata');
  });
});