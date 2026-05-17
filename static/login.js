function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');
// Verifica che gli elementi del form e dell'area messaggi esistano nel DOM
    if (!loginForm || !loginMessage) {
        console.error('Form login o area messaggi non trovati nel DOM');
        return;
    }
// Handler per il submit del form di login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
// Ottengo i valori di email e password inseriti dall'utente
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
// Effettuo la chiamata API per il login
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
// Salvo il token JWT e il tipo di utente restituiti dall'API nella localStorage per l'autenticazione e la gestione dei ruoli
            localStorage.setItem('token', data.token);
            // questo verifica i ruoli
            localStorage.setItem('userType', data.userType);
            if(data.userType === 'allevatore') {
                loginMessage.style.color = 'green';
                loginMessage.textContent = 'Login effettuato con successo';
                window.location.href = '/home-allevatore.html';
            }else{
                window.location.href = '/home.html';
            }
            // questo andrà sistemato quando creiamo anche gli altri utenti, per ora reindirizza tutti alla stessa home
            // loginMessage.style.color = 'green';
            // loginMessage.textContent = 'Login effettuato con successo';
            // window.location.href = '/home.html';
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

