import request from 'supertest';
import app from '../app/app.js';

describe('View Punti Vendita - pagina e script', () => {
    test('GET /view-punti-vendita.html restituisce la tabella con colonna attivo e filtri corretti', async () => {
        const response = await request(app)
            .get('/view-punti-vendita.html')
            .expect(200);

        expect(response.text).toContain('id="puntiVenditaTable"');
        expect(response.text).toContain('id="filterActivePunto"');
        expect(response.text).toContain('Attivo');
        expect(response.text).toContain('id="filterNomePunto"');
        expect(response.text).toContain('id="filterIndirizzoPunto"');
        expect(response.text).toContain('id="filterCategoriePunto"');
        expect(response.text).toContain('view-punti-vendita.js');
    });

    test('Script view-punti-vendita supporta toggle attivo e modifica/elimina', async () => {
        const response = await request(app)
            .get('/view-punti-vendita.js')
            .expect(200);

        expect(response.text).toContain('toggle-punto-vendita-active');
        expect(response.text).toContain('isActive');
        expect(response.text).toContain('data-field="isActive"');
        expect(response.text).toContain('filterCategoriePunto');
        expect(response.text).toContain("fetch('/api/punti-vendita/mine'");
        expect(response.text).toContain("fetch(`/api/punti-vendita/${puntoVenditaId}`");
        expect(response.text).toContain('delete-animal-btn');
        expect(response.text).toContain('edit-animal-btn');
    });
});