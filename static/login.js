const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (loginForm && loginMessage) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        loginMessage.textContent = '';
        loginMessage.style.color = 'red';

        if (!email) {
            loginMessage.textContent = 'Email è obbligatoria';
            return;
        }
        if (!password) {
            loginMessage.textContent = 'Password è obbligatoria';
            return;
        }
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                loginMessage.style.color = 'red';
                loginMessage.textContent = data.message || 'Errore durante il login';
                return;
            }
            localStorage.setItem('token', data.token);
            loginMessage.style.color = 'green';
            loginMessage.textContent = 'Login effettuato con successo';

            // TODO(authz): reindirizzare l’utente verso un’area autenticata quando sarà disponibile
            // TODO(security): valutare in futuro una gestione del token più robusta

        } catch (error) {
            console.error('Errore durante il login:', error);
            loginMessage.style.color = 'red';
            loginMessage.textContent = 'Errore di connessione al server';
        }
    });
}

