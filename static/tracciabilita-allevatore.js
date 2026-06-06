const farmLotFilterInput = document.getElementById('farmLotFilterInput');
const farmReloadLotsBtn = document.getElementById('farmReloadLotsBtn');
const farmTraceStatus = document.getElementById('farmTraceStatus');
const farmLotsList = document.getElementById('farmLotsList');

const farmTraceDialog = document.getElementById('farmTraceDialog');
const farmCloseTraceDialogBtn = document.getElementById('farmCloseTraceDialogBtn');
const farmDialogSubtitle = document.getElementById('farmDialogSubtitle');
const farmDetailPanel = document.getElementById('farmDetailPanel');
const farmPrintLabelBtn = document.getElementById('farmPrintLabelBtn');

const farmLottoId = document.getElementById('farmLottoId');
const farmAziendaId = document.getElementById('farmAziendaId');
const farmLotNumber = document.getElementById('farmLotNumber');
const farmLotProduct = document.getElementById('farmLotProduct');
const farmLotQuantity = document.getElementById('farmLotQuantity');
const farmLotCreatedAt = document.getElementById('farmLotCreatedAt');

const farmTimelineList = document.getElementById('farmTimelineList');
const farmMungitureList = document.getElementById('farmMungitureList');
const farmAnimalsList = document.getElementById('farmAnimalsList');

let cachedLots = [];
let currentTraceData = null;

const farmSetStatus = (message, color = '#3d5a1a') => {
  if (!farmTraceStatus) return;
  farmTraceStatus.style.color = color;
  farmTraceStatus.textContent = message;
};

const farmFormatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('it-IT');
};

const farmOpenDialog = () => {
  if (!farmTraceDialog) return;
  farmTraceDialog.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

const farmCloseDialog = () => {
  if (!farmTraceDialog) return;
  farmTraceDialog.classList.add('hidden');
  document.body.style.overflow = '';
};

const timelineIconByType = (type) => {
  if (type === 'mungitura') return '🥛';
  if (type === 'lavorazione') return '🧀';
  return '📦';
};

const safeStatusLabel = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw || 'n/d';
};

const toStatusCssClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('consegna')) return 'trace-history-status delivery';
  if (normalized.includes('stagionat') || normalized.includes('stoccaggio')) return 'trace-history-status storage';
  if (normalized.includes('pianific')) return 'trace-history-status planning';
  if (normalized.includes('lavor')) return 'trace-history-status processing';
  return 'trace-history-status';
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const farmPrintCurrentLabel = () => {
  const lotto = currentTraceData?.lotto || null;
  if (!lotto?.lotNumber) {
    farmSetStatus('Apri prima il dettaglio di un lotto per ristampare l\'etichetta.', 'red');
    return;
  }

  const params = new URLSearchParams();
  params.set('reprintLot', String(lotto.lotNumber || '').trim());
  if (lotto.id) {
    params.set('reprintLotId', String(lotto.id));
  }

  window.location.href = `/crea-etichette.html?${params.toString()}`;
};

const setActiveItem = (container, activeElement) => {
  if (!container) return;
  container.querySelectorAll('.trace-selectable-item').forEach((el) => el.classList.remove('is-active'));
  if (activeElement) {
    activeElement.classList.add('is-active');
  }
};

const getCurrentAziendaId = () => {
  const direct = (localStorage.getItem('selectedAziendaId') || '').trim();
  if (direct) return direct;

  try {
    const map = JSON.parse(localStorage.getItem('selectedAziendaByUser') || '{}');
    const userId = (localStorage.getItem('userId') || '').trim();
    if (userId && typeof map[userId] === 'string' && map[userId].trim()) {
      return map[userId].trim();
    }
  } catch (error) {
    console.warn('Impossibile leggere selectedAziendaByUser:', error);
  }

  return '';
};

const renderLotsList = (items = []) => {
  if (!farmLotsList) return;
  farmLotsList.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement('li');
    li.className = 'trace-history-item';
    li.textContent = 'Nessun lotto disponibile per questa azienda.';
    farmLotsList.appendChild(li);
    return;
  }

  items.forEach((lot) => {
    const li = document.createElement('li');
    li.className = 'trace-history-item trace-clickable';
    li.dataset.lotNumber = lot.lotNumber || '';

    const title = lot.lotNumber || 'Lotto senza codice';
    const subtitle = `${lot.nomeProdotto || 'Prodotto'} (${lot.quantity ?? '-'} ${lot.unit || ''})`;
    const status = safeStatusLabel(lot.status);
    const statusClass = toStatusCssClass(status);

    li.innerHTML = `
      <div class="trace-history-left">
        <div class="trace-history-icon">📦</div>
        <div class="trace-history-text">
          <p class="trace-history-title">${escapeHtml(title)}</p>
          <p class="trace-history-subtitle">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <span class="${statusClass}">${escapeHtml(status)}</span>
    `;

    li.addEventListener('click', () => {
      const lotNumber = li.dataset.lotNumber || '';
      if (lotNumber) {
        farmLoadTraceability(lotNumber);
      }
    });

    farmLotsList.appendChild(li);
  });
};

const applyLotsFilter = () => {
  const query = typeof farmLotFilterInput?.value === 'string' ? farmLotFilterInput.value.trim().toLowerCase() : '';
  if (!query) {
    renderLotsList(cachedLots);
    return;
  }

  const filtered = cachedLots.filter((lot) => {
    const id = String(lot.id || '').toLowerCase();
    const lotNumber = String(lot.lotNumber || '').toLowerCase();
    const nomeProdotto = String(lot.nomeProdotto || '').toLowerCase();
    const status = String(lot.status || '').toLowerCase();
    return id.includes(query)
      || lotNumber.includes(query)
      || nomeProdotto.includes(query)
      || status.includes(query);
  });

  renderLotsList(filtered);
};

const loadLotsList = async () => {
  const aziendaId = getCurrentAziendaId();
  if (!aziendaId) {
    farmSetStatus('Seleziona prima un\'azienda attiva per vedere i lotti.', 'red');
    renderLotsList([]);
    return;
  }

  farmSetStatus('Caricamento elenco lotti in corso...');

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/tracciabilita/lotti?aziendaId=${encodeURIComponent(aziendaId)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      farmSetStatus(data.message || 'Errore durante il recupero dell\'elenco lotti.', 'red');
      renderLotsList([]);
      return;
    }

    cachedLots = Array.isArray(data.items) ? data.items : [];
    applyLotsFilter();
    farmSetStatus('Elenco lotti aggiornato. Clicca una riga per vedere i dettagli.', '#2f855a');
  } catch (error) {
    console.error('Errore elenco lotti:', error);
    farmSetStatus('Errore di connessione al server.', 'red');
    renderLotsList([]);
  }
};

const farmRenderTimelineDetail = (event) => {
  if (!farmDetailPanel) return;

  const when = farmFormatDateTime(event?.at);
  const status = safeStatusLabel(event?.status);
  const lavorazione = currentTraceData?.lavorazione || null;

  if (event?.type === 'lavorazione') {
    farmDetailPanel.innerHTML = `
      <h4>Dettaglio lavorazione</h4>
      <p><strong>ID:</strong> ${escapeHtml(event.lavorazioneId || '-')}</p>
      <p><strong>Stato:</strong> ${escapeHtml(status)}</p>
      <p><strong>Inizio:</strong> ${escapeHtml(when)}</p>
      <p><strong>Output:</strong> ${escapeHtml(event.outputQuantity ?? '-')} ${escapeHtml(event.outputUnit || '')}</p>
      <p><strong>Note:</strong> ${escapeHtml(lavorazione?.notes || 'Nessuna nota')}</p>
      <p><strong>Fasi disponibili:</strong> ${Array.isArray(lavorazione?.fasi) ? lavorazione.fasi.length : 0}</p>
    `;
    return;
  }

  if (event?.type === 'mungitura') {
    const m = Array.isArray(currentTraceData?.mungiture)
      ? currentTraceData.mungiture.find((item) => String(item._id) === String(event.mungituraId))
      : null;
    farmRenderMungituraDetail(m || event);
    return;
  }

  farmDetailPanel.innerHTML = `
    <h4>Dettaglio lotto</h4>
    <p><strong>ID lotto:</strong> ${escapeHtml(event?.lottoId || currentTraceData?.lotto?.id || '-')}</p>
    <p><strong>Stato:</strong> ${escapeHtml(status)}</p>
    <p><strong>Data:</strong> ${escapeHtml(when)}</p>
    <p><strong>Quantità:</strong> ${escapeHtml(event?.quantity ?? currentTraceData?.lotto?.quantity ?? '-')} ${escapeHtml(event?.unit || currentTraceData?.lotto?.unit || '')}</p>
  `;
};

const farmRenderPhaseDetail = (fase, index) => {
  if (!farmDetailPanel) return;
  const lavorazione = currentTraceData?.lavorazione || null;
  const state = fase?.completed ? 'completata' : 'in corso';

  farmDetailPanel.innerHTML = `
    <h4>Dettaglio fase lavorazione</h4>
    <p><strong>Fase:</strong> ${escapeHtml(index)} - ${escapeHtml(fase?.name || 'n/d')}</p>
    <p><strong>Stato fase:</strong> ${escapeHtml(state)}</p>
    <p><strong>Note lavorazione:</strong> ${escapeHtml(lavorazione?.notes || 'Nessuna nota')}</p>
  `;
};

const farmRenderMungituraDetail = (m) => {
  if (!farmDetailPanel) return;
  const started = farmFormatDateTime(m?.startedAt);
  const ended = farmFormatDateTime(m?.endedAt);
  const relatedAnimal = Array.isArray(currentTraceData?.animals)
    ? currentTraceData.animals.find((item) => String(item.id) === String(m?.animaleId))
    : null;

  farmDetailPanel.innerHTML = `
    <h4>Dettaglio mungitura</h4>
    <p><strong>ID mungitura:</strong> ${escapeHtml(m?._id || m?.mungituraId || '-')}</p>
    <p><strong>Animale:</strong> ${escapeHtml(m?.animaleId || '-')} ${relatedAnimal ? `(${escapeHtml(relatedAnimal.name || 'Animale')})` : ''}</p>
    <p><strong>Stato:</strong> ${escapeHtml(safeStatusLabel(m?.status))}</p>
    <p><strong>Inizio:</strong> ${escapeHtml(started)}</p>
    <p><strong>Fine:</strong> ${escapeHtml(ended)}</p>
    <p><strong>Quantità:</strong> ${escapeHtml(m?.quantity ?? '-')} ${escapeHtml(m?.unit || '')}</p>
    <p><strong>Note:</strong> ${escapeHtml(m?.notes || 'Nessuna nota')}</p>
  `;
};

const farmRenderAnimalDetail = (animal) => {
  if (!farmDetailPanel) return;
  const b = animal?.benessere || {};

  farmDetailPanel.innerHTML = `
    <h4>Dettaglio animale</h4>
    <p><strong>ID:</strong> ${escapeHtml(animal?.id || '-')}</p>
    <p><strong>Nome:</strong> ${escapeHtml(animal?.name || '-')}</p>
    <p><strong>Matricola:</strong> ${escapeHtml(animal?.matricola || '-')}</p>
    <p><strong>Specie:</strong> ${escapeHtml(animal?.species || '-')}</p>
    <p><strong>Sesso:</strong> ${escapeHtml(animal?.sesso || '-')}</p>
    <p><strong>Passi (30d):</strong> ${escapeHtml(b.steps30d ?? '-')}</p>
    <p><strong>Outdoor (30d):</strong> ${escapeHtml(b.outdoorHours30d ?? '-')}</p>
    <p><strong>Temperatura min/avg/max:</strong> ${escapeHtml(b.temperature?.min ?? '-')} / ${escapeHtml(b.temperature?.avg ?? '-')} / ${escapeHtml(b.temperature?.max ?? '-')}</p>
    <p><strong>BPM min/avg/max:</strong> ${escapeHtml(b.bpm?.min ?? '-')} / ${escapeHtml(b.bpm?.avg ?? '-')} / ${escapeHtml(b.bpm?.max ?? '-')}</p>
    <p><strong>Alert attività bassa:</strong> ${escapeHtml(b.alerts?.lowActivityCount ?? 0)}</p>
    <p><strong>Alert temperatura alta:</strong> ${escapeHtml(b.alerts?.highTemperatureCount ?? 0)}</p>
    <p><strong>Alert bpm alto:</strong> ${escapeHtml(b.alerts?.highBpmCount ?? 0)}</p>
  `;
};

const farmRenderTimeline = (timeline = []) => {
  if (!farmTimelineList) return;
  farmTimelineList.innerHTML = '';

  if (!Array.isArray(timeline) || timeline.length === 0) {
    const li = document.createElement('li');
    li.className = 'trace-history-item';
    li.textContent = 'Nessun evento disponibile.';
    farmTimelineList.appendChild(li);
    return;
  }

  const mungituraEvents = timeline.filter((item) => item?.type === 'mungitura');
  let mungituraIndex = 0;

  timeline.forEach((event) => {
    const li = document.createElement('li');
    li.className = `trace-history-item trace-selectable-item trace-clickable trace-timeline-item trace-timeline-${event.type || 'lotto'}`;

    const when = farmFormatDateTime(event.at);
    const status = safeStatusLabel(event.status);
    let title = 'Lotto';
    let subtitle = when;
    let iconMarkup = '<span class="trace-timeline-emoji">📦</span>';

    if (event.type === 'mungitura') {
      mungituraIndex += 1;
      title = `Mungitura (${mungituraIndex}/${mungituraEvents.length || 1})`;
      subtitle = `${when} • ${event.quantity ?? '-'} ${event.unit || ''}`.trim();
      iconMarkup = '<span class="trace-timeline-emoji">🥛🥛</span>';
    } else if (event.type === 'lavorazione') {
      title = 'Lavorazione Completa';
      subtitle = `${when} • output ${event.outputQuantity ?? '-'} ${event.outputUnit || ''}`.trim();
      iconMarkup = '<span class="trace-timeline-emoji">🥣</span>';
    } else {
      title = 'Lotto Creato';
      subtitle = `${when} • ${event.quantity ?? '-'} ${event.unit || ''}`.trim();
      iconMarkup = '<span class="trace-timeline-emoji">📦</span>';
    }

    const statusClass = toStatusCssClass(status);

    li.innerHTML = `
      <div class="trace-history-left">
        <div class="trace-history-icon trace-timeline-icon">${iconMarkup}</div>
        <div class="trace-history-text">
          <p class="trace-history-title">${escapeHtml(title)}</p>
          <p class="trace-history-subtitle">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <span class="${statusClass}">${escapeHtml(status)}</span>
    `;

    li.addEventListener('click', () => {
      setActiveItem(farmTimelineList, li);
      farmRenderTimelineDetail(event);
    });

    farmTimelineList.appendChild(li);

    if (event.type === 'lavorazione') {
      const fasi = Array.isArray(currentTraceData?.lavorazione?.fasi) ? currentTraceData.lavorazione.fasi : [];
      if (fasi.length) {
        const childContainer = document.createElement('ul');
        childContainer.className = 'trace-history-children';

        fasi.forEach((fase, index) => {
          const child = document.createElement('li');
          child.className = 'trace-history-item trace-selectable-item trace-clickable trace-child-item trace-timeline-item trace-timeline-phase';
          const childStatus = fase?.completed ? 'completata' : 'in corso';
          const childStatusClass = toStatusCssClass(childStatus);
          const faseName = String(fase?.name || 'n/d').toLowerCase();
          const faseIcon = faseName.includes('termic') ? '🌡️' : '⚙️';
          child.innerHTML = `
            <div class="trace-history-left">
              <div class="trace-history-icon trace-timeline-icon"><span class="trace-timeline-emoji">${faseIcon}</span></div>
              <div class="trace-history-text">
                <p class="trace-history-title">Fase ${index + 1}: ${escapeHtml(fase?.name || 'n/d')}</p>
                <p class="trace-history-subtitle">Dettaglio fase lavorazione</p>
              </div>
            </div>
            <span class="${childStatusClass}">${escapeHtml(childStatus)}</span>
          `;

          child.addEventListener('click', (evt) => {
            evt.stopPropagation();
            setActiveItem(farmTimelineList, child);
            farmRenderPhaseDetail(fase, index + 1);
          });

          childContainer.appendChild(child);
        });

        const wrapper = document.createElement('li');
        wrapper.className = 'trace-history-child-wrapper';
        wrapper.appendChild(childContainer);
        farmTimelineList.appendChild(wrapper);
      }
    }
  });
};

const farmRenderMungiture = (mungiture = []) => {
  if (!farmMungitureList) return;
  farmMungitureList.innerHTML = '';

  if (!Array.isArray(mungiture) || mungiture.length === 0) {
    const li = document.createElement('li');
    li.className = 'trace-history-item';
    li.textContent = 'Nessuna mungitura collegata.';
    farmMungitureList.appendChild(li);
    return;
  }

  mungiture.forEach((m) => {
    const li = document.createElement('li');
    li.className = 'trace-history-item trace-selectable-item trace-clickable';
    const status = safeStatusLabel(m.status);
    li.innerHTML = `
      <div class="trace-history-left">
        <div class="trace-history-icon">🥛</div>
        <div class="trace-history-text">
          <p class="trace-history-title">Mungitura ${escapeHtml(m._id || '-')}</p>
          <p class="trace-history-subtitle">Animale ${escapeHtml(m.animaleId || '-')} • ${escapeHtml(m.quantity ?? '-')} ${escapeHtml(m.unit || '')}</p>
        </div>
      </div>
      <span class="${toStatusCssClass(status)}">${escapeHtml(status)}</span>
    `;

    li.addEventListener('click', () => {
      setActiveItem(farmMungitureList, li);
      farmRenderMungituraDetail(m);
    });

    farmMungitureList.appendChild(li);
  });
};

const farmRenderAnimals = (animals = []) => {
  if (!farmAnimalsList) return;
  farmAnimalsList.innerHTML = '';

  if (!Array.isArray(animals) || animals.length === 0) {
    const li = document.createElement('li');
    li.className = 'trace-history-item';
    li.textContent = 'Nessun animale collegato.';
    farmAnimalsList.appendChild(li);
    return;
  }

  animals.forEach((animal) => {
    const li = document.createElement('li');
    li.className = 'trace-history-item trace-selectable-item trace-clickable';
    li.innerHTML = `
      <div class="trace-history-left">
        <div class="trace-history-icon">🐄</div>
        <div class="trace-history-text">
          <p class="trace-history-title">${escapeHtml(animal.name || 'Animale')}</p>
          <p class="trace-history-subtitle">Matricola ${escapeHtml(animal.matricola || '-')} • ${escapeHtml(animal.species || '-')}</p>
        </div>
      </div>
      <span class="trace-history-status">dettaglio</span>
    `;

    li.addEventListener('click', () => {
      setActiveItem(farmAnimalsList, li);
      farmRenderAnimalDetail(animal);
    });

    farmAnimalsList.appendChild(li);
  });
};

const farmLoadTraceability = async (lotNumber) => {
  const normalized = typeof lotNumber === 'string' ? lotNumber.trim() : '';
  if (!normalized) {
    farmSetStatus('Inserisci un numero lotto valido.', 'red');
    return;
  }

  farmSetStatus('Caricamento tracciabilita privata in corso...');

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/tracciabilita/lotti/${encodeURIComponent(normalized)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      farmSetStatus(data.message || 'Errore durante il recupero della tracciabilita privata.', 'red');
      return;
    }

    currentTraceData = data;

    const lotto = data.lotto || {};
    farmLottoId.textContent = lotto.id || '-';
    farmAziendaId.textContent = lotto.aziendaId || '-';
    farmLotNumber.textContent = lotto.lotNumber || '-';
    farmLotProduct.textContent = lotto.nomeProdotto || '-';
    farmLotQuantity.textContent = `${lotto.quantity ?? '-'} ${lotto.unit || ''}`.trim();
    farmLotCreatedAt.textContent = farmFormatDateTime(lotto.createdAt);

    if (farmDialogSubtitle) {
      farmDialogSubtitle.textContent = `${lotto.lotNumber || '-'} • ${lotto.nomeProdotto || '-'} (${lotto.quantity ?? '-'} ${lotto.unit || ''})`;
    }

    farmRenderTimeline(data.timeline || []);
    farmRenderMungiture(data.mungiture || []);
    farmRenderAnimals(data.animals || []);

    const firstEvent = Array.isArray(data.timeline) ? data.timeline[0] : null;
    if (firstEvent) {
      farmRenderTimelineDetail(firstEvent);
      const firstItem = farmTimelineList?.querySelector('.trace-selectable-item');
      setActiveItem(farmTimelineList, firstItem || null);
    } else if (farmDetailPanel) {
      farmDetailPanel.innerHTML = '<h4>Dettaglio</h4><p>Seleziona un nodo nell\'albero a sinistra.</p>';
    }

    farmOpenDialog();
    farmSetStatus('Tracciabilita privata caricata con successo.', '#2f855a');
  } catch (error) {
    console.error('Errore tracciabilita privata:', error);
    farmSetStatus('Errore di connessione al server.', 'red');
  }
};

if (farmReloadLotsBtn) {
  farmReloadLotsBtn.addEventListener('click', () => {
    loadLotsList();
  });
}

if (farmLotFilterInput) {
  farmLotFilterInput.addEventListener('input', () => {
    applyLotsFilter();
  });
}

if (farmCloseTraceDialogBtn) {
  farmCloseTraceDialogBtn.addEventListener('click', () => {
    farmCloseDialog();
  });
}

if (farmPrintLabelBtn) {
  farmPrintLabelBtn.addEventListener('click', () => {
    farmPrintCurrentLabel();
  });
}

if (farmTraceDialog) {
  farmTraceDialog.addEventListener('click', (event) => {
    if (event.target === farmTraceDialog) {
      farmCloseDialog();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && farmTraceDialog && !farmTraceDialog.classList.contains('hidden')) {
    farmCloseDialog();
  }
});

farmSetStatus('Pronto. Carico l\'elenco lotti...');
loadLotsList();
