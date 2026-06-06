(function () {
  const buildNavMenu = ({ showHomeLink }) => {
    return `
      <div class="nav-buttons">
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
            <li><a href="/stats-animali.html">Statistiche animali</a></li>
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
            <li><a href="/avvia-mungitura.html">Avvia mungitura</a></li>
            <li><a href="/view-mungiture.html">Visualizza mungiture</a></li>
            <li><a href="/stats-mungiture.html">Statistiche mungitura</a></li>
            <li><a href="/add-lavorazione.html">Aggiungi lavorazione</a></li>
            <li><a href="/view-lavorazioni.html">Visualizza lavorazioni</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">Prodotti \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/add-punto-vendita.html">Aggiungi Punto Vendita</a></li>
            <li><a href="/view-punti-vendita.html">Visualizza Punti Vendita</a></li>
            <li><a href="/tracciabilita-allevatore.html">Tracciabilità</a></li>
             <li><a href="/crea-etichette.html">Crea etichette</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">I tuoi documenti \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/documenti.html">Visualizza documenti</a></li>
          </ul>
        </div>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">Sensori IoT \u25be</button>
          <ul class="nav-dropdown-menu">
            <li><a href="/view-sensori.html" id="nav-sensori">Visualizza Telemetria</a></li>
            <li><a href="/add-sensore.html">Aggiungi Sensore</a></li>
          </ul>
        </div>
      </div>
    `;
  };

  window.renderAllevatoreHeader = function renderAllevatoreHeader(options = {}) {
    const {
      mountId = 'allevatoreHeaderMount',
      titleText = '',
      showHomeLink = true
    } = options;

    const mount = document.getElementById(mountId);
    if (!mount) return;

    const title = titleText
      ? `<h1 class="dashboard-title-light dashboard-title-centered">${titleText}</h1>`
      : '';

    // Recuperiamo subito l'azienda per impostare il bottone info iniziale
    const currentId = localStorage.getItem('selectedAziendaId');
    const displayStyle = currentId ? 'inline-block' : 'none';
    const infoUrl = currentId ? `/show-azienda.html?id=${currentId}` : '#';

    const homeBarHTML = showHomeLink
      ? `<div class="secondary-home-bar">
           <a href="/home-allevatore.html" class="nav-home-btn">\u2190 Torna alla Home</a>
         </div>`
      : '';

    mount.innerHTML = `
      <header class="dashboard-header">
        ${buildNavMenu({ showHomeLink })}
        ${title}
        <div class="header-right-actions" style="display: flex; align-items: center; gap: 10px;">
          <div class="nav-dropdown" id="aziendaSwitcherDropdown">
            <button id="currentAziendaBadge" class="dashboard-header-pill dashboard-header-pill-button" type="button">Azienda attiva: non selezionata \u25be</button>
            <ul class="nav-dropdown-menu azienda-switcher-menu" id="aziendaSwitcherMenu"></ul>
          </div>
          <button id="logoutButton">Logout</button>
        </div>
      </header>

      ${homeBarHTML}
    `;

    // Listener globale: se l'azienda cambia, aggiorna all'istante il link del bottone info
    window.addEventListener('aziendaChanged', (e) => {
      const infoBtn = document.getElementById('headerShowAziendaBtn');
      const id = e.detail?.id || localStorage.getItem('selectedAziendaId');
      if (infoBtn) {
        if (id) {
          infoBtn.href = `/show-azienda.html?id=${id}`;
          infoBtn.style.display = 'inline-block';
        } else {
          infoBtn.style.display = 'none';
        }
      }
    });
  };
})();