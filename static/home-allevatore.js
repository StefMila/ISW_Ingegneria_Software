const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';
// DOM Elements
const statusEl = document.getElementById('aziendaSelectionStatus');
const controlsEl = document.getElementById('aziendaSelectionControls');
const selectorEl = document.getElementById('aziendaSelector');
const saveButtonEl = document.getElementById('saveAziendaSelectionButton');
const currentAziendaBadgeEl = document.getElementById('currentAziendaBadge');
let canSwitchAzienda = false;
// Funzione per salvare l'azienda selezionata nella localStorage
const setSelectedAzienda = (azienda) => {
  localStorage.setItem(SELECTED_AZIENDA_ID_KEY, azienda._id);
  localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, azienda.companyName || 'Azienda senza nome');
};
// Funzione per renderizzare lo stato attuale della selezione dell'azienda
const renderStatus = (text, color = '#1f2937') => {
  if (!statusEl) return;
  statusEl.style.color = color;
  statusEl.textContent = text;
};

const renderCurrentAziendaBadge = (name) => {
  if (!currentAziendaBadgeEl) return;
  currentAziendaBadgeEl.textContent = `Azienda attiva: ${name || 'non selezionata'}`;
};
// Funzione per caricare le aziende di proprietà dell'utente e gestire la logica di selezione
const loadOwnedAziende = async () => {
  const token = localStorage.getItem('token');
// Se non abbiamo un token, non possiamo caricare le aziende, mostriamo un messaggio e usciamo
  if (!token) {
    renderCurrentAziendaBadge('non selezionata');
    renderStatus('Token mancante. Effettua nuovamente il login.', 'red');
    return;
  }
// Carichiamo le aziende di proprietà dell'utente autenticato tramite l'API
  try {
    const response = await fetch('/api/azienda/mine', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
// Gestione della risposta del server per il caricamento delle aziende dell'utente
    if (!response.ok) {
      renderStatus(data.message || 'Errore nel caricamento delle aziende', 'red');
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
      localStorage.removeItem(SELECTED_AZIENDA_ID_KEY);
      localStorage.removeItem(SELECTED_AZIENDA_NAME_KEY);
      renderCurrentAziendaBadge('non selezionata');
      renderStatus('Non hai ancora aziende registrate. Aggiungi un\'azienda per iniziare.', '#b45309');
      return;
    }

    if (items.length === 1) {
      setSelectedAzienda(items[0]);
      renderCurrentAziendaBadge(items[0].companyName);
      if (controlsEl) controlsEl.hidden = true;
      canSwitchAzienda = false;
      renderStatus(`Azienda attiva impostata automaticamente: ${items[0].companyName}`, 'green');
      return;
    }

    if (!selectorEl || !controlsEl) {
      renderStatus('Impossibile mostrare il selettore aziende.', 'red');
      return;
    }

    controlsEl.hidden = true;
    canSwitchAzienda = true;
    selectorEl.innerHTML = '';

    const currentSelectedId = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);

    items.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = item._id;
      option.textContent = `${item.companyName} (${item.vatNumber || 'P.IVA non disponibile'})`;
      option.selected = currentSelectedId ? item._id === currentSelectedId : index === 0;
      selectorEl.appendChild(option);
    });

    const selectedForBadge = items.find((item) => item._id === selectorEl.value) || null;
    renderCurrentAziendaBadge(selectedForBadge ? selectedForBadge.companyName : 'non selezionata');

    renderStatus('Hai più aziende: clicca sul badge "Azienda attiva" in alto per cambiarla.', '#1f2937');

    if (saveButtonEl) {
      saveButtonEl.onclick = () => {
        const selectedId = selectorEl.value;
        const selected = items.find((item) => item._id === selectedId);
        if (!selected) {
          renderStatus('Seleziona un\'azienda valida.', 'red');
          return;
        }
        setSelectedAzienda(selected);
        renderCurrentAziendaBadge(selected.companyName);
        renderStatus(`Azienda attiva selezionata: ${selected.companyName}`, 'green');
      };
    }
  } catch (error) {
    console.error('Errore durante il caricamento delle aziende:', error);
    renderStatus('Errore di connessione al server', 'red');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadOwnedAziende);
} else {
  loadOwnedAziende();
}