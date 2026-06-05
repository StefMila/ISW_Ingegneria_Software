const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';

const statusEl = document.getElementById('statsAnimaliStatus');
const nowTimeEl = document.getElementById('statsNowTime');
const filterViewMode = document.getElementById('filterViewMode');
const filterFromDate = document.getElementById('filterFromDate');
const filterToDate = document.getElementById('filterToDate');
const filterAnimale = document.getElementById('filterAnimale');
const refreshBtn = document.getElementById('refreshStatsAnimaliBtn');
const tableBody = document.getElementById('statsAnimaliTableBody');
const alertsBody = document.getElementById('statsAlertsTableBody');

const animalsCountCard = document.getElementById('animalsCountCard');
const litersTotalCard = document.getElementById('litersTotalCard');
const litersPerDayCard = document.getElementById('litersPerDayCard');
const alertsCountCard = document.getElementById('alertsCountCard');
const stepsAvgCard = document.getElementById('stepsAvgCard');
const stepsMaxCard = document.getElementById('stepsMaxCard');
const outdoorAvgCard = document.getElementById('outdoorAvgCard');
const outdoorMaxCard = document.getElementById('outdoorMaxCard');
const tempAvgCard = document.getElementById('tempAvgCard');
const bpmAvgCard = document.getElementById('bpmAvgCard');

const productionCanvas = document.getElementById('productionTimelineChart');
const activityCanvas = document.getElementById('activitySplitChart');
const outdoorCanvas = document.getElementById('outdoorChart');
const wellbeingCanvas = document.getElementById('wellbeingChart');

let charts = {
	production: null,
	activity: null,
	outdoor: null,
	wellbeing: null
};

let allAnimali = [];
let allMungiture = [];
let allIotItems = [];

const getToken = () => (localStorage.getItem('token') || '').trim();
const getAziendaId = () => (localStorage.getItem(SELECTED_AZIENDA_ID_KEY) || '').trim();

const setStatus = (text, color = '#1f2937') => {
	if (!statusEl) return;
	statusEl.textContent = text;
	statusEl.style.color = color;
};

const refreshClock = () => {
	if (!nowTimeEl) return;
	nowTimeEl.textContent = new Date().toLocaleString('it-IT', {
		weekday: 'short',
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
};

const escapeHtml = (value) => String(value || '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

const asDate = (value) => {
	const date = new Date(value || '');
	return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetweenInclusive = (from, to) => {
	const ms = to.getTime() - from.getTime();
	return Math.max(Math.floor(ms / (24 * 60 * 60 * 1000)) + 1, 1);
};

const normalizeDateRange = () => {
	const now = new Date();
	const fromRaw = filterFromDate?.value ? `${filterFromDate.value}T00:00:00.000Z` : '';
	const toRaw = filterToDate?.value ? `${filterToDate.value}T23:59:59.999Z` : '';

	const defaultTo = now;
	const defaultFrom = new Date(defaultTo.getTime() - 29 * 24 * 60 * 60 * 1000);
	const from = asDate(fromRaw) || defaultFrom;
	const to = asDate(toRaw) || defaultTo;

	if (from.getTime() > to.getTime()) {
		return { from: to, to: from };
	}

	return { from, to };
};

const inRange = (date, from, to) => {
	if (!date) return false;
	const ts = date.getTime();
	return ts >= from.getTime() && ts <= to.getTime();
};

const avg = (values) => {
	if (!values.length) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const formatOneDecimal = (value, suffix = '') => `${value.toFixed(1)}${suffix}`;

const getTrend = (current, previous) => {
	if (!Number.isFinite(previous) || previous <= 0) {
		return { label: 'Nuovo', cls: 'is-flat' };
	}

	const deltaPct = ((current - previous) / previous) * 100;
	const absPct = Math.abs(deltaPct).toFixed(1);
	if (deltaPct > 0.1) return { label: `+${absPct}%`, cls: 'is-up' };
	if (deltaPct < -0.1) return { label: `-${absPct}%`, cls: 'is-down' };
	return { label: '0.0%', cls: 'is-flat' };
};

const metricFromIot = (animalId) => {
	const candidates = allIotItems
		.filter((item) => String(item?.animaleId || '') === String(animalId))
		.sort((left, right) => {
			const l = asDate(left?.ultimoAggiornamento)?.getTime() || 0;
			const r = asDate(right?.ultimoAggiornamento)?.getTime() || 0;
			return r - l;
		});

	const out = {
		passi: null,
		outdoor: null,
		temperatura: null,
		bpm: null
	};

	for (const item of candidates) {
		const values = item?.valori || {};
		if (out.passi === null && Number.isFinite(Number(values.livello_passi))) out.passi = Number(values.livello_passi);
		if (out.outdoor === null && Number.isFinite(Number(values.esposizione_solare))) out.outdoor = Number(values.esposizione_solare);
		if (out.temperatura === null && Number.isFinite(Number(values.temperatura))) out.temperatura = Number(values.temperatura);
		if (out.bpm === null && Number.isFinite(Number(values.frequenza_cardiaca))) out.bpm = Number(values.frequenza_cardiaca);
		if (out.passi !== null && out.outdoor !== null && out.temperatura !== null && out.bpm !== null) break;
	}

	return out;
};

const computeAgeYears = (dataNascita) => {
	const birth = asDate(dataNascita);
	if (!birth) return null;
	const today = new Date();
	let years = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) years -= 1;
	return Math.max(years, 0);
};

const loadAnimali = async (aziendaId, token) => {
	const response = await fetch(`/api/animali/aziende/${aziendaId}/animali?limit=300`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!response.ok) throw new Error('Errore caricamento animali');
	const payload = await response.json().catch(() => ({}));
	return Array.isArray(payload?.items) ? payload.items : [];
};

const loadMungiture = async (aziendaId, token) => {
	const response = await fetch(`/api/mungiture?${new URLSearchParams({ aziendaId }).toString()}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!response.ok) throw new Error('Errore caricamento mungiture');
	const payload = await response.json().catch(() => []);
	return Array.isArray(payload) ? payload : [];
};

const loadIotData = async (aziendaId, token) => {
	const response = await fetch(`/api/iot/sensori/dati?${new URLSearchParams({ aziendaId }).toString()}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!response.ok) return [];
	const payload = await response.json().catch(() => ({}));
	return Array.isArray(payload?.items) ? payload.items : [];
};

const populateAnimaleFilter = () => {
	if (!filterAnimale) return;

	const current = filterAnimale.value;
	const options = allAnimali
		.map((item) => {
			const name = String(item?.name || '').trim() || 'Animale';
			const matricola = String(item?.matricola || '').trim();
			const label = [name, matricola].filter(Boolean).join(' - ');
			return `<option value="${escapeHtml(String(item._id || ''))}">${escapeHtml(label)}</option>`;
		})
		.join('');

	filterAnimale.innerHTML = `<option value="">Seleziona mucca</option>${options}`;
	if (current) filterAnimale.value = current;
};

const updateViewModeUi = () => {
	if (!filterViewMode || !filterAnimale) return;
	const singleMode = filterViewMode.value === 'singola';
	filterAnimale.disabled = !singleMode;
	if (!singleMode) {
		filterAnimale.value = '';
	}
};

const getFilteredAnimals = () => {
	const mode = filterViewMode?.value || 'insieme';
	if (mode === 'singola') {
		const selected = String(filterAnimale?.value || '').trim();
		if (!selected) return [];
		return allAnimali.filter((item) => String(item?._id || '') === selected);
	}
	return allAnimali;
};

const buildStatsRows = (from, to) => {
	const animals = getFilteredAnimals();
	const periodDays = daysBetweenInclusive(from, to);
	const previousTo = new Date(from.getTime() - 1);
	const previousFrom = new Date(previousTo.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000);

	const partsByMatricola = new Map();
	allAnimali.forEach((candidate) => {
		const mother = String(candidate?.figliaDi || '').trim().toUpperCase();
		if (!mother) return;
		partsByMatricola.set(mother, (partsByMatricola.get(mother) || 0) + 1);
	});

	return animals.map((animal) => {
		const animalId = String(animal?._id || '');
		const thisPeriod = allMungiture.filter((item) => {
			if (String(item?.animaleId || '') !== animalId) return false;
			if (String(item?.status || '') !== 'completata') return false;
			return inRange(asDate(item?.startedAt), from, to);
		});
		const previousPeriod = allMungiture.filter((item) => {
			if (String(item?.animaleId || '') !== animalId) return false;
			if (String(item?.status || '') !== 'completata') return false;
			return inRange(asDate(item?.startedAt), previousFrom, previousTo);
		});

		const liters = thisPeriod.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
		const previousLiters = previousPeriod.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
		const mungitureCount = thisPeriod.length;
		const litersPerDay = liters / periodDays;

		return {
			animal,
			ageYears: computeAgeYears(animal?.dataNascita),
			parti: partsByMatricola.get(String(animal?.matricola || '').trim().toUpperCase()) || 0,
			liters,
			litersPerDay,
			mungitureCount,
			iot: metricFromIot(animalId),
			trend: getTrend(liters, previousLiters)
		};
	}).sort((left, right) => right.liters - left.liters);
};

const buildAlerts = (rows) => {
	const alerts = [];
	for (const row of rows) {
		const name = String(row?.animal?.name || 'Animale');
		if (Number.isFinite(row.iot.temperatura) && row.iot.temperatura > 40.5) {
			alerts.push({ mucca: name, evento: 'Temperatura elevata', valore: `${row.iot.temperatura.toFixed(1)} C`, stato: 'Critico' });
		}
		if (Number.isFinite(row.iot.bpm) && row.iot.bpm > 110) {
			alerts.push({ mucca: name, evento: 'Battito accelerato', valore: `${Math.round(row.iot.bpm)} bpm`, stato: 'Attenzione' });
		}
		if (Number.isFinite(row.iot.passi) && row.iot.passi < 2800) {
			alerts.push({ mucca: name, evento: 'Bassa attivita', valore: `${Math.round(row.iot.passi)} passi`, stato: 'Monitorare' });
		}
		if (row.trend.cls === 'is-down' && row.liters > 0) {
			alerts.push({ mucca: name, evento: 'Calo produzione', valore: row.trend.label, stato: 'Monitorare' });
		}
	}
	return alerts.slice(0, 10);
};

const buildDailySeries = (rows, from, to) => {
	const ids = new Set(rows.map((row) => String(row?.animal?._id || '')));
	const perDay = new Map();

	for (let day = new Date(from); day.getTime() <= to.getTime(); day.setDate(day.getDate() + 1)) {
		const key = day.toISOString().slice(0, 10);
		perDay.set(key, 0);
	}

	for (const item of allMungiture) {
		if (String(item?.status || '') !== 'completata') continue;
		if (!ids.has(String(item?.animaleId || ''))) continue;
		const startedAt = asDate(item?.startedAt);
		if (!inRange(startedAt, from, to)) continue;
		const key = startedAt.toISOString().slice(0, 10);
		perDay.set(key, (perDay.get(key) || 0) + (Number(item?.quantity) || 0));
	}

	const labels = Array.from(perDay.keys()).map((iso) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
	const values = Array.from(perDay.values());
	const movingAvg = values.map((_, index) => {
		const start = Math.max(index - 6, 0);
		const chunk = values.slice(start, index + 1);
		return Number(avg(chunk).toFixed(2));
	});

	return { labels, values, movingAvg };
};

const renderTable = (rows) => {
	if (!tableBody) return;
	if (!rows.length) {
		tableBody.innerHTML = '<tr><td colspan="9" class="status">Nessun dato disponibile per il filtro selezionato.</td></tr>';
		return;
	}

	tableBody.innerHTML = rows.map((row) => {
		const name = String(row?.animal?.name || '').trim() || 'Animale';
		const foto = row?.animal?.foto
			? `<img class="animal-photo-thumb" src="${escapeHtml(row.animal.foto)}" alt="Foto ${escapeHtml(name)}">`
			: '<span class="animal-photo-placeholder">--</span>';
		const ageLabel = Number.isFinite(row.ageYears) ? String(row.ageYears) : '--';
		const temperatura = Number.isFinite(row.iot.temperatura) ? `${row.iot.temperatura.toFixed(1)} C` : '--';
		const bpm = Number.isFinite(row.iot.bpm) ? `${Math.round(row.iot.bpm)}` : '--';

		return `
			<tr>
				<td>${foto}</td>
				<td>${escapeHtml(name)}</td>
				<td>${escapeHtml(ageLabel)}</td>
				<td>${row.parti}</td>
				<td>${row.litersPerDay.toFixed(2)} L</td>
				<td>${row.mungitureCount}</td>
				<td>${escapeHtml(temperatura)}</td>
				<td>${escapeHtml(bpm)}</td>
				<td><span class="stats-trend-chip ${row.trend.cls}">${escapeHtml(row.trend.label)}</span></td>
			</tr>
		`;
	}).join('');
};

const renderAlertsTable = (alerts) => {
	if (!alertsBody) return;
	if (!alerts.length) {
		alertsBody.innerHTML = '<tr><td colspan="4" class="status">Nessun allarme nel periodo selezionato.</td></tr>';
		return;
	}

	alertsBody.innerHTML = alerts.map((alert) => `
		<tr>
			<td>${escapeHtml(alert.mucca)}</td>
			<td>${escapeHtml(alert.evento)}</td>
			<td>${escapeHtml(alert.valore)}</td>
			<td>${escapeHtml(alert.stato)}</td>
		</tr>
	`).join('');
};

const renderProductionChart = (series) => {
	if (!productionCanvas || !window.Chart) return;
	if (charts.production) charts.production.destroy();

	charts.production = new window.Chart(productionCanvas, {
		type: 'line',
		data: {
			labels: series.labels,
			datasets: [
				{
					label: 'Litri giornalieri',
					data: series.values,
					borderColor: '#6ce5e8',
					backgroundColor: 'rgba(108, 229, 232, 0.18)',
					fill: true,
					tension: 0.35,
					pointRadius: 2
				},
				{
					label: 'Media mobile 7gg',
					data: series.movingAvg,
					borderColor: '#ffd06a',
					backgroundColor: 'transparent',
					fill: false,
					tension: 0.25,
					pointRadius: 0
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { labels: { color: '#eaf3ff' } } },
			scales: {
				x: { ticks: { color: '#afc2de' }, grid: { color: 'rgba(196, 215, 240, 0.12)' } },
				y: { beginAtZero: true, ticks: { color: '#afc2de' }, grid: { color: 'rgba(196, 215, 240, 0.12)' } }
			}
		}
	});
};

const renderActivityChart = (rows) => {
	if (!activityCanvas || !window.Chart) return;
	if (charts.activity) charts.activity.destroy();

	const stepsAvg = avg(rows.map((row) => row.iot.passi).filter((value) => Number.isFinite(value)));
	const outdoorAvg = avg(rows.map((row) => row.iot.outdoor).filter((value) => Number.isFinite(value)));
	const movement = Math.min(70, Math.max(20, Math.round((stepsAvg / 9000) * 70)));
	const feeding = Math.min(45, Math.max(10, Math.round(outdoorAvg * 7)));
	const rest = Math.max(100 - movement - feeding, 5);

	charts.activity = new window.Chart(activityCanvas, {
		type: 'doughnut',
		data: {
			labels: ['Riposo', 'Movimento', 'Alimentazione'],
			datasets: [{
				data: [rest, movement, feeding],
				backgroundColor: ['#2f70ff', '#42d7a8', '#f2a94d'],
				borderWidth: 0
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { labels: { color: '#dce8fb' } } }
		}
	});
};

const renderOutdoorChart = (rows) => {
	if (!outdoorCanvas || !window.Chart) return;
	if (charts.outdoor) charts.outdoor.destroy();

	const labels = rows.map((row) => String(row?.animal?.name || row?.animal?.matricola || 'Mucca'));
	const values = rows.map((row) => Number(Number(row.iot.outdoor || 0).toFixed(1)));

	charts.outdoor = new window.Chart(outdoorCanvas, {
		type: 'line',
		data: {
			labels,
			datasets: [{
				label: 'Ore esterne',
				data: values,
				borderColor: '#8bd87f',
				backgroundColor: 'rgba(139, 216, 127, 0.25)',
				fill: true,
				tension: 0.35,
				pointRadius: 2
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				x: { ticks: { color: '#afc2de' }, grid: { color: 'rgba(196, 215, 240, 0.12)' } },
				y: { beginAtZero: true, ticks: { color: '#afc2de' }, grid: { color: 'rgba(196, 215, 240, 0.12)' } }
			}
		}
	});
};

const renderWellbeingChart = (rows) => {
	if (!wellbeingCanvas || !window.Chart) return;
	if (charts.wellbeing) charts.wellbeing.destroy();

	const tempAvg = avg(rows.map((row) => row.iot.temperatura).filter((value) => Number.isFinite(value)));
	const bpmAvg = avg(rows.map((row) => row.iot.bpm).filter((value) => Number.isFinite(value)));
	const tempScore = tempAvg ? Math.max(0, 100 - Math.abs(38.8 - tempAvg) * 40) : 0;
	const bpmScore = bpmAvg ? Math.max(0, 100 - Math.abs(66 - bpmAvg) * 2.1) : 0;

	charts.wellbeing = new window.Chart(wellbeingCanvas, {
		type: 'bar',
		data: {
			labels: ['Termico', 'Cardiaco'],
			datasets: [{
				label: 'Indice benessere',
				data: [Number(tempScore.toFixed(1)), Number(bpmScore.toFixed(1))],
				backgroundColor: ['#63e6d1', '#ffb45c'],
				borderRadius: 8
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				x: { ticks: { color: '#afc2de' }, grid: { color: 'rgba(196, 215, 240, 0.12)' } },
				y: {
					beginAtZero: true,
					max: 100,
					ticks: { color: '#afc2de' },
					grid: { color: 'rgba(196, 215, 240, 0.12)' }
				}
			}
		}
	});
};

const renderCards = (rows, alerts, from, to) => {
	const totalLiters = rows.reduce((sum, row) => sum + row.liters, 0);
	const days = daysBetweenInclusive(from, to);
	const litersPerDay = totalLiters / days;

	const stepsList = rows.map((row) => row.iot.passi).filter((value) => Number.isFinite(value));
	const outdoorList = rows.map((row) => row.iot.outdoor).filter((value) => Number.isFinite(value));
	const tempList = rows.map((row) => row.iot.temperatura).filter((value) => Number.isFinite(value));
	const bpmList = rows.map((row) => row.iot.bpm).filter((value) => Number.isFinite(value));

	if (animalsCountCard) animalsCountCard.textContent = String(rows.length);
	if (litersTotalCard) litersTotalCard.textContent = `${totalLiters.toFixed(2)} L`;
	if (litersPerDayCard) litersPerDayCard.textContent = `${litersPerDay.toFixed(2)} L`;
	if (alertsCountCard) alertsCountCard.textContent = String(alerts.length);
	if (stepsAvgCard) stepsAvgCard.textContent = String(Math.round(avg(stepsList) || 0));
	if (stepsMaxCard) stepsMaxCard.textContent = String(Math.round(Math.max(...stepsList, 0)));
	if (outdoorAvgCard) outdoorAvgCard.textContent = formatOneDecimal(avg(outdoorList), ' h');
	if (outdoorMaxCard) outdoorMaxCard.textContent = formatOneDecimal(Math.max(...outdoorList, 0), ' h');
	if (tempAvgCard) tempAvgCard.textContent = tempList.length ? `${avg(tempList).toFixed(1)} C` : '--';
	if (bpmAvgCard) bpmAvgCard.textContent = bpmList.length ? `${Math.round(avg(bpmList))} bpm` : '--';
};

const refreshView = () => {
	refreshClock();
	updateViewModeUi();

	const { from, to } = normalizeDateRange();
	const rows = buildStatsRows(from, to);
	if ((filterViewMode?.value || 'insieme') === 'singola' && !rows.length) {
		setStatus('Seleziona una mucca per attivare la vista singola.', '#b45309');
	}

	const alerts = buildAlerts(rows);
	const dailySeries = buildDailySeries(rows, from, to);

	renderCards(rows, alerts, from, to);
	renderTable(rows);
	renderAlertsTable(alerts);
	renderProductionChart(dailySeries);
	renderActivityChart(rows);
	renderOutdoorChart(rows);
	renderWellbeingChart(rows);

	if (rows.length) {
		setStatus(`Dashboard aggiornata (${rows.length} mucca/e in vista ${filterViewMode?.value || 'insieme'}).`, 'green');
	}
};

const applyDefaultDates = () => {
	if (!filterFromDate || !filterToDate) return;
	const to = new Date();
	const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
	filterToDate.value = to.toISOString().slice(0, 10);
	filterFromDate.value = from.toISOString().slice(0, 10);
};

const bootstrap = async () => {
	const aziendaId = getAziendaId();
	const token = getToken();

	if (!aziendaId) {
		setStatus('Seleziona prima un\'azienda dalla home allevatore.', '#b45309');
		if (tableBody) tableBody.innerHTML = '<tr><td colspan="9" class="status">Nessuna azienda selezionata.</td></tr>';
		return;
	}

	if (!token) {
		setStatus('Sessione non valida. Effettua di nuovo il login.', 'red');
		if (tableBody) tableBody.innerHTML = '<tr><td colspan="9" class="status">Token non disponibile.</td></tr>';
		return;
	}

	setStatus('Caricamento dati dashboard...', '#1f2937');

	try {
		const [animali, mungiture, iot] = await Promise.all([
			loadAnimali(aziendaId, token),
			loadMungiture(aziendaId, token),
			loadIotData(aziendaId, token)
		]);

		allAnimali = animali;
		allMungiture = mungiture;
		allIotItems = iot;

		populateAnimaleFilter();
		applyDefaultDates();
		refreshView();
	} catch (error) {
		setStatus(error.message || 'Errore durante il caricamento delle statistiche animali.', 'red');
		if (tableBody) tableBody.innerHTML = '<tr><td colspan="9" class="status">Errore di caricamento.</td></tr>';
	}
};

if (refreshBtn) refreshBtn.addEventListener('click', refreshView);
if (filterViewMode) filterViewMode.addEventListener('change', refreshView);
if (filterAnimale) filterAnimale.addEventListener('change', refreshView);
if (filterFromDate) filterFromDate.addEventListener('change', refreshView);
if (filterToDate) filterToDate.addEventListener('change', refreshView);

window.addEventListener('aziendaChanged', () => {
	bootstrap();
});

refreshClock();
setInterval(refreshClock, 30000);
bootstrap();
