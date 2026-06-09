const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

let isEditing = false; // Ti serve a sapere se mostrare i testi o gli input di modifica
let aziendaAttuale = null; // Salva i dati dell'azienda per ripristinarli se l'utente clicca "Annulla"

//  Elementi DOM 
const statusMsg = document.getElementById('statusMsg');
const editToggleBtn = document.getElementById('editToggleBtn');
const actionButtonsDiv = document.getElementById('aziendaActionButtons');

const listViewSection = document.getElementById('listViewSection');
const detailViewSection = document.getElementById('detailViewSection');
const farmsTableBody = document.getElementById('farmsTableBody');
const backToListBtn = document.getElementById('backToListBtn');
const viewFotoAzienda = document.getElementById('view-fotoAzienda');
const editFotoWrapper = document.getElementById('edit-fotoWrapper');
const editFotoAziendaInput = document.getElementById('edit-fotoAzienda');
const editFotoPreview = document.getElementById('edit-fotoPreview');
const editFotoFilename = document.getElementById('edit-fotoFilename');
const editRemoveFotoAzienda = document.getElementById('edit-removeFotoAzienda');
const pickFotoAziendaBtn = document.getElementById('pickFotoAziendaBtn');

const campiAzienda = ['companyName', 'vatNumber', 'emailAzienda', 'address'];
let selectedFotoAziendaDataUrl = '';

//  Utility per formattazione e rendering
const formatDate = (iso) => {
  if (!iso) return '—';

  // Se è già un oggetto Date valido
  if (iso instanceof Date && !isNaN(iso)) {
    return iso.toLocaleDateString('it-IT');
  }

  // Se è un timestamp numerico passato come stringa o numero, lo converte
  const timestamp = Number(iso);
  const d = !isNaN(timestamp) ? new Date(timestamp) : new Date(iso);
  
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('it-IT');

  // Fallback manuale estremo: se è una stringa che inizia con YYYY-MM-DD (es. 2026-05-29...)
  if (typeof iso === 'string' && iso.includes('-')) {
    const soloData = iso.split('T')[0]; // Prende solo la parte prima della 'T'
    const parti = soloData.split('-');
    if (parti.length === 3) {
      // Rigira le parti da YYYY-MM-DD a DD/MM/YYYY
      return `${parti[2]}/${parti[1]}/${parti[0]}`;
    }
  }

  return '—';
};
// Capitalizza la prima lettera di una stringa e rende il resto minuscolo, restituendo '—' se la stringa è vuota o non definita
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
// Funzione per renderizzare messaggi di stato all'utente 
const renderStatus = (text, color = '#1f2937') => {
  if (!statusMsg) return;
  statusMsg.style.color = color;
  statusMsg.textContent = text;
};

const escAttr = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const renderFotoAzienda = (foto, companyName) => {
  if (!foto) {
    return '<span class="animal-photo-placeholder">—</span>';
  }

  return `<img class="animal-photo-thumb" src="${escAttr(foto)}" alt="Foto ${escAttr(companyName || 'azienda')}">`;
};

const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('Impossibile leggere la foto selezionata.'));
  reader.readAsDataURL(file);
});

const getAziendaIdFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
};

const initPage = async () => {
  const aziendaId = getAziendaIdFromUrl();
  renderStatus(''); // Resetta eventuali status messages

  if(aziendaId) {
    listViewSection.classList.add('hidden');
    detailViewSection.classList.remove('hidden');
    await fetchDettaglioAzienda(aziendaId);
  } else {
    detailViewSection.classList.add('hidden');
    listViewSection.classList.remove('hidden');
    if(isEditing) toggleEditMode(false);
    await fetchTutteLeAziende();
  }
}

const fetchTutteLeAziende = async () => {
  const token = localStorage.getItem('token');
  renderStatus('Caricamento elenco aziende...', '#3182ce');

  try {
    const response = await fetch('/api/aziende/mine', {
      headers: { 'Authorization': `Bearer ${token}`}
    });
    const data = await response.json();

    if(!response.ok) {
      renderStatus(data.message || 'Errore nel recupero dell\'elenco aziende.', 'red');
      return;
    }

    farmsTableBody.innerHTML = '';
    renderStatus(''); // Pulisce loading test

    const aziende = Array.isArray(data.items) ? data.items : [];

    if(aziende.length === 0) {
      farmsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #64758b;">Nessuna azienda associata a questo account.</td></tr>`;
      return;
    }

    aziende.forEach(farm => {
      const idAzienda = farm._id || farm.id;
      const tr = document.createElement('tr');

      tr.innerHTML= `
        <td><strong>${farm.companyName || '—'}</strong></td>
        <td>${farm.address || '—'}</td>
        <td>${formatDate(farm.createdAt)}</td>
        <td style="text-align: center;">
          <button class="btn-icon view-btn" data-id="${idAzienda}" title="Visualizza dettagli">👁️</button>
          <button class="btn-icon delete-btn" data-id="${idAzienda}" title="Elimina azienda" style="color: #94a3b8;">🗑️</button>
        </td>
      `;
      farmsTableBody.appendChild(tr);
    });

    farmsTableBody.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.history.pushState({}, '', `?id=${id}`);
        initPage();
      });
    });

    farmsTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita conflitti se la riga avesse altri eventi
        const id = e.currentTarget.getAttribute('data-id');
        deleteAzienda(id);
      });
    });
  
  } catch(error) {
    console.error('Errore durante fetch lista aziende:', error);
    renderStatus('Errore di connessione al server durante il recupero dei dati.', 'red');
  }
};

const fetchDettaglioAzienda = async(aziendaId) => {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api/aziende/${aziendaId}`, {
      headers: {Authorization: `Bearer ${token}`}
    });
    const data = await response.json();

    // Se azienda con id non esiset, link per tornare alla lista aziende
    if(!response.ok) {
      renderStatus(data.message || 'Errore nel recupero dell\'azienda.', 'red');
      actionButtonsDiv.innerHTML = `<button id="backToListBtn" class="btn-secondary">Torna alla lista delle aziende</button>`;
      document.getElementById('backToListBtn').addEventListener('click', navigateBackToList);
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

  if (viewFotoAzienda) {
    viewFotoAzienda.innerHTML = renderFotoAzienda(azienda?.foto, azienda?.companyName);
  }

  if (editFotoPreview) {
    editFotoPreview.innerHTML = renderFotoAzienda(azienda?.foto, azienda?.companyName);
  }

  selectedFotoAziendaDataUrl = '';
  if (editFotoFilename) {
    editFotoFilename.textContent = 'Nessun file selezionato';
  }
  if (editRemoveFotoAzienda) {
    editRemoveFotoAzienda.checked = false;
  }
  if (editFotoAziendaInput) {
    editFotoAziendaInput.value = '';
  }

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

  if (viewFotoAzienda && editFotoWrapper) {
    if (isEditing) {
      viewFotoAzienda.classList.add('hidden');
      editFotoWrapper.classList.remove('hidden');
    } else {
      viewFotoAzienda.classList.remove('hidden');
      editFotoWrapper.classList.add('hidden');
    }
  }

  if(isEditing) {
    actionButtonsDiv.innerHTML = `
      <button id="saveBtn" class="btn-success" style="color: green; margin-right: 10px; font-weight: bold; cursor: pointer; background: none; border: 1px solid green; padding: 6px 12px; border-radius: 4px;">Salva</button>
    <button id="cancelBtn" class="btn-secondary" style="color: red; cursor: pointer; background: none; border: 1px solid red; padding: 6px 12px; border-radius: 4px;">Annulla</button>
      `;

      document.getElementById('saveBtn').addEventListener('click', salvaModificheAzienda);
      document.getElementById('cancelBtn').addEventListener('click', () => {
        mostraDatiAzienda(aziendaAttuale);
        toggleEditMode(false);
      });
  } else {
    actionButtonsDiv.innerHTML = `
      <button id="backToListBtn" class="btn-secondary" style="margin-right: 10px;">← Torna alla lista</button>
      <button id="editToggleBtn" class="btn-primary">Modifica Dati</button>
    `;
    document.getElementById('editToggleBtn').addEventListener('click', () => {
      toggleEditMode(true)
    });
  }
};

const salvaModificheAzienda = async() => {
  const aziendaId = getAziendaIdFromUrl();
  const token = localStorage.getItem('token');

  const formData = {};
  campiAzienda.forEach(campo => {
    formData[campo] = document.getElementById(`edit-${campo}`).value.trim();
  });

  if (editRemoveFotoAzienda?.checked) {
    formData.foto = '';
  } else if (selectedFotoAziendaDataUrl) {
    formData.foto = selectedFotoAziendaDataUrl;
  }

  try {
    const response = await fetch(`/api/aziende/${aziendaId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json().catch(() => ({}));

    if(!response.ok) {
      renderStatus(data.message || 'Errore durante l\'aggiornamento.', 'red');
      return;
    }

    renderStatus('Dati aziendali aggiornati correttamente!', 'green');

    // Aggiorna l'oggetto globale con i dati freschi del server (se presenti) o del form
    const datiAggiornati = data.itemInfo || formData;
    aziendaAttuale = {...aziendaAttuale, ...datiAggiornati};
    
    // Esce dalla modalità modifica
    isEditing = false;


    mostraDatiAzienda(aziendaAttuale);
    toggleEditMode(false);

    // Forza il reset dello stato della pagina per ripristinare i listener dei pulsanti
    initPage();

    // Sincronizza aggiornamento del contesto con i menu a tendina superiori
    if (aziendaId === localStorage.getItem(SELECTED_AZIENDA_ID_KEY)) {
      localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, formData.companyName);
      const badgeBtn = document.getElementById('currentAziendaBadge');
      if (badgeBtn) {
        badgeBtn.textContent = `Azienda attiva: ${formData.companyName} ▾`;
      }
    }
  } catch (error) {
    console.error('Errore durante il salvataggio:', error);
    renderStatus('Errore di connessione durante il salvataggio.', 'red');
  }
};

const deleteAzienda = async (idAzienda) => {
  const confermato = confirm("Sei sicuro di voler eliminare definitivamente questa azienda agricola? L'azione non è reversibile.");
  if (!confermato) return;

  const token = localStorage.getItem('token');
  renderStatus('Eliminazione azienda in corso...', '#3182ce');

  try {
    const response = await fetch(`/api/aziende/${idAzienda}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      renderStatus(data.message || "Errore durante l'eliminazione dell'azienda.", 'red');
      return;
    }

    // Successo: mostra il messaggio verde e ricarica l'elenco aggiornato
    renderStatus(data.message || 'Azienda eliminata con successo.', '#10b981');
    
    // Aspetta un secondo per far leggere il messaggio di successo prima di ricaricare la tabella
    setTimeout(() => {
      fetchTutteLeAziende();
    }, 1200);

  } catch (error) {
    console.error('Errore durante eliminazione azienda:', error);
    renderStatus('Errore di connessione al server durante l\'eliminazione.', 'red');
  }
};

const navigateBackToList = () => {
  isEditing = false; // Mette in sicurezza lo stato di editing
  window.history.pushState({}, '', window.location.pathname);
  initPage();
};

document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'backToListBtn' || e.target.closest('#backToListBtn'))) {
    navigateBackToList();
  }
});

if (pickFotoAziendaBtn && editFotoAziendaInput) {
  pickFotoAziendaBtn.addEventListener('click', () => {
    editFotoAziendaInput.click();
  });
}

if (editFotoAziendaInput) {
  editFotoAziendaInput.addEventListener('change', async () => {
    const file = editFotoAziendaInput.files && editFotoAziendaInput.files[0];
    selectedFotoAziendaDataUrl = '';
    if (editFotoFilename) {
      editFotoFilename.textContent = file?.name || 'Nessun file selezionato';
    }

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      renderStatus('Seleziona un file immagine valido.', 'red');
      editFotoAziendaInput.value = '';
      return;
    }

    if (file.size > 1_400_000) {
      renderStatus('Foto azienda troppo grande. Usa un file sotto 1.4MB.', 'red');
      editFotoAziendaInput.value = '';
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      if (!dataUrl) {
        throw new Error('Foto non valida');
      }

      selectedFotoAziendaDataUrl = dataUrl;
      if (editRemoveFotoAzienda) {
        editRemoveFotoAzienda.checked = false;
      }

      if (editFotoPreview) {
        const companyName = document.getElementById('edit-companyName')?.value || 'azienda';
        editFotoPreview.innerHTML = renderFotoAzienda(dataUrl, companyName);
      }
    } catch (error) {
      console.error('Errore lettura foto azienda:', error);
      renderStatus('Impossibile leggere la foto selezionata.', 'red');
      editFotoAziendaInput.value = '';
      selectedFotoAziendaDataUrl = '';
    }
  });
}

if (backToListBtn) {
  backToListBtn.addEventListener('click', navigateBackToList);
}

if (editToggleBtn) {
  editToggleBtn.addEventListener('click', () => toggleEditMode(true));
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

  await initPage();
});

// Listens to native browser Back and Forward navigation changes securely
window.addEventListener('popstate', initPage);

// Initial Execution on window load
document.addEventListener('DOMContentLoaded', initPage);