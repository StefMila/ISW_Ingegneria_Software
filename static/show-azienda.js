import { stringify } from "yamljs";

const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

let isEditing = false; // Ti serve a sapere se mostrare i testi o gli input di modifica
let aziendaAttuale = null; // Salva i dati dell'azienda per ripristinarli se l'utente clicca "Annulla"

//  Elementi DOM 
const statusMsg = document.getElementById('statusMsg');
const editToggleBtn = document.getElementById('editToggleBtn');
const actionButtonsDiv = document.getElementById('aziendaActionButtons');

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

const campiAzienda = ['companyName', 'vatNumber', 'emailAzienda', 'address'];

const getAziendaIdFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
};

const fetchDettaglioAzienda = async() => {
  const aziendaId = getAziendaIdFromUrl();
  const token = localStorage.getItem('token');

  // Se non c'è l'id nell'url, reindirizzamento alla lista
  if(!aziendaId) {
    renderStatus('Nessun ID azienda specificato nell\'URL. Seleziona un\'azienda dal menu.', '#b45309');
    setTimeout(() => {
        window.location.href = '/gestione-aziende.html';
    }, 3000);
    return;
  }

  try {
    const response = await fetch(`/api/aziende(${aziendaId}`, {
      headers: {Authorization: `Bearer ${token}`}
    });
    const data = await response.json();

    // Se azienda con id non esiset, link per tornare alla lista aziende
    if(!response.ok) {
      renderStatus(data.message || 'Errore nel recupero dell\'azienda.', 'red');
      actionButtonsDiv.innerHTML = `<a href="/gestione-aziende.html" class="btn-primary" style="text-decoration: none;">Torna alla lista delle aziende</a>`;
      return;
    }

    if(data.itemInfo) {
      aziendaAttuale = data.itemInfo;
      mostraDatiAzienda(aziendaAttuale);
    }
  } catch(error) {
    console.error('Errore fetch azienda:', error);
    renderStatus('Errore di connessione al server', 'red')
  }
};

// Popola il DOM con i dati ricevutii dal backend
const mostraDatiAzienda = (azienda) => {
  campiAzienda.forEach(campo => {
    document.getElementById(`view-${campo}`).textContent = azienda[campo] || '-';
    document.getElementById(`edit-${campo}`).value = azienda[campo] || '';
  });

  if(azienda.createdAt) {
    const d = new Date(azienda.createdAt);
    document.getElementById('view-createdAt').textContent = isNaN(d) ? '-' : d.toLocaleDateString('it-IT');
  }
};

// Modalità edit
const toggleEditMode = (editing) => {
  isEditing = editing;

  campiAzienda.forEach(campo => {
    const textSpan = document.getElementById(`view-${campo}`);
    const inputField = document.getElementById(`edit-${campo}`);

    if(isEditing) {
      textSpan.classList.add('hidden');
      inputField.classList.remove('hidden');
    } else {
      textSpan.classList.remove('hidden');
      inputField.classList.add('hidden');
    }
  });

  if(isEditing) {
    actionButtonsDiv.innerHTML = `
      <button id="saveBtn" class="btn-success" style="color: green; margin-right: 10px; font-weight: bold;"> Salva</button>
      <button id="cancelBtn" class="btn-secondary" style="color: red;"> Annulla</button>
      `;

      document.getElementById('saveBtn').addEventListener('click', savaModificheAzienda);
      document.getElementById('cancelBtn').addEventListener('click', () => {
        mostraDatiAzienda(aziendaAttuale);
        toggleEditMode(false);
      });
  } else {
    actionButtonsDiv.innerHTML = `<button id="editToggleBtn" class="btn-primary"> Modifica Dati</button>`;
    document.getElementById('editToggleBtn').addEventListener('click', () => {
      toggleEditMode(true)
    });
  }
};

const salvaModificheAzienda = async() => {
  const aziendaId = getAziendaIdFromUrl();
  const token = localStorage.getItem('token');

  const fromData = {};
  campiAzienda.forEach(campo => {
    fromData[campo] = document.getElementById(`edit-${campo}`).value.trim();
  });

  try {
    const response = await fetch(`/api/aziende/${aziendaId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fromData)
    });

    const data = await response.json().catch(() => ({}));

    if(!response.ok) {
      renderStatus(data.message || 'Errore durante l\'aggiornamento.', 'red');
      return;
    }

    renderStatus('Dati aziendali aggiornati correttamente!', 'green');

    aziendaAttuale = {...aziendaAttuale, ...fromData};
    mostraDatiAzienda(aziendaAttuale);
    toggleEditMode(false);

    // Aggiornamento e sincronizzazione con lo switcher
    const aziendaIdDallUrl = getAziendaIdFromUrl();
    const aziendaIdAttivoInStorage = localStorage.getItem(SELECTED_AZIENDA_ID_KEY);

    // Se l'azienda modificata dall'utente è quella attiva nel menu
    if(aziendaIdDallUrl === aziendaIdAttivoInStorage) {
      localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, fromData.companyName);

      const badgeBtn = document.getElementById('currentAziendaBadge');
      const dropdown = document.getElementById('aziendaSwitcherDropdown');
      if(badgeBtn) {
        const arrow = dropdown ? ' ▾' : '';
        badgeBtn.textContent = `Azienda attiva: ${fromData.companyName}${arrow}`;
      }
    }
  } catch(error) {
    console.error('Errore durante il salvataggio:', error);
    renderStatus('Errore di connessione durante il salvataggio.', 'red');
  }
};

if(editToggleBtn) {
  editToggleBtn.addEventListener('click', () => {
    toggleEditMode(true)
  });
}

// Ascolto dello switcher condiviso
window.addEventListener('aziendaChanged', async (e) => {
  const nuovoId = e.detail.id;
  
  if (!nuovoId) return;

  renderStatus('Cambio azienda rilevato... Caricamento dati in corso.', '#3182ce');

  const nuovoUrl = `${window.location.pathname}?id=${nuovoId}`;
  window.history.pushState({ path: nuovoUrl }, '', nuovoUrl);
  if (isEditing) {
    toggleEditMode(false);
  }

  // Ricarica i dati della nuova azienda selezionata
  await fetchDettaglioAzienda();
});