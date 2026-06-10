import request from 'supertest';
import app from '../app/app.js';
import { describe, expect, test } from '@jest/globals';

describe('Scansione Prodotto Consumatore - Pagina e Script', () => {
  
  test('GET /scansiona-prodotto.html restituisce la pagina con la struttura DOM corretta per la scansione e i badge', async () => {
    const response = await request(app)
      .get('/scansiona-prodotto.html')
      .expect(200);

    // Verifica la presenza degli ID degli input e bottoni principali
    expect(response.text).toContain('id="lotNumberInput"');
    expect(response.text).toContain('id="btnInviaScansione"');
    
    // Verifica la presenza degli alert di feedback (successo ed errore)
    expect(response.text).toContain('id="successMessage"');
    expect(response.text).toContain('id="errorMessage"');

    // Verifica la presenza degli elementi che compongono la modale di sblocco dei Badge
    expect(response.text).toContain('id="badgeModal"');
    expect(response.text).toContain('id="nomeBadgeSbloccato"');
    expect(response.text).toContain('id="badgeDescrizione"');
    expect(response.text).toContain('id="closeBadgeModalBtn"');
    expect(response.text).toContain('class="badge-icon');

    // Verifica l'inclusione corretta dello script JavaScript dedicato
    expect(response.text).toContain('<script src="/scansiona-prodotto.js"></script>');
  });

  test('GET /scansiona-prodotto.js contiene la logica di invio, fetch API e apertura modale badge', async () => {
    const response = await request(app)
      .get('/scansiona-prodotto.js')
      .expect(200);

    // Verifica che lo script punti all'endpoint POST corretto per salvare il prodotto scansionato
    expect(response.text).toContain('/api/prodotti-salvati/scansiona');

    // Verifica la presenza dei metodi principali definiti nel modulo
    expect(response.text).toContain('inviaScansione');
    expect(response.text).toContain('mostraBadgeModal');
    expect(response.text).toContain('chiudiModal');
    expect(response.text).toContain('renderMessage');

    // Verifica che il token JWT venga letto e gestito
    expect(response.text).toContain("localStorage.getItem('token')");
    expect(response.text).toContain("Authorization': `Bearer");

    // Verifica la gestione delle classi e della logica gamification (stili dinamici)
    expect(response.text).toContain('data.scansione?.badgeSbloccato');
    expect(response.text).toContain('badge.icona');
    expect(response.text).toContain('badge.stile');
  });

});