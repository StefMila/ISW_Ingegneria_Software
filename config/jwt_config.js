// Specifico la durata del token in base al ruolo dell'utente
const tokenExpByRole = Object.freeze({
    allevatore: '10h',
    distributore: '8h',
    veterinario: '8h',
    consumatore: '30min'
});

export default tokenExpByRole;