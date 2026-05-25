const statusMsg = document.getElementById('statusMsg');
const puntiVenditaTableBody = document.getElementById('puntiVenditaTableBody');
const filterActivePunto = document.getElementById('filterActivePunto');
const filterNomePunto = document.getElementById('filterNomePunto');
const filterIndirizzoPunto = document.getElementById('filterIndirizzoPunto');
const filterCategoriePunto = document.getElementById('filterCategoriePunto');

let allPuntiVendita = [];
const rowDataMap = new Map();

const renderStatus = (text, color = '#1f2937') => {
    if (!statusMsg) {
        return;
    }

    statusMsg.textContent = text;
    statusMsg.style.color = color;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getZonaLabel = (item) => {
    const zoneParts = [item.city, item.province].map((part) => String(part || '').trim()).filter(Boolean);
    return zoneParts.length > 0 ? zoneParts.join(' - ') : '—';
};

const getIndirizzoSearchText = (item) => normalizeText([
    item.city,
    item.province,
    item.indirizzo,
    item.formattedAddress
].filter(Boolean).join(' '));

const getCategorieSearchText = (item) => normalizeText(Array.isArray(item.categories) ? item.categories.join(' ') : '');

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttr = (value) => escapeHtml(value);

const renderEmptyState = (message) => {
    if (!puntiVenditaTableBody) {
        return;
    }

    puntiVenditaTableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="8">${escapeHtml(message)}</td>
        </tr>
    `;
};

const getActiveLabel = (item) => (item.isActive === false ? 'Non attivo' : 'Attivo');
const isActiveSelected = (item) => item.isActive !== false;

const formatWebsiteCell = (website) => (website
    ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Apri</a>`
    : '—');

const formatCategories = (categories) => (Array.isArray(categories) && categories.length > 0
    ? categories.map((category) => escapeHtml(category)).join(', ')
    : '—');

const rowHtml = (item) => `
    <td>
        <span class="punto-vendita-active-badge ${item.isActive === false ? 'is-inactive' : 'is-active'}">${escapeHtml(getActiveLabel(item))}</span>
    </td>
    <td>${escapeHtml(item.nomePunto || '—')}</td>
    <td>${escapeHtml(item.formattedAddress || item.indirizzo || '—')}</td>
    <td>${escapeHtml(item.phoneNumber || '—')}</td>
    <td>${escapeHtml(item.emailPunto || '—')}</td>
    <td>${formatWebsiteCell(item.website)}</td>
    <td>${formatCategories(item.categories)}</td>
    <td>
        <button class="edit-animal-btn" data-id="${escapeAttr(item._id)}" title="Modifica punto vendita" aria-label="Modifica punto vendita">
            <span class="edit-animal-icon" aria-hidden="true">✎</span>
        </button>
        <button class="delete-animal-btn" data-id="${escapeAttr(item._id)}" title="Elimina punto vendita" aria-label="Elimina punto vendita">
            <span class="delete-animal-icon" aria-hidden="true"></span>
        </button>
    </td>`;

const renderTable = (items) => {
    if (!puntiVenditaTableBody) {
        return;
    }

    rowDataMap.clear();

    if (!Array.isArray(items) || items.length === 0) {
        renderEmptyState('Nessun punto vendita trovato con i filtri selezionati.');
        return;
    }

    items.forEach((item) => rowDataMap.set(String(item._id), item));
    puntiVenditaTableBody.innerHTML = items.map((item) => `
        <tr data-id="${escapeAttr(item._id)}" class="${item.isActive === false ? 'inactive-row' : ''}">
            ${rowHtml(item)}
        </tr>
    `).join('');
};

const applyFilters = () => {
    const activeValue = filterActivePunto?.value || 'all';
    const nomeValue = normalizeText(filterNomePunto?.value);
    const indirizzoValue = normalizeText(filterIndirizzoPunto?.value);
    const categorieValue = normalizeText(filterCategoriePunto?.value);

    const filteredItems = allPuntiVendita.filter((item) => {
        const matchesActive = activeValue === 'all'
            || (activeValue === 'true' && item.isActive !== false)
            || (activeValue === 'false' && item.isActive === false);
        const matchesName = !nomeValue || normalizeText(item.nomePunto).includes(nomeValue);
        const matchesIndirizzo = !indirizzoValue || getIndirizzoSearchText(item).includes(indirizzoValue);
        const matchesCategorie = !categorieValue || getCategorieSearchText(item).includes(categorieValue);
        return matchesActive && matchesName && matchesIndirizzo && matchesCategorie;
    });

    renderTable(filteredItems);

    if (allPuntiVendita.length === 0) {
        renderStatus('Non hai ancora salvato punti vendita.', '#b45309');
        return;
    }

    if (filteredItems.length === 0) {
        renderStatus('Nessun punto vendita trovato con i filtri selezionati.', '#b45309');
        return;
    }

    renderStatus(`${filteredItems.length} punto/i vendita visibili.`, 'green');
};

const fetchPuntiVendita = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        renderStatus('Sessione non valida. Effettua nuovamente il login.', 'red');
        renderEmptyState('Accesso richiesto.');
        return;
    }

    try {
        const response = await fetch('/api/punti-vendita/mine', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            renderStatus(data.message || data.error || 'Errore nel caricamento dei punti vendita.', 'red');
            renderEmptyState('Errore nel caricamento.');
            return;
        }

        allPuntiVendita = Array.isArray(data.items) ? data.items : [];
        applyFilters();
    } catch (error) {
        console.error('Errore durante il recupero dei punti vendita:', error);
        renderStatus('Errore di connessione al server.', 'red');
        renderEmptyState('Errore di connessione.');
    }
};

const restoreRow = (tr, item) => {
    tr.classList.remove('editing');
    tr.innerHTML = rowHtml(item);
};

const openInlineEdit = (tr, item) => {
    if (!tr || !item || tr.classList.contains('editing')) {
        return;
    }

    tr.classList.add('editing');
    tr.innerHTML = `
        <td>
            <label class="punto-vendita-active-toggle">
                <input type="checkbox" class="toggle-punto-vendita-active" data-field="isActive" ${isActiveSelected(item) ? 'checked' : ''}>
                <span>${escapeHtml(getActiveLabel(item))}</span>
            </label>
        </td>
        <td><input class="inline-input" data-field="nomePunto" value="${escapeAttr(item.nomePunto)}"></td>
        <td><input class="inline-input" data-field="indirizzo" value="${escapeAttr(item.indirizzo || item.formattedAddress)}"></td>
        <td><input class="inline-input" data-field="phoneNumber" value="${escapeAttr(item.phoneNumber)}"></td>
        <td><input class="inline-input" data-field="emailPunto" value="${escapeAttr(item.emailPunto)}"></td>
        <td><input class="inline-input" data-field="website" value="${escapeAttr(item.website)}"></td>
        <td><input class="inline-input" data-field="categories" value="${escapeAttr(Array.isArray(item.categories) ? item.categories.join(', ') : '')}"></td>
        <td>
            <button class="save-animal-btn" data-id="${escapeAttr(item._id)}" title="Salva" aria-label="Salva">✔</button>
            <button class="cancel-edit-btn" data-id="${escapeAttr(item._id)}" title="Annulla" aria-label="Annulla">✕</button>
        </td>`;
};

const saveInlineEdit = async (tr, puntoVenditaId) => {
    const token = localStorage.getItem('token');

    if (!tr || !puntoVenditaId || !token) {
        renderStatus('Dati mancanti per aggiornare il punto vendita.', 'red');
        return;
    }

    const payload = {};
    tr.querySelectorAll('[data-field]').forEach((element) => {
        const field = element.dataset.field;
        const rawValue = element.type === 'checkbox' ? element.checked : element.value.trim();

        if (field === 'categories') {
            payload.categories = rawValue
                ? [...new Set(rawValue.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))]
                : [];
            return;
        }

        if (field === 'isActive') {
            payload.isActive = rawValue;
            return;
        }

        payload[field] = rawValue;
    });

    if (!payload.nomePunto) {
        renderStatus('Il nome del punto vendita e obbligatorio.', 'red');
        return;
    }

    if (!payload.indirizzo) {
        renderStatus('L\'indirizzo e obbligatorio.', 'red');
        return;
    }

    try {
        const response = await fetch(`/api/punti-vendita/${puntoVenditaId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            renderStatus(data.message || data.error || 'Errore durante la modifica del punto vendita.', 'red');
            return;
        }

        renderStatus(data.message || 'Punto vendita modificato con successo.', 'green');
        await fetchPuntiVendita();
    } catch (error) {
        console.error('Errore durante la modifica del punto vendita:', error);
        renderStatus('Errore di connessione durante la modifica.', 'red');
    }
};

const deletePuntoVenditaById = async (puntoVenditaId) => {
    const token = localStorage.getItem('token');

    if (!puntoVenditaId || !token) {
        renderStatus('Impossibile eliminare il punto vendita.', 'red');
        return;
    }

    const confirmed = window.confirm('Confermi l\'eliminazione di questo punto vendita?');
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/punti-vendita/${puntoVenditaId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            renderStatus(data.message || data.error || 'Errore durante l\'eliminazione del punto vendita.', 'red');
            return;
        }

        allPuntiVendita = allPuntiVendita.filter((item) => String(item._id) !== String(puntoVenditaId));
        applyFilters();
        renderStatus(data.message || 'Punto vendita eliminato con successo.', 'green');
    } catch (error) {
        console.error('Errore durante l\'eliminazione del punto vendita:', error);
        renderStatus('Errore di connessione al server.', 'red');
    }
};

if (filterActivePunto) {
    filterActivePunto.addEventListener('change', applyFilters);
}

if (filterNomePunto) {
    filterNomePunto.addEventListener('input', applyFilters);
}

if (filterIndirizzoPunto) {
    filterIndirizzoPunto.addEventListener('input', applyFilters);
}

if (filterCategoriePunto) {
    filterCategoriePunto.addEventListener('input', applyFilters);
}

if (puntiVenditaTableBody) {
    puntiVenditaTableBody.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-animal-btn');
        if (deleteButton) {
            deletePuntoVenditaById(deleteButton.dataset.id);
            return;
        }

        const editButton = event.target.closest('.edit-animal-btn');
        if (editButton) {
            const tr = editButton.closest('tr');
            const item = rowDataMap.get(editButton.dataset.id);
            if (tr && item) {
                openInlineEdit(tr, item);
            }
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
            const item = rowDataMap.get(cancelButton.dataset.id);
            if (tr && item) {
                restoreRow(tr, item);
            }
        }
    });
}

fetchPuntiVendita();
