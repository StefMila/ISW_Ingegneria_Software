import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app/app.js';
import { jest, describe, beforeAll, beforeEach, afterEach, expect } from '@jest/globals';
import Azienda from '../app/models/azienda.js';
import Animale from '../app/models/animale.js';
import Mungitura from '../app/models/munigitura.js';
// test sulla pagina e script.
describe('US109-110-111 - Mungiture pages - pagina e script', () => {
  test('GET /avvia-mungitura.html restituisce la pagina con form di avvio', async () => {
    const response = await request(app)
      .get('/avvia-mungitura.html')
      .expect(200);

    expect(response.text).toContain('id="avviaMungituraForm"');
    expect(response.text).toContain('id="animaleId"');
    expect(response.text).toContain('id="scanAnimaleIdBtn"');
    expect(response.text).toContain('id="scanVideo"');
    expect(response.text).toContain('id="notes"');
    expect(response.text).toContain('id="mungitureTable"');
    expect(response.text).toContain('<script src="/mungiture-avvio-lista.js"></script>');
    expect(response.text).toContain('<script src="/avvia-mungitura.js"></script>');
  });

  test('GET /view-mungiture.html restituisce tabella mungiture', async () => {
    const response = await request(app)
      .get('/view-mungiture.html')
      .expect(200);

    expect(response.text).toContain('id="filterStartedAtFrom"');
    expect(response.text).toContain('id="filterStartedAtTo"');
    expect(response.text).toContain('id="filterAnimaleId"');
    expect(response.text).toContain('id="visibleMungitureCount"');
    expect(response.text).toContain('id="visibleMungitureLiters"');
    expect(response.text).toContain('id="mungitureTable"');
    expect(response.text).toContain('id="mungitureTableBody"');
    expect(response.text).toContain('Litri');
    expect(response.text).toContain('<script src="/view-mungiture.js"></script>');
  });

  test('Script avvia-mungitura usa endpoint animali e mungiture', async () => {
    const response = await request(app)
      .get('/avvia-mungitura.js')
      .expect(200);

    expect(response.text).toContain('/api/animali/aziende/${aziendaId}/animali');
    expect(response.text).toContain("fetch('/api/mungiture'");
    expect(response.text).toContain('semiLavoratoId');
    expect(response.text).toContain('BarcodeDetector');
  });

  test('Script mungiture-avvio-lista gestisce eliminazione dalla schermata di avvio', async () => {
    const response = await request(app)
      .get('/mungiture-avvio-lista.js')
      .expect(200);

    expect(response.text).toContain('terminate-scale-btn');
    expect(response.text).toContain('terminate-manual-btn');
    expect(response.text).toContain('method: \'PATCH\'');
    expect(response.text).toContain('/api/mungiture/${id}/iot-litri');
    expect(response.text).toContain('/api/mungiture/${id}');
  });

  test('Script view-mungiture usa endpoint lista e patch chiusura', async () => {
    const response = await request(app)
      .get('/view-mungiture.js')
      .expect(200);

    expect(response.text).toContain('/api/mungiture?${params.toString()}');
    expect(response.text).toContain('clearMungitureFilters');
    expect(response.text).toContain('visibleMungitureLiters');
    expect(response.text).toContain('filterAnimaleId');
    expect(response.text).toContain('method: \'DELETE\'');
    expect(response.text).toContain('/api/mungiture/${id}');
    expect(response.text).toContain('delete-mungitura-btn');
  });
});


const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const buildAuthHeader = () => {
  const token = jwt.sign(
    {
      userId: '665f8fd8ad8f8c0012f9c999',
      email: 'allevatore@test.it',
      userType: 'allevatore'
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return `Bearer ${token}`;
};

const buildCustomAuthHeader = ({ userId = '665f8fd8ad8f8c0012f9c999', userType = 'allevatore', expiresIn = '15m' } = {}) => {
  const token = jwt.sign(
    {
      userId,
      email: 'allevatore@test.it',
      userType
    },
    JWT_SECRET,
    { expiresIn }
  );

  return `Bearer ${token}`;
};

const selectable = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

// Test specifici per mungiture (evitando duplicati dei guard 401 già presenti in routes.test.js).
describe('US109-110-111 routes Mungitura', () => {
  let authHeader;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    authHeader = buildAuthHeader();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('POST /api/mungiture senza token restituisce 401', async () => {
    const response = await request(app)
      .post('/api/mungiture')
      .send({
        aziendaId: '665f8fd8ad8f8c0012f9c111',
        animaleId: '665f8fd8ad8f8c0012f9c222'
      })
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/mungiture senza token restituisce 401', async () => {
    const response = await request(app)
      .get('/api/mungiture?aziendaId=665f8fd8ad8f8c0012f9c111')
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('PATCH /api/mungiture/:id senza token restituisce 401', async () => {
    const response = await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .send({ notes: 'aggiornamento' })
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('GET /api/mungiture/:id/iot-litri senza token restituisce 401', async () => {
    const response = await request(app)
      .get('/api/mungiture/665f8fd8ad8f8c0012f9c333/iot-litri')
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('DELETE /api/mungiture/:id senza token restituisce 401', async () => {
    const response = await request(app)
      .delete('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .expect(401)
      .expect(res => {
        expect(res.body.message).toBe('Token mancante o formato non valido: Accesso negato');
      });
  });

  test('POST /api/mungiture con ruolo non autorizzato restituisce 403', async () => {
    const response = await request(app)
      .post('/api/mungiture')
      .set('Authorization', buildCustomAuthHeader({ userType: 'consumatore' }))
      .send({
        aziendaId: '665f8fd8ad8f8c0012f9c111',
        animaleId: '665f8fd8ad8f8c0012f9c222'
      })
      .expect(403)
      .expect(res => {
        expect(res.body.message).toBe('Permessi insufficienti: Accesso negato');
      });
  });

  test('GET /api/mungiture con azienda non di proprieta restituisce 403', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: 'owner-diverso'
    }));

    const response = await request(app)
      .get('/api/mungiture?aziendaId=665f8fd8ad8f8c0012f9c111')
      .set('Authorization', authHeader)
      .expect(403)
      .expect(res => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('PATCH /api/mungiture/:id con azienda non di proprieta restituisce 403', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue({
      _id: '665f8fd8ad8f8c0012f9c333',
      aziendaId: '665f8fd8ad8f8c0012f9c111',
      status: 'in_corso',
      quantity: undefined,
      save: jest.fn().mockResolvedValue(undefined)
    });
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: 'owner-diverso'
    }));

    const response = await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({ notes: 'aggiornamento' })
      .expect(403)
      .expect(res => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('GET /api/mungiture/:id/iot-litri con azienda non di proprieta restituisce 403', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue({
      _id: '665f8fd8ad8f8c0012f9c333',
      aziendaId: '665f8fd8ad8f8c0012f9c111'
    });
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: 'owner-diverso'
    }));

    const response = await request(app)
      .get('/api/mungiture/665f8fd8ad8f8c0012f9c333/iot-litri')
      .set('Authorization', authHeader)
      .expect(403)
      .expect(res => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('DELETE /api/mungiture/:id con azienda non di proprieta restituisce 403', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue({
      _id: '665f8fd8ad8f8c0012f9c333',
      aziendaId: '665f8fd8ad8f8c0012f9c111'
    });
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: 'owner-diverso'
    }));

    const response = await request(app)
      .delete('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .expect(403)
      .expect(res => {
        expect(res.body.message).toBe('Non hai i permessi per questa azienda');
      });
  });

  test('POST /api/mungiture con campi obbligatori mancanti restituisce 400', async () => {
    const response = await request(app)
      .post('/api/mungiture')
      .set('Authorization', authHeader)
      .send({})
      .expect(400);
  });

  test('PATCH /api/mungiture/:id con id non valido restituisce 400', async () => {
    const response = await request(app)
      .patch('/api/mungiture/not-an-object-id')
      .set('Authorization', authHeader)
      .send({
        endedAt: '2024-01-01T08:30:00Z',
        status: 'completata'
      })
      .expect(400);
  });

  test('POST /api/mungiture rifiuta campi non consentiti in fase di avvio', async () => {
    const response = await request(app)
      .post('/api/mungiture')
      .set('Authorization', authHeader)
      .send({
        aziendaId: '665f8fd8ad8f8c0012f9c111',
        animaleId: '665f8fd8ad8f8c0012f9c222',
        quantity: 10
      })
      .expect(400);
  });

  test('PATCH /api/mungiture/:id rifiuta campi non aggiornabili', async () => {
    const response = await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({
        startedAt: '2024-01-01T07:30:00Z'
      })
      .expect(400);
  });

  test('GET /api/mungiture/:id/iot-litri con id non valido restituisce 400', async () => {
    const response = await request(app)
      .get('/api/mungiture/not-an-object-id/iot-litri')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('DELETE /api/mungiture/:id con id non valido restituisce 400', async () => {
    const response = await request(app)
      .delete('/api/mungiture/not-an-object-id')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('PATCH /api/mungiture/:id senza campi aggiornabili restituisce 400', async () => {
    const response = await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({})
      .expect(400);
  });

  test('GET /api/mungiture senza aziendaId restituisce 400', async () => {
    const response = await request(app)
      .get('/api/mungiture')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('GET /api/mungiture con startedAtFrom non valido restituisce 400', async () => {
    const response = await request(app)
      .get('/api/mungiture?aziendaId=665f8fd8ad8f8c0012f9c111&startedAtFrom=data-non-valida')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('GET /api/mungiture con startedAtTo non valido restituisce 400', async () => {
    const response = await request(app)
      .get('/api/mungiture?aziendaId=665f8fd8ad8f8c0012f9c111&startedAtTo=data-non-valida')
      .set('Authorization', authHeader)
      .expect(400);
  });

  test('POST /api/mungiture con animale non trovato restituisce 404', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: '665f8fd8ad8f8c0012f9c999'
    }));
    jest.spyOn(Animale, 'findOne').mockResolvedValue(null);

    const response = await request(app)
      .post('/api/mungiture')
      .set('Authorization', authHeader)
      .send({
        aziendaId: '665f8fd8ad8f8c0012f9c111',
        animaleId: '665f8fd8ad8f8c0012f9c222'
      })
      .expect(404)
      .expect(res => {
        expect(res.body.message).toBe('Animale non trovato nell\'azienda');
      });
  });

  test('GET /api/mungiture con azienda non trovata restituisce 404', async () => {
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable(null));

    const response = await request(app)
      .get('/api/mungiture?aziendaId=665f8fd8ad8f8c0012f9c111')
      .set('Authorization', authHeader)
      .expect(404)
      .expect(res => {
        expect(res.body.message).toBe('Azienda non trovata');
      });
  });

  test('PATCH /api/mungiture/:id con mungitura non trovata restituisce 404', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue(null);

    const response = await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({ notes: 'aggiornamento' })
      .expect(404)
      .expect(res => {
        expect(res.body.message).toBe('Mungitura non trovata');
      });
  });

  test('GET /api/mungiture/:id/iot-litri con mungitura non trovata restituisce 404', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue(null);

    const response = await request(app)
      .get('/api/mungiture/665f8fd8ad8f8c0012f9c333/iot-litri')
      .set('Authorization', authHeader)
      .expect(404)
      .expect(res => {
        expect(res.body.message).toBe('Mungitura non trovata');
      });
  });

  test('DELETE /api/mungiture/:id con mungitura non trovata restituisce 404', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .expect(404)
      .expect(res => {
        expect(res.body.message).toBe('Mungitura non trovata');
      });
  });

  test('PATCH /api/mungiture/:id completa manualmente e salva quantity/endedAt/status', async () => {
    const saveMock = jest.fn().mockResolvedValue(undefined);
    const mungituraDoc = {
      _id: '665f8fd8ad8f8c0012f9c333',
      aziendaId: '665f8fd8ad8f8c0012f9c111',
      status: 'in_corso',
      quantity: undefined,
      unit: 'litri',
      save: saveMock
    };

    jest.spyOn(Mungitura, 'findById').mockResolvedValue(mungituraDoc);
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: '665f8fd8ad8f8c0012f9c999'
    }));

    const response = await request(app)
      .patch('/api/mungiture/665f8fd8ad8f8c0012f9c333')
      .set('Authorization', authHeader)
      .send({
        status: 'completata',
        endedAt: '2026-06-04T10:00:00.000Z',
        quantity: '14.75',
        unit: 'litri',
        notes: 'chiusura manuale'
      })
      .expect(200)
      .expect(res => {
        expect(res.body.message).toBe('Mungitura aggiornata con successo');
      });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(mungituraDoc.status).toBe('completata');
    expect(mungituraDoc.quantity).toBe(14.75);
    expect(mungituraDoc.unit).toBe('litri');
    expect(mungituraDoc.notes).toBe('chiusura manuale');
    expect(response.body.mungitura).toBeDefined();
  });

  test('GET /api/mungiture/:id/iot-litri restituisce misurazione valida', async () => {
    jest.spyOn(Mungitura, 'findById').mockResolvedValue({
      _id: '665f8fd8ad8f8c0012f9c333',
      aziendaId: '665f8fd8ad8f8c0012f9c111'
    });
    jest.spyOn(Azienda, 'findById').mockReturnValue(selectable({
      _id: '665f8fd8ad8f8c0012f9c111',
      ownerUserId: '665f8fd8ad8f8c0012f9c999'
    }));

    await request(app)
      .get('/api/mungiture/665f8fd8ad8f8c0012f9c333/iot-litri')
      .set('Authorization', authHeader)
      .expect(200)
      .expect(res => {
        expect(res.body.source).toBe('iot');
        expect(res.body.unit).toBe('litri');
        expect(typeof res.body.quantity).toBe('number');
        expect(res.body.quantity).toBeGreaterThanOrEqual(8);
        expect(res.body.quantity).toBeLessThanOrEqual(38);
      });
  });
});

