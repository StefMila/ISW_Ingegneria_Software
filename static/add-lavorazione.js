const addLavorazioneForm = document.getElementById('add-lavorazione-form');
const addLavorazioneMessage = document.getElementById('templateFormStatus');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');
const searchLavorazioneForm = document.getElementById('search-lavorazione-form');
const searchLavorazioneMessage = document.getElementById('searchStatus');
const ricercaTemplateInput = document.getElementById('ricercaTemplate');
const templateSuggestions = document.getElementById('templateSuggestions');
const templatePreviewForm = document.getElementById('template-preview-form');
const templatePreviewMessage = document.getElementById('lavorazioneFormStatus');
const semiLavoratoCodeInput = document.getElementById('semiLavoratoCode');
const scanSemiLavoratoBtn = document.getElementById('scanSemiLavoratoBtn');
const semiScanPanel = document.getElementById('semiScanPanel');
const semiScanVideo = document.getElementById('semiScanVideo');
const stopSemiScanBtn = document.getElementById('stopSemiScanBtn');
const semiScanStatus = document.getElementById('semiScanStatus');
// Mappature per tipi e unità di misura basate su input/output selezionati
export const OUTPUT_TO_TIPO = {
    'Latte alimentare confezionato': 'altro',
    'Formaggi stagionati o freschi strutturati': 'formaggio',
    'Vasetti di yogurt': 'yogurt',
    'Panetti di burro': 'altro',
    'Siero di latte residuo': 'altro',
    'Latticello': 'altro',
    'Acque di lavaggio e reflui autolavanti': 'altro'
};
// Codice tipo lavorazione: A per primo-latte, B per formaggio, C per yogurt, D per altro
export const TIPO_TO_CODICETIPO = {
    'primo-latte': 'A',
    'formaggio': 'B',
    'yogurt': 'C',
    'altro': 'D'
};
// Mappature per tipo e unità di misura degli input basate sulla selezione dell'utente
const INPUT_TO_TYPE = {
    'Latte crudo': 'latte',
    'Latte in polvere': 'ingrediente',
    'Latte scremato liquido o crema di latte': 'latte',
    'Acqua': 'ingrediente',
    'Fermenti lattici': 'additivo'
};
// Unit di misura predefinite per ogni materia prima in input
const INPUT_TO_UNIT = {
    'Latte crudo': 'L',
    'Latte in polvere': 'Kg',
    'Latte scremato liquido o crema di latte': 'L',
    'Acqua': 'L',
    'Fermenti lattici': 'Kg'
};
// Unit di misura predefinite per ogni output principale selezionato
export const OUTPUT_TO_UNIT = {
    'Latte alimentare confezionato': 'pezzi',
    'Formaggi stagionati o freschi strutturati': 'Kg',
    'Vasetti di yogurt': 'pezzi',
    'Panetti di burro': 'pezzi',
    'Siero di latte residuo': 'L',
    'Latticello': 'L',
    'Acque di lavaggio e reflui autolavanti': 'L'
};
// Recupero e visualizzazione del nome dell'azienda attiva
const selectedAziendaName = localStorage.getItem('selectedAziendaName') || 'non selezionata';
if (currentAziendaBadge) {
    currentAziendaBadge.textContent = `Azienda attiva: ${selectedAziendaName}`;
}
// Funzione di utilità per ottenere il valore di un input e rimuovere spazi bianchi iniziali/finali
const getTrimmedValue = (id) => {
    const el = document.getElementById(id);
    if (!el || typeof el.value !== 'string') {
        return '';
    }
    return el.value.trim();
};
// Funzione per ottenere le materie prime selezionate dall'utente
const getSelectedInputMaterials = () => {
    const select = document.getElementById('materiePrime');
    if (!(select instanceof HTMLSelectElement)) {
        return [];
    }

    return Array.from(select.selectedOptions)
        .map((option) => option.value.trim())
        .filter(Boolean);
};
// Funzione per ottenere le fasi selezionate dall'utente
const getSelectedPhases = () => {
    const checkboxes = Array.from(document.querySelectorAll('.fase-checkbox'));
    return checkboxes
        .filter((checkbox) => checkbox instanceof HTMLInputElement && checkbox.checked)
        .map((checkbox) => ({
            name: checkbox.getAttribute('data-fase-name') || '',
            completed: false
        }))
        .filter((fase) => fase.name);
};
// Validazione del codice lavorazione secondo il formato standard (es. A123, B456, etc.)
const standardCodiceLavorazione = /^[A][A-D]\d{3}$/;
let templateSuggestionsCache = [];
let templateSuggestionsAziendaId = '';
let semiScannerStream = null;
let semiScannerAnimationId = null;
let semiScannerActive = false;

const normalizeText = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const hideTemplateSuggestions = () => {
    if (!templateSuggestions) return;
    templateSuggestions.innerHTML = '';
    templateSuggestions.classList.add('hidden');
};

const setSemiScanStatus = (text, color = '#1f2937') => {
    if (!semiScanStatus) return;
    semiScanStatus.textContent = text;
    semiScanStatus.style.color = color;
};
// Funzione per fermare la scansione semi-automatica, rilasciare risorse e nascondere il pannello di scansione
const stopSemiScanner = () => {
    semiScannerActive = false;

    if (semiScannerAnimationId) {
        cancelAnimationFrame(semiScannerAnimationId);
        semiScannerAnimationId = null;
    }

    if (semiScannerStream) {
        semiScannerStream.getTracks().forEach((track) => track.stop());
        semiScannerStream = null;
    }

    if (semiScanVideo) {
        semiScanVideo.srcObject = null;
    }

    if (semiScanPanel) {
        semiScanPanel.classList.add('hidden');
    }
};
// Funzione per applicare il codice semi-lavorato rilevato dalla scansione al form, aggiornare lo stato e fornire feedback all'utente
const applyScannedSemiCode = (rawValue) => {
    const normalized = String(rawValue || '').trim();
    if (!normalized) {
        setSemiScanStatus('Codice non leggibile. Riprova.', 'red');
        return false;
    }

    if (semiLavoratoCodeInput) {
        semiLavoratoCodeInput.value = normalized;
    }

    setSemiScanStatus(`Codice rilevato: ${normalized}`, 'green');
    if (templatePreviewMessage) {
        templatePreviewMessage.style.color = '#2f855a';
        templatePreviewMessage.textContent = 'Codice semi-lavorato acquisito da scansione.';
    }

    return true;
};
// Funzione per avviare la scansione semi-automatica, gestire l'accesso alla fotocamera, rilevare codici a barre e aggiornare lo stato in tempo reale
const startSemiScanner = async () => {
    if (!semiScanPanel || !semiScanVideo) {
        return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setSemiScanStatus('Fotocamera non disponibile: usa HTTPS/localhost.', 'red');
        semiScanPanel.classList.remove('hidden');
        return;
    }

    semiScanPanel.classList.remove('hidden');
    setSemiScanStatus('Avvio fotocamera...', '#1f2937');

    try {
        semiScannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });

        semiScanVideo.srcObject = semiScannerStream;
        await semiScanVideo.play();
        semiScannerActive = true;

        if (!('BarcodeDetector' in window)) {
            setSemiScanStatus('Scansione disponibile in futuro su browser compatibili. Inserisci il codice manualmente.', '#b45309');
            return;
        }

        setSemiScanStatus('Inquadra il codice del semi-lavorato.', '#1f2937');
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });

        const tick = async () => {
            if (!semiScannerActive) {
                return;
            }

            try {
                const barcodes = await detector.detect(semiScanVideo);
                if (Array.isArray(barcodes) && barcodes.length > 0) {
                    const rawValue = barcodes[0]?.rawValue;
                    if (applyScannedSemiCode(rawValue)) {
                        stopSemiScanner();
                        return;
                    }
                }
            } catch (error) {
                console.error('Errore durante scansione codice semi-lavorato:', error);
            }

            semiScannerAnimationId = requestAnimationFrame(tick);
        };

        semiScannerAnimationId = requestAnimationFrame(tick);
    } catch (error) {
        console.error('Errore apertura fotocamera semi-lavorato:', error);
        setSemiScanStatus('Impossibile avviare la fotocamera.', 'red');
    }
};
// Funzione per cercare una mungitura completata che corrisponda al codice del semi-lavorato fornito, restituendo l'ID della mungitura se trovata o un messaggio di errore
const resolveMungituraBySemiCode = async (aziendaId, semiLavoratoId) => {
    const token = (localStorage.getItem('token') || '').trim();
    if (!aziendaId || !semiLavoratoId || !token) {
        return { ok: false, message: 'Dati mancanti per il collegamento mungitura-lavorazione' };
    }

    const params = new URLSearchParams({
        aziendaId,
        semiLavoratoId,
        status: 'completata'
    });

    try {
        const response = await fetch(`/api/mungiture?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json().catch(() => ([]));
        if (!response.ok) {
            return { ok: false, message: data?.message || 'Errore durante la ricerca della mungitura' };
        }

        const items = Array.isArray(data) ? data : [];
        const matched = items.find((item) => String(item?.semiLavoratoId || '').trim() === semiLavoratoId);

        if (!matched?._id) {
            return { ok: false, message: 'Nessuna mungitura completata trovata con questo codice semi-lavorato' };
        }

        return { ok: true, mungituraId: String(matched._id) };
    } catch (error) {
        return { ok: false, message: 'Errore di rete durante la ricerca della mungitura' };
    }
};
// Funzione per associare in modo sicuro l'ID di una mungitura agli input della lavorazione, evitando duplicati e assicurando che venga associato all'input di tipo "latte" se presente
const attachMungituraToInputs = (inputs, mungituraId) => {
    if (!Array.isArray(inputs) || !mungituraId) {
        return Array.isArray(inputs) ? inputs : [];
    }

    const targetIndex = inputs.findIndex((input) => String(input?.type || '').toLowerCase() === 'latte');
    const safeIndex = targetIndex >= 0 ? targetIndex : 0;

    return inputs.map((input, index) => {
        if (index !== safeIndex) {
            return input;
        }

        const existingIds = Array.isArray(input?.mungituraIds) ? input.mungituraIds : [];
        const merged = [...new Set([...existingIds.map((id) => String(id)), String(mungituraId)])];
        return {
            ...input,
            mungituraIds: merged
        };
    });
};
// Funzione per mostrare le suggerimenti di template basati sui risultati filtrati, creando dinamicamente i pulsanti e gestendo l'interazione dell'utente
const showTemplateSuggestions = (items) => {
    if (!templateSuggestions) return;

    if (!items.length) {
        hideTemplateSuggestions();
        return;
    }

    templateSuggestions.innerHTML = '';

    items.slice(0, 6).forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'template-suggestion-item';
        button.dataset.value = String(item.codiceLavorazione || item.nomeTemplate || '').trim();

        const top = document.createElement('span');
        top.className = 'template-suggestion-top';
        const codice = String(item.codiceLavorazione || '').trim();
        const nome = String(item.nomeTemplate || '').trim();
        top.textContent = [codice, nome].filter(Boolean).join(' - ') || 'Template';

        const bottom = document.createElement('span');
        bottom.className = 'template-suggestion-bottom';
        const notes = String(item.notes || '').replace(/\s+/g, ' ').trim();
        bottom.textContent = notes ? notes.slice(0, 120) : 'Nessuna descrizione';

        button.appendChild(top);
        button.appendChild(bottom);

        button.addEventListener('click', () => {
            if (ricercaTemplateInput) {
                ricercaTemplateInput.value = button.dataset.value || '';
                ricercaTemplateInput.focus();
            }
            hideTemplateSuggestions();
        });

        templateSuggestions.appendChild(button);
    });

    templateSuggestions.classList.remove('hidden');
};
// Funzione per caricare i suggerimenti di template dal server basati sull'azienda attiva, con caching per migliorare le prestazioni e ridurre le chiamate API
const loadTemplateSuggestions = async () => {
    const aziendaId = (localStorage.getItem('selectedAziendaId') || '').trim();
    if (!aziendaId) {
        templateSuggestionsCache = [];
        templateSuggestionsAziendaId = '';
        return;
    }

    if (templateSuggestionsAziendaId === aziendaId && templateSuggestionsCache.length > 0) {
        return;
    }

    const response = await fetch(`/api/lavorazioni?${new URLSearchParams({ aziendaId, isTemplate: 'true' }).toString()}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        }
    });

    if (!response.ok) {
        templateSuggestionsCache = [];
        templateSuggestionsAziendaId = aziendaId;
        return;
    }

    const data = await response.json().catch(() => []);
    templateSuggestionsCache = Array.isArray(data) ? data : [];
    templateSuggestionsAziendaId = aziendaId;
};
// Funzione per suggerire i template in base alla descrizione o codice inseriti dall'utente, filtrando i risultati e mostrando solo quelli rilevanti
const suggestTemplatesByDescription = async () => {
    const query = normalizeText(getTrimmedValue('ricercaTemplate'));
    if (!query || query.length < 2) {
        hideTemplateSuggestions();
        return;
    }

    await loadTemplateSuggestions();

    const filtered = templateSuggestionsCache.filter((item) => {
        const notes = normalizeText(item.notes);
        const nome = normalizeText(item.nomeTemplate);
        const codice = normalizeText(item.codiceLavorazione);
        return notes.includes(query) || nome.includes(query) || codice.includes(query);
    });

    showTemplateSuggestions(filtered);
};

if (addLavorazioneForm) {
    addLavorazioneForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!addLavorazioneMessage) return;

        const nomeTemplate = getTrimmedValue('nomeTemplate');
        const materiePrime = getSelectedInputMaterials();
        const outputPrincipale = getTrimmedValue('outputPrincipale');
        const userNotes = getTrimmedValue('notes');
        const aziendaId = (localStorage.getItem('selectedAziendaId') || '').trim();

        addLavorazioneMessage.style.color = 'red';
        addLavorazioneMessage.textContent = '';

        if (!nomeTemplate) {
            addLavorazioneMessage.textContent = 'Il nome lavorazione è obbligatorio';
            return;
        }

        if (materiePrime.length === 0) {
            addLavorazioneMessage.textContent = 'Seleziona almeno un input della lavorazione';
            return;
        }

        if (!outputPrincipale) {
            addLavorazioneMessage.textContent = 'Seleziona l\'output della lavorazione';
            return;
        }

        const fasi = getSelectedPhases();
        if (fasi.length === 0) {
            addLavorazioneMessage.textContent = 'Seleziona almeno una fase della lavorazione';
            return;
        }

        if (!aziendaId) {
            addLavorazioneMessage.textContent = 'Seleziona prima un\'azienda attiva';
            return;
        }

        const tipoLavorazione = OUTPUT_TO_TIPO[outputPrincipale] || 'altro';
        const outputUnit = OUTPUT_TO_UNIT[outputPrincipale] || 'pezzi';
        const codiceTipoLav = TIPO_TO_CODICETIPO[tipoLavorazione] || 'D';

        const inputs = materiePrime.map((materiaPrima) => ({
            type: INPUT_TO_TYPE[materiaPrima] || 'ingrediente',
            name: materiaPrima,
            quantity: 1,
            unit: INPUT_TO_UNIT[materiaPrima] || 'L'
        }));

        const templateNotes = [
            `Input selezionati: ${materiePrime.join(', ')}`,
            `Output principale: ${outputPrincipale}`,
            `Fasi selezionate in ordine: ${fasi.map((fase) => fase.name).join(' -> ')}`,
            userNotes
        ].filter(Boolean).join('\n');

        const payload = {
            aziendaId,
            nomeTemplate,
            tipoLavorazione,
            codiceTipoLav,
            isTemplate: true,
            status: 'in_corso',
            notes: templateNotes || undefined,
            inputs,
            fasi,
            outputName: outputPrincipale,
            outputUnit
        };

        try {
            const response = await fetch('/api/lavorazioni', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                addLavorazioneMessage.textContent = responseData.message || 'Errore durante il salvataggio del template';
                return;
            }

            addLavorazioneMessage.style.color = 'green';
            addLavorazioneMessage.textContent = responseData.message || 'Template lavorazione creato con successo';
            addLavorazioneForm.reset();
        } catch (error) {
            addLavorazioneMessage.textContent = 'Errore di rete o del server';
        }
    });
}

if(searchLavorazioneForm){
    searchLavorazioneForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!searchLavorazioneMessage) return;

        const ricercaTemplate = getTrimmedValue('ricercaTemplate');
        const aziendaId = (localStorage.getItem('selectedAziendaId') || '').trim();

        searchLavorazioneMessage.style.color = 'red';
        searchLavorazioneMessage.textContent = '';

        if(!templatePreviewForm.classList.contains('hidden')) { templatePreviewForm.classList.add('hidden'); }

        if(!ricercaTemplate){
            searchLavorazioneMessage.textContent = 'Inserire codice o descrizione del template per proseguire';
            return;
        }

        if (!aziendaId) {
            searchLavorazioneMessage.textContent = 'Seleziona un\'azienda prima di effettuare la ricerca';
            return;
        }

        try{ 
            const params = new URLSearchParams();
            params.set('queryTemplate', ricercaTemplate);
            params.set('aziendaId', aziendaId);

            const response = await fetch(`/api/lavorazioni/search?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                const datiErrore = await response.json().catch(() => ({}));
                searchLavorazioneMessage.textContent = datiErrore.message || 'Errore durante la ricerca del template';
                return;
            }

            const responseData = await response.json();
            // Estraggo i nomi di ogni input/fase del template interessato
            const nomiInput = responseData.inputs.map(el => el.name);  
            const nomiFasi = responseData.fasi.map(el => el.name);  
            
            // Inserisco i dati nei campi dedicati del form 'template-preview-form'
            document.getElementById('templateInfo').value = JSON.stringify(responseData); // campo nascosto nel form, utile per il passaggio dei dati
            document.getElementById('template').value = (responseData.nomeTemplate || 'Non definito').trim();
            document.getElementById('in').value = nomiInput.join(', ');
            document.getElementById('fasi').value = nomiFasi.join(', ');
            document.getElementById('out').value = (responseData.outputName || 'Non definito').trim(); 

            // Rendo visibile il form 'template-preview-form' compilato
            templatePreviewForm.classList.remove('hidden');
            hideTemplateSuggestions();
            
            searchLavorazioneForm.reset();
        } catch (error) {
            searchLavorazioneMessage.textContent = 'Errore di rete o del server';
        }
    });
}

if (ricercaTemplateInput) {
    let debounceTimer = null;
    ricercaTemplateInput.addEventListener('input', () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            suggestTemplatesByDescription().catch(() => {
                hideTemplateSuggestions();
            });
        }, 140);
    });

    ricercaTemplateInput.addEventListener('blur', () => {
        setTimeout(() => hideTemplateSuggestions(), 120);
    });

    ricercaTemplateInput.addEventListener('focus', () => {
        if (getTrimmedValue('ricercaTemplate').length >= 2) {
            suggestTemplatesByDescription().catch(() => {
                hideTemplateSuggestions();
            });
        }
    });
}

if(templatePreviewForm) {
    templatePreviewForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!addLavorazioneMessage) return;

        templatePreviewMessage.style.color = 'red';
        templatePreviewMessage.textContent = '';

        const addedNotes = `\nNote sulla lavorazione:\n` + getTrimmedValue('addedNotes');

        try{
            // Recupero le informazioni sul template dal form 'template-preview-form'
            const templateInfo = document.getElementById('templateInfo').value;
            if(!templateInfo){
                templatePreviewMessage.textContent = 'Errore nel passaggio di informazioni sul template';
                return;
            }
            const template = JSON.parse(templateInfo);
            const { _id, nomeTemplate, endedAt, createdAt, updatedAt, ...basePayload} = template;
            const aziendaId = (localStorage.getItem('selectedAziendaId') || '').trim();
            const semiLavoratoCode = getTrimmedValue('semiLavoratoCode');
            let mungituraIdToLink = '';

            if (semiLavoratoCode) {
                const linked = await resolveMungituraBySemiCode(aziendaId, semiLavoratoCode);
                if (!linked.ok) {
                    templatePreviewMessage.textContent = linked.message;
                    return;
                }
                mungituraIdToLink = linked.mungituraId;
            }

            const payload = {
                ...basePayload,
                isTemplate: false,
                templateId: template._id,
                startedAt: Date.now,
                notes: template.notes + addedNotes,
                status: 'in_corso',
                inputs: attachMungituraToInputs(basePayload.inputs, mungituraIdToLink)
            };

            const response = await fetch('/api/lavorazioni', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                templatePreviewMessage.textContent = responseData.message || 'Errore durante il salvataggio della lavorazione';
                return;
            }

            templatePreviewMessage.style.color = 'green';
            templatePreviewMessage.textContent = responseData.message || 'Lavorazione avviata con successo';
            templatePreviewForm.reset();
            templatePreviewForm.classList.add('hidden'); // Nascondo nuovamente il form
            stopSemiScanner();
        } catch (error) {
            templatePreviewMessage.textContent = 'Errore di rete o del server';
        }
    });
}

if (scanSemiLavoratoBtn) {
    scanSemiLavoratoBtn.addEventListener('click', () => {
        startSemiScanner();
    });
}

if (stopSemiScanBtn) {
    stopSemiScanBtn.addEventListener('click', () => {
        stopSemiScanner();
        setSemiScanStatus('Scansione interrotta. Inserisci il codice manualmente se necessario.', '#b45309');
    });
}

window.addEventListener('beforeunload', () => {
    stopSemiScanner();
});