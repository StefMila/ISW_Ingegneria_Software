const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

const statusMsg = document.getElementById('statusMsg');
const tableBody = document.getElementById('mungitureTableBody');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');

let animaliMap = new Map();

const getToken = () => (localStorage.getItem('token') || '').trim();
const getAziendaId = () => (localStorage.getItem(SELECTED_AZIENDA_ID_KEY) || '').trim();

const renderStatus = (text, color = '#1f2937') => {
  if (!statusMsg) {
    return;
  }
  statusMsg.textContent = text;
  statusMsg.style.color = color;
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatDate = (value) => {
  if (!value) {
    return '—';
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

const setAziendaBadge = () => {
  if (!currentAziendaBadge) {
    return;
  }

  const aziendaName = localStorage.getItem(SELECTED_AZIENDA_NAME_KEY) || getAziendaId() || 'non selezionata';
  currentAziendaBadge.textContent = `Azienda attiva: ${aziendaName} ▾`;
};

const renderEmptyState = (message) => {
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = `
    <tr>
      <td colspan="7">${escapeHtml(message)}</td>
    </tr>
  `;
};

const loadAnimaliMap = async () => {
  const aziendaId = getAziendaId();
  const token = getToken();

  const response = await fetch(`/api/animali/aziende/${aziendaId}/animali?limit=200`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    animaliMap = new Map();
    return;
  }

  const payload = await response.json().catch(() => ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const entries = items
    .filter((item) => item && item._id)
    .map((item) => {
      const parts = [String(item.name || '').trim(), String(item.matricola || '').trim()].filter(Boolean);
      return [String(item._id), parts.join(' - ') || String(item._id)];
    });

  animaliMap = new Map(entries);
};

const getStatoLabel = (status) => {
  if (status === 'completata') return 'Completata';
  if (status === 'annullata') return 'Annullata';
  return 'In corso';
};

const buildRow = (item) => {
  const id = String(item?._id || '');
  const animaleId = String(item?.animaleId || '');
  const note = String(item?.notes || '').trim();
  const status = String(item?.status || 'in_corso').trim();
  const animaleLabel = animaliMap.get(animaleId) || animaleId || '—';
  const quantityLabel = typeof item?.quantity === 'number' ? `${item.quantity} L` : '—';

  return `
    <tr data-id="${escapeHtml(id)}">
      <td>${escapeHtml(formatDate(item?.startedAt))}</td>
      <td>${escapeHtml(animaleLabel)}</td>
      <td>${escapeHtml(item?.semiLavoratoId || '—')}</td>
      <td>${escapeHtml(quantityLabel)}</td>
      <td>${escapeHtml(getStatoLabel(status))}</td>
      <td>${escapeHtml(note || '—')}</td>
      <td>
        <button class="delete-mungitura-btn" data-action="delete">Elimina</button>
      </td>
    </tr>
  `;
};

const fetchMungiture = async () => {
  const aziendaId = getAziendaId();
  const token = getToken();

  if (!tableBody) {
    return;
  }

  if (!aziendaId) {
    renderStatus('Seleziona prima un\'azienda dalla home.', '#b45309');
    renderEmptyState('Nessuna azienda selezionata.');
    return;
  }

  if (!token) {
    renderStatus('Sessione non valida. Effettua di nuovo il login.', 'red');
    renderEmptyState('Accesso richiesto.');
    return;
  }

  try {
    await loadAnimaliMap();

    const params = new URLSearchParams({ aziendaId });
    const response = await fetch(`/api/mungiture?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json().catch(() => ([]));
    if (!response.ok) {
      renderStatus(data.message || 'Errore durante il caricamento delle mungiture.', 'red');
      renderEmptyState('Errore nel caricamento.');
      return;
    }

    const items = Array.isArray(data) ? data : [];
    if (items.length === 0) {
      renderStatus('Nessuna mungitura registrata.', '#b45309');
      renderEmptyState('Nessuna mungitura disponibile.');
      return;
    }

    tableBody.innerHTML = items.map(buildRow).join('');
    renderStatus(`${items.length} mungitura/e caricate.`, 'green');
  } catch (error) {
    console.error('Errore durante il recupero mungiture:', error);
    renderStatus('Errore di connessione al server.', 'red');
    renderEmptyState('Errore di connessione.');
  }
};

const deleteMungitura = async (id) => {
  const token = getToken();
  if (!id || !token) {
    renderStatus('Dati mancanti per eliminare la mungitura.', 'red');
    return;
  }

  const confirmed = window.confirm('Sei sicuro di voler eliminare questa mungitura?');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/mungiture/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      renderStatus(data.message || 'Errore durante l\'eliminazione della mungitura.', 'red');
      return;
    }

    renderStatus(data.message || 'Mungitura eliminata con successo.', 'green');
    await fetchMungiture();
  } catch (error) {
    console.error('Errore durante l\'eliminazione mungitura:', error);
    renderStatus('Errore di connessione durante l\'eliminazione.', 'red');
  }
};

if (tableBody) {
  tableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) {
      return;
    }

    const row = button.closest('tr[data-id]');
    const mungituraId = row?.getAttribute('data-id') || '';
    await deleteMungitura(mungituraId);
  });
}

setAziendaBadge();
fetchMungiture();
