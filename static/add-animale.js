const addAnimaleForm = document.getElementById('add-animale-form');
const addAnimaleMessage = document.getElementById('addAnimaleMessage');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');
const fotoInput = document.getElementById('fotoAnimale');
const fotoPreview = document.getElementById('fotoAnimalePreview');
const saveAnimaleBtn = document.getElementById('saveAnimaleBtn');
// Elementi per la configurazione del sensore indossabile dopo la creazione dell'animale
const availableWearableSensorsInfo = document.getElementById('availableWearableSensorsInfo');
const wearableWizard = document.getElementById('wearableWizard');
const wearableWizardAnimalInfo = document.getElementById('wearableWizardAnimalInfo');
const wizardSensorName = document.getElementById('wizardSensorName');
const wizardSensorState = document.getElementById('wizardSensorState');
const wizardCreateSensorBtn = document.getElementById('wizardCreateSensorBtn');
const wizardSkipSensorBtn = document.getElementById('wizardSkipSensorBtn');
const wearableWizardMessage = document.getElementById('wearableWizardMessage');

let selectedFotoDataUrl = '';
let pendingAnimalForSensor = null;

const DEFAULT_WEARABLE_CAPACITA = [
    { tipoDato: 'temperatura', unitaMisura: '°C' },
    { tipoDato: 'frequenza_cardiaca', unitaMisura: 'bpm' },
    { tipoDato: 'livello_passi', unitaMisura: 'passi' },
    { tipoDato: 'esposizione_solare', unitaMisura: 'ore' }
];

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

const parseResponseBody = async (response) => response.json().catch(() => ({}));

const refreshAvailableWearableSensorsCount = async () => {
    if (!availableWearableSensorsInfo) return;

    const aziendaId = getTrimmedValue('aziendaId') || (localStorage.getItem('selectedAziendaId') || '').trim();
    if (!aziendaId) {
        availableWearableSensorsInfo.textContent = 'Sensori indossabili disponibili: azienda non selezionata';
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/iot/sensori?aziendaId=${encodeURIComponent(aziendaId)}`, {
            method: 'GET',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });

        const data = await parseResponseBody(response);
        if (!response.ok) {
            availableWearableSensorsInfo.textContent = 'Sensori indossabili disponibili: non disponibili';
            return;
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        const availableCount = items.filter((item) => item
            && item.tipoDispositivo === 'indossabile'
            && item.stato === 'attivo'
            && !item.animaleId).length;

        availableWearableSensorsInfo.textContent = `Sensori indossabili disponibili: ${availableCount}`;
    } catch (error) {
        console.error('Errore durante il recupero sensori disponibili:', error);
        availableWearableSensorsInfo.textContent = 'Sensori indossabili disponibili: non disponibili';
    }
};

const createWearableSensorForAnimal = async ({ aziendaId, animaleId, nome, stato, token }) => {
    const response = await fetch('/api/iot/sensori', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            nome,
            tipoDispositivo: 'indossabile',
            capacita: DEFAULT_WEARABLE_CAPACITA,
            aziendaId,
            animaleId,
            stato
        })
    });

    const data = await parseResponseBody(response);
    return { ok: response.ok, status: response.status, data };
};

const closeWearableWizard = ({ resetForm = false } = {}) => {
    if (wearableWizard) {
        wearableWizard.classList.add('hidden');
    }
    if (wearableWizardMessage) {
        wearableWizardMessage.textContent = '';
    }
    if (wearableWizardAnimalInfo) {
        wearableWizardAnimalInfo.textContent = '';
    }
    if (wizardSensorName) {
        wizardSensorName.value = '';
    }
    if (wizardSensorState) {
        wizardSensorState.value = 'attivo';
    }

    if (resetForm && addAnimaleForm) {
        addAnimaleForm.reset();
        selectedFotoDataUrl = '';
        if (fotoPreview) {
            fotoPreview.style.display = 'none';
            fotoPreview.removeAttribute('src');
        }
    }

    if (saveAnimaleBtn) {
        saveAnimaleBtn.disabled = false;
    }

    pendingAnimalForSensor = null;
};

const openWearableWizard = ({ animaleId, aziendaId, matricola, nomeAnimale }) => {
    pendingAnimalForSensor = { animaleId, aziendaId, matricola, nomeAnimale };
    if (wearableWizardAnimalInfo) {
        wearableWizardAnimalInfo.textContent = `Animale creato: ${nomeAnimale || 'Senza nome'} (${matricola || 'senza matricola'}).`;
    }
    if (wizardSensorName) {
        wizardSensorName.value = `Collare IoT - ${matricola || 'nuovo-animale'}`;
    }
    if (wearableWizardMessage) {
        wearableWizardMessage.style.color = '#2f855a';
        wearableWizardMessage.textContent = 'Configura ora il sensore indossabile oppure salta.';
    }
    if (wearableWizard) {
        wearableWizard.classList.remove('hidden');
    }
    if (saveAnimaleBtn) {
        saveAnimaleBtn.disabled = true;
    }
};

if (wizardSkipSensorBtn) {
    wizardSkipSensorBtn.addEventListener('click', () => {
        if (addAnimaleMessage) {
            addAnimaleMessage.style.color = '#2f855a';
            addAnimaleMessage.textContent = 'Animale registrato con successo. Associazione sensore rimandata.';
        }
        closeWearableWizard({ resetForm: true });
        refreshAvailableWearableSensorsCount();
    });
}

if (wizardCreateSensorBtn) {
    wizardCreateSensorBtn.addEventListener('click', async () => {
        if (!pendingAnimalForSensor) {
            return;
        }

        const nome = typeof wizardSensorName?.value === 'string' ? wizardSensorName.value.trim() : '';
        const stato = typeof wizardSensorState?.value === 'string' ? wizardSensorState.value : 'attivo';

        if (!nome) {
            if (wearableWizardMessage) {
                wearableWizardMessage.style.color = 'red';
                wearableWizardMessage.textContent = 'Il nome del sensore è obbligatorio.';
            }
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const result = await createWearableSensorForAnimal({
                aziendaId: pendingAnimalForSensor.aziendaId,
                animaleId: pendingAnimalForSensor.animaleId,
                nome,
                stato,
                token
            });

            if (!result.ok) {
                if (wearableWizardMessage) {
                    wearableWizardMessage.style.color = 'red';
                    wearableWizardMessage.textContent = result.data?.message || 'Errore durante la creazione del sensore';
                }
                return;
            }

            if (addAnimaleMessage) {
                addAnimaleMessage.style.color = '#2f855a';
                addAnimaleMessage.textContent = 'Animale registrato con successo. Sensore indossabile creato e associato.';
            }

            closeWearableWizard({ resetForm: true });
            refreshAvailableWearableSensorsCount();
        } catch (error) {
            console.error('Errore durante la creazione del sensore indossabile:', error);
            if (wearableWizardMessage) {
                wearableWizardMessage.style.color = 'red';
                wearableWizardMessage.textContent = 'Errore di connessione al server durante la creazione del sensore.';
            }
        }
    });
}

refreshAvailableWearableSensorsCount();
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
            const data = await parseResponseBody(response);
            if (!response.ok) {
                addAnimaleMessage.textContent = data.message || 'Errore durante la registrazione dell\'animale';
                return;
            }
            const animaleId = data?.animale?._id || data?.animale?.id || '';
            addAnimaleMessage.style.color = 'green';
            addAnimaleMessage.textContent = `${data.message || 'Animale registrato con successo'}. Ora configura il sensore indossabile (step 2).`;

            if (animaleId) {
                openWearableWizard({
                    animaleId,
                    aziendaId,
                    matricola,
                    nomeAnimale: name
                });
            } else {
                addAnimaleForm.reset();
                selectedFotoDataUrl = '';
                if (fotoPreview) {
                    fotoPreview.style.display = 'none';
                    fotoPreview.removeAttribute('src');
                }
            }
            refreshAvailableWearableSensorsCount();
        } catch (error) {
            console.error('Errore durante la registrazione dell\'animale:', error);
            addAnimaleMessage.textContent = 'Errore di connessione al server';
        }
    });
}