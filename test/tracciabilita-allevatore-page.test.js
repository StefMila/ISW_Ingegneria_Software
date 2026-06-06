import request from 'supertest';
import app from '../app/app.js';
import { describe, expect, test } from '@jest/globals';

describe('Tracciabilita allevatore - pagina e script', () => {
  test('GET /tracciabilita-allevatore.html restituisce la pagina privata', async () => {
    const response = await request(app)
      .get('/tracciabilita-allevatore.html')
      .expect(200);

    expect(response.text).toContain('TRACCIABILITA ALLEVATORE');
    expect(response.text).toContain('STORIA LOTTI E STATO CORRENTE');
    expect(response.text).toContain('id="farmLotFilterInput"');
    expect(response.text).toContain('id="farmReloadLotsBtn"');
    expect(response.text).toContain('id="farmLotsList"');
    expect(response.text).toContain('class="trace-history-list"');
    expect(response.text).toContain('id="farmTimelineList"');
    expect(response.text).toContain('id="farmMungitureList"');
    expect(response.text).toContain('id="farmAnimalsList"');
    expect(response.text).toContain('id="farmPrintLabelBtn"');
    expect(response.text).toContain('<script src="/tracciabilita-allevatore.js"></script>');
  });

  test('GET /tracciabilita-allevatore.js usa endpoint privato tracciabilita', async () => {
    const response = await request(app)
      .get('/tracciabilita-allevatore.js')
      .expect(200);

    expect(response.text).toContain('/api/tracciabilita/lotti?aziendaId=');
    expect(response.text).toContain('/api/tracciabilita/lotti/');
    expect(response.text).toContain('/crea-etichette.html?');
    expect(response.text).toContain('reprintLot');
    expect(response.text).toContain('Tracciabilita privata caricata con successo.');
  });
});
