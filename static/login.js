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

            console.log('Token salvato:', !!data.token);
            console.log('UserType salvato:', data.userType);

            // Auto-seleziona la prima azienda disponibile (se non già impostata)
            try {
              const azRes  = await fetch('/api/azienda/mine', { headers: { Authorization: `Bearer ${data.token}` } });
              const azData = await azRes.json().catch(() => ({}));
              if (azRes.ok && Array.isArray(azData.items) && azData.items.length > 0) {
                localStorage.setItem('selectedAziendaId',   azData.items[0]._id);
                localStorage.setItem('selectedAziendaName', azData.items[0].companyName || '');
              }
            } catch (_) { /* ignora errori non bloccanti */ }
            // Reindirizzo l'utente alla home page specifica in base al suo ruolo
            loginMessage.style.color = 'green';
            loginMessage.textContent = 'Login effettuato con successo';

            // Piccolo delay per assicurare che localStorage sia sincronizzato prima del redirect
            setTimeout(() => {
              switch (data.userType) {
                  case 'allevatore':
                      window.location.href = '/home-allevatore.html';
                      break;
                  case 'veterinario':
                      window.location.href = '/home-veterinario.html';
                      break;
                  case 'consumatore':
                      window.location.href = '/home-consumatore.html';
                      break;
                  case 'distributore':
                      window.location.href = '/home-distributore.html';
                      break;
                  default:
                      window.location.href = '/home.html';
              }
            }, 100);
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

