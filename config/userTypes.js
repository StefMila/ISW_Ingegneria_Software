// Definisco un oggetto che contenga tutti i ruoli validi per gli utenti della piattaforma.
const userTypes = Object.freeze({
    consumatore: 'consumatore',
    allevatore: 'allevatore',
    distributore: 'distributore',
    veterinario: 'veterinario'
});

export default userTypes;