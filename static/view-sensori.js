const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';

document.addEventListener('DOMContentLoaded', () => {
    // Recupero credenziali e contesto dal localStorage
    const token = localStorage.getItem('token');
    
    const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);

    const gridSensori = document.getElementById('sensoriLiveGrid');

    // Se manca il token o l'azienda, blocchiamo tutto subito
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    if (!aziendaId) {
        gridSensori.innerHTML = '<p class="status" style="color: red;">Nessuna azienda selezionata. Torna alla Home per selezionare su quale azienda operare.</p>';
        formSensore.style.display = 'none'; // Nascondiamo il form se non c'è un'azienda a cui associare i sensori
        return;
    }

    // Recupero dati near real time (polling)
    async function caricaDatiSensori() {
        try {
            const response = await fetch(`/api/iot/sensori/dati?aziendaId=${aziendaId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Errore durante il recupero dei dati IoT');
            }

            const data = await response.json();
            renderSensori(data.items);
        } catch (error) {
            console.error('Errore fetch sensori:', error);
            // Evitiamo di mostrare messaggi d'errore invasivi se salta un singolo ciclo di 5 secondi
        }
    }

    // Render griglia sensori
    function renderSensori(sensori) {
        if (!sensori || sensori.length === 0) {
            gridSensori.innerHTML = '<p class="status">Nessun sensore collegato a questa azienda. Registrane uno dal form sottostante.</p>';
            return;
        }

        // Creiamo una struttura a griglia elastica (flexbox)
        let html = '<div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">';
        
        sensori.forEach(sensore => {
            const icona = sensore.tipoDispositivo === 'indossabile' ? '🐄' : '📡';
            const val = (sensore.valore !== null && sensore.valore !== undefined) ? sensore.valore : '--';
            
            html += `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; width: 250px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; font-size: 1.1rem;">${icona} ${sensore.nome}</h3>
                    <p style="margin: 0; font-size: 0.85rem; color: #666; text-transform: capitalize;">
                        Tipo: ${sensore.tipoDispositivo}
                    </p>
                    ${sensore.animaleId ? `<p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #888;">Animale ID: ${sensore.animaleId.substring(0,6)}...</p>` : ''}
                    
                    <div style="margin-top: 1.5rem; text-align: center;">
                        <span style="font-size: 2.5rem; font-weight: bold; color: #2c3e50;">${val}</span>
                        <span style="font-size: 1.2rem; color: #7f8c8d;">${sensore.unitaMisura}</span>
                    </div>
                    
                    <p style="margin: 1rem 0 0 0; text-align: center; font-size: 0.9rem; color: #34495e; font-weight: 500; text-transform: uppercase;">
                        ${sensore.tipoDatoRaccolto.replace('_', ' ')}
                    </p>
                </div>
            `;
        });
        
        html += '</div>';
        gridSensori.innerHTML = html;
    }

    // Avvio
    caricaDatiSensori();
    setInterval(caricaDatiSensori, 5000);
});