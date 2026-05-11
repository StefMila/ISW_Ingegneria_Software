function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (!loginForm || !loginMessage) {
        console.error('Form login o area messaggi non trovati nel DOM');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        loginMessage.style.color = '#1f2937';
        loginMessage.textContent = 'Verifica credenziali...';

        if (!email) {
            loginMessage.style.color = 'red';
            loginMessage.textContent = 'Email è obbligatoria';
            return;
        }
        if (!password) {
            loginMessage.style.color = 'red';
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
            window.location.href = '/home.html';
        } catch (error) {
            console.error('Errore durante il login:', error);
            loginMessage.style.color = 'red';
            loginMessage.textContent = 'Errore di connessione al server';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginForm);
} else {
    initLoginForm();
}

