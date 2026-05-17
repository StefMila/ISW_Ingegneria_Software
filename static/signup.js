// import { sign } from "jsonwebtoken";

const signupForm = document.getElementById('signup-form');
const signupMessage = document.getElementById('signupMessage');
// Handler per la registrazione di un nuovo utente
if (signupForm&& signupMessage) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
// Ottengo i valori di email, password e ruolo inseriti dall'utente
        const name = document.getElementById('name').value;
        const surname = document.getElementById('surname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;

        signupMessage.textContent = 'Registrazione in corso...';
        signupMessage.style.color = 'black';
// Validazione dei campi
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            signupMessage.textContent = 'Email non valida. Assicurati di inserire un indirizzo email corretto.';
            signupMessage.style.color = 'red';
            return;
        }
        if (password.length < 8) {
            signupMessage.textContent = 'La password deve essere lunga almeno 8 caratteri.';
            signupMessage.style.color = 'red';
            return;
        }
        if (!name ){
            signupMessage.textContent = 'Il nome è obbligatorio.';
            signupMessage.style.color = 'red';
            return;
        }
        if (!surname ){
            signupMessage.textContent = 'Il cognome è obbligatorio.';
            signupMessage.style.color = 'red';
            return;
        }
        if (!userType ){
            signupMessage.textContent = 'Il ruolo è obbligatorio.';
            signupMessage.style.color = 'red';
            return;
        }
       // Effettuo la chiamata API per la registrazione
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    name, 
                    surname, 
                    email, 
                    password, 
                    userType 
                })
            });
            const data = await response.json();
// Gestione della risposta del server
            if (!response.ok) {
                signupMessage.textContent = data.message || 'Errore durante la registrazione.';
                signupMessage.style.color = 'red';
                return;
            } else {
                signupMessage.textContent = data.message || 'Registrazione avvenuta con successo!';
                signupMessage.style.color = 'green';
                signupForm.reset();
            }
        } catch (error) {
            signupMessage.textContent = 'Errore di rete. Riprova più tardi.';
            signupMessage.style.color = 'red';
        }
    });
}
