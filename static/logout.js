const logoutButton = document.getElementById('logoutButton');
const logoutMessage = document.getElementById('logoutMessage');

const clearAuthState = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('selectedAziendaId');
    localStorage.removeItem('selectedAziendaName');
};

const performLogout = async () => {
    try {
        const token = localStorage.getItem('token');

        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
    } catch (error) {
        console.error('Errore durante il logout:', error);
    } finally {
        clearAuthState();

        if (logoutMessage) {
            logoutMessage.style.color = 'green';
            logoutMessage.textContent = 'Logout effettuato con successo';
        }

        window.location.href = '/login.html';
    }
};

if (logoutButton) {
    logoutButton.addEventListener('click', performLogout);
}

if (window.location.pathname === '/logout.html') {
    performLogout();
}
