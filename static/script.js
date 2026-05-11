const checkBackendButton = document.getElementById('check-backend-btn');
const statusElement = document.getElementById('status');

console.log('script caricato');
console.log('bottone trovato:', checkBackendButton);
console.log('status trovato:', statusElement);

if (checkBackendButton && statusElement) {
  checkBackendButton.addEventListener('click', async () => {
    console.log('bottone cliccato');
    statusElement.textContent = 'Verifica del backend in corso...';

    try {
      const response = await fetch('/api/health');
      const data = await response.json();

      console.log('risposta backend:', data);

      if (response.ok) {
        statusElement.textContent = `Backend connesso correttamente: ${data.status}`;
      } else {
        statusElement.textContent = 'Il backend ha risposto con un errore.';
      }
    } catch (error) {
      console.error('Errore nella chiamata al backend:', error);
      statusElement.textContent = 'Errore di connessione al backend.';
    }
  });
} else {
  console.error('Elemento bottone o status non trovato nel DOM');
}