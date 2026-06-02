import mqtt from 'mqtt';
import Sensore from '../models/sensore.js';

// Connessione a un broker MQTT pubblico di test
const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

// Cache in memoria per memorizzare l'ultima lettura reale arrivata via MQTT
// Struttura: { "ID_SENSORE": { valore: 23, unitaMisura: "°C", timestamp: Date } }
const ultimeLettureIot = new Map();

// Topic base del progetto (cambia 'allevamento_smart' con un nome unico per evitare conflitti sul broker pubblico)
const TOPIC_BASE = 'unitn/muccapp/allevamento_smart/sensori';

client.on('connect', () => {
    console.log('=== Connesso con successo al Broker MQTT ===');
    
    // Il server si iscrive al canale di ascolto di TUTTI i sensori dell'applicazione
    // Il simbolo '+' è una wildcard MQTT: intercetta qualsiasi ID sensore arrivi su quel path
    client.subscribe(`${TOPIC_BASE}/+/data`, (err) => {
        if (!err) {
            console.log(`Sottoscritto al topic MQTT: ${TOPIC_BASE}/+/data`);
        }
    });

    // Avviamo il simulatore hardware una volta connessi
    avviaSimulatoreHardware();
});

// Ricezione e parsing dati MQTT
client.on('message', (topic, message) => {
    try {
        const stringaGrezza = message.toString();
        // Esempio stringa ricevuta: "665c4d2e...;temperatura;4.2;°C"
        
        const parti = stringaGrezza.split(';');
        const sensoreId = parti[0];
        const tipoDatoRaccolto = parti[1];
        const valoreGrezzo = parti[2];
        const unitaMisura = parti[3];

        let valoreCaricato;
        if (tipoDatoRaccolto === 'posizione_gps') {
            valoreCaricato = valoreGrezzo; // Lascialo come stringa "Lat,Lon"
        } else if (tipoDatoRaccolto === 'peso_corporeo' || tipoDatoRaccolto === 'livello_passi' || tipoDatoRaccolto === 'frequenza_cardiaca') {
            valoreCaricato = parseInt(valoreGrezzo, 10);
        } else {
            valoreCaricato = parseFloat(valoreGrezzo);
        }

        // Salviamo l'informazione decodificata nella nostra mappa in memoria
        ultimeLettureIot.set(sensoreId, {
            valore: valoreCaricato,
            unitaMisura: unitaMisura,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Errore nel parsing del messaggio MQTT:', error.message);
    }
});

// Simulatore hardware fisico
function avviaSimulatoreHardware() {
    // Ogni 5 secondi l'hardware si "sveglia", prende i sensori dal DB e spara i dati via MQTT
    setInterval(async () => {
        try {
            const sensoriAttivi = await Sensore.find({ stato: 'attivo' });

            sensoriAttivi.forEach(sensore => {
                let valore = 0;
                switch (sensore.tipoDatoRaccolto) {
                    case 'temperatura':
                        // Temperatura corporea bovina (38.0 - 39.5)
                        valore = (Math.random() * (39.5 - 38.0) + 38.0).toFixed(1);
                        break;
                    case 'frequenza_cardiaca':
                        // Battiti bovino adulto a riposo (48 - 84 bpm)
                        valore = Math.floor(Math.random() * (84 - 48) + 48);
                        break;
                    case 'livello_passi':
                        valore = Math.floor(Math.random() * (12000 - 2000) + 2000);
                        break;
                    case 'esposizione_solare':
                        // Ore di esposizione (es. da 0 a 10)
                        valore = (Math.random() * 10).toFixed(1);
                        break;
                    case 'posizione_gps':
                        // Genera coordinate fittizie nei pressi dell'azienda (es. Nord Italia)
                        const lat = (45.0 + Math.random() * 0.1).toFixed(5);
                        const lon = (10.0 + Math.random() * 0.1).toFixed(5);
                        valore = `${lat},${lon}`;
                        break;
                }

                // Generiamo la stringa di testo grezza
                const payloadGrezzo = `${sensore._id};${sensore.tipoDatoRaccolto};${valore};${sensore.unitaMisura}`;
                
                // Topic specifico del dispositivo (es: univr/allevamento_smart/sensori/665c4d2e.../data)
                const topicDispositivo = `${TOPIC_BASE}/${sensore._id}/data`;

                // L'hardware invia il messaggio sul broker
                client.publish(topicDispositivo, payloadGrezzo);
            });

        } catch (error) {
            console.error('Errore nel simulatore hardware MQTT:', error.message);
        }
    }, 5000); // Frequenza di invio: 5 secondi
}

// Costanti per il Time-To-Live (TTL)
const SCADENZA_DATI_MS = 5 * 60 * 1000; // 5 minuti in millisecondi
const INTERVALLO_PULIZIA_MS = 60 * 1000; // 1 minuto in millisecondi

function pulisciCacheObsoleta() {
    const oraAttuale = Date.now();

    // Iteriamo su tutte le chiavi (ID Sensore) e i valori presenti nella Map
    for (const [sensoreId, dati] of ultimeLettureIot.entries()) {
        const tempoTrascorso = oraAttuale - dati.timestamp.getTime();

        // Se il dato è più vecchio del nostro tempo di scadenza, lo rimuoviamo
        if (tempoTrascorso > SCADENZA_DATI_MS) {
            ultimeLettureIot.delete(sensoreId);
            console.log(`[MQTT Cache] Rimossi dati obsoleti per il sensore inattivo: ${sensoreId}`);
        }
    }
}
// Avviamo il timer che esegue la pulizia ogni minuto in background
setInterval(pulisciCacheObsoleta, INTERVALLO_PULIZIA_MS);

// Esportiamo la mappa in modo che le rotte Express possano leggerla al volo
export { ultimeLettureIot };