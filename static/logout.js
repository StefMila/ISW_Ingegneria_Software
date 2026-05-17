const logoutButton = document.getElementById('logoutButton');
const logoutMessage = document.getElementById('logoutMessage');
// Handler per il logout dell'utente
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            // Ottengo il token JWT dalla localStorage per l'autenticazione
            const token = localStorage.getItem('token');

            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Invia il token JWT nell'header Authorization (se presente)
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            // Rimuovi il token JWT dal localStorage
            localStorage.removeItem('token');
            if (logoutMessage) {
                logoutMessage.style.color = 'green';
                logoutMessage.textContent = 'Logout effettuato con successo';
            }
            // qui possiamo anche reindirizzare alla home volendo.
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Errore durante il logout:', error);
            localStorage.removeItem('token');
            if (logoutMessage) {
                logoutMessage.style.color = 'red';
                logoutMessage.textContent = 'Errore durante il logout';
            }

            window.location.href = '/login.html';
        }
    });
}
                
