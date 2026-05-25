import request from 'supertest';
import app from '../app/app.js';

// Verifica end-to-end leggera della view add-punto-vendita (struttura + script + guard API).
describe('Punti Vendita - pagina e script', () => {
    test('GET /add-punto-vendita.html restituisce la pagina con mappa e form di inserimento', async () => {
        const response = await request(app)
            .get('/add-punto-vendita.html')
            .expect(200);

        expect(response.text).toContain('id="add-punto-vendita-form"');
        expect(response.text).toContain('id="nomePunto"');
        expect(response.text).toContain('id="indirizzo"');
        expect(response.text).toContain('id="emailPunto"');
        expect(response.text).toContain('id="phoneNumber"');
        expect(response.text).toContain('id="website"');
        expect(response.text).toContain('id="description"');
        expect(response.text).toContain('id="categories"');
        expect(response.text).toContain('id="addPuntoVenditaMessage"');
    });

    test('Pagina punti-vendita integra caricamento config maps e script dedicato', async () => {
        const response = await request(app)
            .get('/add-punto-vendita.html')
            .expect(200);

        expect(response.text).toContain('<script src="/add-punto-vendita.js"></script>');
        expect(response.text).toContain('getLocationBtn');
    });

    test('Script punti-vendita usa endpoint /api/punti-vendita e messaggi di validazione principali', async () => {
        const response = await request(app)
            .get('/add-punto-vendita.js')
            .expect(200);

        expect(response.text).toContain("fetch('/api/punti-vendita'");
        expect(response.text).toContain('Il nome del punto vendita e obbligatorio');
        expect(response.text).toMatch(/indirizzo e obbligatorio/i);
        expect(response.text).toContain('Coordinate geografiche non valide');
        expect(response.text).toContain('Errore di connessione al server');
    });

    test('GET /api/punti-vendita/mine senza token restituisce 401', async () => {
        await request(app)
            .get('/api/punti-vendita/mine')
            .expect(401);
    });
});
