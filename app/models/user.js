import mongoose from "mongoose";
// definizione dello schema per l'utente= descrive la struttura dati 
const { Schema } = mongoose;
//come è fatto un utente: email e password, con alcune regole di validazione (es. email deve essere unica, obbligatoria, ecc.)
const userSchema = new Schema({
    email: {
        type: String,
        //obbligatorio
        required: true,
        //no duplicati
        unique: true,
        //rimuove spazi bianchi iniziali e finali
        trim: true,
        //converte in minuscolo
        lowercase: true,
    },
    password: {
        type: String,
        required: true
    },
});

const User = mongoose.model("User", userSchema);
//esporta il modello User per poterlo utilizzare in altre parti dell'applicazione --> auth.js per la registrazione e il login degli utenti
export default User; 