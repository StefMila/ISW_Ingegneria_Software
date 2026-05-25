import request from 'supertest';
import app from '../app/app.js';

// Questi test verificano due aspetti fondamentali:
// 1) sicurezza degli endpoint eventi (devono essere protetti da token)
// 2) coerenza tra implementazione e documentazione OpenAPI.
describe('Eventi API - protezione endpoint', () => {
  test('GET /api/aziende/:aziendaId/eventi senza token restituisce 401', async () => {
    const response = await request(app)
      .get('/api/aziende/665f8fd8ad8f8c0012f9c123/eventi')
      .expect(401);

    expect(response.body.message).toContain('Token mancante');
  });

  test('GET /api/eventi senza /pubblici restituisce 404 dopo la rimozione degli alias legacy', async () => {
    const response = await request(app)
      .get('/api/eventi?aziendaId=665f8fd8ad8f8c0012f9c123')
      .expect(404);

    expect(response.body).toEqual({});
  });

  test('POST /api/eventi/sincronizzazioni/google restituisce 404 dopo la rimozione degli alias legacy', async () => {
    await request(app)
      .post('/api/eventi/sincronizzazioni/google')
      .send({ aziendaId: '665f8fd8ad8f8c0012f9c123' })
      .expect(404);
  });

  test('POST /api/eventi/:id/sincronizzazioni/google restituisce 404 dopo la rimozione degli alias legacy', async () => {
    await request(app)
      .post('/api/eventi/665f8fd8ad8f8c0012f9c124/sincronizzazioni/google')
      .expect(404);
  });

  test('POST /api/eventi/google-sync-all restituisce 404 dopo la rimozione dell alias legacy', async () => {
    await request(app)
      .post('/api/eventi/google-sync-all')
      .send({ aziendaId: '665f8fd8ad8f8c0012f9c123' })
      .expect(404);
  });

  test('POST /api/eventi/:id/google-sync restituisce 404 dopo la rimozione dell alias legacy', async () => {
    await request(app)
      .post('/api/eventi/665f8fd8ad8f8c0012f9c124/google-sync')
      .expect(404);
  });

  test('POST /api/aziende/:aziendaId/eventi/sincronizzazioni/google senza token restituisce 401', async () => {
    const response = await request(app)
      .post('/api/aziende/665f8fd8ad8f8c0012f9c123/eventi/sincronizzazioni/google')
      .send({ onlyUnsynced: true })
      .expect(401);

    expect(response.body.message).toContain('Token mancante');
  });
});

describe('OpenAPI - allineamento endpoint eventi', () => {
  test('Spec contiene i path noun-based di sincronizzazione eventi', async () => {
    const response = await request(app)
      .get('/api-docs/spec.json')
      .expect(200);

    // Se la spec e aggiornata, i nuovi path REST devono essere presenti.
    const paths = response.body?.paths || {};
    expect(paths['/api/aziende/{aziendaId}/eventi/sincronizzazioni/google']).toBeDefined();
    expect(paths['/api/aziende/{aziendaId}/eventi/{id}/sincronizzazioni/google']).toBeDefined();
    expect(paths['/api/eventi/pubblici']).toBeDefined();
    expect(paths['/api/aziende/{aziendaId}/eventi/pubblici']).toBeDefined();
  });

  test('Spec documenta i filtri pubblici per azienda, citta e data', async () => {
    const response = await request(app)
      .get('/api-docs/spec.json')
      .expect(200);

    const publicParameters = response.body?.paths?.['/api/eventi/pubblici']?.get?.parameters || [];
    const parameterNames = publicParameters.map((parameter) => parameter.name);
    expect(parameterNames).toEqual(expect.arrayContaining(['aziendaId', 'city', 'date', 'page', 'limit']));
  });

  test('Spec POST /api/aziende/{aziendaId}/eventi include esempi temporaneo pubblico e singolo privato', async () => {
    const response = await request(app)
      .get('/api-docs/spec.json')
      .expect(200);

    // Verifichiamo anche gli esempi business richiesti (public/private).
    const examples = response.body?.paths?.['/api/aziende/{aziendaId}/eventi']?.post?.requestBody?.content?.['application/json']?.examples;
    expect(examples?.temporaneoPubblico).toBeDefined();
    expect(examples?.singoloPrivato).toBeDefined();
    expect(examples?.temporaneoPubblico?.value?.visibility).toBe('public');
    expect(examples?.singoloPrivato?.value?.visibility).toBe('private');
  });
});
