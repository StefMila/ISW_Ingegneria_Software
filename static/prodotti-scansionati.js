(() => {
    const listaContainer = document.getElementById('listaProdotti');
    const badgeContainer = document.getElementById('listaBadge');
    const menuRoot = document.getElementById('menu-root');

    const caricaStoricoProdotti = async () => {
        if (!listaContainer) return;

        // Lettura sicura del token (allineata con scansiona-prodotto.js)
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');

        if (!token || token === 'null' || token === 'undefined') {
            listaContainer.innerHTML = '<p class="error">Sessione scaduta. Effettua nuovamente il login.</p>';
            return;
        }

        try {
            const response = await fetch('/api/prodotti-salvati', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.status === 200) {
                listaContainer.innerHTML = ''; // Rimuove il testo di caricamento

                if (badgeContainer) {
                        badgeContainer.innerHTML = ''; // Svuota i vecchi badge statici
                        
                        if (!data.badges || data.badges.length === 0) {
                            badgeContainer.innerHTML = '<p class="no-badges">Nessun badge sbloccato. Fai la tua prima scansione!</p>';
                        } else {
                            // Genera i badge reali calcolati dal server
                            data.badges.forEach(b => {
                                const badgeHtml = `
                                    <div class="badge-item-profilo ${b.stile}">
                                        <span class="badge-item-icon">${b.icona}</span>
                                        <span class="badge-item-titolo">${b.titolo}</span>
                                    </div>
                                `;
                                badgeContainer.insertAdjacentHTML('beforeend', badgeHtml);
                            });
                        }
                    }

                if (!data.items || data.items.length === 0) {
                    listaContainer.innerHTML = '<p>Non hai ancora scansionato nessun prodotto. Comincia subito!</p>';
                    return;
                }

                // Genera le card per ogni prodotto salvato
                data.items.forEach(item => {
                    const lotto = item.lottoProdottoId;
                    if (!lotto) return; // Salta se i dati del lotto sono corrotti

                    const dataScansione = new Date(item.scansionatoAt).toLocaleDateString('it-IT', {
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit'
                    });

                    const cardHtml = `
                        <div class="prodotto-card">
                            <div class="card-header">
                                <h3>${lotto.nomeProdotto}</h3>
                                <span class="badge-lotto">Lotto: ${lotto.lotNumber}</span>
                            </div>
                            <div class="card-body">
                                <p><strong>Quantità:</strong> ${lotto.quantity} ${lotto.unit}</p>
                                <p class="data-scansione">Scansionato il: ${dataScansione}</p>
                            </div>
                        </div>
                    `;
                    listaContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
            } else {
                listaContainer.innerHTML = `<p class="error">Errore nel caricamento: ${data.message || 'Errore del server'}</p>`;
            }
        } catch (error) {
            console.error("Errore di rete durante caricaStoricoProdotti:", error);
            listaContainer.innerHTML = '<p class="error">Impossibile connettersi al server.</p>';
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
        // Carica il menu dinamico
        await loadMenu();
        
        // Recupera i dati dal server
        await caricaStoricoProdotti();
    };

    // Esecuzione al caricamento della finestra
    document.addEventListener('DOMContentLoaded', initPage);

})();