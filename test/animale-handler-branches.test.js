import { jest } from '@jest/globals';

// Mock espliciti dei model: ci permettono di testare i rami del controller
// senza dipendere da MongoDB reale durante la suite.
const mockFindOneAnimale = jest.fn();
const mockFindByIdAzienda = jest.fn();
const mockSaveAnimale = jest.fn();

class MockAnimaleModel {
  constructor(payload) {
    Object.assign(this, payload);
    this.save = mockSaveAnimale;
  }

  static findOne = mockFindOneAnimale;
}

class MockAziendaModel {
  static findById = mockFindByIdAzienda;
}

jest.unstable_mockModule('../app/models/animale.js', () => ({
  default: MockAnimaleModel
}));

jest.unstable_mockModule('../app/models/azienda.js', () => ({
  default: MockAziendaModel
}));

const { registerAnimale } = await import('../app/routes/animale.js');

// Utility minimale per simulare l'oggetto response di Express.
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {
    matricola: 'ITA00001',
    name: 'Bruna',
    species: 'mucca',
    dataNascita: '2022-01-10',
    sesso: 'femmina',
    aziendaId: '665f8fd8ad8f8c0012f9c123'
  },
  params: {},
  user: {
    userType: 'allevatore',
    userId: '665f8fd8ad8f8c0012f9c999'
  },
  ...overrides
});

const selectable = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

// Obiettivo: coprire i codici di stato principali richiesti dalla specifica.
describe('registerAnimale branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveAnimale.mockResolvedValue(undefined);
    mockFindOneAnimale.mockResolvedValue(null);
    mockFindByIdAzienda.mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c123',
      ownerUserId: '665f8fd8ad8f8c0012f9c999'
    }));
  });

  test('400 per input non validi', async () => {
    const req = makeReq({ body: { name: 'Bruna' } });
    const res = makeRes();

    await registerAnimale(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Matricola, name, species, dataNascita, sesso e aziendaId sono obbligatori'
    });
  });

  test('403 per ownership/permessi', async () => {
    const req = makeReq();
    const res = makeRes();

    mockFindByIdAzienda.mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c123',
      ownerUserId: '665f8fd8ad8f8c0012f9c111'
    }));

    await registerAnimale(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Non hai i permessi per questa azienda'
    });
  });

  test('404 risorsa non trovata', async () => {
    const req = makeReq();
    const res = makeRes();

    mockFindByIdAzienda.mockReturnValue(selectable(null));

    await registerAnimale(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Azienda non trovata'
    });
  });

  test('409 duplicati', async () => {
    const req = makeReq();
    const res = makeRes();

    mockFindOneAnimale.mockResolvedValue({ _id: 'dup' });

    await registerAnimale(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Esiste già un animale con questa matricola'
    });
  });

  test('500 ramo catch', async () => {
    const req = makeReq();
    const res = makeRes();

    mockFindOneAnimale.mockRejectedValue(new Error('db down'));

    await registerAnimale(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Errore interno del server'
    });
  });
});
