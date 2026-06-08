const menuRoot = document.getElementById('menu-root');
const filtersForm = document.getElementById('publicEventsFiltersForm');
const companyFilter = document.getElementById('companyFilter');
const cityFilter = document.getElementById('cityFilter');
const dateFilter = document.getElementById('dateFilter');
const resetFiltersButton = document.getElementById('resetPublicEventsFilters');
const publicEventsStatus = document.getElementById('publicEventsStatus');
const publicEventsList = document.getElementById('publicEventsList');
const publicEventsCount = document.getElementById('publicEventsCount');

const setStatus = (text, color = '#1f2937') => {
	if (!publicEventsStatus) return;
	publicEventsStatus.style.color = color;
	publicEventsStatus.textContent = text;
};

const setCountBadge = (text, success = false) => {
	if (!publicEventsCount) return;
	publicEventsCount.textContent = text;
	publicEventsCount.classList.toggle('status-chip-success', success);
	publicEventsCount.classList.toggle('status-chip-warning', !success);
};

const formatDateTime = (item) => {
	const startDate = item.date ? new Date(`${item.date}T${item.startTime || '00:00'}`) : null;
	if (!startDate || Number.isNaN(startDate.getTime())) {
		return `${item.date || ''} ${item.startTime || ''}`.trim();
	}

	const day = startDate.toLocaleDateString('it-IT', {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});

	return `${day} • ${item.startTime || '--:--'} - ${item.endTime || '--:--'}`;
};

const renderEvents = (items = []) => {
	if (!publicEventsList) return;

	if (!items.length) {
		publicEventsList.innerHTML = '<p class="status">nessun risultato</p>';
		setCountBadge('0 eventi', false);
		return;
	}

	publicEventsList.innerHTML = items.map((item) => `
		<article class="event-card">
			<div class="event-card-top">
				<h3>${item.title}</h3>
				<span class="event-type-chip">${item.typeLabel || item.type || 'Evento'}</span>
			</div>
			<p><strong>Azienda:</strong> ${item.companyName || 'Non specificata'}</p>
			<p><strong>Citta:</strong> ${item.city || 'Non specificata'}</p>
			<p><strong>Quando:</strong> ${formatDateTime(item)}</p>
			<p><strong>Luogo:</strong> ${item.location || item.companyAddress || 'Non specificato'}</p>
			${item.link ? `<p><strong>Link:</strong> <a href="${item.link}" target="_blank" rel="noopener noreferrer">Apri link evento</a></p>` : ''}
			<p><strong>Ricorrenza:</strong> ${item.recurrenceLabel || 'Evento singolo'}</p>
			<p>${item.description || 'Nessuna descrizione disponibile.'}</p>
		</article>
	`).join('');

	setCountBadge(`${items.length} eventi`, true);
};

const loadCompanies = async () => {
	if (!companyFilter) return;

	try {
		const response = await fetch('/api/aziende/public');
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			return;
		}

		const items = Array.isArray(data.items) ? data.items : [];
		const options = items
			.sort((left, right) => String(left.companyName || '').localeCompare(String(right.companyName || '')))
			.map((item) => `<option value="${item._id}">${item.companyName}</option>`)
			.join('');

		companyFilter.innerHTML = '<option value="">Tutte le aziende</option>' + options;
	} catch (error) {
		console.error('Errore caricamento aziende pubbliche:', error);
	}
};

const buildPublicEventsUrl = () => {
	const params = new URLSearchParams();
	const aziendaId = companyFilter?.value?.trim() || '';
	const city = cityFilter?.value?.trim() || '';
	const date = dateFilter?.value?.trim() || '';

	if (aziendaId) params.set('aziendaId', aziendaId);
	if (city) params.set('city', city);
	if (date) params.set('date', date);
	params.set('limit', '100');

	const query = params.toString();
	return query ? `/api/eventi/pubblici?${query}` : '/api/eventi/pubblici';
};

const loadPublicEvents = async () => {
	setStatus('Caricamento eventi pubblici...');
	setCountBadge('Caricamento...', false);

	try {
		const response = await fetch(buildPublicEventsUrl());
		const data = await response.json().catch(() => ({}));

		if (!response.ok) {
			renderEvents([]);
			setStatus(data.message || 'Errore nel caricamento degli eventi pubblici.', 'red');
			return;
		}

		const items = Array.isArray(data.items) ? data.items : [];
		renderEvents(items);
		setStatus(items.length ? 'Eventi pubblici caricati con successo.' : 'nessun risultato', items.length ? 'green' : '#b45309');
	} catch (error) {
		console.error('Errore caricamento eventi pubblici:', error);
		renderEvents([]);
		setStatus('Errore di connessione durante il caricamento degli eventi.', 'red');
	}
};

if (filtersForm) {
	filtersForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		await loadPublicEvents();
	});
}

if (resetFiltersButton) {
	resetFiltersButton.addEventListener('click', async () => {
		if (filtersForm) filtersForm.reset();
		if (companyFilter) companyFilter.value = '';
		await loadPublicEvents();
	});
}

document.addEventListener('DOMContentLoaded', async () => {
	await loadCompanies();
	await loadPublicEvents();
});
