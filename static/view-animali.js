const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';
// Variabili di stato
let currentPage = 1;
let currentFilters = {};
let debounceTimer = null;
let currentSort = { by: 'createdAt', order: 'desc' };

//  Elementi DOM 
const statusMsg = document.getElementById('statusMsg');
const animaliBody = document.getElementById('animaliBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');

//  Utility per formattazione e rendering
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('it-IT');
};
// Capitalizza la prima lettera di una stringa e rende il resto minuscolo, restituendo '—' se la stringa è vuota o non definita
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
// Funzione per renderizzare messaggi di stato all'utente 
const renderStatus = (text, color = '#1f2937') => {
  if (!statusMsg) return;
  statusMsg.style.color = color;
  statusMsg.textContent = text;
};

const deleteAnimaleById = async (animaleId) => {
  const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
  const token = localStorage.getItem('token');

  if (!animaleId) {
    renderStatus('ID animale non valido.', 'red');
    return;
  }

  if (!aziendaId || !token) {
    renderStatus('Sessione non valida. Effettua nuovamente il login.', 'red');
    return;
  }

  const confirmed = window.confirm('Confermi l\'eliminazione di questo animale?');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/azienda/${aziendaId}/animali/${animaleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      renderStatus(data.message || 'Errore durante l\'eliminazione dell\'animale.', 'red');
      return;
    }

    renderStatus(data.message || 'Animale eliminato con successo.', 'green');

    if (animaliBody.children.length === 1 && currentPage > 1) {
      currentPage -= 1;
    }

    await fetchAnimali();
  } catch (err) {
    console.error('Errore durante l\'eliminazione dell\'animale:', err);
    renderStatus('Errore di connessione durante l\'eliminazione.', 'red');
  }
};

//  Fetch degli animali con filtri e paginazione
const fetchAnimali = async () => {
  const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
  const token = localStorage.getItem('token');
// Se non abbiamo id azienda o token, non possiamo caricare gli animali, mostriamo un messaggio e usciamo
  if (!aziendaId) {
    renderStatus('Nessuna azienda selezionata. Torna alla home e seleziona un\'azienda.', '#b45309');
    animaliBody.innerHTML = '<tr class="empty-row"><td colspan="9">Seleziona prima un\'azienda dalla home.</td></tr>';
    return;
  }

  // Aggiorna il badge azienda (testo senza sovrascrivere la freccia gestita dal switcher)
  const aziendaName = localStorage.getItem(SELECTED_AZIENDA_NAME_KEY) || aziendaId;
  if (currentAziendaBadge) currentAziendaBadge.textContent = `Azienda attiva: ${aziendaName} ▾`;

  // Costruisce i query params dai filtri attivi + paginazione
  const params = new URLSearchParams({ page: currentPage, limit: 20 });
  Object.entries(currentFilters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set('sortBy', currentSort.by);
  params.set('sortOrder', currentSort.order);

  try {
    const response = await fetch(`/api/azienda/${aziendaId}/animali?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
// Gestione della risposta del server
    const data = await response.json();

    if (!response.ok) {
      renderStatus(data.message || 'Errore nel caricamento degli animali', 'red');
      animaliBody.innerHTML = '<tr class="empty-row"><td colspan="9">Errore nel caricamento.</td></tr>';
      return;
    }

    const { items = [], pagination = {} } = data;
    renderTable(items);
    renderPagination(pagination);

    if (items.length === 0) {
      renderStatus('Nessun animale trovato con i filtri selezionati.', '#b45309');
    } else {
      renderStatus(`${pagination.totalItems} animale/i trovati.`, 'green');
    }
  } catch (err) {
    console.error('Errore durante il recupero degli animali:', err);
    renderStatus('Errore di connessione al server.', 'red');
    animaliBody.innerHTML = '<tr class="empty-row"><td colspan="9">Errore di connessione.</td></tr>';
  }
};

// Mappa id→dati animale usata per l'editing inline
const rowDataMap = new Map();
// Sanitizza un valore per uso come attributo HTML
const escAttr = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

//  Render della tabella degli animali
const renderTable = (items) => {
  rowDataMap.clear();
  if (items.length === 0) {
    animaliBody.innerHTML = '<tr class="empty-row"><td colspan="9">Nessun animale trovato.</td></tr>';
    return;
  }

  items.forEach(a => rowDataMap.set(String(a._id), a));

  animaliBody.innerHTML = items.map((a) => `
    <tr data-id="${a._id || ''}">
      <td>${a.matricola || '—'}</td>
      <td>${a.name || '—'}</td>
      <td>${capitalize(a.species)}</td>
      <td>${formatDate(a.dataNascita)}</td>
      <td>${capitalize(a.sesso)}</td>
      <td>${a.razza || '—'}</td>
      <td>${a.figliaDi || '—'}</td>
      <td>${a.note || '—'}</td>
      <td>
        <button class="edit-animal-btn" data-id="${a._id || ''}" title="Modifica animale" aria-label="Modifica animale">
          <span class="edit-animal-icon" aria-hidden="true">✎</span>
        </button>
        <button class="delete-animal-btn" data-id="${a._id || ''}" title="Elimina animale" aria-label="Elimina animale">
          <span class="delete-animal-icon" aria-hidden="true"></span>
        </button>
      </td>
    </tr>
  `).join('');
};

// Aggiorna le icone di ordinamento nell'intestazione
const renderSortIcons = () => {
  document.querySelectorAll('.header-labels th[data-sort]').forEach((th) => {
    const icon = th.querySelector('.sort-icon');
    if (!icon) return;
    if (th.dataset.sort === currentSort.by) {
      icon.textContent = currentSort.order === 'asc' ? ' ▲' : ' ▼';
      th.classList.add('sorted');
    } else {
      icon.textContent = '';
      th.classList.remove('sorted');
    }
  });
};
// Renderizza la sezione di paginazione con informazioni sulla pagina corrente e abilita/disabilita i bottoni
const renderPagination = ({ page = 1, totalPages = 1 }) => {
  pageInfo.textContent = `Pagina ${page} di ${totalPages}`;
  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages;
};

//  Gestione filtri e paginazione
const onFilterChange = (e) => {
  const key = e.target.dataset.filter;
  if (!key) return;
  currentFilters[key] = e.target.value;
  currentPage = 1;

  clearTimeout(debounceTimer);
  // I select rispondono subito, i campi testo hanno un debounce di 350ms
  const delay = e.target.tagName === 'SELECT' || e.target.type === 'date' ? 0 : 350;
  debounceTimer = setTimeout(fetchAnimali, delay);
};

//  Attacca i listener a tutti i campi filtro
document.querySelectorAll('[data-filter]').forEach((el) => {
  el.addEventListener('input', onFilterChange);
  el.addEventListener('change', onFilterChange);
});
// Listener unificato per i pulsanti della tabella (modifica, elimina, salva, annulla)
animaliBody.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('.delete-animal-btn');
  if (deleteButton) { deleteAnimaleById(deleteButton.dataset.id); return; }

  const editButton = event.target.closest('.edit-animal-btn');
  if (editButton) {
    const tr = editButton.closest('tr');
    const animale = rowDataMap.get(editButton.dataset.id);
    if (animale) openInlineEdit(tr, animale);
    return;
  }

  const saveButton = event.target.closest('.save-animal-btn');
  if (saveButton) { await saveInlineEdit(saveButton.closest('tr'), saveButton.dataset.id); return; }

  const cancelButton = event.target.closest('.cancel-edit-btn');
  if (cancelButton) {
    const animale = rowDataMap.get(cancelButton.dataset.id);
    if (animale) restoreRow(cancelButton.closest('tr'), animale);
    return;
  }
});

//  Funzioni per gestione inline edit e delete degli animali (la delete è confermata da un prompt, l'edit apre dei campi modificabili direttamente nella riga, con salvataggio o annullamento)

const rowHtml = (a) => `
  <td>${a.matricola || '—'}</td>
  <td>${a.name || '—'}</td>
  <td>${capitalize(a.species)}</td>
  <td>${formatDate(a.dataNascita)}</td>
  <td>${capitalize(a.sesso)}</td>
  <td>${a.razza || '—'}</td>
  <td>${a.figliaDi || '—'}</td>
  <td>${a.note || '—'}</td>
  <td>
    <button class="edit-animal-btn" data-id="${a._id || ''}" title="Modifica animale" aria-label="Modifica animale">
      <span class="edit-animal-icon" aria-hidden="true">✎</span>
    </button>
    <button class="delete-animal-btn" data-id="${a._id || ''}" title="Elimina animale" aria-label="Elimina animale">
      <span class="delete-animal-icon" aria-hidden="true"></span>
    </button>
  </td>`;
// Apre la modalità di modifica inline per una riga della tabella, sostituendo i campi con input e select precompilati con i dati dell'animale
const openInlineEdit = (tr, a) => {
  if (tr.classList.contains('editing')) return;
  tr.classList.add('editing');
  tr.innerHTML = `
    <td>${a.matricola || '—'}</td>
    <td><input class="inline-input" data-field="name" value="${escAttr(a.name)}"></td>
    <td>
      <select class="inline-input" data-field="species">
        <option value="">—</option>
        <option value="mucca" ${a.species === 'mucca' ? 'selected' : ''}>Mucca</option>
        <option value="pecora" ${a.species === 'pecora' ? 'selected' : ''}>Pecora</option>
        <option value="capra" ${a.species === 'capra' ? 'selected' : ''}>Capra</option>
        <option value="pollo" ${a.species === 'pollo' ? 'selected' : ''}>Pollo</option>
        <option value="coniglio" ${a.species === 'coniglio' ? 'selected' : ''}>Coniglio</option>
      </select>
    </td>
    <td><input class="inline-input" type="date" data-field="dataNascita" value="${a.dataNascita ? a.dataNascita.split('T')[0] : ''}"></td>
    <td>
      <select class="inline-input" data-field="sesso">
        <option value="">—</option>
        <option value="maschio" ${a.sesso === 'maschio' ? 'selected' : ''}>Maschio</option>
        <option value="femmina" ${a.sesso === 'femmina' ? 'selected' : ''}>Femmina</option>
      </select>
    </td>
    <td><input class="inline-input" data-field="razza" value="${escAttr(a.razza)}"></td>
    <td><input class="inline-input" data-field="figliaDi" value="${escAttr(a.figliaDi)}"></td>
    <td><input class="inline-input" data-field="note" value="${escAttr(a.note)}"></td>
    <td>
      <button class="save-animal-btn" data-id="${a._id}" title="Salva" aria-label="Salva">✔</button>
      <button class="cancel-edit-btn" data-id="${a._id}" title="Annulla" aria-label="Annulla">✕</button>
    </td>`;
};
// Ripristina la riga alla visualizzazione normale con i dati originali, rimuovendo la modalità di modifica
const restoreRow = (tr, a) => {
  tr.classList.remove('editing');
  tr.innerHTML = rowHtml(a);
};
// Salva le modifiche di un animale effettuate in modalità inline edit, inviando una richiesta PATCH al server e aggiornando la tabella al successo
const saveInlineEdit = async (tr, animaleId) => {
  const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
  const token = localStorage.getItem('token');
// Validazione base: serve l'id dell'animale, l'id dell'azienda e il token per procedere con la richiesta
  if (!animaleId || !aziendaId || !token) {
    renderStatus('Dati mancanti per aggiornare l\'animale.', 'red');
    return;
  }
// Costruisce l'oggetto con i campi modificati da inviare al server, prendendo i valori dagli input della riga
  const formData = {};
  tr.querySelectorAll('[data-field]').forEach(el => {
    const val = el.value.trim();
    if (val) formData[el.dataset.field] = val;
  });
// Invia la richiesta di aggiornamento al server e gestisce la risposta, mostrando messaggi di successo o errore e aggiornando la tabella
  try {
    const response = await fetch(`/api/azienda/${aziendaId}/animali/${animaleId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      renderStatus(data.message || 'Errore durante la modifica dell\'animale.', 'red');
      return;
    }
    renderStatus('Animale modificato con successo!', 'green');
    await fetchAnimali();
  } catch (err) {
    console.error('Errore durante la modifica:', err);
    renderStatus('Errore di connessione durante la modifica.', 'red');
  }
};


// Gestione click sulle intestazioni ordinabili
document.querySelectorAll('.header-labels th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (currentSort.by === field) {
      currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.by = field;
      currentSort.order = 'asc';
    }
    currentPage = 1;
    renderSortIcons();
    fetchAnimali();
  });
});
// Gestione click sui bottoni di paginazione
prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; fetchAnimali(); }
});
// Gestione click sui bottoni di paginazione
nextPageBtn.addEventListener('click', () => {
  currentPage++;
  fetchAnimali();
});


// Quando l'utente cambia azienda dal dropdown condiviso, resetta e ricarica
window.addEventListener('aziendaChanged', () => {
  currentPage = 1;
  currentFilters = {};
  document.querySelectorAll('[data-filter]').forEach(el => { el.value = ''; });
  fetchAnimali();
});

//  Avvio iniziale
renderSortIcons();
fetchAnimali();
