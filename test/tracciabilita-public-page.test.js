import request from 'supertest';
import app from '../app/app.js';
import { describe, expect, test } from '@jest/globals';

describe('Tracciabilita pubblica - pagina e script', () => {
  test('GET /tracciabilita.html restituisce la pagina pubblica', async () => {
    const response = await request(app)
      .get('/tracciabilita.html')
      .expect(200);

    expect(response.text).toContain('TRACCIABILITA PRODOTTO');
    expect(response.text).toContain('id="lotNumberInput"');
    expect(response.text).toContain('id="searchTraceBtn"');
    expect(response.text).toContain('id="traceTimelineList"');
    expect(response.text).toContain('id="traceAnimalsList"');
    expect(response.text).toContain('<script src="/tracciabilita.js"></script>');
  });

  test('GET /tracciabilita.js contiene la logica per endpoint pubblico', async () => {
    const response = await request(app)
      .get('/tracciabilita.js')
      .expect(200);

    expect(response.text).toContain('/api/tracciabilita/public/lotti/');
    expect(response.text).toContain('Tracciabilita caricata con successo.');
    expect(response.text).toContain('Passi giornalieri (media)');
  });
});
