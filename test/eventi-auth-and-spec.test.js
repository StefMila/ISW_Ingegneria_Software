import request from 'supertest';
import app from '../app/app.js';

// Questi test verificano due aspetti fondamentali:
// 1) sicurezza degli endpoint eventi (devono essere protetti da token)
// 2) coerenza tra implementazione e documentazione OpenAPI.
describe('Eventi API - protezione endpoint', () => {
  test('GET /api/eventi senza token restituisce 401', async () => {
    const response = await request(app)
      .get('/api/eventi?aziendaId=665f8fd8ad8f8c0012f9c123')
      .expect(401);

    expect(response.body.message).toContain('Token mancante');
  });

  test('POST /api/eventi/sincronizzazioni/google senza token restituisce 401', async () => {
    const response = await request(app)
      .post('/api/eventi/sincronizzazioni/google')
      .send({ aziendaId: '665f8fd8ad8f8c0012f9c123' })
      .expect(401);

    expect(response.body.message).toContain('Token mancante');
  });

  test('POST /api/eventi/:id/sincronizzazioni/google senza token restituisce 401', async () => {
    const response = await request(app)
      .post('/api/eventi/665f8fd8ad8f8c0012f9c124/sincronizzazioni/google')
      .expect(401);

    expect(response.body.message).toContain('Token mancante');
  });

  test('Alias legacy POST /api/eventi/google-sync-all resta disponibile (protetto)', async () => {
    const response = await request(app)
      .post('/api/eventi/google-sync-all')
      .send({ aziendaId: '665f8fd8ad8f8c0012f9c123' })
      .expect(401);

    expect(response.body.message).toContain('Token mancante');
  });

  test('Alias legacy POST /api/eventi/:id/google-sync resta disponibile (protetto)', async () => {
    const response = await request(app)
      .post('/api/eventi/665f8fd8ad8f8c0012f9c124/google-sync')
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
    expect(paths['/api/eventi/sincronizzazioni/google']).toBeDefined();
    expect(paths['/api/eventi/{id}/sincronizzazioni/google']).toBeDefined();
  });

  test('Spec POST /api/eventi include esempi temporaneo pubblico e singolo privato', async () => {
    const response = await request(app)
      .get('/api-docs/spec.json')
      .expect(200);

    // Verifichiamo anche gli esempi business richiesti (public/private).
    const examples = response.body?.paths?.['/api/eventi']?.post?.requestBody?.content?.['application/json']?.examples;
    expect(examples?.temporaneoPubblico).toBeDefined();
    expect(examples?.singoloPrivato).toBeDefined();
    expect(examples?.temporaneoPubblico?.value?.visibility).toBe('public');
    expect(examples?.singoloPrivato?.value?.visibility).toBe('private');
  });
});
