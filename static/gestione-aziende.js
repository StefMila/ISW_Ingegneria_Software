// Gestione elenco aziende (Modello view-animali.js)
const statusMsg = document.getElementById('statusMsg');
const tableBody = document.getElementById('aziendeTableBody');

const renderStatus = (text, color = '#1f2937') => {
    if (!statusMsg) return;
    statusMsg.style.color = color;
    statusMsg.textContent = text;
};

// 1. Carica le aziende dall'endpoint /api/aziende/mine
const caricaAziendeUtente = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        renderStatus('Sessione scaduta. Effettua nuovamente il login.', 'red');
        return;
    }

    try {
        const response = await fetch('/api/aziende/mine', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok) {
            renderStatus(data.message || 'Errore nel recupero delle aziende.', 'red');
            return;
        }

        // Il tuo backend risponde con { items: [...] } dopo la correzione dello spread
        renderAziendeTable(data.items || []);
    } catch (error) {
        console.error('Errore nel caricamento aziende:', error);
        renderStatus('Errore di connessione al server.', 'red');
    }
};

// 2. Renderizza la tabella
const renderAziendeTable = (aziende) => {
    if (aziende.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center;">Nessuna azienda registrata.</td></tr>`;
        return;
    }

    tableBody.innerHTML = aziende.map(az => `
        <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px; font-weight: 500;">${az.companyName}</td>
            <td style="padding: 12px;">${az.vatNumber}</td>
            <td style="padding: 12px;">${az.emailAzienda || '-'}</td>
            <td style="padding: 12px; text-align: right;">
                <a href="/show-azienda.html?id=${az._id}" class="btn-secondary" style="text-decoration: none; margin-right: 8px; padding: 6px 12px; font-size: 0.85rem;">Vedi/Modifica</a>
                <button class="btn-delete" data-id="${az._id}" style="background-color: #e53e3e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Elimina</button>
            </td>
        </tr>
    `).join('');

    // Aggancia i listener per l'eliminazione
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => eliminaAzienda(e.target.dataset.id));
    });
};

// 3. Funzione di eliminazione (DELETE)
const eliminaAzienda = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questa azienda?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/aziende/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok) {
            renderStatus(data.message || "Impossibile eliminare l'azienda.", 'red');
            return;
        }

        renderStatus('Azienda eliminata con successo!', 'green');
        // Ricarica la tabella aggiornata
        await caricaAziendeUtente();
    } catch (error) {
        console.error('Errore durante l\'eliminazione:', error);
        renderStatus('Errore di connessione durante l\'eliminazione.', 'red');
    }
};

// Avvio al caricamento della pagina
document.addEventListener('DOMContentLoaded', caricaAziendeUtente);