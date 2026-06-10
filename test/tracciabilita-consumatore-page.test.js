import request from 'supertest';
import app from '../app/app.js';
import { describe, expect, test } from '@jest/globals';

describe('Tracciabilita consumatore autenticato - pagina', () => {
  test('GET /tracciabilita-consumatore.html restituisce pagina protetta con campi lotto aggiornati', async () => {
    const response = await request(app)
      .get('/tracciabilita-consumatore.html')
      .expect(200);

    expect(response.text).toContain("protectRoute(['consumatore'])");
    expect(response.text).toContain('/menu-consumatore.html');
    expect(response.text).toContain('id="lotProducerWebsiteValue"');
    expect(response.text).toContain('id="lotOpenMapBtn"');
    expect(response.text).toContain('<script src="/tracciabilita.js"></script>');
  });
});