const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
    
    const formSensore = document.getElementById('formNuovoSensore');
    const statusForm = document.getElementById('formSensoreStatus');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    if (!aziendaId) {
        statusForm.style.color = 'red';
        statusForm.textContent = 'Errore: Nessuna azienda selezionata. Torna alla Home.';
        formSensore.style.display = 'none';
        return;
    }

    formSensore.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        statusForm.style.color = 'black';
        statusForm.textContent = 'Registrazione in corso...';

        const tipoDispositivo = document.getElementById('iotTipoDispositivo').value;
        let animaleId = document.getElementById('iotAnimaleId').value.trim();

        if (tipoDispositivo !== 'indossabile') {
            animaleId = null;
        }

        // Raccogliamo tutte le checkbox selezionate
        const checkboxSelezionate = document.querySelectorAll('#iotCapacita input[type="checkbox"]:checked');
        const capacitaArray = Array.from(checkboxSelezionate).map(cb => ({
            tipoDato: cb.value,
            unitaMisura: cb.getAttribute('data-unita')
        }));

        if (capacitaArray.length === 0) {
            statusForm.style.color = 'red';
            statusForm.textContent = 'Devi selezionare almeno una capacità per il dispositivo.';
            return;
        }

        const payload = {
            nome: document.getElementById('iotNome').value,
            tipoDispositivo: tipoDispositivo,
            capacita: capacitaArray, // Inviamo l'array al backend
            animaleId: animaleId,
            aziendaId: aziendaId 
        };

        try {
            const response = await fetch('/api/iot/sensori', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Errore nella registrazione del sensore');
            }

            statusForm.style.color = 'green';
            statusForm.textContent = 'Hardware registrato con successo! Reindirizzamento alla telemetria...';
            
            formSensore.reset();
            
            // Dopo il successo, rimandiamo l'utente alla schermata di telemetria per vedere il nuovo dato
            setTimeout(() => {
                window.location.href = '/view-sensori.html';
            }, 2000);

        } catch (error) {
            statusForm.style.color = 'red';
            statusForm.textContent = error.message;
        }
    });

    // Caricamento dinamico animali
    const selectAnimale = document.getElementById('iotAnimaleId');
    
    async function caricaAnimali() {
        // Recuperiamo l'elemento HTML della select
        const selectAnimale = document.getElementById('iotAnimaleId');
        
        // 1. Inizializziamo il componente Choices.js per la ricerca
        const choicesAnimale = new Choices(selectAnimale, {
            searchEnabled: true,
            searchPlaceholderValue: 'Cerca matricola o nome...',
            itemSelectText: 'Seleziona',
            noResultsText: 'Nessuna mucca trovata',
            placeholder: true,
        });

        try {
            // Mostriamo lo stato di caricamento nel menu a tendina
            choicesAnimale.setChoices([{ value: '', label: 'Caricamento mucche in corso...', disabled: true }], 'value', 'label', true);

            // Chiamata API al backend
            const response = await fetch(`/api/aziende/${aziendaId}/animali`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Errore di rete o rotta non trovata');
            
            const data = await response.json();
            
            // 2. Popoliamo i dati nel menu
            if (data.items && data.items.length > 0) {
                
                // Mappiamo i dati restituiti dal DB nel formato richiesto da Choices.js
                const opzioniMucche = data.items.map(animale => {
                    // ATTENZIONE: Qui ho corretto "mucca" in "animale" per allinearmi alla variabile del ciclo!
                    const matricola = animale.matricola ? animale.matricola : 'Senza matricola';
                    const nome = animale.name ? animale.name : 'Senza nome';

                    return {
                        value: animale._id,
                        label: `${matricola} - ${nome}`
                    };
                });
                
                // Aggiungiamo l'opzione vuota (placeholder) in cima alla lista
                opzioniMucche.unshift({ value: '', label: '-- Seleziona una mucca --', placeholder: true });
                
                // Carichiamo tutte le opzioni nel componente visivo
                choicesAnimale.setChoices(opzioniMucche, 'value', 'label', true);
                
            } else {
                choicesAnimale.setChoices([{ value: '', label: 'Nessuna mucca trovata in stalla', disabled: true }], 'value', 'label', true);
            }
        } catch (error) {
            console.error("Errore nel caricamento delle mucche:", error);
            choicesAnimale.setChoices([{ value: '', label: 'Errore nel caricamento', disabled: true }], 'value', 'label', true);
        }
    }
    
    // Richiamiamo la funzione subito
    caricaAnimali();

    // Autocompilazione unità di misura
    const tipoDatoSelect = document.getElementById('iotTipoDato');
    const unitaSelect = document.getElementById('iotUnita');

    tipoDatoSelect.addEventListener('change', (e) => {
        const mappaUnita = {
            'temperatura': '°C',
            'frequenza_cardiaca': 'bpm',
            'livello_passi': 'passi',
            'esposizione_solare': 'ore',
            'posizione_gps': 'coordinate'
        };
        const unitaCorretta = mappaUnita[e.target.value];
        if (unitaCorretta) {
            unitaSelect.value = unitaCorretta;
        }
    });
});