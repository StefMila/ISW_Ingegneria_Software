const lotNumberInput = document.getElementById('lotNumberInput');
const searchTraceBtn = document.getElementById('searchTraceBtn');
const scanQrBtn = document.getElementById('scanQrBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrScannerPanel = document.getElementById('qrScannerPanel');
const qrScannerStatus = document.getElementById('qrScannerStatus');
const qrVideo = document.getElementById('qrVideo');
const traceStatus = document.getElementById('traceStatus');
const traceResult = document.getElementById('traceResult');

const lotNumberValue = document.getElementById('lotNumberValue');
const lotProductValue = document.getElementById('lotProductValue');
const lotQuantityValue = document.getElementById('lotQuantityValue');
const lotCreatedAtValue = document.getElementById('lotCreatedAtValue');
const lotProducerValue = document.getElementById('lotProducerValue');
const traceTimelineList = document.getElementById('traceTimelineList');
const traceAnimalsList = document.getElementById('traceAnimalsList');

let qrStream = null;
let qrScanIntervalId = null;
let qrIsActive = false;
let qrDetector = null;

const getLotFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return (params.get('lotto') || '').trim();
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('it-IT');
};

const setStatus = (message, color = '#3d5a1a') => {
  if (!traceStatus) return;
  traceStatus.style.color = color;
  traceStatus.textContent = message;
};

const setQrStatus = (message, color = '#3d5a1a') => {
  if (!qrScannerStatus) return;
  qrScannerStatus.style.color = color;
  qrScannerStatus.textContent = message;
};

const showQrPanel = () => {
  if (!qrScannerPanel) return;
  qrScannerPanel.classList.remove('hidden');
};

const hideQrPanel = () => {
  if (!qrScannerPanel) return;
  qrScannerPanel.classList.add('hidden');
};

const extractLotFromQrValue = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  const directMatch = value.match(/\bLOT-[A-Z0-9-]+\b/i);
  if (directMatch) {
    return directMatch[0].toUpperCase();
  }

  try {
    const parsedUrl = new URL(value);
    const lotFromQuery = (parsedUrl.searchParams.get('lotto') || parsedUrl.searchParams.get('lot') || '').trim();
    if (lotFromQuery) return lotFromQuery;
  } catch (_) {
    const queryMatch = value.match(/[?&]lotto=([^&#]+)/i) || value.match(/[?&]lot=([^&#]+)/i);
    if (queryMatch?.[1]) {
      try {
        return decodeURIComponent(queryMatch[1]).trim();
      } catch (_) {
        return queryMatch[1].trim();
      }
    }
  }

  return value;
};

const stopQrScan = () => {
  qrIsActive = false;

  if (qrScanIntervalId) {
    clearInterval(qrScanIntervalId);
    qrScanIntervalId = null;
  }

  if (qrVideo) {
    qrVideo.pause();
    qrVideo.srcObject = null;
  }

  if (qrStream) {
    qrStream.getTracks().forEach((track) => track.stop());
    qrStream = null;
  }

  hideQrPanel();
};

const startQrScan = async () => {
  if (qrIsActive) return;

  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    setStatus('Il browser non supporta la fotocamera per la scansione QR.', 'red');
    return;
  }

  if (typeof window.BarcodeDetector !== 'function') {
    setStatus('Scansione QR non disponibile su questo browser. Inserisci il lotto manualmente.', 'red');
    return;
  }

  try {
    qrDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch (error) {
    console.error('Errore inizializzazione BarcodeDetector:', error);
    setStatus('Impossibile avviare lo scanner QR su questo dispositivo.', 'red');
    return;
  }

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    if (qrVideo) {
      qrVideo.srcObject = qrStream;
      await qrVideo.play();
    }

    qrIsActive = true;
    showQrPanel();
    setQrStatus('Scanner attivo: inquadra il QR del prodotto.');
    setStatus('Scanner QR avviato.');

    qrScanIntervalId = setInterval(async () => {
      if (!qrIsActive || !qrVideo || qrVideo.readyState < 2) return;

      try {
        const barcodes = await qrDetector.detect(qrVideo);
        if (!Array.isArray(barcodes) || barcodes.length === 0) return;

        const rawValue = barcodes[0]?.rawValue || '';
        const lotNumber = extractLotFromQrValue(rawValue);
        if (!lotNumber) return;

        if (lotNumberInput) {
          lotNumberInput.value = lotNumber;
        }

        setQrStatus(`QR rilevato: ${lotNumber}`, '#2f855a');
        stopQrScan();
        loadTraceability(lotNumber);
      } catch (_) {
        // ignora frame non decodificabili
      }
    }, 350);
  } catch (error) {
    console.error('Errore accesso fotocamera:', error);
    stopQrScan();
    setStatus('Accesso alla fotocamera negato o non disponibile.', 'red');
  }
};

const renderTimeline = (timeline = []) => {
  if (!traceTimelineList) return;
  traceTimelineList.innerHTML = '';

  if (!Array.isArray(timeline) || timeline.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nessun evento timeline disponibile.';
    traceTimelineList.appendChild(li);
    return;
  }

  timeline.forEach((event) => {
    const li = document.createElement('li');
    const datePart = formatDateTime(event.at);
    const quantityPart = Number.isFinite(event.quantity) ? ` - ${event.quantity} ${event.unit || ''}` : '';
    const outputPart = Number.isFinite(event.outputQuantity) ? ` - ${event.outputQuantity} ${event.outputUnit || ''}` : '';

    if (event.type === 'lavorazione') {
      li.textContent = `[${datePart}] Lavorazione (${event.status || 'n/d'})${outputPart}`;
    } else if (event.type === 'mungitura') {
      li.textContent = `[${datePart}] Mungitura (${event.status || 'n/d'})${quantityPart}`;
    } else {
      li.textContent = `[${datePart}] Lotto (${event.status || 'n/d'})${quantityPart}`;
    }

    traceTimelineList.appendChild(li);
  });
};

const renderAnimals = (animals = []) => {
  if (!traceAnimalsList) return;
  traceAnimalsList.innerHTML = '';

  if (!Array.isArray(animals) || animals.length === 0) {
    traceAnimalsList.textContent = 'Nessun dato animale disponibile per questo lotto.';
    return;
  }

  animals.forEach((animal) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '10px';
    card.style.textAlign = 'left';

    const label = animal.label || 'Animale';
    const benessere = animal.benessere || {};

    card.innerHTML = `
      <p><strong>Mucca:</strong> ${label}</p>
      <p><strong>Passi giornalieri (media):</strong> ${benessere.stepsDailyAvg ?? '-'}</p>
      <p><strong>Aria aperta (%):</strong> ${benessere.outdoorPercent ?? '-'}</p>
    `;

    traceAnimalsList.appendChild(card);
  });
};

const hideResult = () => {
  if (traceResult) {
    traceResult.classList.add('hidden');
  }
};

const showResult = () => {
  if (traceResult) {
    traceResult.classList.remove('hidden');
  }
};

const loadTraceability = async (lotNumber) => {
  const normalized = typeof lotNumber === 'string' ? lotNumber.trim() : '';
  if (!normalized) {
    setStatus('Inserisci un numero lotto valido.', 'red');
    hideResult();
    return;
  }

  setStatus('Caricamento tracciabilita in corso...');

  try {
    const response = await fetch(`/api/tracciabilita/public/lotti/${encodeURIComponent(normalized)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.message || 'Errore durante il recupero della tracciabilita.', 'red');
      hideResult();
      return;
    }

    const lotto = data.lotto || {};
    const producer = data.producer || {};
    lotNumberValue.textContent = lotto.lotNumber || '-';
    lotProductValue.textContent = lotto.nomeProdotto || '-';
    lotQuantityValue.textContent = `${lotto.quantity ?? '-'} ${lotto.unit || ''}`.trim();
    lotCreatedAtValue.textContent = formatDateTime(lotto.createdAt);
    if (lotProducerValue) {
      lotProducerValue.textContent = producer.companyName || '-';
    }

    renderTimeline(data.timeline || []);
    renderAnimals(data.animals || []);

    showResult();
    setStatus('Tracciabilita caricata con successo.', '#2f855a');
  } catch (error) {
    console.error('Errore caricamento tracciabilita:', error);
    setStatus('Errore di connessione al server.', 'red');
    hideResult();
  }
};

if (searchTraceBtn) {
  searchTraceBtn.addEventListener('click', () => {
    loadTraceability(lotNumberInput?.value || '');
  });
}

if (scanQrBtn) {
  scanQrBtn.addEventListener('click', () => {
    startQrScan();
  });
}

if (stopScanBtn) {
  stopScanBtn.addEventListener('click', () => {
    stopQrScan();
    setStatus('Scanner QR fermato.');
  });
}

if (lotNumberInput) {
  lotNumberInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadTraceability(lotNumberInput.value || '');
    }
  });
}

const prefilledLot = getLotFromQuery();
if (prefilledLot && lotNumberInput) {
  lotNumberInput.value = prefilledLot;
  loadTraceability(prefilledLot);
} else {
  setStatus('Pronto. Inserisci un lotto per vedere la tracciabilita.');
  hideResult();
}

window.addEventListener('beforeunload', () => {
  stopQrScan();
});
