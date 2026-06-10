const labelBuilderStatus = document.getElementById('labelBuilderStatus');
const labelLotsFilterInput = document.getElementById('labelLotsFilterInput');
const labelCreatedFromInput = document.getElementById('labelCreatedFromInput');
const labelCreatedToInput = document.getElementById('labelCreatedToInput');
const labelLotsReloadBtn = document.getElementById('labelLotsReloadBtn');
const labelLotsTableBody = document.getElementById('labelLotsTableBody');
const labelConfigTableBody = document.getElementById('labelConfigTableBody');
const labelPreviewGrid = document.getElementById('labelPreviewGrid');
const labelProducerName = document.getElementById('labelProducerName');
const labelTotalCount = document.getElementById('labelTotalCount');
const labelLotDetailCard = document.getElementById('labelLotDetailCard');
const labelDetailLotNumber = document.getElementById('labelDetailLotNumber');
const labelDetailProduct = document.getElementById('labelDetailProduct');
const labelDetailCreatedAt = document.getElementById('labelDetailCreatedAt');
const labelDetailPrintedStatus = document.getElementById('labelDetailPrintedStatus');
const labelDetailProducer = document.getElementById('labelDetailProducer');
const labelDetailExpiryText = document.getElementById('labelDetailExpiryText');
const labelDetailQrImage = document.getElementById('labelDetailQrImage');
const labelDetailQrMissing = document.getElementById('labelDetailQrMissing');
const labelDetailExpiryInput = document.getElementById('labelDetailExpiryInput');
const labelDetailCopiesInput = document.getElementById('labelDetailCopiesInput');
const labelDetailReprintBtn = document.getElementById('labelDetailReprintBtn');
const labelCloseReprintDialogBtn = document.getElementById('labelCloseReprintDialogBtn');

const labelPrevBtn = document.getElementById('labelPrevBtn');
const labelNextBtn = document.getElementById('labelNextBtn');
const labelPrintBtn = document.getElementById('labelPrintBtn');
// Stato globale dei lotti caricati, dei lotti selezionati per la stampa, del lotto attivo nel dettaglio e di eventuali target di ristampa provenienti dalla query string
const stepPanels = {
  1: document.getElementById('labelStep1'),
  2: document.getElementById('labelStep2'),
  3: document.getElementById('labelStep3')
};
// Funzione per aggiornare lo stato del builder di etichette, mostrando un messaggio e cambiando il colore del testo in base al contesto (default verde scuro, rosso per errori)
const stepButtons = {
  1: document.getElementById('labelStep1Btn'),
  2: document.getElementById('labelStep2Btn'),
  3: document.getElementById('labelStep3Btn')
};

let currentStep = 1;
let allLots = [];
const selectedLots = new Map();
let lastShiftSelectionIndex = null;
let activeDetailLot = null;
let pendingReprintLotFromQuery = null;
let pendingReprintLotIdFromQuery = null;
const PRINT_LOGO_SRC = '/logo-muccapp.svg';
// Stato per evitare più richieste di ristampa contemporanee
const labelSetStatus = (message, color = '#3d5a1a') => {
  if (!labelBuilderStatus) return;
  labelBuilderStatus.style.color = color;
  labelBuilderStatus.textContent = message;
};
// Funzione per formattare date in modo leggibile, usata in più punti
const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('it-IT');
};
// Funzione per formattare date in input type="date" (YYYY-MM-DD), usata per valorizzare i campi data e per costruire le date di scadenza
const formatDateInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// Funzione per eseguire escaping di stringhe da inserire in HTML, per evitare problemi di sicurezza o di visualizzazione
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
// ottieni IdAzienda
const getCurrentAziendaId = () => {
  const direct = (localStorage.getItem('selectedAziendaId') || '').trim();
  if (direct) return direct;

  try {
    const byUser = JSON.parse(localStorage.getItem('selectedAziendaByUser') || '{}');
    const userId = (localStorage.getItem('userId') || '').trim();
    if (userId && typeof byUser[userId] === 'string' && byUser[userId].trim()) {
      return byUser[userId].trim();
    }
  } catch (error) {
    console.warn('Impossibile leggere selectedAziendaByUser:', error);
  }

  return '';
};
// Funzione per costruire il menu di navigazione dell'allevatore, con logica condizionale per mostrare o nascondere voci di menu in base alle opzioni passate
const getProducerName = () => {
  const name = (localStorage.getItem('selectedAziendaName') || '').trim();
  return name || 'Azienda produttrice';
};

const getLotKey = (lot) => String(lot?._id || lot?.id || lot?.lotNumber || '');

const loadReprintTargetFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  pendingReprintLotFromQuery = String(params.get('reprintLot') || '').trim();
  pendingReprintLotIdFromQuery = String(params.get('reprintLotId') || '').trim();
};
// Funzione per consumare i parametri di query relativi a un lotto da ristampare, cercare il lotto corrispondente tra quelli caricati e aprire il dettaglio se trovato, altrimenti mostrare un messaggio di errore, e infine pulire i parametri di query per evitare comportamenti indesiderati in futuro
const consumeReprintTargetFromQuery = () => {
  if (!pendingReprintLotFromQuery && !pendingReprintLotIdFromQuery) {
    return;
  }

  const found = allLots.find((lot) => {
    const lotId = String(lot?._id || lot?.id || '').trim();
    const lotNumber = String(lot?.lotNumber || '').trim();
    if (pendingReprintLotIdFromQuery && lotId && lotId === pendingReprintLotIdFromQuery) {
      return true;
    }
    if (pendingReprintLotFromQuery && lotNumber && lotNumber === pendingReprintLotFromQuery) {
      return true;
    }
    return false;
  });

  if (found) {
    setStep(1);
    openLotDetail(found);
  } else if (pendingReprintLotFromQuery || pendingReprintLotIdFromQuery) {
    labelSetStatus('Lotto di ristampa non trovato nell\'azienda attiva.', 'red');
  }

  pendingReprintLotFromQuery = null;
  pendingReprintLotIdFromQuery = null;
};
// Funzione per chiudere la finestra di dialogo del dettaglio del lotto, nascondendo il pannello e ripristinando lo scroll della pagina
const closeLotDetailDialog = () => {
  if (!labelLotDetailCard) return;
  labelLotDetailCard.classList.add('hidden');
  document.body.style.overflow = '';
};
// Funzione per ottenere un testo riassuntivo dello stato di stampa di un lotto, indicando quante volte è stato stampato e quando è stata l'ultima stampa, o se non è mai stato stampato
const getPrintedSummaryText = (lot) => {
  const printedCount = Number.isFinite(lot?.labelsPrintedCount) ? lot.labelsPrintedCount : 0;
  if (printedCount <= 0) {
    return 'Mai stampate';
  }

  const printedAt = lot?.labelsLastPrintedAt ? formatDate(lot.labelsLastPrintedAt) : '-';
  return `Stampate ${printedCount} • ultima ${printedAt}`;
};
// Se la stampa è stata fatta almeno una volta, consideriamo ristampabile. 
const isLotPrinted = (lot) => {
  const printedCount = Number.isFinite(lot?.labelsPrintedCount) ? lot.labelsPrintedCount : 0;
  return Boolean(lot?.labelsPrinted) || printedCount > 0;
};
// menu di navigazione 
const syncReprintPreviewFields = (lot, expiryDateValue) => {
  if (labelDetailProducer) labelDetailProducer.textContent = getProducerName();
  if (labelDetailLotNumber) labelDetailLotNumber.textContent = lot?.lotNumber || '-';
  if (labelDetailProduct) labelDetailProduct.textContent = lot?.nomeProdotto || '-';
  if (labelDetailCreatedAt) labelDetailCreatedAt.textContent = formatDate(lot?.createdAt);
  if (labelDetailExpiryText) labelDetailExpiryText.textContent = expiryDateValue || '-';

  const qrImage = String(lot?.qrCodeImage || '').trim();
  if (labelDetailQrImage) {
    if (qrImage) {
      labelDetailQrImage.src = qrImage;
      labelDetailQrImage.classList.remove('hidden');
      labelDetailQrImage.alt = `QR lotto ${lot?.lotNumber || ''}`;
    } else {
      labelDetailQrImage.removeAttribute('src');
      labelDetailQrImage.classList.add('hidden');
    }
  }

  if (labelDetailQrMissing) {
    labelDetailQrMissing.classList.toggle('hidden', Boolean(qrImage));
  }
};
//selezione lotto e visualizzazione dettaglio
const upsertSelectedLot = (lot) => {
  const key = getLotKey(lot);
  if (!key) return;

  const current = selectedLots.get(key);
  if (current) {
    current.lot = lot;
    selectedLots.set(key, current);
    return;
  }

  selectedLots.set(key, {
    lot,
    expiryDate: '',
    copies: 1
  });
};
// filtraggio lotto
const getFilteredLots = () => {
  const query = String(labelLotsFilterInput?.value || '').trim().toLowerCase();
  const createdFrom = String(labelCreatedFromInput?.value || '').trim();
  const createdTo = String(labelCreatedToInput?.value || '').trim();

  const fromDate = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
  const toDate = createdTo ? new Date(`${createdTo}T23:59:59`) : null;

  if (!query && !createdFrom && !createdTo) {
    return allLots;
  }

  return allLots.filter((lot) => {
    const lotNumber = String(lot?.lotNumber || '').toLowerCase();
    const product = String(lot?.nomeProdotto || '').toLowerCase();
    const byText = !query || lotNumber.includes(query) || product.includes(query);

    const createdAt = new Date(lot?.createdAt);
    const byDate = Number.isNaN(createdAt.getTime())
      ? (!fromDate && !toDate)
      : ((!fromDate || createdAt >= fromDate) && (!toDate || createdAt <= toDate));

    return byText && byDate;
  });
};
// finestra di dialogo con dettagli
const openLotDetail = (lot) => {
  if (!isLotPrinted(lot)) {
    labelSetStatus('Ristampa disponibile solo per lotti già stampati almeno una volta.', 'red');
    return;
  }

  activeDetailLot = lot;
  if (!labelLotDetailCard) return;

  if (labelDetailPrintedStatus) labelDetailPrintedStatus.textContent = getPrintedSummaryText(lot);

  let expiryValue = '';
  if (labelDetailExpiryInput) {
    expiryValue = formatDateInputValue(lot?.labelsLastExpiryDate);
    labelDetailExpiryInput.value = expiryValue;
  }

  if (labelDetailCopiesInput) {
    const defaultCopies = Number.isFinite(lot?.labelsLastPrintCopies) && lot.labelsLastPrintCopies > 0
      ? lot.labelsLastPrintCopies
      : 1;
    labelDetailCopiesInput.value = String(defaultCopies);
  }

  syncReprintPreviewFields(lot, expiryValue);

  labelLotDetailCard.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};
// etichette da ristampare per un lotto specifico, con configurazione di scadenza e copie
const buildLabelsForSingleLot = (lot, copies, expiryDate) => {
  const normalizedCopies = Number.isFinite(copies) && copies > 0 ? Math.floor(copies) : 1;
  const labels = [];
  for (let i = 0; i < normalizedCopies; i += 1) {
    labels.push({
      lotId: String(lot?._id || lot?.id || ''),
      producer: getProducerName(),
      lotNumber: lot?.lotNumber || '-',
      product: lot?.nomeProdotto || '-',
      createdAt: formatDate(lot?.createdAt),
      expiryDate: expiryDate || '-',
      qrCodeImage: lot?.qrCodeImage || ''
    });
  }
  return labels;
};
// render dell'elenco dei lotti filtrati, con gestione della selezione tramite checkbox, click sulla riga per aprire il dettaglio, e supporto per selezioni multiple con Shift, oltre a indicare visivamente i lotti già stampati e quelli ristampabili
const renderLotsSelectionTable = () => {
  if (!labelLotsTableBody) return;
  labelLotsTableBody.innerHTML = '';

  const filtered = getFilteredLots();
  if (!filtered.length) {
    labelLotsTableBody.innerHTML = '<tr><td colspan="5">Nessun lotto trovato.</td></tr>';
    return;
  }

  filtered.forEach((lot, index) => {
    const key = getLotKey(lot);
    const row = document.createElement('tr');
    row.classList.add('label-lot-row-clickable');
    const isChecked = selectedLots.has(key);

    const printedCount = Number.isFinite(lot?.labelsPrintedCount) ? lot.labelsPrintedCount : 0;
    const isPrinted = Boolean(lot?.labelsPrinted) || printedCount > 0;

    if (isPrinted) {
      row.classList.add('label-row-printed');
      row.classList.add('label-lot-row-reprintable');
    } else {
      row.classList.add('label-lot-row-disabled');
    }

    row.innerHTML = `
      <td><input type="checkbox" class="label-lot-checkbox" data-key="${escapeHtml(key)}" ${isChecked ? 'checked' : ''}></td>
      <td>${escapeHtml(lot.lotNumber || '-')}</td>
      <td>${escapeHtml(lot.nomeProdotto || '-')}</td>
      <td>${escapeHtml(formatDate(lot.createdAt))}</td>
      <td>
        ${isPrinted
          ? `<span class="label-printed-badge">${escapeHtml(getPrintedSummaryText(lot))}</span>`
          : '<span class="label-not-printed">Mai stampate</span>'}
      </td>
    `;

    row.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('input')) {
        return;
      }
      openLotDetail(lot);
    });

    const checkbox = row.querySelector('.label-lot-checkbox');
    checkbox?.addEventListener('click', (event) => {
      event.stopPropagation();

      if (checkbox.checked) {
        upsertSelectedLot(lot);
      } else {
        selectedLots.delete(key);
      }

      if (event.shiftKey && lastShiftSelectionIndex !== null && lastShiftSelectionIndex !== index) {
        const start = Math.min(lastShiftSelectionIndex, index);
        const end = Math.max(lastShiftSelectionIndex, index);
        for (let i = start; i <= end; i += 1) {
          const rangeLot = filtered[i];
          if (!rangeLot) continue;

          const rangeKey = getLotKey(rangeLot);
          if (!rangeKey) continue;

          if (checkbox.checked) {
            upsertSelectedLot(rangeLot);
          } else {
            selectedLots.delete(rangeKey);
          }
        }

        renderLotsSelectionTable();
        return;
      }

      lastShiftSelectionIndex = index;
    });

    labelLotsTableBody.appendChild(row);
  });
};
// caricamento lotti in base all'azienda selezionata, con gestione degli errori e aggiornamento dello stato di caricamento
const renderConfigTable = () => {
  if (!labelConfigTableBody) return;
  labelConfigTableBody.innerHTML = '';

  const items = [...selectedLots.values()];
  if (!items.length) {
    labelConfigTableBody.innerHTML = '<tr><td colspan="4">Nessun lotto selezionato.</td></tr>';
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(item.lot.lotNumber || '-')}</td>
      <td>${escapeHtml(item.lot.nomeProdotto || '-')}</td>
      <td><input type="date" class="label-expiry-input" data-index="${index}" value="${escapeHtml(item.expiryDate || '')}"></td>
      <td><input type="number" class="label-copies-input" min="1" max="200" step="1" data-index="${index}" value="${escapeHtml(item.copies || 1)}"></td>
    `;

    const expiryInput = row.querySelector('.label-expiry-input');
    const copiesInput = row.querySelector('.label-copies-input');

    expiryInput?.addEventListener('change', () => {
      item.expiryDate = String(expiryInput.value || '').trim();
    });

    copiesInput?.addEventListener('change', () => {
      const next = Number.parseInt(copiesInput.value, 10);
      item.copies = Number.isFinite(next) && next > 0 ? next : 1;
      copiesInput.value = String(item.copies);
    });

    labelConfigTableBody.appendChild(row);
  });
};
// configurazione etichette
const buildLabels = () => {
  const producer = getProducerName();
  const labels = [];

  selectedLots.forEach((item) => {
    const copies = Number.isFinite(item.copies) && item.copies > 0 ? item.copies : 1;
    for (let i = 0; i < copies; i += 1) {
      labels.push({
        lotId: String(item.lot?._id || item.lot?.id || ''),
        producer,
        lotNumber: item.lot.lotNumber || '-',
        product: item.lot.nomeProdotto || '-',
        createdAt: formatDate(item.lot.createdAt),
        expiryDate: item.expiryDate || '-',
        qrCodeImage: item.lot.qrCodeImage || ''
      });
    }
  });

  return labels;
};
// anteprima da stampare
const renderPreview = () => {
  if (!labelPreviewGrid || !labelTotalCount || !labelProducerName) return;
  const labels = buildLabels();

  labelProducerName.textContent = getProducerName();
  labelTotalCount.textContent = String(labels.length);
  labelPreviewGrid.innerHTML = '';

  if (!labels.length) {
    labelPreviewGrid.innerHTML = '<p>Nessuna etichetta da mostrare.</p>';
    return;
  }

  labels.slice(0, 12).forEach((label) => {
    const card = document.createElement('article');
    card.className = 'label-preview-card';
    card.innerHTML = `
      <p><strong>Azienda:</strong> ${escapeHtml(label.producer)}</p>
      <p><strong>Lotto:</strong> ${escapeHtml(label.lotNumber)}</p>
      <p><strong>Prodotto:</strong> ${escapeHtml(label.product)}</p>
      <p><strong>Creato:</strong> ${escapeHtml(label.createdAt)}</p>
      <p><strong>Scadenza:</strong> ${escapeHtml(label.expiryDate)}</p>
      ${label.qrCodeImage ? `<img src="${escapeHtml(label.qrCodeImage)}" alt="QR lotto ${escapeHtml(label.lotNumber)}">` : '<p>QR non disponibile</p>'}
    `;
    labelPreviewGrid.appendChild(card);
  });

  if (labels.length > 12) {
    const more = document.createElement('p');
    more.className = 'status';
    more.textContent = `Anteprima ridotta: mostrate 12 etichette su ${labels.length}.`;
    labelPreviewGrid.appendChild(more);
  }
};
// validazione step 2
const validateStep2 = () => {
  if (!selectedLots.size) {
    labelSetStatus('Seleziona almeno un lotto.', 'red');
    return false;
  }

  let ok = true;
  selectedLots.forEach((item) => {
    if (!item.expiryDate) ok = false;
    if (!Number.isFinite(item.copies) || item.copies < 1) ok = false;
  });

  if (!ok) {
    labelSetStatus('Compila scadenza e copie valide per ogni lotto selezionato.', 'red');
    return false;
  }

  return true;
};
// settaggio step e navigazione tra step, con gestione della visibilità dei pulsanti e dei pannelli in base allo step corrente
const setStep = (step) => {
  currentStep = step;

  [1, 2, 3].forEach((s) => {
    const panel = stepPanels[s];
    const btn = stepButtons[s];
    if (panel) panel.classList.toggle('hidden', s !== step);
    if (btn) btn.classList.toggle('is-active', s === step);
  });

  labelPrevBtn.classList.toggle('hidden', step === 1);
  labelNextBtn.classList.toggle('hidden', step === 3);
  labelPrintBtn.classList.toggle('hidden', step !== 3);
};
// gestione click su next
const onNext = () => {
  if (currentStep === 1) {
    if (!selectedLots.size) {
      labelSetStatus('Seleziona almeno un lotto per continuare.', 'red');
      return;
    }
    renderConfigTable();
    setStep(2);
    labelSetStatus('Step 2: imposta scadenza e copie per ciascun lotto.');
    return;
  }

  if (currentStep === 2) {
    if (!validateStep2()) return;
    renderPreview();
    setStep(3);
    labelSetStatus('Step 3: verifica anteprima e stampa.', '#2f855a');
  }
};
// gestione click su precedente
const onPrev = () => {
  if (currentStep === 3) {
    setStep(2);
    return;
  }
  if (currentStep === 2) {
    setStep(1);
  }
};
// carica i lotti 
const loadLots = async () => {
  const aziendaId = getCurrentAziendaId();
  if (!aziendaId) {
    labelSetStatus('Seleziona prima un\'azienda attiva.', 'red');
    allLots = [];
    renderLotsSelectionTable();
    return;
  }

  labelSetStatus('Caricamento lotti in corso...');

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/lotti-prodotto?aziendaId=${encodeURIComponent(aziendaId)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const data = await response.json().catch(() => ([]));
    if (!response.ok) {
      labelSetStatus(data.message || 'Errore durante il recupero dei lotti.', 'red');
      allLots = [];
      renderLotsSelectionTable();
      return;
    }

    allLots = Array.isArray(data) ? data : [];
    renderLotsSelectionTable();

    if (activeDetailLot) {
      const refreshed = allLots.find((item) => getLotKey(item) === getLotKey(activeDetailLot));
      if (refreshed) {
        openLotDetail(refreshed);
      } else {
        activeDetailLot = null;
        closeLotDetailDialog();
      }
    }

    consumeReprintTargetFromQuery();

    labelSetStatus('Seleziona i lotti da etichettare (Shift per intervalli).', '#2f855a');
  } catch (error) {
    console.error('Errore caricamento lotti etichette:', error);
    labelSetStatus('Errore di connessione al server.', 'red');
    allLots = [];
    renderLotsSelectionTable();
  }
};

const buildPrintPayloadByLot = () => {
  const payload = [];
  selectedLots.forEach((item) => {
    const lottoId = String(item?.lot?._id || item?.lot?.id || '').trim();
    const copies = Number.isFinite(item?.copies) && item.copies > 0 ? Math.floor(item.copies) : 1;
    const expiryDate = String(item?.expiryDate || '').trim();
    if (!lottoId) return;
    payload.push({ lottoId, copies, expiryDate });
  });
  return payload;
};
// salva se le etichette sono state stam
const persistPrintedLabelsOnDb = async (prints) => {
  const aziendaId = getCurrentAziendaId();
  if (!aziendaId) {
    throw new Error('Azienda non selezionata');
  }

  const normalizedPrints = Array.isArray(prints) ? prints : [];
  if (!normalizedPrints.length) {
    throw new Error('Nessun lotto valido da registrare');
  }

  const token = localStorage.getItem('token');
  const response = await fetch('/api/lotti-prodotto/mark-printed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ aziendaId, prints: normalizedPrints })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Impossibile aggiornare stato stampa su DB');
  }
};

const buildPrintHtml = (labels = []) => {
  const cards = labels.map((label) => `
    <article class="print-label-card">
      <h1>${escapeHtml(label.producer)}</h1>
      <p><strong>Lotto:</strong> ${escapeHtml(label.lotNumber)}</p>
      <p><strong>Prodotto:</strong> ${escapeHtml(label.product)}</p>
      <p><strong>Creato:</strong> ${escapeHtml(label.createdAt)}</p>
      <p><strong>Scadenza:</strong> ${escapeHtml(label.expiryDate)}</p>
      <div class="print-brand-qr-row">
        <div class="print-logo-wrap">
          <img src="${PRINT_LOGO_SRC}" alt="Logo MuccApp" onerror="this.style.display='none'; this.parentElement.classList.add('is-hidden');">
          <span class="print-logo-fallback">MuccApp</span>
        </div>
        <div class="print-qr-wrap">
          ${label.qrCodeImage ? `<img src="${escapeHtml(label.qrCodeImage)}" alt="QR ${escapeHtml(label.lotNumber)}">` : '<span>QR non disponibile</span>'}
        </div>
      </div>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Stampa Etichette</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; }
    .print-sheet {
      display: grid;
      grid-template-columns: repeat(auto-fill, 58mm);
      grid-auto-rows: 40mm;
      gap: 2mm;
      justify-content: start;
      align-content: start;
    }
    .print-label-card {
      width: 58mm;
      height: 40mm;
      padding: 2.2mm;
      border: 0.2mm solid #111;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      break-inside: avoid;
    }
    h1 { margin: 0 0 1mm; font-size: 2.8mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    p { margin: 0.3mm 0; font-size: 2.4mm; line-height: 1.15; }
    .print-brand-qr-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2mm;
      margin-top: 0.6mm;
    }
    .print-logo-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 44mm;
    }
    .print-logo-wrap.is-hidden { min-width: 0; }
    .print-logo-wrap img {
      width: 34mm;
      height: 15mm;
      object-fit: contain;
      display: block;
    }
    .print-logo-fallback {
      font-size: 2.1mm;
      font-weight: 700;
      letter-spacing: 0.06mm;
      color: #14532d;
      line-height: 1;
      margin-top: 0.4mm;
    }
    .print-logo-wrap img:not([style*="display: none"]) + .print-logo-fallback {
      display: none;
    }
    .print-qr-wrap { text-align: right; margin-left: auto; }
    .print-qr-wrap img { width: 12mm; height: 12mm; object-fit: contain; }
    .print-qr-wrap span { font-size: 2.1mm; }
  </style>
</head>
<body>
  <section class="print-sheet">
    ${cards}
  </section>
</body>
</html>`;
};

const executePrint = async ({ labels, persistPayload, successMessage }) => {
  if (!labels.length) {
    labelSetStatus('Nessuna etichetta da stampare.', 'red');
    return;
  }

  const oldFrame = document.getElementById('labelPrintFrame');
  if (oldFrame && oldFrame.parentNode) {
    oldFrame.parentNode.removeChild(oldFrame);
  }

  const frame = document.createElement('iframe');
  frame.id = 'labelPrintFrame';
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';
  frame.setAttribute('aria-hidden', 'true');

  let hasPrinted = false;
  frame.onload = () => {
    if (hasPrinted) return;

    const hasLabelContent = frame.contentDocument?.querySelector('.print-label-card');
    if (!hasLabelContent) {
      return;
    }

    hasPrinted = true;
    try {
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        labelSetStatus('Impossibile avviare la stampa.', 'red');
        return;
      }

      printWindow.focus();
      printWindow.print();

      persistPrintedLabelsOnDb(persistPayload)
        .then(() => loadLots())
        .then(() => {
          labelSetStatus(successMessage, '#2f855a');
          if (activeDetailLot) {
            const refreshed = allLots.find((item) => getLotKey(item) === getLotKey(activeDetailLot));
            if (refreshed) {
              openLotDetail(refreshed);
            }
          }
        })
        .catch((error) => {
          console.error('Errore salvataggio stato stampa su DB:', error);
          labelSetStatus('Stampa avviata, ma salvataggio su DB non riuscito.', 'red');
        });
    } catch (error) {
      console.error('Errore stampa etichette:', error);
      labelSetStatus('Errore durante la stampa.', 'red');
    } finally {
      setTimeout(() => {
        const current = document.getElementById('labelPrintFrame');
        if (current && current.parentNode) {
          current.parentNode.removeChild(current);
        }
      }, 1500);
    }
  };

  const printHtml = buildPrintHtml(labels);
  if ('srcdoc' in frame) {
    frame.srcdoc = printHtml;
  } else {
    frame.src = `data:text/html;charset=utf-8,${encodeURIComponent(printHtml)}`;
  }
  document.body.appendChild(frame);
};

const printLabels = async () => {
  const labels = buildLabels();
  const persistPayload = buildPrintPayloadByLot();
  await executePrint({
    labels,
    persistPayload,
    successMessage: `Stampa avviata per ${labels.length} etichette. Stato salvato su DB.`
  });
};

const reprintActiveLot = async () => {
  if (!activeDetailLot) {
    labelSetStatus('Seleziona un lotto dalla tabella per la ristampa.', 'red');
    return;
  }

  const copies = Number.parseInt(String(labelDetailCopiesInput?.value || '1'), 10);
  const safeCopies = Number.isFinite(copies) && copies > 0 ? copies : 1;
  if (labelDetailCopiesInput) {
    labelDetailCopiesInput.value = String(safeCopies);
  }

  const expiryDate = String(labelDetailExpiryInput?.value || '').trim();
  if (!expiryDate) {
    labelSetStatus('Inserisci la data di scadenza per la ristampa.', 'red');
    return;
  }

  const labels = buildLabelsForSingleLot(activeDetailLot, safeCopies, expiryDate);
  const lotId = String(activeDetailLot?._id || activeDetailLot?.id || '').trim();
  if (!lotId) {
    labelSetStatus('Lotto non valido per la ristampa.', 'red');
    return;
  }

  await executePrint({
    labels,
    persistPayload: [{ lottoId: lotId, copies: safeCopies, expiryDate }],
    successMessage: `Ristampa avviata per ${safeCopies} etichette del lotto ${activeDetailLot.lotNumber || '-'}.`
  });
};

if (labelLotsFilterInput) {
  labelLotsFilterInput.addEventListener('input', () => {
    renderLotsSelectionTable();
  });
}

if (labelCreatedFromInput) {
  labelCreatedFromInput.addEventListener('change', () => {
    renderLotsSelectionTable();
  });
}

if (labelCreatedToInput) {
  labelCreatedToInput.addEventListener('change', () => {
    renderLotsSelectionTable();
  });
}

if (labelDetailExpiryInput) {
  labelDetailExpiryInput.addEventListener('input', () => {
    if (!activeDetailLot) return;
    syncReprintPreviewFields(activeDetailLot, String(labelDetailExpiryInput.value || '').trim());
  });
}

if (labelLotsReloadBtn) {
  labelLotsReloadBtn.addEventListener('click', () => {
    loadLots();
  });
}

if (labelNextBtn) {
  labelNextBtn.addEventListener('click', onNext);
}

if (labelPrevBtn) {
  labelPrevBtn.addEventListener('click', onPrev);
}

if (labelPrintBtn) {
  labelPrintBtn.addEventListener('click', async () => {
    if (!validateStep2()) {
      setStep(2);
      return;
    }
    await printLabels();
  });
}

if (labelDetailReprintBtn) {
  labelDetailReprintBtn.addEventListener('click', async () => {
    await reprintActiveLot();
  });
}

if (labelCloseReprintDialogBtn) {
  labelCloseReprintDialogBtn.addEventListener('click', () => {
    closeLotDetailDialog();
  });
}

if (labelLotDetailCard) {
  labelLotDetailCard.addEventListener('click', (event) => {
    if (event.target === labelLotDetailCard) {
      closeLotDetailDialog();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && labelLotDetailCard && !labelLotDetailCard.classList.contains('hidden')) {
    closeLotDetailDialog();
  }
});

Object.entries(stepButtons).forEach(([step, btn]) => {
  btn?.addEventListener('click', () => {
    const numericStep = Number(step);
    if (numericStep < currentStep) {
      setStep(numericStep);
      return;
    }

    if (numericStep === 2 && selectedLots.size > 0) {
      renderConfigTable();
      setStep(2);
      return;
    }

    if (numericStep === 3 && validateStep2()) {
      renderPreview();
      setStep(3);
    }
  });
});

labelSetStatus('Pronto. Carico i lotti disponibili...');
loadReprintTargetFromQuery();
setStep(1);
loadLots();
