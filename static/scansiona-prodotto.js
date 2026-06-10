(() => {
    const lotNumberInput = document.getElementById('lotNumberInput');
    const btnInviaScansione = document.getElementById('btnInviaScansione');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const badgeDescrizione = document.getElementById('badgeDescrizione');
    const badgeModal = document.getElementById('badgeModal');
    const nomeBadgeSbloccato = document.getElementById('nomeBadgeSbloccato');
    const closeBadgeModalBtn = document.getElementById('closeBadgeModalBtn');

    const menuRoot = document.getElementById('menu-root');

    const renderMessage = (element, displayMode, text = '') => {
        if (!element) return;
        element.style.display = displayMode;
        if (text) element.innerHTML = text;
    };

    const inviaScansione = async () => {
        const lotNumber = lotNumberInput ? lotNumberInput.value.trim() : '';
        
        // Reset messaggi visivi
        renderMessage(successMessage, 'none');
        renderMessage(errorMessage, 'none');

        if (!lotNumber) {
            alert("Inserisci un codice lotto valido.");
            return;
        }

        // Lettura sicura del token
        const token = localStorage.getItem('token') || localStorage.getItem('userToken');

        if (!token || token === 'null' || token === 'undefined') {
            renderMessage(errorMessage, 'block', "Sessione scaduta. Effettua nuovamente il login.");
            return;
        }

        try {
            const response = await fetch(`/api/prodotti-salvati/scansiona`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ lotNumber })
            });

            const data = await response.json();

            if (response.status === 201) {
                // Successo
                const nomeProdotto = data.prodotto?.nomeProdotto || 'Prodotto';
                const nomeAzienda = data.prodotto?.companyName || '—';
                
                renderMessage(
                    successMessage, 
                    'block', 
                    `<strong>${nomeProdotto}</strong> salvato con successo! Azienda: ${nomeAzienda}`
                );
                
                if (lotNumberInput) lotNumberInput.value = '';

                // Sblocco Badge: compare SOLO se il server conferma che è stato SBLOCCATO ORA (isNewBadge)
                // Se il tuo backend non ha ancora "isNewBadge", controlla se data.badgeSbloccato è popolato solo al primo sblocco
                if (data.scansione?.badgeSbloccato || data.badgeSbloccato) {
                    const badgeDaMostrare = data.scansione?.badgeSbloccato || data.badgeSbloccato;
                    mostraBadgeModal(badgeDaMostrare);
                }
            } else if (response.status === 409) {
                // Duplicato
                renderMessage(errorMessage, 'block', data.message || 'Prodotto già scansionato.');
            } else {
                // Altri errori
                renderMessage(errorMessage, 'block', data.message || 'Errore durante la scansione.');
            }
        } catch (error) {
            console.error("Errore di rete durante inviaScansione:", error);
            renderMessage(errorMessage, 'block', "Errore di connessione con il server.");
        }
    };

    const mostraBadgeModal = (badge) => {
        if (!badge) return;

        const iconaElement = document.querySelector('.badge-icon');

        // Imposta l'icona emoji ed applica la classe per la sfumatura metallica (bronzo, argento, oro)
        if (iconaElement) {
            iconaElement.innerText = badge.icona || '🏆';
            iconaElement.className = `badge-icon ${badge.stile || ''}`.trim();
        }

        // Imposta il titolo del traguardo fedeltà
        if (nomeBadgeSbloccato) {
            nomeBadgeSbloccato.innerText = badge.titolo || '';
        }

        // Imposta il testo descrittivo/esplicativo
        if (badgeDescrizione) {
            badgeDescrizione.innerText = badge.descrizione || '';
        }

        // Mostra la modale a schermo con flex-box per centrarla
        if (badgeModal) {
            badgeModal.style.display = 'flex';
        }
    };

    const chiudiModal = () => {
        if (badgeModal) {
            badgeModal.style.display = 'none';
        }
    };

    const loadMenu = async () => {
        if (!menuRoot) return;
        try {
            const res = await fetch('/menu-consumatore.html');
            if (!res.ok) throw new Error('Errore caricamento menu');
            const html = await res.text();
            menuRoot.innerHTML = html;
        } catch (err) {
            console.error('Errore caricamento menu:', err);
        }
    };

   const initPage = async () => {
        // 1. Carica il menu laterale
        await loadMenu();
        
        // 2. Associa gli Event Listeners
        if (btnInviaScansione) {
            btnInviaScansione.addEventListener('click', inviaScansione);
        }
        
        if (closeBadgeModalBtn) {
            closeBadgeModalBtn.addEventListener('click', chiudiModal);
        }
    };

    // Esecuzione al caricamento della finestra
    document.addEventListener('DOMContentLoaded', initPage);

})();