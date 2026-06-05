const addLavorazioneForm = document.getElementById('add-lavorazione-form');
const addLavorazioneMessage = document.getElementById('templateFormStatus');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');
const searchLavorazioneForm = document.getElementById('search-lavorazione-form');
const searchLavorazioneMessage = document.getElementById('searchStatus');
const ricercaTemplateInput = document.getElementById('ricercaTemplate');
const templateSuggestions = document.getElementById('templateSuggestions');
const templatePreviewForm = document.getElementById('template-preview-form');
const templatePreviewMessage = document.getElementById('lavorazioneFormStatus');

export const OUTPUT_TO_TIPO = {
    'Latte alimentare confezionato': 'altro',
    'Formaggi stagionati o freschi strutturati': 'formaggio',
    'Vasetti di yogurt': 'yogurt',
    'Panetti di burro': 'altro',
    'Siero di latte residuo': 'altro',
    'Latticello': 'altro',
    'Acque di lavaggio e reflui autolavanti': 'altro'
};

export const TIPO_TO_CODICETIPO = {
    'primo-latte': 'A',
    'formaggio': 'B',
    'yogurt': 'C',
    'altro': 'D'
};

const INPUT_TO_TYPE = {
    'Latte crudo': 'latte',
    'Latte in polvere': 'ingrediente',
    'Latte scremato liquido o crema di latte': 'latte',
    'Acqua': 'ingrediente',
    'Fermenti lattici': 'additivo'
};

const INPUT_TO_UNIT = {
    'Latte crudo': 'L',
    'Latte in polvere': 'Kg',
    'Latte scremato liquido o crema di latte': 'L',
    'Acqua': 'L',
    'Fermenti lattici': 'Kg'
};

export const OUTPUT_TO_UNIT = {
    'Latte alimentare confezionato': 'pezzi',
    'Formaggi stagionati o freschi strutturati': 'Kg',
    'Vasetti di yogurt': 'pezzi',
    'Panetti di burro': 'pezzi',
    'Siero di latte residuo': 'L',
    'Latticello': 'L',
    'Acque di lavaggio e reflui autolavanti': 'L'
};

const selectedAziendaName = localStorage.getItem('selectedAziendaName') || 'non selezionata';
if (currentAziendaBadge) {
    currentAziendaBadge.textContent = `Azienda attiva: ${selectedAziendaName}`;
}

const getTrimmedValue = (id) => {
    const el = document.getElementById(id);
    if (!el || typeof el.value !== 'string') {
        return '';
    }
    return el.value.trim();
};

const getSelectedInputMaterials = () => {
    const select = document.getElementById('materiePrime');
    if (!(select instanceof HTMLSelectElement)) {
        return [];
    }

    return Array.from(select.selectedOptions)
        .map((option) => option.value.trim())
        .filter(Boolean);
};

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

const standardCodiceLavorazione = /^[A][A-D]\d{3}$/;
let templateSuggestionsCache = [];
let templateSuggestionsAziendaId = '';

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

        searchLavorazioneMessage.style.color = 'red';
        searchLavorazioneMessage.textContent = '';

        if(!templatePreviewForm.classList.contains('hidden')) { templatePreviewForm.classList.add('hidden'); }

        if(!ricercaTemplate){
            searchLavorazioneMessage.textContent = 'Inserire codice o descrizione del template per proseguire';
            return;
        }

        try{ 
            const params = new URLSearchParams();
            params.set('queryTemplate', ricercaTemplate);

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
            const payload = {
                ...basePayload,
                isTemplate: false,
                templateId: template._id,
                startedAt: Date.now,
                notes: template.notes + addedNotes,
                status: 'in_corso' 
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
        } catch (error) {
            templatePreviewMessage.textContent = 'Errore di rete o del server';
        }
    });
}