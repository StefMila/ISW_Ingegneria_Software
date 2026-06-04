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

  await mongoose.connection.collection('sensores').insertOne({
    _id: new mongoose.Types.ObjectId(),
    nome: "Sensore Umidità Stalla",
    tipoDispositivo: "ambientale",
    capacita: ["umidità"],
    // Trasformato in ObjectId
    aziendaId: new mongoose.Types.ObjectId(idAziendaValidoEsistente), 
    stato: "attivo",
    createdAt: new Date()
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Stesso costruttore del file show-azienda
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

describe('API IoT Sensori - GET /api/iot/sensori', () => {

  test('200 - GET lista sensori con token proprietario', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);

    const res = await request(app)
      .get(`/api/iot/sensori?aziendaId=${idAziendaValidoEsistente}`)
      .set('Authorization', authHeader);
     
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  test('400 - GET senza aziendaId', async () => {
    const authHeader = buildAuthHeader(idAllevatoreProprietario);

    const res = await request(app)
      .get('/api/iot/sensori') // Non passiamo l'aziendaId
      .set('Authorization', authHeader);
     
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Il parametro query aziendaId è obbligatorio');
  });

  test('403 - GET con utente NON proprietario', async () => {
    const idAllevatoreEsterno = '665f8fd8ad8f8c0012f9e111';
    const authHeaderNonProprietario = buildAuthHeader(idAllevatoreEsterno);
    
    const res = await request(app)
      .get(`/api/iot/sensori?aziendaId=${idAziendaValidoEsistente}`)
      .set('Authorization', authHeaderNonProprietario);

    expect(res.status).toBe(403);
  });
});