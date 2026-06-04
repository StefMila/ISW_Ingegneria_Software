/**
 * azienda-switcher.js
 * Script condiviso: gestisce il dropdown "Azienda attiva" in ogni pagina.
 * - Mostra subito il nome salvato in localStorage
 * - Recupera le aziende dell'utente via /api/aziende/mine
 * - Sincronizza automaticamente il <select> della Home (se presente)
 * - Se l'utente ha più aziende, abilita il menu a discesa per cambiare al volo
 * - Emette l'evento personalizzato `aziendaChanged` sul window
 */
(function () {
  const SELECTED_AZIENDA_ID_KEY = 'selectedAziendaId';
  const SELECTED_AZIENDA_NAME_KEY = 'selectedAziendaName';

  const badgeBtn     = document.getElementById('currentAziendaBadge');
  const dropdown     = document.getElementById('aziendaSwitcherDropdown');
  const menu         = document.getElementById('aziendaSwitcherMenu');
  
  // Elemento della Home Allevatore (se ci troviamo in quella pagina)
  const homeSelector = document.getElementById('aziendaSelector');

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
      const res  = await fetch('/api/aziende/mine', { headers: { Authorization: `Bearer ${token}` } });
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

      if (homeSelector) {
        // Popola il menu a tendina della Home con le aziende
        homeSelector.innerHTML = items.map(az => `
          <option value="${az._id}" ${az._id === localStorage.getItem(SELECTED_AZIENDA_ID_KEY) ? 'selected' : ''}>
            ${az.companyName || 'Azienda senza nome'}
          </option>
        `).join('');

        // Salva istantaneamente l'azienda se l'utente la cambia dal selettore della pagina
        homeSelector.addEventListener('change', () => {
          const selectedOpt = homeSelector.options[homeSelector.selectedIndex];
          const selectedName = selectedOpt ? selectedOpt.text : '';
          
          localStorage.setItem(SELECTED_AZIENDA_ID_KEY, homeSelector.value);
          localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, selectedName);
          
          updateBadge(selectedName);
          
          window.dispatchEvent(new CustomEvent('aziendaChanged', { 
            detail: { id: homeSelector.value, name: selectedName } 
          }));
        });
      }
      
      // Con una sola azienda non serve il dropdown
      if (items.length <= 1 || !menu || !dropdown) {
        if (badgeBtn) badgeBtn.style.cursor = 'default';
        return;
      }

      // Popola il menu con tutte le aziende dell'utente
      menu.innerHTML = items.map(az => `
        <li>
          <button type="button" class="azienda-switcher-item"
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

      // Chiude cliccando fuori dal dropdown in modo sicuro
      document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target)) {
          dropdown.classList.remove('open');
        }
      });

      // Usiamo mousedown per prevenire il bug di chiusura anticipata
      menu.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('.azienda-switcher-item');
        if (!btn) return;
        
        e.preventDefault(); // Mantiene il focus ed evita conflitti con il click-out
        
        const { id, name } = btn.dataset;
        
        // 1. Aggiorna lo stato globale
        localStorage.setItem(SELECTED_AZIENDA_ID_KEY, id);
        localStorage.setItem(SELECTED_AZIENDA_NAME_KEY, name);
        updateBadge(name);
        
        // Allinea il selettore della Home se presente
        if (homeSelector) homeSelector.value = id;
        
        //Chiude il dropdown e notifica il sistema
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