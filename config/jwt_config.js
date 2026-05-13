// Specifico la durata del token in base al ruolo dell'utente
const tokenExpByRole = Object.freeze({
    consumatore: '30min',
    allevatore: '10h',
    distributore: '8h',
    veterinario: '8h'
});

export default tokenExpByRole;