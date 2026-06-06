import { OUTPUT_TO_TIPO, OUTPUT_TO_UNIT, TIPO_TO_CODICETIPO } from "./add-lavorazione.js";

const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';
// Elementi DOM
const statusMsg = document.getElementById('statusMsg');
const templateTableBody = document.getElementById('templateTableBody');
const lavorazioniStatus = document.getElementById('lavorazioniStatus');
const lavorazioniTableBody = document.getElementById('lavorazioniTableBody');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');
// Elementi filtro
const filterNomeTemplate = document.getElementById('filterNomeTemplate');
const filterInputTemplate = document.getElementById('filterInputTemplate');
const filterOutputTemplate = document.getElementById('filterOutputTemplate');

let allTemplates = [];
let allLavorazioni = [];
const rowTemplateMap = new Map();
const rowLavorazioniMap = new Map();
let detailsOverlay = null;

const renderStatus = (message, text, color = '#1f2937') => {
    if (!message) {
        return;
    }

    message.textContent = text;
    message.style.color = color;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttr = (value) => escapeHtml(value);

const getCodiceLavorazione = (item) => item.codiceLavorazione || '—';

const getNomeLavorazione = (item) => item.nomeTemplate || item.tipoLavorazione || '—';

const getStatoLabel = (status) => {
    if (status === 'completata') return 'Completata';
    if (status === 'annullata') return 'Annullata';
    return 'In corso';
  };

const getInputSummary = (item) => {
    if (!Array.isArray(item.inputs) || item.inputs.length === 0) {
        return '—';
    }

    return item.inputs
        .map((input) => input?.name || input?.type)
        .filter(Boolean)
        .join(', ') || '—';
};

const getNotes = (item) => item.notes || '—';

const getOutputName = (item) => item.outputName || '—';
const getQuantityLabel = (item) => {
    if(!item.outputQuantity || typeof item.outputQuantity !== 'number'){
        if (!item.outputUnit || typeof item.outputUnit !== 'string'){
            return `—`;
        }
        return `— ${item.outputUnit}`;
    }
    return `${item.outputQuantity} ${item.outputUnit}`;
}
const canEditFasi = (item) => !item?.isTemplate && item?.status === 'in_corso';
const hasSequentialCompletedFasi = (fasi = []) => {
    let foundIncomplete = false;

    for (const fase of fasi) {
        const completed = Boolean(fase?.completed);
        if (!completed) {
            foundIncomplete = true;
            continue;
        }

        if (foundIncomplete) {
            return false;
        }
    }

    return true;
};

const areAllFasiCompleted = (fasi = []) => Array.isArray(fasi) && fasi.length > 0 && fasi.every((fase) => Boolean(fase?.completed));
// riquadro di dettaglio con tutte le fasi e note
const formatDateTime = (value) => {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(date);
};

const getPhaseName = (phase, index) => {
    if (typeof phase === 'string') {
        return phase;
    }
    if (phase && typeof phase === 'object') {
        return phase.nome || phase.name || phase.tipo || phase.fase || `Fase ${index + 1}`;
    }
    return `Fase ${index + 1}`;
};

const getPhaseDetails = (phase) => {
    if (!phase || typeof phase !== 'object') {
        return '';
    }

    const details = [];
    const dataInizio = formatDateTime(phase.dataInizio || phase.inizio || phase.startAt);
    const dataFine = formatDateTime(phase.dataFine || phase.fine || phase.endAt);

    if (dataInizio) {
        details.push(`inizio: ${dataInizio}`);
    }
    if (dataFine) {
        details.push(`fine: ${dataFine}`);
    }
    if (phase.note) {
        details.push(`note: ${phase.note}`);
    }

    return details.join(' | ');
};

const getPhasesHtml = (item, editable = false) => {
    if (!Array.isArray(item.fasi) || item.fasi.length === 0) {
        return '<p class="status" style="margin:0">Nessuna fase presente.</p>';
    }

    const rows = item.fasi.map((phase, index) => {
        const phaseName = escapeHtml(getPhaseName(phase, index));
        const phaseDetails = escapeHtml(getPhaseDetails(phase));
        const checked = Boolean(phase?.completed);

        if (editable) {
            return `
                <li style="margin-bottom:8px;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" data-phase-index="${index}" ${checked ? 'checked' : ''}>
                        <strong>${phaseName}</strong>
                    </label>
                    ${phaseDetails ? `<div style="opacity:.85;font-size:.92em;margin-left:24px;">${phaseDetails}</div>` : ''}
                </li>
            `;
        }

        return `
            <li style="margin-bottom:8px;">
                <strong>${phaseName}</strong>
                ${checked ? '<span style="margin-left:8px;color:#166534;font-size:.85em;">(completata)</span>' : ''}
                ${phaseDetails ? `<div style="opacity:.85;font-size:.92em;">${phaseDetails}</div>` : ''}
            </li>
        `;
    }).join('');

    return `<ol style="margin:8px 0 0 18px;">${rows}</ol>`;
};
// funzione di ripristino riga dopo modifica inline.
const ensureDetailsOverlay = () => {
    if (detailsOverlay) {
        return detailsOverlay;
    }

    detailsOverlay = document.createElement('div');
    detailsOverlay.id = 'lavorazioneDetailsOverlay';
    detailsOverlay.style.position = 'fixed';
    detailsOverlay.style.inset = '0';
    detailsOverlay.style.background = 'rgba(17,24,39,.45)';
    detailsOverlay.style.display = 'none';
    detailsOverlay.style.alignItems = 'center';
    detailsOverlay.style.justifyContent = 'center';
    detailsOverlay.style.padding = '20px';
    detailsOverlay.style.zIndex = '9999';
    detailsOverlay.innerHTML = `
        <div role="dialog" aria-modal="true" aria-labelledby="lavorazioneDetailsTitle" style="width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;padding:18px 20px;box-shadow:0 14px 42px rgba(0,0,0,.2)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <h3 id="lavorazioneDetailsTitle" style="margin:0;color:#111827;">Dettaglio lavorazione</h3>
                <button type="button" id="closeLavorazioneDetails" style="border:0;background:#15803d;color:#ffffff;font-size:18px;cursor:pointer;line-height:1;width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 4px 12px rgba(2, 94, 40, 0.35);" title="Chiudi dettaglio" aria-label="Chiudi dettaglio">✕</button>
            </div>
            <div id="lavorazioneDetailsBody" style="margin-top:12px;"></div>
        </div>
    `;

    detailsOverlay.addEventListener('click', (event) => {
        if (event.target === detailsOverlay) {
            detailsOverlay.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && detailsOverlay && detailsOverlay.style.display !== 'none') {
            detailsOverlay.style.display = 'none';
        }
    });

    document.body.appendChild(detailsOverlay);

    const closeButton = detailsOverlay.querySelector('#closeLavorazioneDetails');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            detailsOverlay.style.display = 'none';
        });
    }

    return detailsOverlay;
};
// apre la finestra di dettaglio al click sulla riga, con focus trap e chiusura con ESC o click fuori.
const openDetails = (item) => {
    if (!item) {
        return;
    }

    const overlay = ensureDetailsOverlay();
    const body = overlay.querySelector('#lavorazioneDetailsBody');

    if (!body) {
        return;
    }

    const isEditable = canEditFasi(item);
    body.innerHTML = `
        <div style="display:grid;gap:10px;">
            <p style="margin:0;"><strong>Codice:</strong> ${escapeHtml(getCodiceLavorazione(item))}</p>
            <p style="margin:0;"><strong>Nome:</strong> ${escapeHtml(getNomeLavorazione(item))}</p>
            <p style="margin:0;"><strong>Input:</strong> ${escapeHtml(getInputSummary(item))}</p>
            <p style="margin:0;"><strong>Output:</strong> ${escapeHtml(getOutputName(item))}</p>
            <p style="margin:0;"><strong>Stato:</strong> ${escapeHtml(getStatoLabel(item.status))}</p>
            <div>
                <strong>Fasi:</strong>
                ${getPhasesHtml(item, isEditable)}
            </div>
            ${isEditable
                ? `<button type="button" id="saveFasiDetailsBtn" data-id="${escapeAttr(item._id)}" style="justify-self:start;border:0;background:#15803d;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:700;">Salva fasi</button>`
                : `<p style="margin:0;color:#92400e;font-weight:600;">Dettaglio in sola lettura: la lavorazione non è in corso.</p>`
            }
            ${item.notes ? `<p style="margin:0;"><strong>Note:</strong> ${escapeHtml(item.notes)}</p>` : ''}
        </div>
    `;

    overlay.style.display = 'flex';
};
// tasto di modifica inline. 
const rowTemplateHtml = (item) => `
    <td>${escapeHtml(getCodiceLavorazione(item))}</td>
    <td>${escapeHtml(getNomeLavorazione(item))}</td>
    <td>${escapeHtml(getInputSummary(item))}</td>
    <td>${escapeHtml(getOutputName(item))}</td>
    <td>
        <button class="edit-animal-btn" data-id="${escapeAttr(item._id)}" title="Modifica template" aria-label="Modifica template">
            <span class="edit-animal-icon" aria-hidden="true">✎</span>
        </button>
        <button class="delete-animal-btn" data-id="${escapeAttr(item._id)}" title="Elimina template" aria-label="Elimina template">
            <span class="delete-animal-icon" aria-hidden="true">🗑</span>
        </button>
    </td>
`;
const rowLavorazioneHtml = (item) => `
    <td>${escapeHtml(formatDateTime(item.startedAt))}</td>
    <td>${escapeHtml(getCodiceLavorazione(item))}</td>
    <td>${escapeHtml(getQuantityLabel(item))}</td>
    <td>${escapeHtml(getStatoLabel(item.status))}</td>
    <td>${escapeHtml(getNotes(item))}</td>
    <td>
        ${item.status === 'in_corso' 
            ? `
            ${item.outputUnit !== 'pezzi' 
                ? `<button class="terminate-scale-btn" data-id="${escapeAttr(item._id)}" title="Termina con bilancia" aria-label="Termina con bilancia" data-action="close-iot"><span class="terminate-scale-icon" aria-hidden="true">🌐</span></button>` 
                : ''
            }
                <button class="terminate-manual-btn" data-id="${escapeAttr(item._id)}" title="Termina manuale" aria-label="Termina manuale" data-action="close-manual"><span class="terminate-manual-icon" aria-hidden="true">📏</span></button>
            ` 
            : '<span>—</span>'
        }
        <button class="delete-animal-btn" data-id="${escapeAttr(item._id)}" title="Elimina lavorazione" aria-label="Elimina lavorazione">
            <span class="delete-animal-icon" aria-hidden="true">🗑</span>
        </button>
    </td>
`;

const renderEmptyState = (tableBody, message) => {
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="4">${escapeHtml(message)}</td>
        </tr>
    `;
};

const renderTemplatesTable = (items) => {
    if (!templateTableBody) {
        return;
    }

    rowTemplateMap.clear();

    if (!Array.isArray(items) || items.length === 0) {
        renderEmptyState(templateTableBody, 'Nessun template trovato con i filtri selezionati.');
        return;
    }

    items.forEach((item) => {
        if (item && item._id) { rowTemplateMap.set(String(item._id), item); }
    });

    templateTableBody.innerHTML = items.map((item) => `
        <tr data-id="${escapeAttr(item._id)}" class="lavorazione-row" tabindex="0" role="button" aria-label="Apri dettaglio template">
            ${rowTemplateHtml(item)}
        </tr>
    `).join('');
};

const renderLavorazioniTable = (items) => {
    if (!lavorazioniTableBody) {
        return;
    }
    
    rowLavorazioniMap.clear();

    if (!Array.isArray(items) || items.length === 0) {
        renderEmptyState(lavorazioniTableBody, 'Nessuna lavorazione trovata.');
        return;
    }

    items.forEach((item) => rowLavorazioniMap.set(String(item._id), item));

    lavorazioniTableBody.innerHTML = items.map((item) => `
        <tr data-id="${escapeAttr(item._id)}" class="lavorazione-row" tabindex="0" role="button" aria-label="Apri dettaglio lavorazione">
            ${rowLavorazioneHtml(item)}
        </tr>
    `).join('');
};

const saveFasiFromDetails = async (lavorazioneId) => {
    const overlay = ensureDetailsOverlay();
    const token = localStorage.getItem('token');
    if (!lavorazioneId || !token) {
        renderStatus(lavorazioniStatus, 'Dati mancanti per salvare le fasi.', 'red');
        return;
    }

    const item = rowLavorazioniMap.get(String(lavorazioneId));
    if (!item || !canEditFasi(item)) {
        renderStatus(lavorazioniStatus, 'La lavorazione non è modificabile.', '#b45309');
        return;
    }

    const phaseInputs = Array.from(overlay.querySelectorAll('[data-phase-index]'));
    if (phaseInputs.length === 0 || !Array.isArray(item.fasi)) {
        renderStatus(lavorazioniStatus, 'Nessuna fase disponibile da aggiornare.', '#b45309');
        return;
    }

    const updatedFasi = item.fasi.map((phase, index) => {
        const checkbox = phaseInputs.find((node) => Number(node.dataset.phaseIndex) === index);
        return {
            name: getPhaseName(phase, index),
            completed: Boolean(checkbox?.checked)
        };
    });

    if (!hasSequentialCompletedFasi(updatedFasi)) {
        renderStatus(lavorazioniStatus, 'Le fasi devono essere completate in ordine: non puoi flaggare una fase se la precedente non è completata.', '#b45309');
        return;
    }

    try {
        const response = await fetch(`/api/lavorazioni/${lavorazioneId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fasi: updatedFasi })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            renderStatus(lavorazioniStatus, data.message || 'Errore durante il salvataggio delle fasi.', 'red');
            return;
        }

        const updatedItem = data?.lavorazione || { ...item, fasi: updatedFasi };
        rowLavorazioniMap.set(String(lavorazioneId), updatedItem);
        allLavorazioni = allLavorazioni.map((current) => (
            String(current._id) === String(lavorazioneId) ? { ...current, ...updatedItem, fasi: updatedItem.fasi || updatedFasi } : current
        ));

        renderStatus(lavorazioniStatus, 'Fasi lavorazione aggiornate con successo.', 'green');
        openDetails(rowLavorazioniMap.get(String(lavorazioneId)));
    } catch (error) {
        console.error('Errore durante salvataggio fasi lavorazione:', error);
        renderStatus(lavorazioniStatus, 'Errore di connessione durante il salvataggio delle fasi.', 'red');
    }
};

const syncSequentialPhaseInputs = (overlay) => {
    if (!overlay) {
        return;
    }

    const phaseInputs = Array.from(overlay.querySelectorAll('[data-phase-index]'))
        .sort((left, right) => Number(left.dataset.phaseIndex) - Number(right.dataset.phaseIndex));

    if (phaseInputs.length === 0) {
        return;
    }

    phaseInputs.forEach((input, index) => {
        if (index === 0) {
            input.disabled = false;
            return;
        }

        const previous = phaseInputs[index - 1];
        const enabled = Boolean(previous?.checked);
        input.disabled = !enabled;

        if (!enabled && input.checked) {
            input.checked = false;
        }
    });
};

const bindSequentialPhaseInputs = (overlay) => {
    if (!overlay) {
        return;
    }

    const phaseInputs = Array.from(overlay.querySelectorAll('[data-phase-index]'));
    if (phaseInputs.length === 0) {
        return;
    }

    syncSequentialPhaseInputs(overlay);
    phaseInputs.forEach((input) => {
        input.addEventListener('change', () => {
            syncSequentialPhaseInputs(overlay);
        });
    });
};

const ensureLavorazioneCanBeClosed = (lavorazioneId) => {
    const item = rowLavorazioniMap.get(String(lavorazioneId));
    if (!item) {
        renderStatus(lavorazioniStatus, 'Lavorazione non trovata.', 'red');
        return false;
    }

    if (!areAllFasiCompleted(item.fasi)) {
        renderStatus(lavorazioniStatus, 'Non puoi terminare la lavorazione finché tutte le fasi non sono completate.', '#b45309');
        return false;
    }

    return true;
};

const applyFilters = () => {
    if (allTemplates.length === 0) {
        renderStatus(statusMsg, 'Non hai ancora salvato template.', '#b45309');
        return;
    }

    const nomeValue = normalizeText(filterNomeTemplate?.value);
    const inputValue = normalizeText(filterInputTemplate?.value);
    const outputValue = normalizeText(filterOutputTemplate?.value);

    const filteredItems = allTemplates.filter((item) => {
        const matchesNome = !nomeValue || normalizeText(getNomeLavorazione(item)).includes(nomeValue);
        const matchesInput = !inputValue || normalizeText(getInputSummary(item)).includes(inputValue);
        const matchesOutput = !outputValue || normalizeText(getOutputName(item)).includes(outputValue);
        return matchesNome && matchesInput && matchesOutput;
    });

    renderTemplatesTable(filteredItems);

    if (filteredItems.length === 0) {
        renderStatus(statusMsg, 'Nessun template trovato con i filtri selezionati.', '#b45309');
    } else {
        renderStatus(statusMsg, `${filteredItems.length} template visibile/i.`, 'green');
    }
};

const fetchLavorazioni = async (options = {}) => {
    const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
    const token = localStorage.getItem('token');

    if (!aziendaId) {
        renderStatus(statusMsg, 'Nessuna azienda selezionata. Torna alla home e seleziona un\'azienda.', '#b45309');
        renderEmptyState(templateTableBody, 'Seleziona prima un\'azienda dalla home.');
        return;
    }

    if (!token) {
        renderStatus(statusMsg, 'Sessione non valida. Effettua nuovamente il login.', 'red');
        renderEmptyState(templateTableBody, 'Accesso richiesto.');
        return;
    }

    const aziendaName = localStorage.getItem(SELECTED_AZIENDA_NAME_KEY) || aziendaId;
    if (currentAziendaBadge) {
        currentAziendaBadge.textContent = `Azienda attiva: ${aziendaName} ▾`;
    }

    const target = options.target || 'all'; 

    try {
        if (target === 'templates') {
            const params = new URLSearchParams({ aziendaId, isTemplate: true });
            const response = await fetch(`/api/lavorazioni?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json().catch(() => ([]));
            if (!response.ok) {
                const errorMessage = Array.isArray(data) ? 'Errore nel caricamento dei template.' : (data.message || 'Errore nel caricamento dei template.');
                renderStatus(statusMsg, errorMessage, 'red');
                renderEmptyState(templateTableBody, 'Errore nel caricamento.');
                return;
            }
            allTemplates = Array.isArray(data) ? data : [];;
            applyFilters();
            return;
        }  
        
        if (target === 'lavorazioni') {
            const params = new URLSearchParams({ aziendaId, isTemplate: false });
            const response = await fetch(`/api/lavorazioni?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json().catch(() => ([]));
            if (!response.ok) {
                const errorMessage = Array.isArray(data) ? 'Errore nel caricamento delle lavorazioni.' : (data.message || 'Errore nel caricamento delle lavorazioni.');
                renderStatus(lavorazioniStatus, errorMessage, 'red');
                renderEmptyState(lavorazioniTableBody, 'Errore nel caricamento.');
                return;
            }
            allLavorazioni = Array.isArray(data) ? data : [];
            if (allLavorazioni.length !== 0) { 
                renderLavorazioniTable(allLavorazioni);
                renderStatus(lavorazioniStatus, `${allLavorazioni.length} lavorazione/i visibile/i.`, 'green');
            } else {
                renderStatus(lavorazioniStatus, 'Non hai ancora avviato nessuna lavorazione.', '#b45309');
            }
            return;
        }
        
        if (target === 'all') {
            const paramsTemplates = new URLSearchParams({ aziendaId, isTemplate: 'true' });
            const paramsLavorazioni = new URLSearchParams({ aziendaId, isTemplate: 'false' });

            const [resTemplates, resLavorazioni] = await Promise.all([
                fetch(`/api/lavorazioni?${paramsTemplates.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/lavorazioni?${paramsLavorazioni.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const dataTemplates = await resTemplates.json().catch(() => ([]));
            if (!resTemplates.ok) {
                const errorMessage = Array.isArray(data) ? 'Errore nel caricamento dei template.' : (data.message || 'Errore nel caricamento dei template.');
                renderStatus(statusMsg, errorMessage, 'red');
                renderEmptyState(templateTableBody, 'Errore nel caricamento.');
                return;
            }
            const dataLavorazioni = await resLavorazioni.json().catch(() => ([]));
            if (!resLavorazioni.ok) {
                const errorMessage = Array.isArray(data) ? 'Errore nel caricamento delle lavorazioni.' : (data.message || 'Errore nel caricamento delle lavorazioni.');
                renderStatus(lavorazioniStatus, errorMessage, 'red');
                renderEmptyState(lavorazioniTableBody, 'Errore nel caricamento.');
                return;
            }

            allTemplates = Array.isArray(dataTemplates) ? dataTemplates : [];
            applyFilters();

            allLavorazioni = Array.isArray(dataLavorazioni) ? dataLavorazioni : [];
            if (allLavorazioni.length > 0) {
                renderLavorazioniTable(allLavorazioni);
                renderStatus(lavorazioniStatus, `${allLavorazioni.length} lavorazione/i visibile/i.`, 'green');
            } else {
                renderStatus(lavorazioniStatus, 'Non hai ancora avviato nessuna lavorazione.', '#b45309');
            }
        }
        
    } catch (error) {
        console.error('Errore durante il recupero delle lavorazioni/templates:', error);
        renderStatus(statusMsg, 'Errore di connessione al server.', 'red');
        renderEmptyState(templateTableBody, 'Errore di connessione.');
    }
};

const restoreRow = (tr, item) => {
    tr.classList.remove('editing');
    if (item.isTemplate) {
        tr.innerHTML = rowTemplateHtml(item); 
    } else {
        tr.innerHTML = rowLavorazioneHtml(item);
    } 
};
// funzione di eliminazione con conferma.
const deleteLavorazioneById = async (message, lavorazioneId) => {
    const token = localStorage.getItem('token');
    if (!lavorazioneId || !token) {
        renderStatus(message, 'Dati mancanti per eliminare la lavorazione.', 'red');
        return;
    }
    const confirmed = window.confirm('Sei sicuro di voler eliminare questa lavorazione? Questa azione non può essere annullata.');
    if (!confirmed) {
        return;
    }
    try {
        const response = await fetch(`/api/lavorazioni/${lavorazioneId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            renderStatus(message, data.message || 'Errore durante l\'eliminazione della lavorazione.', 'red');
            return;
        }
        renderStatus(message, data.message || 'Lavorazione eliminata con successo.', 'green');
        await fetchLavorazioni();
    } catch (error) {
        console.error('Errore durante l\'eliminazione della lavorazione:', error);
        renderStatus(message, 'Errore di connessione durante l\'eliminazione.', 'red');
    }
};
// funzione di modifica inline (solo template). 
const openInlineEdit = (tr, item) => {
    if (!tr || !item || tr.classList.contains('editing')) {
        return;
    }

    tr.classList.add('editing');
    tr.innerHTML = `
        <td>${escapeHtml(getCodiceLavorazione(item))}</td>
        <td><input class="inline-input" data-field="nomeTemplate" value="${escapeAttr(item.nomeTemplate || '')}" placeholder="Nome lavorazione"></td>
        <td>${escapeHtml(getInputSummary(item))}</td>
        <td>${escapeHtml(getOutputName(item))}</td>
        <td>
            <button class="save-animal-btn" data-id="${escapeAttr(item._id)}" title="Salva" aria-label="Salva">✔</button>
            <button class="cancel-edit-btn" data-id="${escapeAttr(item._id)}" title="Annulla" aria-label="Annulla">✕</button>
        </td>
    `;
};
// funzione di salvataggio modifica inline (solo template).
const saveInlineEdit = async (tr, lavorazioneId) => {
    const token = localStorage.getItem('token');

    if (!tr || !lavorazioneId || !token) {
        renderStatus(statusMsg, 'Dati mancanti per aggiornare la lavorazione.', 'red');
        return;
    }

    const payload = {};
    tr.querySelectorAll('[data-field]').forEach((element) => {
        const field = element.dataset.field;
        const value = String(element.value || '').trim();
        payload[field] = value;
    });

    if (!payload.nomeTemplate) {
        renderStatus(statusMsg,'Il nome template è obbligatorio.', 'red');
        return;
    }

    try {
        const response = await fetch(`/api/lavorazioni/${lavorazioneId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            renderStatus(statusMsg, data.message || 'Errore durante la modifica della lavorazione.', 'red');
            return;
        }

        renderStatus(statusMsg, data.message || 'Lavorazione modificata con successo.', 'green');
        await fetchLavorazioni({ options: 'template'});
    } catch (error) {
        console.error('Errore durante la modifica della lavorazione:', error);
        renderStatus(statusMsg, 'Errore di connessione durante la modifica.', 'red');
    }
};

const patchCloseLavorazione = async (id, quantity, notes, source) => {
    const token = localStorage.getItem('token');
    if (!id || !token) {
      renderStatus(lavorazioniStatus, 'Dati mancanti per chiudere la lavorazione.', 'red');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      renderStatus(lavorazioniStatus, 'Valore non valido.', 'red');
      return;
    }

    const sourceLabel = source === 'iot' ? 'IoT' : 'manuale';
    const composedNotes = [
      typeof notes === 'string' ? notes.trim() : '',
      `Rilevazione litri: ${sourceLabel}`
    ].filter(Boolean).join(' | ');

    const payload = {
      status: 'completata',
      endedAt: new Date().toISOString(),
      outputQuantity: Number(parsedQuantity.toFixed(2)),
    };

    if (composedNotes) {
      payload.notes = composedNotes;
    }

    try {
      const response = await fetch(`/api/lavorazioni/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        renderStatus(lavorazioniStatus, data.message || 'Errore durante la chiusura della lavorazione.', 'red');
        return;
      }

      renderStatus(lavorazioniStatus, data.message || 'Lavorazione aggiornata con successo.', 'green');
      await fetchLavorazioni();
    } catch (error) {
      console.error('Errore durante la chiusura lavorazione:', error);
      renderStatus(lavorazioniStatus, 'Errore di connessione durante l\'aggiornamento.', 'red');
    }
  };

const closeLavorazioneManual = async (id) => {
        if (!ensureLavorazioneCanBeClosed(id)) {
            return;
        }

    const quantityInput = window.prompt(`Inserisci la quantità rilevata manualmente:`, '0');
    if (quantityInput === null) {
      return;
    }

    const notes = window.prompt('Note di chiusura (facoltative):', '');
    await patchCloseLavorazione(id, quantityInput, notes, 'manuale');
};

const closeLavorazioneIot = async (id) => {
        if (!ensureLavorazioneCanBeClosed(id)) {
            return;
        }

    const token = localStorage.getItem('token');
    if (!id || !token) {
      renderStatus(lavorazioniStatus, 'Dati mancanti per leggere dalla bilancia IoT.', 'red');
      return;
    }

    try {
      const iotResponse = await fetch(`/api/lavorazioni/${id}/iot`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const iotData = await iotResponse.json().catch(() => ({}));
      if (!iotResponse.ok) {
        renderStatus(lavorazioniStatus, iotData.message || 'Errore durante la lettura dalla bilancia IoT.', 'red');
        return;
      }

      const quantity = iotData?.quantity;
      const notes = window.prompt('Note di chiusura (facoltative):', '');
      await patchCloseLavorazione(id, quantity, notes, 'iot');
    } catch (error) {
      console.error('Errore durante lettura IoT:', error);
      renderStatus(lavorazioniStatus, 'Errore di connessione durante lettura IoT.', 'red');
    }
};

if (filterNomeTemplate) {
    filterNomeTemplate.addEventListener('input', applyFilters);
}

if (filterInputTemplate) {
    filterInputTemplate.addEventListener('input', applyFilters);
}

if (filterOutputTemplate) {
    filterOutputTemplate.addEventListener('input', applyFilters);
}

if (templateTableBody) {
    templateTableBody.addEventListener('click', async (event) => {
        const clickedRow = event.target.closest('tr[data-id]');
        const editButton = event.target.closest('.edit-animal-btn');

        if (editButton) {
            event.stopPropagation(); 
            const tr = editButton.closest('tr');

            if (tr) {
                const itemId = tr.dataset.id;
                const item = rowTemplateMap.get(itemId);
                if (item) {
                    openInlineEdit(tr, item);
                } else {
                    console.warn(`Oggetto non trovato nella mappa per l'ID: ${itemId}`);
                }
            }
            return;
        }

        const deleteButton = event.target.closest('.delete-animal-btn');
        if (deleteButton) {
            await deleteLavorazioneById(statusMsg, deleteButton.dataset.id);
            return;
        }

        const saveButton = event.target.closest('.save-animal-btn');
        if (saveButton) {
            await saveInlineEdit(saveButton.closest('tr'), saveButton.dataset.id);
            return;
        }

        const cancelButton = event.target.closest('.cancel-edit-btn');
        if (cancelButton) {
            const tr = cancelButton.closest('tr');
            const item = rowTemplateMap.get(cancelButton.dataset.id);
            if (tr && item) {
                restoreRow(tr, item);
            }
            return;
        }

        if (clickedRow && !clickedRow.classList.contains('editing')) {
            const item = rowTemplateMap.get(clickedRow.dataset.id);
            openDetails(item);
        }
    });

    templateTableBody.addEventListener('keydown', (event) => {
        const row = event.target.closest('tr[data-id]');
        if (!row || row.classList.contains('editing')) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const item = rowTemplateMap.get(row.dataset.id);
            openDetails(item);
        }
    });
}

const overlay = ensureDetailsOverlay();
overlay.addEventListener('click', async (event) => {
    const saveButton = event.target.closest('#saveFasiDetailsBtn');
    if (!saveButton) {
        return;
    }
    await saveFasiFromDetails(saveButton.dataset.id);
});

overlay.addEventListener('change', (event) => {
    const phaseInput = event.target.closest('[data-phase-index]');
    if (!phaseInput) {
        return;
    }
    syncSequentialPhaseInputs(overlay);
});

fetchLavorazioni();

// Funzionalità della tabella dedicata alle lavorazioni 
if(lavorazioniTableBody){
    lavorazioniTableBody.addEventListener('click', async (event) => {
        const clickedRow = event.target.closest('tr[data-id]');
        const closeScaleButton = event.target.closest('.terminate-scale-btn');
        const closeManualButton = event.target.closest('.terminate-manual-btn');
        const deleteButton = event.target.closest('.delete-animal-btn');

        if (closeScaleButton) {
            const lavorazioneId = closeScaleButton.getAttribute('data-id') || '';
            await closeLavorazioneIot(lavorazioneId);
            return;
        }
        
        if (closeManualButton) {
            const lavorazioneId = closeManualButton.getAttribute('data-id') || '';
            await closeLavorazioneManual(lavorazioneId);
            return;
        }

        if (deleteButton) {
            await deleteLavorazioneById(lavorazioniStatus, deleteButton.dataset.id);
            return;
        }

        if (clickedRow) {
            const item = rowLavorazioniMap.get(clickedRow.dataset.id);
            openDetails(item);
            bindSequentialPhaseInputs(overlay);
        }
    });

    lavorazioniTableBody.addEventListener('keydown', (event) => {
        const row = event.target.closest('tr[data-id]');
        if (!row) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const item = rowLavorazioniMap.get(row.dataset.id);
            openDetails(item);
            bindSequentialPhaseInputs(overlay);
        }
    });
}

