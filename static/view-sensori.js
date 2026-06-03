const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';

document.addEventListener('DOMContentLoaded', () => {
    // Recupero credenziali e contesto dal localStorage
    const token = localStorage.getItem('token');
    let aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY); // Usa 'let' e mettilo qui dentro
    const gridSensori = document.getElementById('sensoriLiveGrid');

    // --- ASCOLTO DEL CAMBIO AZIENDA (Messo qui dentro così vede caricaDatiSensori!) ---
    window.addEventListener('aziendaChanged', (e) => {
        aziendaId = e.detail.id; // Usa .id come da azienda-switcher.js

        if (!aziendaId) {
            gridSensori.innerHTML = '<p class="status" style="color: red;">Nessuna azienda selezionata.</p>';
            return;
        }

        // Mostriamo un feedback visivo immediato di caricamento
        gridSensori.innerHTML = `
            <div style="overflow-x: auto;">
                <p class="status" style="padding: 1rem; color: #666;">
                    🔄 Caricamento sensori per la nuova azienda in corso...
                </p>
            </div>
        `;
        
        // Forziamo subito il recupero dei nuovi dati senza aspettare il prossimo ciclo di 5 secondi
        caricaDatiSensori();
    });
    // ----------------------------------------------------------------------------------

    // Se manca il token o l'azienda all'avvio, blocchiamo tutto subito
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    if (!aziendaId) {
        gridSensori.innerHTML = '<p class="status" style="color: red;">Nessuna azienda selezionata. Torna alla Home per selezionare su quale azienda operare.</p>';
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
            // Evitiamo di mostrare messaggi d'errore invasivi se salta un singolo ciclo
        }
    }

    // Render tabella sensori
    function renderSensori(sensori) {
        if (!sensori || sensori.length === 0) {
            gridSensori.innerHTML = '<p class="status">Nessun sensore collegato a questa azienda.</p>';
            return;
        }

        // Inizio struttura della tabella
        let html = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: left;">
                    <thead style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <tr>
                            <th style="padding: 12px;">Sensore</th>
                            <th style="padding: 12px;">Tipo</th>
                            <th style="padding: 12px;">Animale ID</th>
                            <th style="padding: 12px;">Parametro</th>
                            <th style="padding: 12px; text-align: right;">Valore</th>
                            <th style="padding: 12px; text-align: center;">Stato</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sensori.forEach((sensore, sIndex) => {
            const icona = sensore.tipoDispositivo === 'indossabile' ? '🐄' : '📡';
            const totaleCapacita = sensore.capacita.length || 1; // Gestiamo il rowspan
            
            // Colore di background alternato per raggruppare visivamente i sensori
            const baseBgColor = sIndex % 2 === 0 ? '#ffffff' : '#fafbfc';

            // Se il sensore non ha parametri configurati
            if (sensore.capacita.length === 0) {
                html += `
                    <tr style="border-bottom: 1px solid #eee; background-color: ${baseBgColor};">
                        <td style="padding: 12px;"><strong>${icona} ${sensore.nome}</strong></td>
                        <td style="padding: 12px; text-transform: capitalize;">${sensore.tipoDispositivo}</td>
                        <td style="padding: 12px; color: #666;">${sensore.animaleId ? sensore.animaleId.substring(0,6) + '...' : '-'}</td>
                        <td colspan="3" style="padding: 12px; text-align: center; color: #999;">Nessun parametro monitorato</td>
                    </tr>
                `;
                return;
            }

            // Iteriamo su tutte le misurazioni di questo specifico sensore
            sensore.capacita.forEach((cap, index) => {
                const rawVal = (sensore.valori && sensore.valori[cap.tipoDato] !== undefined) ? sensore.valori[cap.tipoDato] : null;
                const valDisplay = rawVal !== null ? rawVal : '--';
                const label = cap.tipoDato.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                // Variabili di stato per la metrica corrente
                let isAnomaly = false;
                let rowBgColor = baseBgColor;
                let statusBadge = `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">Normale</span>`;
                let valColor = 'color: #2c3e50; font-weight: 500;';

                // Anomalia: Temperatura su sensore indossabile
                if (sensore.tipoDispositivo === 'indossabile' && cap.tipoDato === 'temperatura' && rawVal !== null) {
                    // Range normale approssimativo per una bovina adulta: 38.0 - 39.5
                    if (rawVal < 38.0 || rawVal > 39.5) {
                        isAnomaly = true;
                        rowBgColor = '#fff5f5'; // Sfondo rosso chiaro per evidenziare
                        valColor = 'color: #c62828; font-weight: bold;';
                        statusBadge = `<span style="background: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">Anomalia</span>`;
                    }
                } else if (rawVal === null) {
                    statusBadge = `<span style="background: #f5f5f5; color: #9e9e9e; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">In attesa</span>`;
                }

                html += `<tr style="border-bottom: 1px solid #eee; background-color: ${rowBgColor}; transition: background-color 0.3s;">`;
                
                // Le informazioni generali del sensore (Nome, Tipo, Animale) usano rowspan per apparire solo nella prima riga
                if (index === 0) {
                    html += `
                        <td rowspan="${totaleCapacita}" style="padding: 12px; vertical-align: top; border-right: 1px solid #f0f0f0;">
                            <strong>${icona} ${sensore.nome}</strong>
                        </td>
                        <td rowspan="${totaleCapacita}" style="padding: 12px; vertical-align: top; text-transform: capitalize; border-right: 1px solid #f0f0f0;">
                            ${sensore.tipoDispositivo}
                        </td>
                        <td rowspan="${totaleCapacita}" style="padding: 12px; vertical-align: top; color: #666; border-right: 1px solid #f0f0f0;">
                            ${sensore.animaleId ? sensore.animaleId.substring(0,6) + '...' : '-'}
                        </td>
                    `;
                }

                // Colonne specifiche per il singolo parametro
                html += `
                        <td style="padding: 12px;">${label}</td>
                        <td style="padding: 12px; text-align: right; ${valColor}">
                            ${valDisplay} <span style="font-size: 0.8rem; color: #7f8c8d;">${cap.unitaMisura}</span>
                        </td>
                        <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                    </tr>
                `;
            });
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        gridSensori.innerHTML = html;
    }

    // Avvio iniziale e impostazione del polling
    caricaDatiSensori();
    setInterval(caricaDatiSensori, 5000);
});