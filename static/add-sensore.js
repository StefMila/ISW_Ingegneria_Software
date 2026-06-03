const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // Può cambiare l'ID dinamicamente
    let aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
    
    const formSensore = document.getElementById('formNuovoSensore');
    const statusForm = document.getElementById('formSensoreStatus');
    const selectAnimale = document.getElementById('iotAnimaleId');
    
    // Inizializziamo Choices.js all'esterno della funzione
    let choicesAnimale = null;
    if (selectAnimale) {
        choicesAnimale = new Choices(selectAnimale, {
            searchEnabled: true,
            searchPlaceholderValue: 'Cerca matricola o nome...',
            itemSelectText: 'Seleziona',
            noResultsText: 'Nessuna mucca trovata',
            placeholder: true,
        });
    }

    // Ascolto del cambio azienda
    window.addEventListener('aziendaChanged', (e) => {
        aziendaId = e.detail.id; // Aggiorniamo l'azienda attiva

        if (!aziendaId) {
            statusForm.style.color = 'red';
            statusForm.textContent = 'Errore: Nessuna azienda selezionata. Torna alla Home.';
            if (formSensore) formSensore.style.display = 'none';
            return;
        }

        // Selezionata nuova azienda: ripristiniamo la UI e ricarichiamo gli animali
        if (formSensore) formSensore.style.display = 'block';
        statusForm.textContent = '';
        
        caricaAnimali();
    });

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    if (!aziendaId) {
        statusForm.style.color = 'red';
        statusForm.textContent = 'Errore: Nessuna azienda selezionata. Torna alla Home.';
        if (formSensore) formSensore.style.display = 'none';
        return;
    }

    // Funzione per il caricamento dinamico animali
    async function caricaAnimali() {
        if (!choicesAnimale) return;

        try {
            // Rimuoviamo visivamente l'animale attualmente selezionato
            choicesAnimale.removeActiveItems();
            // Svuotiamo completamente la memoria della tendina (rimuove le vecchie opzioni)
            choicesAnimale.clearStore(); 

            // Mostriamo lo stato di caricamento
            choicesAnimale.setChoices([{ value: '', label: 'Caricamento mucche in corso...', disabled: true }], 'value', 'label', true);

            // Chiamata API al backend con il nuovo aziendaId
            const response = await fetch(`/api/aziende/${aziendaId}/animali`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Errore di rete o rotta non trovata');
            
            const data = await response.json();
            
            // Puliamo di nuovo il placeholder di caricamento prima di inserire i dati definitivi
            choicesAnimale.removeActiveItems();
            choicesAnimale.clearStore();
            
            // Popoliamo i dati nel menu
            if (data.items && data.items.length > 0) {
                const opzioniMucche = data.items.map(animale => {
                    const matricola = animale.matricola ? animale.matricola : 'Senza matricola';
                    const nome = animale.name ? animale.name : 'Senza nome';

                    return {
                        value: animale._id,
                        label: `${matricola} - ${nome}`
                    };
                });
                
                // Aggiungiamo l'opzione vuota (placeholder) in cima alla lista
                opzioniMucche.unshift({ value: '', label: '-- Seleziona una mucca --', placeholder: true });
                
                // Carichiamo tutte le nuove opzioni nel componente visivo ('true' sovrascrive tutto)
                choicesAnimale.setChoices(opzioniMucche, 'value', 'label', true);
                
            } else {
                choicesAnimale.setChoices([{ value: '', label: 'Nessuna mucca trovata in stalla', disabled: true }], 'value', 'label', true);
            }
        } catch (error) {
            console.error("Errore nel caricamento delle mucche:", error);
            choicesAnimale.removeActiveItems();
            choicesAnimale.clearStore();
            choicesAnimale.setChoices([{ value: '', label: 'Errore nel caricamento', disabled: true }], 'value', 'label', true);
        }
    }
    
    // Richiamiamo la funzione subito al primo avvio
    caricaAnimali();

    // Gestione invio Form
    if (formSensore) {
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
                capacita: capacitaArray,
                animaleId: animaleId,
                aziendaId: aziendaId // Userà l'aziendaId aggiornato!
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
                
                setTimeout(() => {
                    window.location.href = '/view-sensori.html';
                }, 2000);

            } catch (error) {
                statusForm.style.color = 'red';
                statusForm.textContent = error.message;
            }
        });
    }

    // Autocompilazione unità di misura (logica originale mantenuta)
    const tipoDatoSelect = document.getElementById('iotTipoDato');
    const unitaSelect = document.getElementById('iotUnita');

    if (tipoDatoSelect && unitaSelect) {
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
    }
});