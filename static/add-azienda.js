const aziendaForm = document.getElementById('add-azienda-form');
const aziendaFormMessage = document.getElementById('addAziendaMessage');
const currentAziendaBadge = document.getElementById('currentAziendaBadge');

const selectedAziendaName = localStorage.getItem('selectedAziendaName') || 'non selezionata';
if (currentAziendaBadge) {
    currentAziendaBadge.textContent = `Azienda attiva: ${selectedAziendaName}`;
}

// Carica dinamicamente Google Maps JS API con la chiave letta dal backend.
function loadGoogleMapsScript(apiKey, callback) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.head.appendChild(script);
}

function initAutocomplete() {
    const input = document.getElementById('indirizzo');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    if (window.google && google.maps && google.maps.places && input && latInput && lngInput) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
            types: ['geocode'],
            componentRestrictions: { country: 'it' }
        });

        autocomplete.addListener('place_changed', function() {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                latInput.value = place.geometry.location.lat();
                lngInput.value = place.geometry.location.lng();
            }
        });
    }

    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn && input && latInput && lngInput) {
        getLocationBtn.addEventListener('click', function() {
            if (!navigator.geolocation) {
                alert('Geolocalizzazione non supportata dal browser.');
                return;
            }

            getLocationBtn.disabled = true;
            getLocationBtn.textContent = 'Rilevamento posizione...';

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    latInput.value = lat;
                    lngInput.value = lng;
                    input.value = `Lat: ${lat}, Lng: ${lng}`;

                    if (window.google && google.maps && google.maps.Geocoder) {
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: { lat, lng } }, function(results, status) {
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
                function(error) {
                    alert('Impossibile ottenere la posizione: ' + error.message);
                    getLocationBtn.textContent = 'Usa la mia posizione attuale';
                    getLocationBtn.disabled = false;
                }
            );
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
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

// Handler per la creazione di una nuova azienda 
if (aziendaForm) {
    aziendaForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const companyName  = document.getElementById('nomeAzienda').value.trim();
        const address      = document.getElementById('indirizzo').value.trim();
        const vatNumber    = document.getElementById('partitaIva').value.trim();
        const phoneNumber  = document.getElementById('telefono').value.trim();
        const emailAzienda = document.getElementById('email').value.trim();
        const website      = document.getElementById('website').value.trim();
        const productCategoriesInput = document.getElementById('productCategories').value.trim();
        const lat          = document.getElementById('lat').value.trim();
        const lng          = document.getElementById('lng').value.trim();
        const productCategories = productCategoriesInput
            ? [...new Set(productCategoriesInput.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))]
            : [];

        aziendaFormMessage.style.color = 'red';
        aziendaFormMessage.textContent = '';

        if (!companyName) {
            aziendaFormMessage.textContent = 'Il nome dell\'azienda è obbligatorio';
            return;
        }
        if (!vatNumber) {
            aziendaFormMessage.textContent = 'La partita IVA è obbligatoria';
            return;
        }
        if (vatNumber.length !== 13 || !/^IT\d{11}$/.test(vatNumber)) {
            aziendaFormMessage.textContent = 'La partita IVA deve essere composta da 11 cifre precedute da "IT"';
            return;
        }
        if (!emailAzienda) {
            aziendaFormMessage.textContent = 'L\'email azienda è obbligatoria';
            return;
        }
        // In questo flusso la posizione e' basata sulle coordinate
        if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
            aziendaFormMessage.textContent = 'Seleziona un indirizzo dai suggerimenti o usa la posizione attuale per ottenere le coordinate';
            return;
        }
        try {
            // Ottengo il token JWT dalla localStorage per l'autenticazione
            const token = localStorage.getItem('token');
            const response = await fetch('/api/aziende', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    companyName,
                    address,
                    vatNumber,
                    phoneNumber,
                    emailAzienda,
                    website,
                    categories: productCategories,
                    lat,
                    lng
                })
            });
// Gestione della risposta del server
            const data = await response.json();
            if (!response.ok) {
                aziendaFormMessage.textContent = data.message || 'Errore durante la creazione dell\'azienda';
                return;
            }
            aziendaFormMessage.style.color = 'green';
            aziendaFormMessage.textContent = 'Azienda creata con successo';
            aziendaForm.reset();
        } catch (error) {
            console.error('Errore durante la creazione dell\'azienda:', error);
            aziendaFormMessage.textContent = 'Errore di connessione al server';
        }
    });
}
