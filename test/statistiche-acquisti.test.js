import request from 'supertest';
import app from '../app/app.js';
import { describe, expect, test } from '@jest/globals';

describe('Statistiche e Bacheca Badge Consumatore - Pagina e Script', () => {
  
  test('GET /statistiche-acquisti.html restituisce la pagina con i contatori e i contenitori dei badge', async () => {
    const response = await request(app)
      .get('/statistiche-acquisti.html')
      .expect(200);

    // Verifica la presenza del root per il menu laterale
    expect(response.text).toContain('id="menu-root"');

    // Verifica la presenza del contatore del totale acquisti/spesa
    expect(response.text).toContain('id="totaleSpesaKm0"');

    // Verifica la presenza degli ID per i 3 livelli di traguardo/badge
    expect(response.text).toContain('id="badge-1"');
    expect(response.text).toContain('id="badge-5"');
    expect(response.text).toContain('id="badge-10"');

    // Verifica l'inclusione corretta dello script JavaScript dedicato
    expect(response.text).toContain('<script src="/statistiche-acquisti.js"></script>');
  });

  test('GET /statistiche-acquisti.js contiene la logica per il fetch dei dati e la transizione visiva dei badge', async () => {
    const response = await request(app)
      .get('/statistiche-acquisti.js')
      .expect(200);

    // Verifica che lo script punti all'endpoint GET corretto per lo storico salvataggi
    expect(response.text).toContain('/api/prodotti-salvati');

    // Verifica la presenza delle funzioni strutturali del modulo
    expect(response.text).toContain('loadMenu');
    expect(response.text).toContain('calcolaStatisticheEBadge');
    expect(response.text).toContain('initPage');

    // Verifica la lettura di fallback del token (userToken o token) e la sua iniezione negli header
    expect(response.text).toContain("localStorage.getItem('userToken')");
    expect(response.text).toContain("localStorage.getItem('token')");
    expect(response.text).toContain("Authorization': `Bearer");

    // Verifica la corretta manipolazione delle classi CSS per "sbloccare" i badge (da locked a unlocked/colorato)
    expect(response.text).toContain("classList.remove('locked')");
    expect(response.text).toContain("classList.add('unlocked', 'badge-bronzo')");
    expect(response.text).toContain("classList.add('unlocked', 'badge-argento')");
    expect(response.text).toContain("classList.add('unlocked', 'badge-oro')");
    
    // Verifica l'ascolto dell'evento di caricamento DOM
    expect(response.text).toContain("document.addEventListener('DOMContentLoaded'");
  });

});