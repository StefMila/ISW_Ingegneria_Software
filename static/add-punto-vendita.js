const addPuntoVenditaForm = document.getElementById('add-punto-vendita-form');
const addPuntoVenditaMessage = document.getElementById('addPuntoVenditaMessage');
const getLocationBtn = document.getElementById('getLocationBtn');
const latInput = document.getElementById('lat');
const lngInput = document.getElementById('lng');
// Funzione per caricare dinamicamente lo script di Google Maps con la chiave API
function loadGoogleMapsScript(apiKey, callback) {
	const script = document.createElement('script');
	script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
	script.async = true;
	script.defer = true;
	script.onload = callback;
	document.head.appendChild(script);
}
// autocompletamento indirizzo e geolocalizzazione
function initAutocomplete() {
	const input = document.getElementById('indirizzo');
	if (window.google && google.maps && google.maps.places && input && latInput && lngInput) {
		const autocomplete = new google.maps.places.Autocomplete(input, {
			types: ['geocode'],
			componentRestrictions: { country: 'it' }
		});

		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (place.geometry && place.geometry.location) {
				latInput.value = place.geometry.location.lat();
				lngInput.value = place.geometry.location.lng();
			}
		});
	}

	if (!getLocationBtn || !input || !latInput || !lngInput) {
		return;
	}

	getLocationBtn.addEventListener('click', () => {
		if (!navigator.geolocation) {
			alert('Geolocalizzazione non supportata dal browser.');
			return;
		}

		getLocationBtn.disabled = true;
		getLocationBtn.textContent = 'Rilevamento posizione...';

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;
				latInput.value = lat;
				lngInput.value = lng;
				input.value = `Lat: ${lat}, Lng: ${lng}`;

				if (window.google && google.maps && google.maps.Geocoder) {
					const geocoder = new google.maps.Geocoder();
					geocoder.geocode({ location: { lat, lng } }, (results, status) => {
						if (status === 'OK' && results && results.length > 0) {
							input.value = results[0].formatted_address;
						}
						getLocationBtn.textContent = 'Usa la mia posizione attuale';
						getLocationBtn.disabled = false;
					});
					return;
				}

				getLocationBtn.textContent = 'Usa la mia posizione attuale';
				getLocationBtn.disabled = false;
			},
			(error) => {
				alert('Impossibile ottenere la posizione: ' + error.message);
				getLocationBtn.textContent = 'Usa la mia posizione attuale';
				getLocationBtn.disabled = false;
			}
		);
	});
}
// Inizializza l'autocomplete e il rilevamento posizione al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
	fetch('/api/config')
		.then((res) => res.json())
		.then((cfg) => {
			if (cfg.googleMapsKey) {
				loadGoogleMapsScript(cfg.googleMapsKey, initAutocomplete);
				return;
			}
			alert('Chiave Google Maps non trovata.');
		})
		.catch(() => {
			alert('Errore nel caricamento della configurazione Google Maps.');
		});
});
// Gestione creazione punto vendita
if (addPuntoVenditaForm) {
	addPuntoVenditaForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const nomePunto = document.getElementById('nomePunto')?.value.trim() || '';
		const indirizzo = document.getElementById('indirizzo')?.value.trim() || '';
		const emailPunto = document.getElementById('emailPunto')?.value.trim() || '';
		const phoneNumber = document.getElementById('phoneNumber')?.value.trim() || '';
		const website = document.getElementById('website')?.value.trim() || '';
		const description = document.getElementById('description')?.value.trim() || '';
		const categoriesRaw = document.getElementById('categories')?.value.trim() || '';
		const lat = latInput?.value.trim() || '';
		const lng = lngInput?.value.trim() || '';

		const categories = categoriesRaw
			? [...new Set(categoriesRaw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))]
			: [];

		addPuntoVenditaMessage.style.color = 'red';
		addPuntoVenditaMessage.textContent = '';

		if (!nomePunto) {
			addPuntoVenditaMessage.textContent = 'Il nome del punto vendita e obbligatorio';
			return;
		}

		if (!indirizzo) {
			addPuntoVenditaMessage.textContent = 'L\'indirizzo e obbligatorio';
			return;
		}

		if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
			addPuntoVenditaMessage.textContent = 'Coordinate geografiche non valide';
			return;
		}

		try {
			const token = localStorage.getItem('token');
			const response = await fetch('/api/punti-vendita', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({
					nomePunto,
					indirizzo,
					emailPunto,
					phoneNumber,
					website,
					description,
					categories,
					lat,
					lng
				})
			});

			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				addPuntoVenditaMessage.textContent = data.message || data.error || 'Errore durante la creazione del punto vendita';
				return;
			}

			addPuntoVenditaMessage.style.color = 'green';
			addPuntoVenditaMessage.textContent = 'Punto vendita creato con successo';
			addPuntoVenditaForm.reset();
		} catch (error) {
			console.error('Errore durante la creazione del punto vendita:', error);
			addPuntoVenditaMessage.textContent = 'Errore di connessione al server';
		}
	});
}

