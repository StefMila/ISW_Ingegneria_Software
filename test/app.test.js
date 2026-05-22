import request from 'supertest';
import app from '../app/app.js';
// Nota: app.js esporta solo l'app Express, non avvia il server. Questo permette di testare le rotte senza dover avviare un server reale.
test('GET /api/health dovrebbe rispondere con 200', async () => {
  const response = await request(app)
    .get('/api/health')
    .expect(200);
    // Verifica che la risposta con quella attesa
  expect(response.body.status).toBe('ok');
});