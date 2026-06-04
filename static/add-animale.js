const addAnimaleForm = document.getElementById('add-animale-form');
const addAnimaleMessage = document.getElementById('addAnimaleMessage');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');
const fotoInput = document.getElementById('fotoAnimale');
const fotoPreview = document.getElementById('fotoAnimalePreview');

let selectedFotoDataUrl = '';

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

if (fotoInput) {
    fotoInput.addEventListener('change', () => {
        const file = fotoInput.files && fotoInput.files[0];
        selectedFotoDataUrl = '';

        if (!file) {
            if (fotoPreview) {
                fotoPreview.style.display = 'none';
                fotoPreview.removeAttribute('src');
            }
            return;
        }

        if (!file.type.startsWith('image/')) {
            if (addAnimaleMessage) {
                addAnimaleMessage.style.color = 'red';
                addAnimaleMessage.textContent = 'Seleziona un file immagine valido.';
            }
            fotoInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            selectedFotoDataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (fotoPreview && selectedFotoDataUrl) {
                fotoPreview.src = selectedFotoDataUrl;
                fotoPreview.style.display = 'block';
            }
        };
        reader.onerror = () => {
            if (addAnimaleMessage) {
                addAnimaleMessage.style.color = 'red';
                addAnimaleMessage.textContent = 'Impossibile leggere la foto selezionata.';
            }
        };
        reader.readAsDataURL(file);
    });
}
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
            const response = await fetch(`/api/aziende/${aziendaId}/animali`, {
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
                    note,
                    foto: selectedFotoDataUrl || undefined
                })
            });
// Gestione della risposta del server
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                addAnimaleMessage.textContent = data.message || 'Errore durante la registrazione dell\'animale';
                return;
            }
            addAnimaleMessage.style.color = 'green';
            addAnimaleMessage.textContent = data.message || 'Animale registrato con successo';
            addAnimaleForm.reset();
            selectedFotoDataUrl = '';
            if (fotoPreview) {
                fotoPreview.style.display = 'none';
                fotoPreview.removeAttribute('src');
            }
        } catch (error) {
            console.error('Errore durante la registrazione dell\'animale:', error);
            addAnimaleMessage.textContent = 'Errore di connessione al server';
        }
    });
}