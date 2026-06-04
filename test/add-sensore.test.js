import request from 'supertest';
import app from '../app/app.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_SECRET = JWT_SECRET;

let mongoServer;

const idAziendaValidoEsistente = '665f9fd8ad8f8c0012f9d900'; 
const idAllevatoreProprietario = '665f8fd8ad8f8c0012f9c999';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  await mongoose.connection.collection('aziendas').insertOne({
    _id: new mongoose.Types.ObjectId(idAziendaValidoEsistente),
    // Trasformato in ObjectId
    ownerUserId: new mongoose.Types.ObjectId(idAllevatoreProprietario),
    companyName: "Azienda Agricola Rossi Originale",
    vatNumber: "IT12345687901",
    emailAzienda: "rossi@test.it",
    address: "Via Roma 1, Calliano"
  });
});

beforeEach(async () => {
  await mongoose.connection.collection('aziendas').deleteMany({});
  await mongoose.connection.collection('sensores').deleteMany({});

  await mongoose.connection.collection('aziendas').insertOne({
    _id: new mongoose.Types.ObjectId(idAziendaValidoEsistente),
    // Trasformato in ObjectId
    ownerUserId: new mongoose.Types.ObjectId(idAllevatoreProprietario),
    companyName: "Azienda Agricola Rossi Originale",
    vatNumber: "IT12345687901",
    emailAzienda: "rossi@test.it",
    address: "Via Roma 1, Calliano"
  });
});
afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

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

describe('API IoT Sensori - POST /api/iot/sensori', () => {

  test('201 - POST /api/iot/sensori con dati validi', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);
    const nuovoSensore = {
      nome: "Sensore Termico Stalla",
      tipoDispositivo: "ambientale",
      aziendaId: idAziendaValidoEsistente,
      capacita: [
        {
          tipoDato: "temperatura",
          unitaMisura: "°C"
        }
      ]
    };

    const res = await request(app)
      .post('/api/iot/sensori')
      .set('Authorization', authHeader)
      .send(nuovoSensore);

    if (res.status === 500) console.log("ERRORE 500:", res.body);
     
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('item');
    expect(res.body.item).toHaveProperty('_id');
    expect(res.body.item.nome).toBe("Sensore Termico Stalla");
  });

  test('400 - POST senza campi obbligatori', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);

    const res = await request(app)
      .post('/api/iot/sensori')
      .set('Authorization', authHeader)
      .send({ nome: "Sensore Incompleto" }); // Mancano di proposito parametri chiave
       
    expect(res.status).toBe(400);
  });

  test('403 - POST con utente NON proprietario', async () => {
    const idAllevatoreEsterno = '665f8fd8ad8f8c0012f9e111';
    const authHeaderNonProprietario = buildAuthHeader(idAllevatoreEsterno);

    const nuovoSensore = {
      nome: "Sensore Test 403",
      tipoDispositivo: "ambientale",
      capacita: ["temperatura"],
      aziendaId: idAziendaValidoEsistente
    };

    const res = await request(app)
      .post('/api/iot/sensori')
      .set('Authorization', authHeaderNonProprietario)
      .send(nuovoSensore);

    expect(res.status).toBe(403);
  });
});