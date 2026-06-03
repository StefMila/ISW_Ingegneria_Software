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
            
            // Creiamo dinamicamente la lista delle metriche
            let metricheHtml = '';
            sensore.capacita.forEach(cap => {
                // Cerchiamo se nel JSON arrivato da MQTT esiste il valore per questa metrica
                const val = (sensore.valori && sensore.valori[cap.tipoDato] !== undefined) 
                            ? sensore.valori[cap.tipoDato] 
                            : '--';
                
                // Formattiamo il nome (es: "frequenza_cardiaca" diventa "Frequenza Cardiaca")
                const label = cap.tipoDato.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

                metricheHtml += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; border-bottom: 1px dashed #eee; padding-bottom: 0.2rem;">
                        <span style="color: #7f8c8d; font-size: 0.9rem;">${label}</span>
                        <span style="font-weight: bold; color: #2c3e50;">${val} <span style="font-size: 0.8rem;">${cap.unitaMisura}</span></span>
                    </div>
                `;
            });

            html += `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; width: 280px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; font-size: 1.1rem;">${icona} ${sensore.nome}</h3>
                    <p style="margin: 0; font-size: 0.85rem; color: #666; text-transform: capitalize;">
                        Tipo: ${sensore.tipoDispositivo}
                    </p>
                    ${sensore.animaleId ? `<p style="margin: 0.2rem 0 1rem 0; font-size: 0.8rem; color: #888;">Animale ID: ${sensore.animaleId.substring(0,6)}...</p>` : '<div style="margin-bottom: 1rem;"></div>'}
                    
                    <div style="background: #f9f9f9; padding: 1rem; border-radius: 6px;">
                        ${metricheHtml}
                    </div>
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