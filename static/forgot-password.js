const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotPasswordMessage = document.getElementById('forgotPasswordMessage');

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        forgotPasswordMessage.style.color = '#1f2937';
        forgotPasswordMessage.textContent = 'Verifica email...';
        // Validazione semplice dell'email
        if (!email) {
            forgotPasswordMessage.style.color = 'red';
            forgotPasswordMessage.textContent = 'Email è obbligatoria';
            return;
        }
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            // In un'implementazione reale, dovremmo rispondere sempre con successo per evitare enumeration, ma per ora mostriamo il messaggio restituito dall'API
            // TODO(security): evitare enumeration e abuso della funzionalità, mostrare sempre un messaggio generico indipendentemente dall'esistenza dell'email
            // TODO(security): integrare invio email per il recupero password, attualmente non viene inviata nessuna email, ma in un'implementazione reale dovremmo inviare un'email con un link di reset password

            if (!response.ok) {
                forgotPasswordMessage.style.color = 'red';
                forgotPasswordMessage.textContent = data.message || 'Errore durante il recupero password';
                return;
            }
            forgotPasswordMessage.style.color = 'green';
            forgotPasswordMessage.textContent = data.message;
        } catch (error) {
            console.error('Errore durante il recupero password:', error);
            forgotPasswordMessage.style.color = 'red';
            forgotPasswordMessage.textContent = 'Errore di connessione al server';
        }
    });
}  