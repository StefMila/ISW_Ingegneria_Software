const addAnimaleForm = document.getElementById('add-animale-form');
const addAnimaleMessage = document.getElementById('addAnimaleMessage');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');

const selectedAziendaName = localStorage.getItem('selectedAziendaName') || 'non selezionata';
if (currentAziendaBadge) {
    currentAziendaBadge.textContent = `Azienda attiva: ${selectedAziendaName}`;
}
// Trimma i valori di input da uno o più campi, restituendo la prima stringa non vuota trovata o una stringa vuota se nessun campo ha un valore valido
const getTrimmedValue = (...ids) => {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el && typeof el.value === 'string') {
            return el.value.trim();
        }
    }
    return '';
};
// Handler per la registrazione di un nuovo animale
if (addAnimaleForm) {
    addAnimaleForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!addAnimaleMessage) return;

        const matricola = getTrimmedValue('matricola');
        const name = getTrimmedValue('name', 'nomeAnimale');
        const species = getTrimmedValue('species') || 'mucca';
        const dataNascita = getTrimmedValue('dataNascita');
        const sesso = getTrimmedValue('sesso');
        const razza = getTrimmedValue('razza');
        const figliaDi = getTrimmedValue('figliaDi', 'figlioDi');
        const aziendaId = getTrimmedValue('aziendaId') || (localStorage.getItem('selectedAziendaId') || '').trim();
        const note = getTrimmedValue('note');
        addAnimaleMessage.style.color = 'red';
        addAnimaleMessage.textContent = '';
        if (!matricola) {
            addAnimaleMessage.textContent = 'La matricola è obbligatoria';
            return;
        }
        if (!name) {
            addAnimaleMessage.textContent = 'Il nome è obbligatorio';
            return;
        }
        if (!species) {
            addAnimaleMessage.textContent = 'La specie è obbligatoria';
            return;
        }
        if (!dataNascita) {
            addAnimaleMessage.textContent = 'La data di nascita/acquisto è obbligatoria';
            return;
        }
        if (!sesso) {
            addAnimaleMessage.textContent = 'Il sesso è obbligatorio';
            return;
        }
        if (!aziendaId) {
            addAnimaleMessage.textContent = 'L\'azienda di appartenenza è obbligatoria';
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/azienda/${aziendaId}/animali`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    matricola,
                    name,
                    species,
                    dataNascita,
                    sesso,
                    razza,
                    figliaDi,
                    aziendaId,
                    note
                })
            });
// Gestione della risposta del server
            const data = await response.json();
            if (!response.ok) {
                addAnimaleMessage.textContent = data.message || 'Errore durante la registrazione dell\'animale';
                return;
            }
            addAnimaleMessage.style.color = 'green';
            addAnimaleMessage.textContent = data.message || 'Animale registrato con successo';
            addAnimaleForm.reset();
        } catch (error) {
            console.error('Errore durante la registrazione dell\'animale:', error);
            addAnimaleMessage.textContent = 'Errore di connessione al server';
        }
    });
}