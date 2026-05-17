const resetPasswordForm = document.getElementById('reset-password-form');
const resetPasswordMessage = document.getElementById('resetPasswordMessage');

// Aggiungo un listener al form di reset password
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
// Ottengo i valori di email, nuova password e conferma password inseriti dall'utente
    const email = document.getElementById('email').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmedPassword = document.getElementById('confirmPassword').value;
// Resetto l'area messaggi prima di effettuare le validazioni
    resetPasswordMessage.textContent = '';
    resetPasswordMessage.style.color = 'red';

    // Validazione dei campi
    if (!email || !newPassword || !confirmedPassword) {
      resetPasswordMessage.textContent = 'Tutti i campi sono obbligatori.';
      return;
    }
    // Lunghezza minima password
    if (newPassword.length < 8) {
      resetPasswordMessage.textContent = 'La nuova password deve essere lunga almeno 8 caratteri.';
      return;
    }
    // nuova password e conferma devono coincidere
    if (newPassword !== confirmedPassword) {
      resetPasswordMessage.textContent = 'Le password non coincidono.';
      return;
    }
    // invia la richiesta di reset password al server
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await response.json();
      // Se la risposta non è ok, mostro l'errore restituito dal server
      if (!response.ok) {
        resetPasswordMessage.textContent = data.message || 'Errore durante il reset della password.';
        return;
      }
      // Se la password è stata aggiornata con successo
      resetPasswordMessage.style.color = 'green';
      resetPasswordMessage.textContent = 'Password aggiornata! Reindirizzamento al login...';
      // Reindirizzo alla pagina di login dopo 2 secondi
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);

    } catch (error) {
      console.error('Errore reset password:', error);
      resetPasswordMessage.textContent = 'Errore di connessione al server.';
    }
  });
}