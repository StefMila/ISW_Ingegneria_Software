(function () {
  // Nome globale della callback usata da Google Maps quando lo script e pronto.
  const CALLBACK_NAME = '__muccAppEventMapsReady';
  // Flag per evitare caricamenti multipli o race condition del loader.
  let isLoading = false;
  let isLoaded = false;

  window[CALLBACK_NAME] = function () {
    isLoaded = true;
    // Notifica l'app che Places Autocomplete puo essere inizializzato nel form eventi.
    window.dispatchEvent(new Event('maps:event-location-ready'));
  };

  window.loadEventLocationMaps = async function () {
    // Evita richieste duplicate se lo script e gia in caricamento o pronto.
    if (isLoaded || isLoading) return;

    isLoading = true;
    try {
      const response = await fetch('/api/config');
      const config = await response.json().catch(() => ({}));
      // Se manca la chiave API, lasciamo il campo luogo in inserimento manuale.
      if (!config || !config.googleMapsKey) return;

      const existingScript = document.querySelector('script[data-role="event-maps-loader"]');
      if (existingScript) return;

      // Iniezione dinamica dello script Maps per non includerlo staticamente in pagina.
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsKey}&libraries=places&callback=${CALLBACK_NAME}`;
      script.async = true;
      script.defer = true;
      script.dataset.role = 'event-maps-loader';
      document.head.appendChild(script);
    } catch (_) {
      // Fallback silenzioso: il campo Luogo resta editabile manualmente.
    } finally {
      isLoading = false;
    }
  };
})();
