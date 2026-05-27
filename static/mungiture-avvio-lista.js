(() => {
  const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
  const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

  const state = {
    tableBody: null,
    statusMsg: null,
    currentAziendaBadge: null,
    animaliMap: new Map()
  };

  const getToken = () => (localStorage.getItem('token') || '').trim();
  const getAziendaId = () => (localStorage.getItem(SELECTED_AZIENDA_ID_KEY) || '').trim();

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const renderStatus = (text, color = '#1f2937') => {
    if (!state.statusMsg) {
      return;
    }
    state.statusMsg.textContent = text;
    state.statusMsg.style.color = color;
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  };

  const setAziendaBadge = () => {
    if (!state.currentAziendaBadge) {
      return;
    }
    const aziendaName = localStorage.getItem(SELECTED_AZIENDA_NAME_KEY) || getAziendaId() || 'non selezionata';
    state.currentAziendaBadge.textContent = `Azienda attiva: ${aziendaName} ▾`;
  };

  const renderEmptyState = (message) => {
    if (!state.tableBody) {
      return;
    }
    state.tableBody.innerHTML = `
      <tr>
        <td colspan="7">${escapeHtml(message)}</td>
      </tr>
    `;
  };

  const getStatoLabel = (status) => {
    if (status === 'completata') return 'Completata';
    if (status === 'annullata') return 'Annullata';
    return 'In corso';
  };

  const loadAnimaliMap = async () => {
    const aziendaId = getAziendaId();
    const token = getToken();

    const response = await fetch(`/api/animali/aziende/${aziendaId}/animali?limit=200`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      state.animaliMap = new Map();
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

    state.animaliMap = new Map(entries);
  };

  const buildRow = (item) => {
    const id = String(item?._id || '');
    const animaleId = String(item?.animaleId || '');
    const note = String(item?.notes || '').trim();
    const status = String(item?.status || 'in_corso').trim();
    const animaleLabel = state.animaliMap.get(animaleId) || animaleId || '—';
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
          ${status === 'in_corso' ? '<button class="terminate-scale-btn" data-action="close-iot">Termina con bilancia</button> <button class="terminate-manual-btn" data-action="close-manual">Termina manuale</button>' : '<span>—</span>'}
        </td>
      </tr>
    `;
  };

  const fetchMungiture = async () => {
    const aziendaId = getAziendaId();
    const token = getToken();

    if (!state.tableBody) {
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
        headers: { Authorization: `Bearer ${token}` }
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

      state.tableBody.innerHTML = items.map(buildRow).join('');
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
        headers: { Authorization: `Bearer ${token}` }
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

  const patchCloseMungitura = async (id, quantity, notes, source) => {
    const token = getToken();
    if (!id || !token) {
      renderStatus('Dati mancanti per chiudere la mungitura.', 'red');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      renderStatus('Valore litri non valido.', 'red');
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
      quantity: Number(parsedQuantity.toFixed(2)),
      unit: 'litri'
    };

    if (composedNotes) {
      payload.notes = composedNotes;
    }

    try {
      const response = await fetch(`/api/mungiture/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        renderStatus(data.message || 'Errore durante la chiusura della mungitura.', 'red');
        return;
      }

      renderStatus(data.message || 'Mungitura aggiornata con successo.', 'green');
      await fetchMungiture();
    } catch (error) {
      console.error('Errore durante la chiusura mungitura:', error);
      renderStatus('Errore di connessione durante l\'aggiornamento.', 'red');
    }
  };

  const closeMungituraManual = async (id) => {
    const quantityInput = window.prompt('Inserisci i litri rilevati manualmente:', '0');
    if (quantityInput === null) {
      return;
    }

    const notes = window.prompt('Note di chiusura (facoltative):', '');
    await patchCloseMungitura(id, quantityInput, notes, 'manuale');
  };

  const closeMungituraIot = async (id) => {
    const token = getToken();
    if (!id || !token) {
      renderStatus('Dati mancanti per leggere dalla bilancia IoT.', 'red');
      return;
    }

    try {
      const iotResponse = await fetch(`/api/mungiture/${id}/iot-litri`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const iotData = await iotResponse.json().catch(() => ({}));
      if (!iotResponse.ok) {
        renderStatus(iotData.message || 'Errore durante la lettura dalla bilancia IoT.', 'red');
        return;
      }

      const quantity = iotData?.quantity;
      const notes = window.prompt('Note di chiusura (facoltative):', '');
      await patchCloseMungitura(id, quantity, notes, 'iot');
    } catch (error) {
      console.error('Errore durante lettura IoT:', error);
      renderStatus('Errore di connessione durante lettura IoT.', 'red');
    }
  };

  window.initMungitureAvvioLista = ({ tableBody, statusMsg, currentAziendaBadge }) => {
    state.tableBody = tableBody;
    state.statusMsg = statusMsg;
    state.currentAziendaBadge = currentAziendaBadge;
    setAziendaBadge();
    fetchMungiture();
  };

  window.handleMungitureAvvioListClick = async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const row = button.closest('tr[data-id]');
    const mungituraId = row?.getAttribute('data-id') || '';
    const action = button.getAttribute('data-action');

    if (action === 'close-manual') {
      await closeMungituraManual(mungituraId);
      return;
    }

    if (action === 'close-iot') {
      await closeMungituraIot(mungituraId);
    }
  };
})();
