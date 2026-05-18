/**
 * azienda-switcher.js
 * Script condiviso: gestisce il dropdown "Azienda attiva" in ogni pagina.
 * - Mostra subito il nome salvato in localStorage
 * - Recupera le aziende dell'utente via /api/azienda/mine
 * - Se l'utente ha più aziende, abilita il menu a discesa per cambiare al volo
 * - Emette l'evento personalizzato `aziendaChanged` sul window così le pagine
 *   possono reagire (es. view-animali.js ricarica la lista)
 */
(function () {
  const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
  const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

  const badgeBtn  = document.getElementById('currentAziendaBadge');
  const dropdown  = document.getElementById('aziendaSwitcherDropdown');
  const menu      = document.getElementById('aziendaSwitcherMenu');

  const updateBadge = (name) => {
    if (!badgeBtn) return;
    const arrow = dropdown ? ' ▾' : '';
    badgeBtn.textContent = `Azienda attiva: ${name || 'non selezionata'}${arrow}`;
  };

  const init = async () => {
    const token = localStorage.getItem('token');
    if (!token || !badgeBtn) return;

    // Mostra subito il valore già salvato
    updateBadge(localStorage.getItem(SELECTED_AZIENDA_NAME_KEY));

    try {
      const res  = await fetch('/api/azienda/mine', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.items) || data.items.length === 0) return;

      const items = data.items;

      // Auto-seleziona la prima azienda se localStorage è vuoto
      if (!localStorage.getItem(SELECTED_AZIENDA_ID_KEY)) {
        localStorage.setItem(SELECTED_AZIENDA_ID_KEY, items[0]._id);
        localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, items[0].companyName || '');
        updateBadge(items[0].companyName);
        window.dispatchEvent(new CustomEvent('aziendaChanged', {
          detail: { id: items[0]._id, name: items[0].companyName || '' }
        }));
      }

      // Con una sola azienda non serve il dropdown
      if (items.length <= 1 || !menu || !dropdown) {
        if (badgeBtn) badgeBtn.style.cursor = 'default';
        return;
      }

      // Popola il menu con tutte le aziende dell'utente
      menu.innerHTML = items.map(az => `
        <li>
          <button class="azienda-switcher-item"
                  data-id="${az._id}"
                  data-name="${(az.companyName || '').replace(/"/g, '&quot;')}">
            ${az.companyName || 'Azienda senza nome'}
          </button>
        </li>
      `).join('');

      // Apre/chiude il dropdown al click sul badge
      badgeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });

      // Chiude cliccando fuori dal dropdown
      document.addEventListener('click', () => dropdown.classList.remove('open'));

      // Cambio azienda al click su una voce del menu
      menu.addEventListener('click', (e) => {
        const btn = e.target.closest('.azienda-switcher-item');
        if (!btn) return;
        const { id, name } = btn.dataset;
        localStorage.setItem(SELECTED_AZIENDA_ID_KEY, id);
        localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, name);
        updateBadge(name);
        dropdown.classList.remove('open');
        window.dispatchEvent(new CustomEvent('aziendaChanged', { detail: { id, name } }));
      });

    } catch (err) {
      console.error('Errore switcher azienda:', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
