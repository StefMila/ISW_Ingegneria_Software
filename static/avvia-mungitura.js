const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

const form = document.getElementById('avviaMungituraForm');
const animaleSelect = document.getElementById('animaleId');
const notesInput = document.getElementById('notes');
const statusMsg = document.getElementById('statusMsg');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');
const scanButton = document.getElementById('scanAnimaleIdBtn');
const scanPanel = document.getElementById('scanPanel');
const scanVideo = document.getElementById('scanVideo');
const stopScanBtn = document.getElementById('stopScanBtn');
const scanStatus = document.getElementById('scanStatus');

let scannerStream = null;
let scannerAnimationId = null;
let scannerActive = false;
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

const setAziendaBadge = () => {
  if (!currentAziendaBadge) {
    return;
  }

  const aziendaName = localStorage.getItem(SELECTED_AZIENDA_NAME_KEY) || getAziendaId() || 'non selezionata';
  currentAziendaBadge.textContent = `Azienda attiva: ${aziendaName} ▾`;
};

const setScanStatus = (text, color = '#1f2937') => {
  if (!scanStatus) {
    return;
  }

  scanStatus.textContent = text;
  scanStatus.style.color = color;
};

const findAnimaleOptionByScannedValue = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value || !animaleSelect) {
    return null;
  }

  const exactMatch = Array.from(animaleSelect.options).find((option) => String(option.value || '').trim() === value);
  if (exactMatch) {
    return exactMatch;
  }

  const lowerValue = value.toLowerCase();
  return Array.from(animaleSelect.options).find((option) => String(option.textContent || '').toLowerCase().includes(lowerValue));
};

const stopScanner = () => {
  scannerActive = false;

  if (scannerAnimationId) {
    cancelAnimationFrame(scannerAnimationId);
    scannerAnimationId = null;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }

  if (scanVideo) {
    scanVideo.srcObject = null;
  }

  if (scanPanel) {
    scanPanel.style.display = 'none';
  }
};

const applyScannedValue = (rawValue) => {
  const matchedOption = findAnimaleOptionByScannedValue(rawValue);
  if (!matchedOption) {
    setScanStatus('ID non trovato tra le mucche disponibili. Riprova.', 'red');
    return false;
  }

  animaleSelect.value = matchedOption.value;
  setScanStatus(`Selezionata: ${matchedOption.textContent}`, 'green');
  renderStatus('Mucca selezionata tramite scansione.', 'green');
  return true;
};

const startScanner = async () => {
  if (!scanPanel || !scanVideo) {
    return;
  }

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    setScanStatus('Fotocamera non disponibile: usa HTTPS/localhost.', 'red');
    scanPanel.style.display = 'block';
    return;
  }

  scanPanel.style.display = 'block';
  setScanStatus('Avvio fotocamera...', '#1f2937');

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    scanVideo.srcObject = scannerStream;
    await scanVideo.play();
    scannerActive = true;
    setScanStatus('Inquadra il codice ID della mucca.', '#1f2937');

    if (!('BarcodeDetector' in window)) {
      setScanStatus('BarcodeDetector non supportato dal browser.', '#b45309');
      return;
    }

    const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });

    const tick = async () => {
      if (!scannerActive) {
        return;
      }

      try {
        const barcodes = await detector.detect(scanVideo);
        if (Array.isArray(barcodes) && barcodes.length > 0) {
          const rawValue = barcodes[0]?.rawValue;
          if (applyScannedValue(rawValue)) {
            stopScanner();
            return;
          }
        }
      } catch (error) {
        console.error('Errore durante scansione barcode:', error);
      }

      scannerAnimationId = requestAnimationFrame(tick);
    };

    scannerAnimationId = requestAnimationFrame(tick);
  } catch (error) {
    console.error('Errore apertura fotocamera:', error);
    setScanStatus('Impossibile avviare la fotocamera.', 'red');
  }
};

const populateAnimali = async () => {
  const aziendaId = getAziendaId();
  const token = getToken();

  if (!aziendaId) {
    renderStatus('Seleziona prima un\'azienda dalla home.', '#b45309');
    animaleSelect.innerHTML = '<option value="">Nessuna azienda selezionata</option>';
    animaleSelect.disabled = true;
    return;
  }

  if (!token) {
    renderStatus('Sessione non valida. Effettua di nuovo il login.', 'red');
    animaleSelect.innerHTML = '<option value="">Accesso richiesto</option>';
    animaleSelect.disabled = true;
    return;
  }

  try {
    const response = await fetch(`/api/animali/aziende/${aziendaId}/animali?limit=200`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      renderStatus(payload.message || 'Errore durante il caricamento degli animali.', 'red');
      animaleSelect.innerHTML = '<option value="">Errore caricamento animali</option>';
      animaleSelect.disabled = true;
      return;
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0) {
      animaleSelect.innerHTML = '<option value="">Nessuna mucca registrata</option>';
      animaleSelect.disabled = true;
    renderStatus('Registra prima almeno una mucca nella mandria.', '#b45309');
      return;
    }

    const entries = items
      .filter((item) => item && item._id)
      .map((item) => {
        const name = String(item.name || '').trim();
        const matricola = String(item.matricola || '').trim();
        const label = [name, matricola ? `(${matricola})` : ''].filter(Boolean).join(' ');
        return [String(item._id), label || String(item._id)];
      });

    animaliMap = new Map(entries);

    animaleSelect.innerHTML = '<option value="">Seleziona una mucca</option>' + entries
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join('');
    animaleSelect.disabled = false;
    renderStatus('Seleziona una mucca e avvia la mungitura.', 'green');
  } catch (error) {
    console.error('Errore durante il caricamento animali:', error);
    renderStatus('Errore di connessione durante il caricamento animali.', 'red');
    animaleSelect.innerHTML = '<option value="">Errore di rete</option>';
    animaleSelect.disabled = true;
  }
};

const startMungitura = async () => {
  const aziendaId = getAziendaId();
  const token = getToken();
  const animaleId = (animaleSelect?.value || '').trim();
  const notes = String(notesInput?.value || '').trim();

  if (!aziendaId) {
    renderStatus('Seleziona prima un\'azienda dalla home.', '#b45309');
    return;
  }

  if (!token) {
    renderStatus('Sessione non valida. Effettua di nuovo il login.', 'red');
    return;
  }

  if (!animaleId) {
    renderStatus('Seleziona una mucca prima di avviare.', 'red');
    return;
  }

  const payload = { aziendaId, animaleId };
  if (notes) {
    payload.notes = notes;
  }

  try {
    const response = await fetch('/api/mungiture', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      renderStatus(data.message || 'Errore durante l\'avvio della mungitura.', 'red');
      return;
    }

    const semiLavoratoId = data?.mungitura?.semiLavoratoId;
    const startedAt = data?.mungitura?.startedAt;
    const startedLabel = startedAt ? new Date(startedAt).toLocaleString('it-IT') : 'ora';
    const semiLabel = semiLavoratoId ? ` | Semi-lavorato: ${semiLavoratoId}` : '';
    renderStatus(`Mungitura avviata con successo (${startedLabel})${semiLabel}`, 'green');
    form.reset();

    if (window.initMungitureAvvioLista) {
      window.initMungitureAvvioLista({
        tableBody: document.getElementById('mungitureTableBody'),
        statusMsg,
        currentAziendaBadge
      });
    }
  } catch (error) {
    console.error('Errore durante avvio mungitura:', error);
    renderStatus('Errore di connessione al server.', 'red');
  }
};

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await startMungitura();
  });
}

if (scanButton) {
  scanButton.addEventListener('click', async () => {
    if (!animaleSelect || animaleSelect.disabled) {
      renderStatus('Carica prima la lista mucche prima di scansionare.', '#b45309');
      return;
    }

    await startScanner();
  });
}

if (stopScanBtn) {
  stopScanBtn.addEventListener('click', () => {
    stopScanner();
  });
}

const mungitureTableBody = document.getElementById('mungitureTableBody');
if (mungitureTableBody) {
  mungitureTableBody.addEventListener('click', async (event) => {
    if (typeof window.handleMungitureAvvioListClick === 'function') {
      await window.handleMungitureAvvioListClick(event);
    }
  });
}

window.addEventListener('beforeunload', () => {
  stopScanner();
});

setAziendaBadge();
populateAnimali();
if (window.initMungitureAvvioLista) {
  window.initMungitureAvvioLista({
    tableBody: document.getElementById('mungitureTableBody'),
    statusMsg,
    currentAziendaBadge
  });
}
