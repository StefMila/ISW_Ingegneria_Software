const aziendaForm = document.getElementById('add-azienda-form');
const aziendaFormMessage = document.getElementById('addAziendaMessage');

if (aziendaForm) {
    aziendaForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const companyName  = document.getElementById('nomeAzienda').value.trim();
        const address      = document.getElementById('indirizzo').value.trim();
        const vatNumber    = document.getElementById('partitaIva').value.trim();
        const phoneNumber  = document.getElementById('telefono').value.trim();
        const emailAzienda = document.getElementById('email').value.trim();
        const website      = document.getElementById('website').value.trim();

        aziendaFormMessage.style.color = 'red';
        aziendaFormMessage.textContent = '';

        if (!companyName) {
            aziendaFormMessage.textContent = 'Il nome dell\'azienda è obbligatorio';
            return;
        }
        if (!address) {
            aziendaFormMessage.textContent = 'L\'indirizzo è obbligatorio';
            return;
        }
        if (!vatNumber) {
            aziendaFormMessage.textContent = 'La partita IVA è obbligatoria';
            return;
        }
        if (vatNumber.length !== 11 || !/^\d{11}$/.test(vatNumber)) {
            aziendaFormMessage.textContent = 'La partita IVA deve essere composta da 11 cifre';
            return;
        }
        if (!emailAzienda) {
            aziendaFormMessage.textContent = 'L\'email azienda è obbligatoria';
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/azienda', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    companyName,
                    address,
                    vatNumber,
                    phoneNumber,
                    emailAzienda,
                    website
                })
            });

            const data = await response.json();
            if (!response.ok) {
                aziendaFormMessage.textContent = data.message || 'Errore durante la creazione dell\'azienda';
                return;
            }
            aziendaFormMessage.style.color = 'green';
            aziendaFormMessage.textContent = 'Azienda creata con successo';
            aziendaForm.reset();
        } catch (error) {
            console.error('Errore durante la creazione dell\'azienda:', error);
            aziendaFormMessage.textContent = 'Errore di connessione al server';
        }
    });
}
