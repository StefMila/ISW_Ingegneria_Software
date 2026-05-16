const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

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

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

const renderStatus = (text, color = '#1f2937') => {
  if (!statusMsg) return;
  statusMsg.style.color = color;
  statusMsg.textContent = text;
};

//  Fetch degli animali con filtri e paginazione
const fetchAnimali = async () => {
  const aziendaId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);
  const token = localStorage.getItem('token');

  if (!aziendaId) {
    renderStatus('Nessuna azienda selezionata. Torna alla home e seleziona un\'azienda.', '#b45309');
    animaliBody.innerHTML = '<tr class="empty-row"><td colspan="8">Seleziona prima un\'azienda dalla home.</td></tr>';
    return;
  }

  // Aggiorna il badge azienda
  const aziendaName = localStorage.getItem(SELECTED_AZIENDA_NAME_KEY) || aziendaId;
  if (currentAziendaBadge) currentAziendaBadge.textContent = `Azienda attiva: ${aziendaName}`;

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

    const data = await response.json();

    if (!response.ok) {
      renderStatus(data.message || 'Errore nel caricamento degli animali', 'red');
      animaliBody.innerHTML = '<tr class="empty-row"><td colspan="8">Errore nel caricamento.</td></tr>';
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
    animaliBody.innerHTML = '<tr class="empty-row"><td colspan="8">Errore di connessione.</td></tr>';
  }
};

//  Render della tabella degli animali
const renderTable = (items) => {
  if (items.length === 0) {
    animaliBody.innerHTML = '<tr class="empty-row"><td colspan="8">Nessun animale trovato.</td></tr>';
    return;
  }

  animaliBody.innerHTML = items.map((a) => `
    <tr>
      <td>${a.matricola || '—'}</td>
      <td>${a.name || '—'}</td>
      <td>${capitalize(a.species)}</td>
      <td>${formatDate(a.dataNascita)}</td>
      <td>${capitalize(a.sesso)}</td>
      <td>${a.razza || '—'}</td>
      <td>${a.figliaDi || '—'}</td>
      <td>${a.note || '—'}</td>
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

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; fetchAnimali(); }
});

nextPageBtn.addEventListener('click', () => {
  currentPage++;
  fetchAnimali();
});

//  Avvio iniziale
renderSortIcons();
fetchAnimali();
