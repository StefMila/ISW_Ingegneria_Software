// Questo script gestisce la costruzione dinamica dell'header/menù 
// per le pagine dell'allevatore, con opzioni per mostrare o nascondere 
// determinate voci di menu.
(function () {
  // Costruisce la porzione navigazione con menu completo sempre visibile.
  const buildNavMenu = ({ showHomeLink }) => {
    const homeLink = showHomeLink
      ? '<a href="/home-allevatore.html" class="nav-home-btn">\u2190 Home</a>'
      : '';

    return `
      <div class="nav-buttons">
        ${homeLink}
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">La tua attività \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/add-azienda.html">Aggiungi azienda</a></li>
            <li><a href="/show-azienda.html">Gestisci aziende</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">La tua mandria \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/add-animale.html">Aggiungi animale</a></li>
            <li><a href="/view-animali.html">Visualizza animali</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">Eventi e calendario \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/eventi-allevatore.html">Gestisci eventi</a></li>
            <li><a href="/impostazioni-calendario.html">Google Calendar</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">Lavorazioni \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/add-lavorazione.html">Aggiungi lavorazione</a></li>
            <li><a href="/view-lavorazioni.html">Visualizza lavorazioni</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">Prodotti \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/add-punto-vendita.html">Aggiungi Punto Vendita</a></li>
            <li><a href="/view-punti-vendita.html">Visualizza Punti Vendita</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">I tuoi documenti \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/documenti.html">Visualizza documenti</a></li>
          </ul>
        </div>
      </div>
    `;
  };
// La funzione renderAllevatoreHeader è esposta globalmente e può essere chiamata da qualsiasi pagina che include questo script.
  window.renderAllevatoreHeader = function renderAllevatoreHeader(options = {}) {
    const {
      mountId = 'allevatoreHeaderMount',
      titleText = '',
      showHomeLink = true
    } = options;

    const mount = document.getElementById(mountId);
    // Se la pagina non espone il mount, il renderer non deve fallire.
    if (!mount) return;

    const title = titleText
      ? `<h1 class="dashboard-title-light dashboard-title-centered">${titleText}</h1>`
      : '';

    // Render centralizzato: in questo modo il markup fisso non e duplicato su ogni vista.
    mount.innerHTML = `
      <header class="dashboard-header">
        ${buildNavMenu({ showHomeLink })}
        ${title}
        <div class="header-right-actions">
          <div class="nav-dropdown" id="aziendaSwitcherDropdown">
            <button id="currentAziendaBadge" class="dashboard-header-pill dashboard-header-pill-button" type="button">Azienda attiva: non selezionata \u25be</button>
            <ul class="nav-dropdown-menu azienda-switcher-menu" id="aziendaSwitcherMenu"></ul>
          </div>
          <button id="logoutButton">Logout</button>
        </div>
      </header>
    `;
  };
})();
