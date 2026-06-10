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
const lotProducerWebsiteValue = document.getElementById('lotProducerWebsiteValue');
const lotOpenMapBtn = document.getElementById('lotOpenMapBtn');
const traceTimelineList = document.getElementById('traceTimelineList');
const traceAnimalsList = document.getElementById('traceAnimalsList');
const traceAnimalDetail = document.getElementById('traceAnimalDetail');

let qrStream = null;
let qrScanIntervalId = null;
let qrIsActive = false;
let qrDetector = null;
let currentAnimals = [];
let activeAnimalId = '';

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

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const normalizeWebsiteUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const getTimelineTitle = (event) => {
  if (event.type === 'lavorazione') {
    return 'Fase Lavorazione';
  }
  if (event.type === 'mungitura') {
    return 'Mungitura';
  }
  return 'Lotto Creato';
};

const getTimelineSubtitle = (event) => {
  if (event.type === 'lavorazione') {
    if (Number.isFinite(event.outputQuantity)) {
      return `Output ${event.outputQuantity} ${event.outputUnit || ''}`.trim();
    }
    return `Stato: ${event.status || 'n/d'}`;
  }
  if (event.type === 'mungitura') {
    if (Number.isFinite(event.quantity)) {
      return `${event.quantity} ${event.unit || ''}`.trim();
    }
    return `Stato: ${event.status || 'n/d'}`;
  }
  if (Number.isFinite(event.quantity)) {
    return `${event.quantity} ${event.unit || ''}`.trim();
  }
  return `Stato: ${event.status || 'n/d'}`;
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
  traceTimelineList.className = 'trace-public-timeline';

  if (!Array.isArray(timeline) || timeline.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nessun evento timeline disponibile.';
    traceTimelineList.appendChild(li);
    return;
  }

  timeline.forEach((event, index) => {
    const li = document.createElement('li');
    li.className = 'trace-public-timeline-item';
    const datePart = formatDate(event.at);
    const title = getTimelineTitle(event);
    const subtitle = getTimelineSubtitle(event);
    const dotClass = event.type === 'lotto' ? 'is-lotto' : (event.type === 'lavorazione' ? 'is-lavorazione' : 'is-mungitura');

    li.innerHTML = `
      <div class="trace-public-timeline-dot ${dotClass}" aria-hidden="true"></div>
      <div class="trace-public-timeline-content">
        <p class="trace-public-timeline-date">${escapeHtml(datePart)}</p>
        <p class="trace-public-timeline-title">${escapeHtml(title)}</p>
        <p class="trace-public-timeline-subtitle">${escapeHtml(subtitle)}</p>
      </div>
    `;

    if (index === timeline.length - 1) {
      li.classList.add('is-last');
    }

    traceTimelineList.appendChild(li);
  });
};

const renderAnimalDetail = (animal) => {
  if (!traceAnimalDetail) return;

  if (!animal) {
    traceAnimalDetail.classList.add('hidden');
    traceAnimalDetail.innerHTML = '';
    return;
  }

  const benessere = animal.benessere || {};
  const stepsDailyAvg = Number.isFinite(benessere.stepsDailyAvg) ? benessere.stepsDailyAvg : '-';
  const outdoorPercent = Number.isFinite(benessere.outdoorPercent) ? benessere.outdoorPercent : '-';
  const outdoorHours = Number.isFinite(benessere.outdoorPercent)
    ? Number(((benessere.outdoorPercent / 100) * 24).toFixed(1))
    : '-';

  const safeLabel = escapeHtml(animal.label || 'Animale');
  const safeMatricola = escapeHtml(animal.matricola || '-');
  const safeSpecies = escapeHtml(animal.species || '-');
  const safeSesso = escapeHtml(animal.sesso || '-');
  const safeFoto = typeof animal.foto === 'string' ? animal.foto.trim() : '';

  traceAnimalDetail.innerHTML = `
    <div class="trace-animal-detail-media">
      ${safeFoto
        ? `<img src="${escapeHtml(safeFoto)}" alt="Foto ${safeLabel}" class="trace-animal-photo">`
        : '<div class="trace-animal-photo-placeholder" aria-hidden="true">🐄</div>'}
    </div>
    <div class="trace-animal-detail-body">
      <h4>${safeLabel}</h4>
      <p><strong>Matricola:</strong> ${safeMatricola}</p>
      <p><strong>Specie:</strong> ${safeSpecies}</p>
      <p><strong>Sesso:</strong> ${safeSesso}</p>
      <p><strong>Passi giornalieri (media):</strong> ${escapeHtml(String(stepsDailyAvg))}</p>
      <p><strong>Tempo all'aria aperta:</strong> ${escapeHtml(String(outdoorHours))} h/giorno</p>
      <p><strong>Aria aperta:</strong> ${escapeHtml(String(outdoorPercent))}%</p>
    </div>
  `;

  traceAnimalDetail.classList.remove('hidden');
};

const handleAnimalSelection = (animalId) => {
  activeAnimalId = String(animalId || '').trim();
  const selected = currentAnimals.find((animal) => String(animal.id || animal.label || '') === activeAnimalId) || null;
  renderAnimalDetail(selected);

  const buttons = traceAnimalsList?.querySelectorAll('.trace-animal-select-btn') || [];
  buttons.forEach((button) => {
    const matches = String(button.dataset.animalId || '') === activeAnimalId;
    button.classList.toggle('is-active', matches);
  });
};

const renderAnimals = (animals = []) => {
  if (!traceAnimalsList) return;
  traceAnimalsList.innerHTML = '';
  if (traceAnimalDetail) {
    traceAnimalDetail.classList.add('hidden');
    traceAnimalDetail.innerHTML = '';
  }

  currentAnimals = Array.isArray(animals) ? animals : [];
  activeAnimalId = '';

  if (!Array.isArray(animals) || animals.length === 0) {
    traceAnimalsList.textContent = 'Nessun dato animale disponibile per questo lotto.';
    return;
  }

  const list = document.createElement('div');
  list.className = 'trace-animal-list';

  animals.forEach((animal, index) => {
    const animalId = String(animal.id || animal.label || `animal-${index}`);
    const benessere = animal.benessere || {};
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'trace-animal-select-btn';
    button.dataset.animalId = animalId;
    button.innerHTML = `
      <span class="trace-animal-icon" aria-hidden="true">🐄</span>
      <span class="trace-animal-copy">
        <span class="trace-animal-name">${escapeHtml(animal.label || 'Animale')}</span>
        <span class="trace-animal-metrics">${escapeHtml(String(Number.isFinite(benessere.stepsDailyAvg) ? benessere.stepsDailyAvg : '-'))} passi/g • ${escapeHtml(String(Number.isFinite(benessere.outdoorPercent) ? benessere.outdoorPercent : '-'))}% outdoor</span>
      </span>
    `;

    button.addEventListener('click', () => {
      handleAnimalSelection(animalId);
    });

    list.appendChild(button);
  });

  traceAnimalsList.appendChild(list);

  const firstAnimalId = String(animals[0]?.id || animals[0]?.label || '').trim();
  if (firstAnimalId) {
    handleAnimalSelection(firstAnimalId);
  }
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

    if (lotProducerWebsiteValue) {
      const websiteUrl = normalizeWebsiteUrl(producer.website);
      if (websiteUrl) {
        lotProducerWebsiteValue.innerHTML = `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(producer.website)}</a>`;
      } else {
        lotProducerWebsiteValue.textContent = '-';
      }
    }

    if (lotOpenMapBtn) {
      const producerId = String(producer.id || '').trim();
      const params = new URLSearchParams();
      if (producerId) {
        params.set('aziendaId', producerId);
      }

      const lat = Number(producer?.map?.lat);
      const lng = Number(producer?.map?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }

      if (params.toString()) {
        lotOpenMapBtn.href = `/esplora.html?${params.toString()}`;
        lotOpenMapBtn.classList.remove('hidden');
      } else {
        lotOpenMapBtn.href = '/esplora.html';
        lotOpenMapBtn.classList.add('hidden');
      }
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

document.addEventListener('DOMContentLoaded', async () => {
  const prefilledLot = getLotFromQuery();
  if (prefilledLot && lotNumberInput) {
    lotNumberInput.value = prefilledLot;
    loadTraceability(prefilledLot);
  } else {
    setStatus('Pronto. Inserisci un lotto per vedere la tracciabilita.');
    hideResult();
  }
});

window.addEventListener('beforeunload', () => {
  stopQrScan();
});
