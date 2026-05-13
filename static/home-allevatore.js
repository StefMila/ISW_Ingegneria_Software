const addAziendaButton = document.getElementById('addAziendaButton');

if (addAziendaButton) {
  addAziendaButton.addEventListener('click', () => {
    window.location.href = '/add-azienda.html';
  });
}