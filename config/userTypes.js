// Definisco un oggetto che contenga tutti i ruoli validi per gli utenti della piattaforma.
const userTypes = Object.freeze({
    allevatore: 'allevatore',
    distributore: 'distributore',
    veterinario: 'veterinario',
    consumatore: 'consumatore'
});

export default userTypes;