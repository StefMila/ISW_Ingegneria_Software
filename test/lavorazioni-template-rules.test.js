import { jest } from '@jest/globals';

const mockFindByIdAzienda = jest.fn();
const mockLavorazioneFind = jest.fn();

class MockAziendaModel {
  static findById = mockFindByIdAzienda;
}

class MockLavorazioneModel {
  constructor(payload) {
    Object.assign(this, payload);
    this.save = jest.fn().mockResolvedValue(undefined);
  }

  static find = mockLavorazioneFind;
}

jest.unstable_mockModule('../app/models/azienda.js', () => ({
  default: MockAziendaModel
}));

jest.unstable_mockModule('../app/models/lavorazione.js', () => ({
  default: MockLavorazioneModel
}));

const { createLavorazione, getLavorazioni } = await import('../app/routes/lavorazioni.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeSelectable = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

const userId = '665f8fd8ad8f8c0012f9c999';
const aziendaId = '665f8fd8ad8f8c0012f9c123';

describe('Routes - Lavorazioni template rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByIdAzienda.mockReturnValue(makeSelectable({
      _id: aziendaId,
      ownerUserId: userId
    }));
  });

  test('POST /api/lavorazioni rifiuta isTemplate non boolean-like', async () => {
    const req = {
      user: { userId },
      body: {
        aziendaId,
        tipoLavorazione: 'altro',
        isTemplate: 'yes'
      }
    };
    const res = makeRes();

    await createLavorazione(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'isTemplate deve essere true o false' });
  });

  test('POST /api/lavorazioni rifiuta fasi non consentite', async () => {
    const req = {
      user: { userId },
      body: {
        aziendaId,
        tipoLavorazione: 'altro',
        fasi: [{ name: 'Fase inventata', completed: false }]
      }
    };
    const res = makeRes();

    await createLavorazione(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Le fasi consentite sono: Ricevimento, Centrifugazione, Omogeneizzazione, Trattamento termico, Inoculo, Coagulazione, Rottura cagliata, Formatura, Salatura, Stagionatura, Concentrazione, Zangolatura, Confezionamento'
    });
  });

  test('GET /api/lavorazioni senza isTemplate applica filtro default che esclude i template', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    mockLavorazioneFind.mockReturnValue({ sort: sortMock });

    const req = {
      user: { userId },
      query: { aziendaId }
    };
    const res = makeRes();

    await getLavorazioni(req, res);

    expect(mockLavorazioneFind).toHaveBeenCalledWith({
      aziendaId,
      isTemplate: { $ne: true }
    });
    expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
