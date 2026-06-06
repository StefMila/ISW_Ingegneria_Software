const lotNumberInput = document.getElementById('lotNumberInput');
const searchTraceBtn = document.getElementById('searchTraceBtn');
const traceStatus = document.getElementById('traceStatus');
const traceResult = document.getElementById('traceResult');

const lotNumberValue = document.getElementById('lotNumberValue');
const lotProductValue = document.getElementById('lotProductValue');
const lotQuantityValue = document.getElementById('lotQuantityValue');
const lotCreatedAtValue = document.getElementById('lotCreatedAtValue');
const lotProducerValue = document.getElementById('lotProducerValue');
const traceTimelineList = document.getElementById('traceTimelineList');
const traceAnimalsList = document.getElementById('traceAnimalsList');

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
