import request from 'supertest';
import app from '../app/app.js';

describe('Mungiture pages - pagina e script', () => {
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
    expect(response.text).toContain('method: \'DELETE\'');
    expect(response.text).toContain('/api/mungiture/${id}');
    expect(response.text).toContain('delete-mungitura-btn');
  });
});
