const activeFilters = {
	latte: false,
	yogurt: false,
	formaggio: false,
	gelato: false,
	eventi: false
};

window.activeFilters = activeFilters;

let databaseAziende = [];
let mappaComponent;
let markerAttivi = [];
let eventMarkerAttivi = [];
let eventiPubbliciSettimana = [];
const geocodeCache = new Map();
let aziendeConEventiIds = new Set();
let elencoCollapsed = false;
let aroundMeEnabled = false;
let aroundMeCoords = null;
let mapInstanceGlobal = null;

const CATEGORY_FILTER_TERMS = {
	latte: ['latte'],
	yogurt: ['yogurt'],
	formaggio: ['formaggio', 'formaggi'],
	gelato: ['gelato', 'gelati']
};

function normalizeEntityId(value) {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'object') {
		if (value._id) return String(value._id);
		if (value.id) return String(value.id);
	}
	return String(value);
}

function parseCoordinate(value) {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function hasUsableCoordinates(lat, lng) {
	if (lat === null || lng === null) {
		return false;
	}

	// Coordinate 0,0 sono spesso placeholder e centrano la mappa in oceano.
	if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) {
		return false;
	}

	return true;
}

function getMapInstance() {
	return mapInstanceGlobal || mappaComponent?.innerMap || null;
}

function setMapView(lat, lng, zoom) {
	const parsedLat = parseCoordinate(lat);
	const parsedLng = parseCoordinate(lng);
	if (!hasUsableCoordinates(parsedLat, parsedLng)) {
		return;
	}

	const map = getMapInstance();
	if (map) {
		map.setCenter({ lat: parsedLat, lng: parsedLng });
		if (zoom !== undefined && zoom !== null) {
			map.setZoom(Number(zoom));
		}
		return;
	}

	if (mappaComponent && typeof mappaComponent.setAttribute === 'function') {
		mappaComponent.setAttribute('center', `${parsedLat},${parsedLng}`);
		if (zoom !== undefined && zoom !== null) {
			mappaComponent.setAttribute('zoom', String(zoom));
		}
	}
}

function filterAziendeInCurrentViewport(aziende, enabled = false) {
	if (!enabled) {
		return aziende;
	}

	const map = getMapInstance();
	if (!map || typeof map.getBounds !== 'function') {
		return aziende;
	}

	const bounds = map.getBounds();
	if (!bounds || !(window.google && google.maps && google.maps.LatLng)) {
		return aziende;
	}

	return aziende.filter((az) => {
		const lat = parseCoordinate(az?.lat);
		const lng = parseCoordinate(az?.lng);
		if (!hasUsableCoordinates(lat, lng)) {
			return false;
		}

		return bounds.contains(new google.maps.LatLng(lat, lng));
	});
}

function loadConsumerMenu() {
	fetch('/menu-consumatore.html')
		.then((res) => res.text())
		.then((html) => {
			const menuRoot = document.getElementById('menu-root');
			if (menuRoot) {
				menuRoot.innerHTML = html;
			}
		})
		.catch((err) => {
			console.error('Errore caricamento menu:', err);
		});
}

function loadGoogleMapsApi() {
	fetch('/api/config')
		.then((res) => res.json())
		.then((config) => {
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsKey}&callback=initApp&libraries=places,maps,marker&v=beta`;
			script.async = true;
			document.head.appendChild(script);
		})
		.catch((err) => {
			console.error('Errore caricamento Google Maps API:', err);
		});
}

function getRaggioKm() {
	const val = Number(document.getElementById('raggioInput')?.value);
	return !Number.isNaN(val) && val > 0 ? val : 10;
}

function updateAroundMeButtonState() {
	const aroundMeButton = document.getElementById('aroundMeToggle');
	if (!aroundMeButton) return;

	aroundMeButton.classList.toggle('is-active', aroundMeEnabled);
	aroundMeButton.setAttribute('aria-pressed', aroundMeEnabled ? 'true' : 'false');
}

function applyAroundMeFilter(aziende) {
	if (!aroundMeEnabled || !aroundMeCoords) {
		return aziende;
	}

	const raggioKm = getRaggioKm();
	return aziende.filter((az) => distanzaKm(aroundMeCoords.lat, aroundMeCoords.lng, az.lat, az.lng) <= raggioKm);
}

function getCurrentPosition() {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Il tuo browser non supporta la geolocalizzazione.'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude
				});
			},
			() => {
				reject(new Error('Impossibile accedere alla tua posizione. Controlla i permessi del browser.'));
			}
		);
	});
}

function normalizeFilterKey(rawKey) {
	if (!rawKey) return null;
	const map = {
		formaggi: 'formaggio',
		formaggio: 'formaggio',
		latte: 'latte',
		yogurt: 'yogurt',
		gelato: 'gelato',
		eventi: 'eventi'
	};
	return map[String(rawKey).toLowerCase()] || null;
}

function getAziendaSearchBlob(azienda) {
	const categorieProdotto = Array.isArray(azienda.categorie) ? azienda.categorie.join(' ') : '';
	return [azienda.categoria, categorieProdotto, azienda.nome, azienda.citta, azienda.indirizzo]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

function hasEventData(azienda) {
	const aziendaId = normalizeEntityId(azienda?.id || azienda?._id);
	return Boolean(
		(aziendaId && aziendeConEventiIds.has(aziendaId)) ||
		azienda.eventi === true ||
		azienda.hasEvents === true ||
		(Number.isFinite(Number(azienda.eventCount)) && Number(azienda.eventCount) > 0) ||
		(Number.isFinite(Number(azienda.eventiCount)) && Number(azienda.eventiCount) > 0) ||
		azienda.nextEventDate ||
		azienda.prossimoEvento
	);
}

function applyActiveFilters(aziende) {
	const selectedFilters = Object.keys(activeFilters).filter((key) => activeFilters[key] && key !== 'eventi');
	if (!selectedFilters.length) {
		return aziende;
	}

	return aziende.filter((azienda) => {
		const blob = getAziendaSearchBlob(azienda);
		return selectedFilters.some((filterKey) => {
			const terms = CATEGORY_FILTER_TERMS[filterKey] || [filterKey];
			return terms.some((term) => blob.includes(term));
		});
	});
}

function updateFilterButtonStates() {
	document.querySelectorAll('.filter-toggle').forEach((button) => {
		const filterKey = button.dataset.filter;
		const isActive = Boolean(activeFilters[filterKey]);
		button.classList.toggle('is-active', isActive);
		button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
	});
}

function clearActiveFilters() {
	Object.keys(activeFilters).forEach((key) => {
		activeFilters[key] = false;
	});
	updateFilterButtonStates();
}

function initQuickFilters() {
	const params = new URLSearchParams(window.location.search);
	const initialCategory = normalizeFilterKey(params.get('category'));
	if (initialCategory && Object.prototype.hasOwnProperty.call(activeFilters, initialCategory)) {
		activeFilters[initialCategory] = true;
	}

	const resetButton = document.querySelector('[data-action="reset-filters"]');
	if (resetButton) {
		resetButton.addEventListener('click', () => {
			clearActiveFilters();
			activeFilters.eventi = true;
			aroundMeEnabled = false;
			aroundMeCoords = null;
			updateAroundMeButtonState();
			const input = document.getElementById('searchInput');
			if (input) {
				input.value = '';
			}
			updateFilterButtonStates();
			filtraAziende({ preserveMapView: true });
		});
	}

	document.querySelectorAll('.filter-toggle').forEach((button) => {
		button.addEventListener('click', () => {
			const filterKey = button.dataset.filter;
			if (!Object.prototype.hasOwnProperty.call(activeFilters, filterKey)) {
				return;
			}
			activeFilters[filterKey] = !activeFilters[filterKey];
			updateFilterButtonStates();
			filtraAziende({ preserveMapView: true });
		});
	});

	updateFilterButtonStates();
}

function setElencoCollapsed(collapsed) {
	elencoCollapsed = collapsed;
	document.body.classList.toggle('elenco-collapsed', collapsed);
	const toggleBtn = document.getElementById('elencoToggleBtn');
	if (toggleBtn) {
		toggleBtn.innerHTML = collapsed ? '&#9654;' : '&#9664;';
		toggleBtn.setAttribute('aria-label', collapsed ? 'Mostra elenco aziende' : 'Nascondi elenco aziende');
	}
}

function toggleElencoLaterale() {
	setElencoCollapsed(!elencoCollapsed);
}

function posizionaDettaglioVicinoClick(box, clickEvent, markerElement) {
	let clickX = window.innerWidth / 2;
	let clickY = window.innerHeight / 2;

	if (clickEvent && typeof clickEvent.clientX === 'number' && typeof clickEvent.clientY === 'number') {
		clickX = clickEvent.clientX;
		clickY = clickEvent.clientY;
	} else if (clickEvent && clickEvent.domEvent && typeof clickEvent.domEvent.clientX === 'number' && typeof clickEvent.domEvent.clientY === 'number') {
		clickX = clickEvent.domEvent.clientX;
		clickY = clickEvent.domEvent.clientY;
	} else if (markerElement && typeof markerElement.getBoundingClientRect === 'function') {
		const markerRect = markerElement.getBoundingClientRect();
		clickX = markerRect.left + markerRect.width / 2;
		clickY = markerRect.top;
	}

	const margin = 12;
	const boxRect = box.getBoundingClientRect();
	let left = clickX + 12;
	let top = clickY - boxRect.height / 2;

	left = Math.min(Math.max(margin, left), window.innerWidth - boxRect.width - margin);
	top = Math.min(Math.max(margin, top), window.innerHeight - boxRect.height - margin);

	box.style.left = `${left}px`;
	box.style.top = `${top}px`;
}

function mostraDettagliAzienda(azienda, clickEvent, markerElement) {
	const box = document.getElementById('dettaglioAzienda');
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(azienda.lat + ',' + azienda.lng)}`;
	const categoriaInfo = azienda.categoria || (Array.isArray(azienda.categorie) && azienda.categorie.length ? azienda.categorie.join(', ') : '');
	box.innerHTML =
		`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">` +
			`<div>` +
				`<h3 style="margin:0 0 8px 0;">${azienda.nome}</h3>` +
				(categoriaInfo ? `<div><b>Categoria:</b> ${categoriaInfo}</div>` : '') +
				(azienda.indirizzo ? `<div><b>Indirizzo:</b> ${azienda.indirizzo}</div>` : '') +
				(azienda.citta ? `<div><b>Citta:</b> ${azienda.citta}</div>` : '') +
				(azienda.email ? `<div><b>Email:</b> <a href="mailto:${azienda.email}">${azienda.email}</a></div>` : '') +
				(azienda.telefono ? `<div><b>Telefono:</b> ${azienda.telefono}</div>` : '') +
				(azienda.sito ? `<div><b>Sito:</b> <a href="${azienda.sito}" target="_blank" rel="noopener noreferrer">${azienda.sito}</a></div>` : '') +
			`</div>` +
			`<button type="button" onclick="this.closest('#dettaglioAzienda').style.display='none'">Chiudi</button>` +
		`</div>` +
		`<div style="margin-top:12px;">` +
			`<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="button-link">Apri su Google Maps</a>` +
		`</div>`;

	box.style.display = 'block';
	posizionaDettaglioVicinoClick(box, clickEvent, markerElement);
}

function escapeHtml(value) {
	return String(value || '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function getEventStartDate(evento) {
	if (!evento?.date) return null;
	const parsed = new Date(`${evento.date}T${evento.startTime || '00:00'}`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEventAddressForGeocoding(evento) {
	return [evento?.location, evento?.companyAddress, evento?.city]
		.map((value) => String(value || '').trim())
		.filter(Boolean)
		.join(', ');
}

function geocodeAddress(address) {
	const normalizedAddress = String(address || '').trim();
	if (!normalizedAddress) {
		return Promise.resolve(null);
	}

	const cacheKey = normalizedAddress.toLowerCase();
	const cached = geocodeCache.get(cacheKey);
	if (cached) {
		return Promise.resolve(cached);
	}

	if (!(window.google && google.maps && google.maps.Geocoder)) {
		return Promise.resolve(null);
	}

	const geocoder = new google.maps.Geocoder();
	const attempts = [normalizedAddress];
	if (!/\bitalia\b/i.test(normalizedAddress)) {
		attempts.push(`${normalizedAddress}, Italia`);
	}

	return new Promise((resolve) => {
		const tryNext = (index) => {
			if (index >= attempts.length) {
				resolve(null);
				return;
			}

			geocoder.geocode({ address: attempts[index] }, (results, status) => {
				if (status === 'OK' && results[0]?.geometry?.location) {
					const coords = {
						lat: Number(results[0].geometry.location.lat()),
						lng: Number(results[0].geometry.location.lng())
					};
					geocodeCache.set(cacheKey, coords);
					resolve(coords);
					return;
				}

				tryNext(index + 1);
			});
		};

		tryNext(0);
	});
}

async function enrichEventsWithCoordinates(eventi) {
	const enriched = [];

	for (const evento of eventi) {
		const lat = parseCoordinate(evento?.lat);
		const lng = parseCoordinate(evento?.lng);
		if (hasUsableCoordinates(lat, lng)) {
			enriched.push({ ...evento, lat, lng });
			continue;
		}

		const address = getEventAddressForGeocoding(evento);
		const coords = await geocodeAddress(address);
		enriched.push({
			...evento,
			lat: coords?.lat,
			lng: coords?.lng
		});
	}

	return enriched;
}

function isDateInNext7Days(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return false;
	}

	const now = new Date();
	const windowStart = new Date(now);
	windowStart.setHours(0, 0, 0, 0);
	const windowEnd = new Date(now);
	windowEnd.setDate(now.getDate() + 7);

	return date >= windowStart && date <= windowEnd;
}

function mostraDettagliEvento(evento, clickEvent, markerElement) {
	const box = document.getElementById('dettaglioAzienda');
	const startDate = getEventStartDate(evento);
	const dayLabel = startDate
		? startDate.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
		: 'Giorno non disponibile';

	const eventLat = parseCoordinate(evento.lat);
	const eventLng = parseCoordinate(evento.lng);
	const mapsUrl = hasUsableCoordinates(eventLat, eventLng)
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evento.lat},${evento.lng}`)}`
		: '';

	box.innerHTML =
		`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">` +
			`<div>` +
				`<h3 style="margin:0 0 8px 0;">${escapeHtml(evento.title || 'Evento')}</h3>` +
				`<div><b>Giorno:</b> ${escapeHtml(dayLabel)}</div>` +
				`<div><b>Orario:</b> ${escapeHtml(evento.startTime || '--:--')} - ${escapeHtml(evento.endTime || '--:--')}</div>` +
				(evento.companyName ? `<div><b>Azienda:</b> ${escapeHtml(evento.companyName)}</div>` : '') +
				(evento.location ? `<div><b>Luogo:</b> ${escapeHtml(evento.location)}</div>` : '') +
				(evento.description ? `<div><b>Descrizione:</b> ${escapeHtml(evento.description)}</div>` : '') +
			`</div>` +
			`<button type="button" onclick="this.closest('#dettaglioAzienda').style.display='none'">Chiudi</button>` +
		`</div>` +
		(mapsUrl
			? `<div style="margin-top:12px;"><a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="button-link">Apri su Google Maps</a></div>`
			: '');

	box.style.display = 'block';
	posizionaDettaglioVicinoClick(box, clickEvent, markerElement);
}

function clearEventMarkers() {
	eventMarkerAttivi.forEach((marker) => {
		if (marker && typeof marker.setMap === 'function') {
			marker.setMap(null);
			return;
		}
		if (marker && typeof marker.remove === 'function') {
			marker.remove();
		}
	});
	eventMarkerAttivi = [];
}

function mostraEventiSettimanaSuMappa(aziendeVisibili) {
	if (!mappaComponent) return;

	clearEventMarkers();
	const mapInstance = getMapInstance();

	const visibleAziendaIds = new Set((aziendeVisibili || []).map((azienda) => normalizeEntityId(azienda.id)).filter(Boolean));
	const aziendaCoordsById = new Map((databaseAziende || []).map((azienda) => [
		normalizeEntityId(azienda.id),
		{ lat: Number(azienda.lat), lng: Number(azienda.lng) }
	]));

	const eventiConCoordinate = eventiPubbliciSettimana
		.map((evento) => {
			const directLat = parseCoordinate(evento.lat);
			const directLng = parseCoordinate(evento.lng);
			if (hasUsableCoordinates(directLat, directLng)) {
				return { ...evento, lat: directLat, lng: directLng };
			}

			const eventAziendaId = normalizeEntityId(evento.aziendaId);
			const aziendaCoords = aziendaCoordsById.get(eventAziendaId);
			if (aziendaCoords && Number.isFinite(aziendaCoords.lat) && Number.isFinite(aziendaCoords.lng)) {
				if (!hasUsableCoordinates(aziendaCoords.lat, aziendaCoords.lng)) {
					return { ...evento, lat: null, lng: null };
				}
				return { ...evento, lat: aziendaCoords.lat, lng: aziendaCoords.lng };
			}

			return { ...evento, lat: null, lng: null };
		})
		.filter((evento) => hasUsableCoordinates(parseCoordinate(evento.lat), parseCoordinate(evento.lng)));

	let eventiDaMostrare = activeFilters.eventi ? [...eventiConCoordinate] : eventiConCoordinate.filter((evento) => {
		if (visibleAziendaIds.size === 0) {
			return true;
		}

		const eventAziendaId = normalizeEntityId(evento.aziendaId);
		if (!eventAziendaId) {
			return true;
		}

		return visibleAziendaIds.has(eventAziendaId);
	});

	if (eventiDaMostrare.length === 0 && eventiConCoordinate.length > 0) {
		eventiDaMostrare = eventiConCoordinate;
	}

	eventiDaMostrare.forEach((evento) => {
		if (!mapInstance || !(window.google && google.maps && google.maps.Marker)) {
			return;
		}

		const lat = parseCoordinate(evento.lat);
		const lng = parseCoordinate(evento.lng);
			if (!hasUsableCoordinates(lat, lng)) {
			return;
		}

		const marker = new google.maps.Marker({
			map: mapInstance,
			position: { lat, lng },
			title: `${evento.title || 'Evento'} (${evento.companyName || 'Azienda'})`,
			zIndex: 2000
		});

		marker.addListener('click', (event) => {
			mostraDettagliEvento(evento, event, null);
		});

		eventMarkerAttivi.push(marker);
	});

	return eventiDaMostrare;

}

async function loadEventiPubbliciSettimana() {
	try {
		const response = await fetch('/api/eventi/pubblici?limit=200');
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			eventiPubbliciSettimana = [];
			console.warn(data.message || 'Eventi pubblici non disponibili al momento.');
			return;
		}

		eventiPubbliciSettimana = (Array.isArray(data.items) ? data.items : [])
			.filter((evento) => isDateInNext7Days(getEventStartDate(evento)));

		eventiPubbliciSettimana = await enrichEventsWithCoordinates(eventiPubbliciSettimana);
		aziendeConEventiIds = new Set(
			eventiPubbliciSettimana
				.map((evento) => normalizeEntityId(evento?.aziendaId))
				.filter(Boolean)
		);
	} catch (error) {
		console.error('Errore caricamento eventi pubblici della settimana:', error);
		eventiPubbliciSettimana = [];
		aziendeConEventiIds = new Set();
	}
}

function initApp() {
	mappaComponent = document.getElementById('myMap');
	if (window.google && google.maps && mappaComponent) {
		mapInstanceGlobal = new google.maps.Map(mappaComponent, {
			center: { lat: 41.8719, lng: 12.5674 },
			zoom: 6,
			mapTypeId: 'roadmap',
			mapTypeControl: true,
			streetViewControl: true,
			fullscreenControl: true
		});
	}

	if (window.google && google.maps && google.maps.places) {
		const input = document.getElementById('searchInput');
		const autocomplete = new google.maps.places.Autocomplete(input, {
			types: ['geocode'],
			componentRestrictions: { country: 'it' }
		});

		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (place && place.formatted_address) {
				input.value = place.formatted_address;
				filtraAziende();
			}
		});
	}

	Promise.all([
		fetch('/api/aziende/public').then((res) => res.json()),
		loadEventiPubbliciSettimana()
	])
		.then(([data]) => {
			databaseAziende = (data.items || [])
				.map((az) => ({
					id: az._id,
					categorie: Array.isArray(az.productCategories)
						? az.productCategories
						: (az.productCategories ? az.productCategories.split(',').map((c) => c.trim()) : []),
					nome: az.companyName,
					categoria: az.categories && az.categories.length > 0 ? az.categories[0] : '',
					indirizzo: az.address,
					lat: az.geo && az.geo.lat ? az.geo.lat : az.location && az.location.coordinates && az.location.coordinates[1],
					lng: az.geo && az.geo.lng ? az.geo.lng : az.location && az.location.coordinates && az.location.coordinates[0],
					citta: az.city || '',
					email: az.emailAzienda || '',
					telefono: az.phoneNumber || '',
					sito: az.website || ''
				}))
				.map((az) => ({
					...az,
					categoria: az.categoria || (az.categorie.length ? az.categorie[0] : '')
				}))
				.filter((az) => az.lat && az.lng);

			mostraAziendeSuMappa(databaseAziende);
		})
		.catch((err) => {
			alert(`Errore nel caricamento delle aziende: ${err}`);
		});
}

function mostraAziendeSuMappa(aziende, options = {}) {
	const { preserveMapView = false } = options;
	const aziendeDaVisualizzare = Array.isArray(aziende) ? aziende : [];
	markerAttivi.forEach((marker) => {
		if (marker && typeof marker.setMap === 'function') {
			marker.setMap(null);
			return;
		}
		if (marker && typeof marker.remove === 'function') {
			marker.remove();
		}
	});
	markerAttivi = [];
	const mapInstance = getMapInstance();

	if (mapInstance && window.google && google.maps && google.maps.Marker) {
		aziendeDaVisualizzare.forEach((azienda) => {
			const marker = new google.maps.Marker({
				map: mapInstance,
				position: { lat: Number(azienda.lat), lng: Number(azienda.lng) },
				title: azienda.nome + (azienda.categoria ? ` (${azienda.categoria})` : '') + (azienda.indirizzo ? ` - ${azienda.indirizzo}` : ''),
				zIndex: 1000
			});

			marker.addListener('click', (event) => {
				mostraDettagliAzienda(azienda, event, null);
			});

			markerAttivi.push(marker);
		});
	}

	const eventiVisibili = activeFilters.eventi
		? (mostraEventiSettimanaSuMappa(aziendeDaVisualizzare) || [])
		: [];

	if (!activeFilters.eventi) {
		clearEventMarkers();
	}
	if (!preserveMapView && eventiVisibili.length > 0 && window.google && google.maps) {
		if (mapInstance && google.maps.LatLngBounds) {
			const eventiConCoordinateUtili = eventiVisibili.filter((evento) =>
				hasUsableCoordinates(parseCoordinate(evento?.lat), parseCoordinate(evento?.lng))
			);

			if (eventiConCoordinateUtili.length === 1) {
				const primoEvento = eventiConCoordinateUtili[0];
				mapInstance.setCenter({ lat: Number(primoEvento.lat), lng: Number(primoEvento.lng) });
				mapInstance.setZoom(12);
			} else if (eventiConCoordinateUtili.length > 1) {
				const bounds = new google.maps.LatLngBounds();
				eventiConCoordinateUtili.forEach((evento) => {
					bounds.extend({ lat: Number(evento.lat), lng: Number(evento.lng) });
				});
				mapInstance.fitBounds(bounds, 80);
			}
		}
	}

		if (!preserveMapView && !aziendeDaVisualizzare.length && activeFilters.eventi) {
			const primoEventoConCoordinate = eventiPubbliciSettimana.find((evento) =>
				hasUsableCoordinates(parseCoordinate(evento?.lat), parseCoordinate(evento?.lng))
			);
			if (primoEventoConCoordinate) {
				setMapView(primoEventoConCoordinate.lat, primoEventoConCoordinate.lng, 10);
			}
		}

	mostraElencoAziende(aziendeDaVisualizzare);
}

function mostraElencoAziende(aziende) {
	const elenco = document.getElementById('elencoAziende');
	if (!aziende.length) {
		elenco.innerHTML = '<em>nessun risultato</em>';
		return;
	}

	elenco.innerHTML = '<b>Aziende trovate:</b><ul style="padding-left:18px;">' + aziende
		.map((az) =>
			`<li><b>${az.nome}</b><br>` +
			(az.categoria ? `<b>Categoria:</b> ${az.categoria}<br>` : '') +
			(az.indirizzo ? `${az.indirizzo}<br>` : '') +
			(az.citta ? `${az.citta}<br>` : '') +
			(az.email ? `Email: ${az.email}<br>` : '') +
			(az.telefono ? `Tel: ${az.telefono}<br>` : '') +
			(az.sito ? `Sito: <a href="${az.sito}" target="_blank">${az.sito}</a>` : '') +
			'</li>'
		)
		.join('') + '</ul>';
}

function distanzaKm(lat1, lng1, lat2, lng2) {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
						Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
						Math.sin(dLng / 2) * Math.sin(dLng / 2);
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function setMapCenterAndZoomForResults(risultati, fallbackZoom = '12', options = {}) {
	const { preserveMapView = false } = options;
	if (preserveMapView) {
		return;
	}

	if (risultati.length > 0) {
		const primo = risultati[0];
		setMapView(primo.lat, primo.lng, 10);
		return;
	}

	if (aroundMeEnabled && aroundMeCoords) {
		setMapView(aroundMeCoords.lat, aroundMeCoords.lng, fallbackZoom);
	}
}

function filtraAziende(options = {}) {
	const { preserveMapView = false } = options;
	const input = document.getElementById('searchInput');
	const testoCercato = input.value.trim();
	const testoNorm = testoCercato.toLowerCase();
	const aziendeFiltratePerToggle = applyActiveFilters(databaseAziende);

	if (!testoCercato) {
		const risultati = filterAziendeInCurrentViewport(
			applyAroundMeFilter(aziendeFiltratePerToggle),
			preserveMapView
		);
		mostraAziendeSuMappa(risultati, { preserveMapView });
		if (!preserveMapView && risultati.length > 0) {
			const primo = risultati[0];
			setMapView(primo.lat, primo.lng, 10);
		} else if (!preserveMapView && aroundMeEnabled && aroundMeCoords) {
			setMapView(aroundMeCoords.lat, aroundMeCoords.lng, 12);
		} else if (!preserveMapView) {
			setMapView(41.8719, 12.5674, 6);
		}
		return;
	}

	const risultatiTestuali = aziendeFiltratePerToggle.filter((az) => {
		const categoriaPrincipale = (az.categoria || '').toLowerCase();
		const categorieProdotto = Array.isArray(az.categorie) ? az.categorie.join(' ').toLowerCase() : '';
		const nome = (az.nome || '').toLowerCase();
		const citta = (az.citta || '').toLowerCase();
		const indirizzo = (az.indirizzo || '').toLowerCase();
		return categoriaPrincipale.includes(testoNorm) ||
					 categorieProdotto.includes(testoNorm) ||
					 nome.includes(testoNorm) ||
					 citta.includes(testoNorm) ||
					 indirizzo.includes(testoNorm);
	});

	if (risultatiTestuali.length > 0) {
		const risultati = filterAziendeInCurrentViewport(
			applyAroundMeFilter(risultatiTestuali),
			preserveMapView
		);
		mostraAziendeSuMappa(risultati, { preserveMapView });
		setMapCenterAndZoomForResults(risultati, '12', { preserveMapView });
		return;
	}

	geocodeAddress(testoCercato).then((coords) => {
		if (coords) {
			const lat = coords.lat;
			const lng = coords.lng;
			const raggioKm = getRaggioKm();
			const risultatiByAddress = aziendeFiltratePerToggle.filter((az) => distanzaKm(lat, lng, az.lat, az.lng) <= raggioKm);
			const risultati = filterAziendeInCurrentViewport(
				applyAroundMeFilter(risultatiByAddress),
				preserveMapView
			);
			mostraAziendeSuMappa(risultati, { preserveMapView });
			if (!preserveMapView && risultati.length > 0) {
				setMapView(lat, lng, 12);
			} else if (!preserveMapView && aroundMeEnabled && aroundMeCoords) {
				setMapView(aroundMeCoords.lat, aroundMeCoords.lng, 12);
			}
			return;
		}

		alert('Luogo non trovato. Prova a selezionare un suggerimento.');
	});
}

function cercaIntornoAMe() {
	if (aroundMeEnabled) {
		aroundMeEnabled = false;
		aroundMeCoords = null;
		updateAroundMeButtonState();
		filtraAziende();
		return;
	}

	getCurrentPosition()
		.then((coords) => {
			aroundMeEnabled = true;
			aroundMeCoords = coords;
			updateAroundMeButtonState();
			filtraAziende();
		})
		.catch((error) => {
			alert(error.message);
		});
}

window.initApp = initApp;
window.filtraAziende = filtraAziende;
window.cercaIntornoAMe = cercaIntornoAMe;
window.toggleElencoLaterale = toggleElencoLaterale;

document.addEventListener('DOMContentLoaded', () => {
	initQuickFilters();
	updateAroundMeButtonState();
	loadConsumerMenu();
	loadGoogleMapsApi();
});