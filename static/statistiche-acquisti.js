(() => {
    const menuRoot = document.getElementById('menu-root');
    const totaleSpesa = document.getElementById('totaleSpesaKm0');
    
    // Badge
    const badge1 = document.getElementById('badge-1');
    const badge5 = document.getElementById('badge-5');
    const badge10 = document.getElementById('badge-10');

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

    const calcolaStatisticheEBadge = async () => {
        // Lettura sicura del token
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        
        if (!token || token === 'null' || token === 'undefined') {
            console.warn("Sessione non valida per caricare le statistiche.");
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
                // Utilizza data.totale (che abbiamo inserito nel backend) oppure calcola la lunghezza dell'array
                const totale = data.totale !== undefined ? data.totale : (data.items ? data.items.length : 0);
                
                // Aggiorna il contatore a schermo
                if (totaleSpesa) {
                    totaleSpesa.innerText = totale;
                }

                // 2. Logica di attivazione visiva dei Badge
                if (totale >= 1 && badge1) {
                    badge1.classList.remove('locked');
                    badge1.classList.add('unlocked', 'badge-bronzo');
                }
                if (totale >= 5 && badge5) {
                    badge5.classList.remove('locked');
                    badge5.classList.add('unlocked', 'badge-argento');
                }
                if (totale >= 10 && badge10) {
                    badge10.classList.remove('locked');
                    badge10.classList.add('unlocked', 'badge-oro');
                }
            }
        } catch (error) {
            console.error("Errore nel calcolo delle statistiche:", error);
        }
    };

    const initPage = async () => {
        await loadMenu();
        await calcolaStatisticheEBadge();
    };

    // Esecuzione al caricamento della finestra
    document.addEventListener('DOMContentLoaded', initPage);

})();