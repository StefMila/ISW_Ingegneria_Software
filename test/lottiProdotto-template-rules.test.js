import { jest } from '@jest/globals';

const mockFindByIdAzienda = jest.fn();
const mockFindOneLavorazione = jest.fn();

class MockAziendaModel {
  static findById = mockFindByIdAzienda;
}

class MockLavorazioneModel {
  static findOne = mockFindOneLavorazione;
}

class MockLottoProdottoModel {
  constructor(payload) {
    Object.assign(this, payload);
    this.validate = jest.fn().mockResolvedValue(undefined);
    this.save = jest.fn().mockResolvedValue(undefined);
  }
}

jest.unstable_mockModule('../app/models/azienda.js', () => ({
  default: MockAziendaModel
}));

jest.unstable_mockModule('../app/models/lavorazione.js', () => ({
  default: MockLavorazioneModel
}));

jest.unstable_mockModule('../app/models/lottoProdotto.js', () => ({
  default: MockLottoProdottoModel
}));

const { createLottoProdotto, updateLottoProdotto } = await import('../app/routes/lottiProdotto.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeSelectable = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

const makeLotto = (overrides = {}) => ({
  _id: '665f8fd8ad8f8c0012f9c124',
  aziendaId: '665f8fd8ad8f8c0012f9c123',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const userId = '665f8fd8ad8f8c0012f9c999';
const aziendaId = '665f8fd8ad8f8c0012f9c123';
const lavorazioneId = '665f8fd8ad8f8c0012f9c125';

describe('Routes - Lotti Prodotto template rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByIdAzienda.mockReturnValue(makeSelectable({
      _id: aziendaId,
      ownerUserId: userId
    }));
  });

  test('POST /api/lotti-prodotto blocca lavorazione template', async () => {
    mockFindOneLavorazione.mockReturnValue(makeSelectable({
      _id: lavorazioneId,
      aziendaId,
      isTemplate: true
    }));

    const req = {
      user: { userId },
      body: {
        aziendaId,
        lavorazioneId,
        nomeProdotto: 'Caciotta',
        quantity: 10,
        unit: 'pezzi'
      }
    };
    const res = makeRes();

    await createLottoProdotto(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'La lavorazione selezionata è un template e non può essere usata per creare un lotto prodotto'
    });
  });

  test('PATCH /api/lotti-prodotto/:id blocca assegnazione lavorazione template', async () => {
    MockLottoProdottoModel.findById = jest.fn().mockResolvedValue(makeLotto());
    mockFindOneLavorazione.mockReturnValue(makeSelectable({
      _id: lavorazioneId,
      isTemplate: true
    }));

    const req = {
      user: { userId },
      params: { id: '665f8fd8ad8f8c0012f9c124' },
      body: { lavorazioneId }
    };
    const res = makeRes();

    await updateLottoProdotto(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'La lavorazione selezionata è un template e non può essere usata per creare un lotto prodotto'
    });
  });
});
