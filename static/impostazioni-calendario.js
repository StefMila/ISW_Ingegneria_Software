const calendarSettingsForm = document.getElementById('calendarSettingsForm');
const connectionBadge = document.getElementById('connectionBadge');
const settingsMessage = document.getElementById('calendarSettingsMessage');
const disconnectButton = document.getElementById('disconnectButton');
const connectGoogleButton = document.getElementById('connectGoogleButton');

const accountEmailInput = document.getElementById('accountEmail');
const privateCalendarIdInput = document.getElementById('privateCalendarId');
const publicCalendarIdInput = document.getElementById('publicCalendarId');
const connectNowInput = document.getElementById('connectNow');
// Impostazioni di default per la visualizzazione, usate quando non si riesce a caricare lo stato reale o quando non è selezionata un'azienda.
const defaultSettings = {
  connected: false,
  accountEmail: '',
  privateCalendarId: '',
  publicCalendarId: '',
  updatedAt: ''
};

const getToken = () => localStorage.getItem('token') || '';
const getAziendaId = () => localStorage.getItem('selectedAziendaId') || '';
// Funzione helper per fare fetch con gestione automatica dell'Authorization header e parsing JSON, usata per tutte le chiamate API in questa pagina.
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
// Funzione per aggiornare il messaggio di stato nella UI, con testo e colore personalizzabili.
const setMessage = (text, color = '#1f2937') => {
  if (!settingsMessage) return;
  settingsMessage.style.color = color;
  settingsMessage.textContent = text;
};
// Funzione per aggiornare il badge di stato della connessione Google Calendar, mostrando se è connesso o meno e l'email dell'account se disponibile.
const updateBadge = (connected, accountEmail) => {
  if (!connectionBadge) return;

  connectionBadge.classList.remove('status-chip-success', 'status-chip-warning');
  if (connected) {
    connectionBadge.classList.add('status-chip-success');
    connectionBadge.textContent = accountEmail ? `Connesso (${accountEmail})` : 'Connesso';
    return;
  }

  connectionBadge.classList.add('status-chip-warning');
  connectionBadge.textContent = 'Non connesso';
};
// Funzione per abilitare o disabilitare i pulsanti di azione in base allo stato di connessione: se è connesso, disabilita il pulsante di connessione e abilita quello di disconnessione, e viceversa.
const updateActionButtons = (connected) => {
  if (connectGoogleButton) {
    connectGoogleButton.disabled = Boolean(connected);
  }
  if (disconnectButton) {
    disconnectButton.disabled = !connected;
  }
};
// Funzione per popolare il form con le impostazioni correnti, usata sia all'inizializzazione che dopo ogni aggiornamento delle impostazioni. Se non sono disponibili, usa i valori di default.
const hydrateForm = () => {
  const settings = defaultSettings;

  if (accountEmailInput) accountEmailInput.value = settings.accountEmail || '';
  if (privateCalendarIdInput) privateCalendarIdInput.value = settings.privateCalendarId || '';
  if (publicCalendarIdInput) publicCalendarIdInput.value = settings.publicCalendarId || '';
  if (connectNowInput) connectNowInput.checked = Boolean(settings.connected);

  updateBadge(Boolean(settings.connected), settings.accountEmail || '');
  updateActionButtons(Boolean(settings.connected));
};
// Funzione per applicare le impostazioni caricate dal server al form, sovrascrivendo i valori di default con quelli reali. Viene chiamata dopo il caricamento delle impostazioni e in caso di errori per resettare la UI.
const applySettingsToForm = (settings) => {
  const merged = {
    ...defaultSettings,
    ...(settings || {})
  };

  if (accountEmailInput) accountEmailInput.value = merged.accountEmail || '';
  if (privateCalendarIdInput) privateCalendarIdInput.value = merged.privateCalendarId || '';
  if (publicCalendarIdInput) publicCalendarIdInput.value = merged.publicCalendarId || '';
  if (connectNowInput) connectNowInput.checked = Boolean(merged.connected);

  updateBadge(Boolean(merged.connected), merged.accountEmail || '');
  updateActionButtons(Boolean(merged.connected));
};
// Funzione per caricare lo stato di connessione Google Calendar dal server, usando l'azienda selezionata. Se non è selezionata un'azienda o se c'è un errore, mostra un messaggio e applica le impostazioni di default al form.
const loadSettings = async () => {
  const aziendaId = getAziendaId();
  if (!aziendaId) {
    setMessage('Seleziona prima un\'azienda attiva nella home allevatore.', '#b45309');
    applySettingsToForm(defaultSettings);
    return;
  }
// Chiamata API per ottenere lo stato di connessione Google Calendar dell'azienda selezionata, con gestione degli errori e aggiornamento della UI in base alla risposta.
  const { response, data } = await apiFetch(`/api/google-calendar/status?aziendaId=${encodeURIComponent(aziendaId)}`);
  if (!response.ok) {
    setMessage(data.message || 'Errore nel caricamento impostazioni calendario.', 'red');
    applySettingsToForm(defaultSettings);
    return;
  }

  applySettingsToForm(data.settings || defaultSettings);
};
// Funzione per leggere i parametri dalla query string dopo il redirect OAuth e mostrare un messaggio di esito della connessione Google Calendar, distinguendo tra successo e errore e mostrando eventuali motivi di errore.
const showOAuthOutcomeFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const gcal = params.get('gcal');

  if (gcal === 'connected') {
    setMessage('Connessione Google Calendar completata con successo.', 'green');
    return;
  }

  if (gcal === 'error') {
    const reason = params.get('reason') || 'Errore OAuth';
    const reasonMap = {
      google_calendar_not_enabled: 'L\'account Google usato non ha Google Calendar attivo. Apri calendar.google.com o usa un account con Calendar abilitato.',
      missing_config: 'Configurazione OAuth Google mancante nel backend.',
      missing_params: 'Parametri OAuth mancanti nel callback.',
      ownership_failed: 'Utente non autorizzato per questa azienda.'
    };
    const readable = reasonMap[reason] || reason;
    setMessage(`Connessione Google Calendar fallita: ${readable}`, 'red');
  }
};
// Gestione submit del form: in questo caso non abbiamo campi modificabili direttamente, quindi preveniamo il comportamento di default e non facciamo nulla. Tutta la gestione avviene tramite i pulsanti di connessione/disconnessione.
if (calendarSettingsForm) {
  calendarSettingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}
// Gestione click sul pulsante di disconnessione: chiama l'API di disconnessione, mostra un messaggio di esito e ricarica le impostazioni per aggiornare la UI. Se non è selezionata un'azienda, mostra un messaggio di avviso.
if (disconnectButton) {
  disconnectButton.addEventListener('click', async () => {
    const aziendaId = getAziendaId();
    if (!aziendaId) {
      setMessage('Seleziona prima un\'azienda attiva nella home allevatore.', '#b45309');
      return;
    }

    const { response, data } = await apiFetch('/api/google-calendar/disconnect', {
      method: 'POST',
      body: JSON.stringify({ aziendaId })
    });

    if (!response.ok) {
      setMessage(data.message || 'Errore disconnessione Google Calendar.', 'red');
      return;
    }

    if (connectNowInput) connectNowInput.checked = false;
    await loadSettings();
    setMessage('Connessione Google Calendar disattivata.', '#b45309');
  });
}
// Gestione click sul pulsante di connessione: ottiene l'URL di autorizzazione OAuth dal server e reindirizza l'utente a Google per completare la connessione. Se non è selezionata un'azienda o se c'è un errore, mostra un messaggio di avviso o errore.
if (connectGoogleButton) {
  connectGoogleButton.addEventListener('click', async () => {
    const aziendaId = getAziendaId();
    if (!aziendaId) {
      setMessage('Seleziona prima un\'azienda attiva nella home allevatore.', '#b45309');
      return;
    }

    const { response, data } = await apiFetch(`/api/google-calendar/auth-url?aziendaId=${encodeURIComponent(aziendaId)}`);
    if (!response.ok) {
      setMessage(data.message || 'Errore avvio connessione Google.', 'red');
      return;
    }

    if (!data.authUrl) {
      setMessage('URL di autorizzazione Google non disponibile.', 'red');
      return;
    }

    window.location.href = data.authUrl;
  });
}

showOAuthOutcomeFromQuery();
hydrateForm();
loadSettings();

window.addEventListener('aziendaChanged', () => {
  loadSettings();
});
