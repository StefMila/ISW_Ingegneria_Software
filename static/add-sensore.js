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

        const payload = {
            nome: document.getElementById('iotNome').value,
            tipoDispositivo: tipoDispositivo,
            tipoDatoRaccolto: document.getElementById('iotTipoDato').value,
            unitaMisura: document.getElementById('iotUnita').value,
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
        try {
            const response = await fetch(`/api/animali?aziendaId=${aziendaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            selectAnimale.innerHTML = '<option value="">-- Seleziona una mucca --</option>';
            
            if (data.items && data.items.length > 0) {
                data.items.forEach(animale => {
                    const option = document.createElement('option');
                    option.value = animale._id;
                    // Mostra il nome della mucca, o la matricola, o una parte dell'ID se non ha nome
                    option.textContent = animale.nome || `Matricola: ${animale.matricola}` || `ID: ${animale._id.substring(0,6)}`;
                    selectAnimale.appendChild(option);
                });
            } else {
                selectAnimale.innerHTML = '<option value="">Nessuna mucca trovata in stalla</option>';
            }
        } catch (error) {
            console.error("Errore nel caricamento delle mucche:", error);
            selectAnimale.innerHTML = '<option value="">Errore nel caricamento</option>';
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