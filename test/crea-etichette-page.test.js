import request from 'supertest';
import app from '../app/app.js';
import { describe, expect, test } from '@jest/globals';

describe('Crea etichette - pagina e script', () => {
  test('GET /crea-etichette.html restituisce la pagina dedicata', async () => {
    const response = await request(app)
      .get('/crea-etichette.html')
      .expect(200);

    expect(response.text).toContain('CREA ETICHETTE');
    expect(response.text).toContain('id="labelStep1"');
    expect(response.text).toContain('id="labelStep2"');
    expect(response.text).toContain('id="labelStep3"');
    expect(response.text).toContain('id="labelLotsFilterInput"');
    expect(response.text).toContain('id="labelCreatedFromInput"');
    expect(response.text).toContain('id="labelCreatedToInput"');
    expect(response.text).toContain('id="labelLotsTableBody"');
    expect(response.text).toContain('id="labelLotDetailCard"');
    expect(response.text).toContain('id="labelDetailReprintBtn"');
    expect(response.text).toContain('Stampa etichette');
    expect(response.text).toContain('id="labelConfigTableBody"');
    expect(response.text).toContain('id="labelPrintBtn"');
    expect(response.text).toContain('<script src="/crea-etichette.js"></script>');
  });

  test('GET /crea-etichette.js contiene logica wizard e stampa iframe', async () => {
    const response = await request(app)
      .get('/crea-etichette.js')
      .expect(200);

    expect(response.text).toContain('/api/lotti-prodotto?aziendaId=');
    expect(response.text).toContain('/api/lotti-prodotto/mark-printed');
    expect(response.text).toContain('openLotDetail(');
    expect(response.text).toContain('reprintActiveLot');
    expect(response.text).toContain('event.shiftKey');
    expect(response.text).toContain('labelCreatedFromInput');
    expect(response.text).toContain('labelCreatedToInput');
    expect(response.text).toContain('labelPrintFrame');
    expect(response.text).toContain('printWindow.print()');
    expect(response.text).toContain('setStep(1);');
  });
});
