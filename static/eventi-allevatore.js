const eventoForm = document.getElementById('eventoForm');
const eventFormMessage = document.getElementById('eventFormMessage');
const eventsList = document.getElementById('eventsList');
const calendarConnectionStatus = document.getElementById('calendarConnectionStatus');
const locationInput = document.getElementById('eventLocation');
const syncSummary = document.getElementById('syncSummary');
const syncAllButton = document.getElementById('syncAllButton');
const recurrenceTypeInput = document.getElementById('eventRecurrenceType');
const recurrenceIntervalWrapper = document.getElementById('recurrenceIntervalWrapper');
const recurrenceUntilWrapper = document.getElementById('recurrenceUntilWrapper');
const recurrenceIntervalInput = document.getElementById('eventRecurrenceInterval');
const recurrenceUntilInput = document.getElementById('eventRecurrenceUntil');

let isGoogleConnected = false;

const getToken = () => localStorage.getItem('token') || '';
const getAziendaId = () => localStorage.getItem('selectedAziendaId') || '';
const getAziendaEventsBasePath = (aziendaId) => `/api/aziende/${encodeURIComponent(aziendaId)}/eventi`;

const setMessage = (text, color = '#1f2937') => {
	if (!eventFormMessage) return;
	eventFormMessage.style.color = color;
	eventFormMessage.textContent = text;
};
// Funzione per validare se una stringa sembra un indirizzo, con controlli di base su presenza di lettere, numeri, parole chiave e punteggiatura comune negli indirizzi.
const looksLikeAddress = (value) => {
	const normalized = String(value || '').trim();
	if (normalized.length < 8) return false;

	const hasLetters = /[a-zA-ZÀ-ÿ]/.test(normalized);
	const hasStreetCue = /(via|viale|piazza|corso|largo|vicolo|strada|avenue|street|road|boulevard|blvd)\b/i.test(normalized);
	const hasNumber = /\d/.test(normalized);
	const hasComma = /,/.test(normalized);

	return hasLetters && (hasStreetCue || (hasNumber && hasComma));
};
// Funzione per formattare data e orari in un formato leggibile localizzato in italiano.
const toLocalDateLabel = (event) => {
	const dateLabel = new Date(`${event.date}T${event.startTime}`).toLocaleDateString('it-IT', {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
	return `${dateLabel} • ${event.startTime} - ${event.endTime}`;
};
// Funzione per inizializzare Places Autocomplete sul campo luogo, con restrizioni all'Italia e gestione del caso in cui l'API non sia disponibile.
const initLocationAutocomplete = () => {
	if (!locationInput) return false;
	if (!window.google || !window.google.maps || !window.google.maps.places) return false;
	if (locationInput.dataset.autocompleteReady === '1') return true;

	const autocomplete = new google.maps.places.Autocomplete(locationInput, {
		types: ['address'],
		componentRestrictions: { country: 'it' },
		fields: ['formatted_address', 'name']
	});
// Quando l'utente seleziona un suggerimento, aggiorniamo il campo con l'indirizzo formattato restituito da Google.
	autocomplete.addListener('place_changed', () => {
		const place = autocomplete.getPlace();
		if (place?.formatted_address) {
			locationInput.value = place.formatted_address;
		}
	});

	locationInput.dataset.autocompleteReady = '1';
	return true;
};
// Funzione wrapper per chiamate API, che include automaticamente il token di autenticazione e gestisce la risposta JSON.
const apiFetch = async (url, options = {}) => {
	const token = getToken();
	const headers = {
		'Content-Type': 'application/json',
		...(options.headers || {}),
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};

	const response = await fetch(url, { ...options, headers });
	const data = await response.json().catch(() => ({}));
	return { response, data };
};
// Funzione per aggiornare il badge di stato della connessione a Google Calendar, con stili e testo dinamico in base allo stato.
const renderCalendarConnectionBadge = (settings) => {
	if (!calendarConnectionStatus) return;

	isGoogleConnected = Boolean(settings?.connected);
	if (isGoogleConnected) {
		calendarConnectionStatus.classList.remove('status-chip-warning');
		calendarConnectionStatus.classList.add('status-chip-success');
		calendarConnectionStatus.textContent = settings.accountEmail
			? `Google Calendar connesso (${settings.accountEmail})`
			: 'Google Calendar connesso';
		return;
	}

	calendarConnectionStatus.classList.remove('status-chip-success');
	calendarConnectionStatus.classList.add('status-chip-warning');
	calendarConnectionStatus.textContent = 'Google Calendar non connesso';
};
// Funzione per caricare lo stato di connessione a Google Calendar dall'API e aggiornare il badge di conseguenza.
const loadCalendarConnectionStatus = async () => {
	const aziendaId = getAziendaId();
	if (!aziendaId) {
		renderCalendarConnectionBadge({ connected: false });
		return;
	}
// Chiamata all'API per verificare lo stato di connessione a Google Calendar per l'azienda selezionata.
	const { response, data } = await apiFetch(`/api/google-calendar/status?aziendaId=${encodeURIComponent(aziendaId)}`);
	if (!response.ok) {
		renderCalendarConnectionBadge({ connected: false });
		return;
	}

	renderCalendarConnectionBadge(data.settings || { connected: false });
};
// Funzione per sincronizzare un singolo evento su Google Calendar, chiamando l'API dedicata e gestendo eventuali errori.
const syncEventToGoogle = async (eventId) => {
	const aziendaId = getAziendaId();
	const { response, data } = await apiFetch(`${getAziendaEventsBasePath(aziendaId)}/${eventId}/sincronizzazioni/google`, {
		method: 'POST'
	});

	if (!response.ok) {
		throw new Error(data.message || 'Errore sincronizzazione Google Calendar');
	}

	return data;
};
// Funzione per sincronizzare tutti gli eventi non ancora sincronizzati su Google Calendar, con gestione dell'esito e aggiornamento dello stato.
const syncAllEventsToGoogle = async (aziendaId) => {
	const { response, data } = await apiFetch(`${getAziendaEventsBasePath(aziendaId)}/sincronizzazioni/google`, {
		method: 'POST',
		body: JSON.stringify({ onlyUnsynced: true })
	});

	if (!response.ok) {
		throw new Error(data.message || 'Errore sincronizzazione massiva Google Calendar');
	}

	return data;
};
// Funzione per aggiornare il riepilogo dello stato di sincronizzazione degli eventi, mostrando quanti sono sincronizzati e quanti sono ancora da sincronizzare.
const renderSyncSummary = (items = []) => {
	if (!syncSummary) return;

	const total = items.length;
	const synced = items.filter((item) => Boolean(item.googleSyncedAt)).length;
	const pending = Math.max(total - synced, 0);

	syncSummary.textContent = `Stato sincronizzazione: ${synced}/${total} sincronizzati, ${pending} da sincronizzare`;

	if (syncAllButton) {
		syncAllButton.disabled = !isGoogleConnected || pending === 0;
	}
};
// Funzione per caricare gli eventi dell'azienda selezionata dall'API e renderizzarli nella pagina, con gestione dei casi di errore e stato di caricamento.
const loadEvents = async () => {
	if (!eventsList) return;

	const aziendaId = getAziendaId();
	if (!aziendaId) {
		eventsList.innerHTML = '<p class="status">Seleziona un\'azienda attiva prima di gestire gli eventi.</p>';
		return;
	}

	eventsList.innerHTML = '<p class="status">Caricamento eventi...</p>';
	const { response, data } = await apiFetch(`${getAziendaEventsBasePath(aziendaId)}?limit=100`);

	if (!response.ok) {
		eventsList.innerHTML = `<p class="status">${data.message || 'Errore nel caricamento eventi'}</p>`;
		return;
	}

	const items = Array.isArray(data.items) ? data.items : [];
	renderSyncSummary(items);
	if (items.length === 0) {
		eventsList.innerHTML = '<p class="status">Nessun evento disponibile per l\'azienda selezionata.</p>';
		if (syncAllButton) syncAllButton.disabled = true;
		return;
	}
// Renderizzazione della lista eventi: per ogni evento creiamo una card con i dettagli e i pulsanti di azione, disabilitando il pulsante di sincronizzazione se Google Calendar non è connesso.
	eventsList.innerHTML = items.map((event) => {
		const statusSync = event.googleSyncedAt ? 'Sincronizzato' : 'Non sincronizzato';
		const isAlreadySynced = Boolean(event.googleCalendarEventId || event.googleSyncedAt);
		const disableSyncButton = !isGoogleConnected || isAlreadySynced;
		const visibilityLabel = event.visibilityLabel || (event.visibility === 'public' ? 'Pubblico' : 'Privato');
		const recurrenceLabel = event.recurrenceLabel || 'Evento singolo';
		const eventLinkHtml = event.link
			? `<p><strong>Link:</strong> <a href="${event.link}" target="_blank" rel="noopener noreferrer">Apri link evento</a></p>`
			: '';
		return `
			<article class="event-card" data-event-id="${event.id}">
				<div class="event-card-top">
					<h3>${event.title}</h3>
					<span class="event-type-chip">${event.typeLabel}</span>
				</div>
				<p><strong>Quando:</strong> ${toLocalDateLabel(event)}</p>
				<p><strong>Visibilita:</strong> ${visibilityLabel}</p>
				<p><strong>Ricorrenza:</strong> ${recurrenceLabel}</p>
				<p><strong>Luogo:</strong> ${event.location || 'Non specificato'}</p>
				${eventLinkHtml}
				<p><strong>Promemoria:</strong> ${event.reminderLabel || 'Nessuno'}</p>
				<p><strong>Google:</strong> ${statusSync}</p>
				<p>${event.description || 'Nessuna descrizione inserita.'}</p>
				<div class="event-card-actions">
					<button type="button" class="event-sync-btn" data-sync-id="${event.id}" ${disableSyncButton ? 'disabled' : ''} title="${isAlreadySynced ? 'Evento gia sincronizzato su Google Calendar' : ''}">
						Sincronizza su Google Calendar
					</button>
					<button type="button" class="event-delete-btn" data-delete-id="${event.id}">Elimina</button>
				</div>
			</article>
		`;
	}).join('');
};
// funzione per eliminare un evento con l'api dedicata.
const handleDeleteEvent = async (eventId) => {
	const aziendaId = getAziendaId();
	const { response, data } = await apiFetch(`${getAziendaEventsBasePath(aziendaId)}/${eventId}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		throw new Error(data.message || 'Errore eliminazione evento');
	}
};

if (eventoForm) {
	eventoForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		const formData = new FormData(eventoForm);
		const title = String(formData.get('eventTitle') || '').trim();
		const type = String(formData.get('eventType') || '').trim();
		const date = String(formData.get('eventDate') || '').trim();
		const startTime = String(formData.get('eventStartTime') || '').trim();
		const endTime = String(formData.get('eventEndTime') || '').trim();
		const location = String(formData.get('eventLocation') || '').trim();
		const description = String(formData.get('eventDescription') || '').trim();
		const link = String(formData.get('eventLink') || '').trim();
		const reminderMinutes = Number(formData.get('eventReminder') || 0);
		const visibility = formData.get('eventVisibility') === 'public' ? 'public' : 'private';
		const recurrenceType = String(formData.get('eventRecurrenceType') || 'single');
		const recurrenceInterval = Number(formData.get('eventRecurrenceInterval') || 1);
		const recurrenceUntil = String(formData.get('eventRecurrenceUntil') || '').trim();
		const aziendaId = getAziendaId();

		if (!aziendaId) {
			setMessage('Seleziona prima un\'azienda attiva.', 'red');
			return;
		}

		if (!title || !type || !date || !startTime || !endTime) {
			setMessage('Compila tutti i campi obbligatori.', 'red');
			return;
		}

		if (!location || !looksLikeAddress(location)) {
			setMessage('Inserisci un indirizzo valido nel luogo (es. Via Roma 10, Milano).', 'red');
			return;
		}

		if (link) {
			try {
				const parsedLink = new URL(link);
				if (parsedLink.protocol !== 'http:' && parsedLink.protocol !== 'https:') {
					throw new Error('protocollo non supportato');
				}
			} catch {
				setMessage('Inserisci un link valido che inizi con http:// o https://.', 'red');
				return;
			}
		}

		const startAt = new Date(`${date}T${startTime}`);
		const endAt = new Date(`${date}T${endTime}`);
		if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
			setMessage('Controlla data e orari: la fine deve essere successiva all\'inizio.', 'red');
			return;
		}

		if (recurrenceType !== 'single') {
			if (!Number.isFinite(recurrenceInterval) || recurrenceInterval < 1 || recurrenceInterval > 52) {
				setMessage('Intervallo ricorrenza non valido.', 'red');
				return;
			}

			if (recurrenceUntil) {
				const untilDate = new Date(`${recurrenceUntil}T23:59:59`);
				if (Number.isNaN(untilDate.getTime()) || untilDate < startAt) {
					setMessage('Data fine ricorrenza non valida.', 'red');
					return;
				}
			}
		}

		const { response, data } = await apiFetch(getAziendaEventsBasePath(aziendaId), {
			method: 'POST',
			body: JSON.stringify({
				title,
				type,
				startAt: startAt.toISOString(),
				endAt: endAt.toISOString(),
				location,
				description,
				link,
				reminderMinutes,
				visibility,
				recurrenceType,
				recurrenceInterval,
				recurrenceUntil: recurrenceType === 'single' ? '' : recurrenceUntil
			})
		});

		if (!response.ok) {
			setMessage(data.message || 'Errore durante la creazione evento.', 'red');
			return;
		}

		setMessage('Evento salvato con successo.', 'green');
		eventoForm.reset();
		await loadEvents();
	});
}
// Gestione click sui pulsanti di sincronizzazione ed eliminazione degli eventi, delegando l'azione alla funzione corrispondente e mostrando messaggi di esito.
if (eventsList) {
	eventsList.addEventListener('click', async (e) => {
		const deleteBtn = e.target.closest('.event-delete-btn');
		const syncBtn = e.target.closest('.event-sync-btn');

		if (deleteBtn) {
			const eventId = deleteBtn.dataset.deleteId;
			if (!eventId) return;
			try {
				await handleDeleteEvent(eventId);
				setMessage('Evento eliminato con successo.', '#b45309');
				await loadEvents();
			} catch (error) {
				setMessage(error.message || 'Errore eliminazione evento.', 'red');
			}
			return;
		}

		if (syncBtn) {
			const eventId = syncBtn.dataset.syncId;
			if (!eventId) return;
			try {
				syncBtn.disabled = true;
				await syncEventToGoogle(eventId);
				setMessage('Evento sincronizzato su Google Calendar.', 'green');
				await loadEvents();
			} catch (error) {
				setMessage(error.message || 'Errore sincronizzazione Google Calendar.', 'red');
				syncBtn.disabled = false;
			}
		}
	});
}

if (syncAllButton) {
	syncAllButton.addEventListener('click', async () => {
		const aziendaId = getAziendaId();
		if (!aziendaId) {
			setMessage('Seleziona prima un\'azienda attiva.', 'red');
			return;
		}

		if (!isGoogleConnected) {
			setMessage('Connetti prima Google Calendar dalle impostazioni.', 'red');
			return;
		}

		try {
			syncAllButton.disabled = true;
			const result = await syncAllEventsToGoogle(aziendaId);
			const stats = result?.result || {};
			const firstFailureMessage = Array.isArray(stats.failures) && stats.failures.length > 0
				? ` Primo errore: ${stats.failures[0].message || 'non disponibile'}`
				: '';
			setMessage(`Sincronizzazione completata: ${stats.synced ?? 0} ok, ${stats.failed ?? 0} falliti.${firstFailureMessage}`, stats.failed ? '#b45309' : 'green');
			await loadEvents();
		} catch (error) {
			setMessage(error.message || 'Errore sincronizzazione massiva Google Calendar.', 'red');
			syncAllButton.disabled = false;
		}
	});
}

window.addEventListener('aziendaChanged', async () => {
	await loadCalendarConnectionStatus();
	await loadEvents();
});

window.addEventListener('maps:event-location-ready', () => {
	initLocationAutocomplete();
});

const bootstrap = async () => {
	initLocationAutocomplete();

	if (recurrenceTypeInput) {
		recurrenceTypeInput.addEventListener('change', () => {
			const isRecurring = recurrenceTypeInput.value !== 'single';
			if (recurrenceIntervalWrapper) recurrenceIntervalWrapper.style.display = isRecurring ? '' : 'none';
			if (recurrenceUntilWrapper) recurrenceUntilWrapper.style.display = isRecurring ? '' : 'none';
			if (!isRecurring && recurrenceUntilInput) recurrenceUntilInput.value = '';
		});
	}

	await loadCalendarConnectionStatus();
	await loadEvents();
};

bootstrap();
