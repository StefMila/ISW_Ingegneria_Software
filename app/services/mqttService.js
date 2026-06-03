import mqtt from 'mqtt';
import Sensore from '../models/sensore.js';

// Connessione a un broker MQTT pubblico di test
// Only connect if we are NOT in a test environment
const client = process.env.NODE_ENV !== 'test' 
  ? mqtt.connect('mqtt://broker.hivemq.com:1883') 
  : { on: () => {}, subscribe: () => {}, publish: () => {}, end: () => {} }; // Dummy client for tests

// Cache in memoria per memorizzare l'ultima lettura reale arrivata via MQTT
// Struttura: { "ID_SENSORE": { valore: 23, unitaMisura: "°C", timestamp: Date } }
export const ultimeLettureIot = new Map();

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

    if (process.env.NODE_ENV !== 'test') {
        // Avviamo il simulatore hardware una volta connessi
        avviaSimulatoreHardware();
    }

    
});

// Ricezione e parsing dati MQTT
client.on('message', (topic, message) => {
    try {
        const partiTopic = topic.split('/');
        const sensoreId = partiTopic[4]; // Estrae l'ID dal topic
        
        // Decodifica il JSON industriale
        const misurazioni = JSON.parse(message.toString());

        ultimeLettureIot.set(sensoreId, {
            dati: misurazioni, // Es: { temperatura: 38.5, frequenza_cardiaca: 60 }
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Errore nel parsing JSON MQTT:', error.message);
    }
});

// Funzione helper per decidere se generare un'anomalia (probabilità del 5%)
function deveGenerareAnomalia() {
    return Math.random() < 0.05; 
}

// Simulatore hardware fisico multi-metrica
let intervalId;

export const avviaSimulatoreHardware = () => {
    // Aggiungi il controllo per evitare partenze multiple
    if (process.env.NODE_ENV === 'test') return;
    if (intervalId) return; 
    
    intervalId = setInterval(async () => {
        try {
            const sensoriAttivi = await Sensore.find({ stato: 'attivo' });

            sensoriAttivi.forEach(sensore => {
                const payloadJSON = {};

                sensore.capacita.forEach(cap => {
                    switch (cap.tipoDato) {
                        case 'temperatura':
                            if (sensore.tipoDispositivo === 'indossabile') {
                                if (deveGenerareAnomalia()) {
                                    // Febbre (40.5°C - 42.0°C)
                                    payloadJSON.temperatura = parseFloat((Math.random() * (42.0 - 40.5) + 40.5).toFixed(1));
                                } else {
                                    // Temperatura normale
                                    payloadJSON.temperatura = parseFloat((Math.random() * (39.5 - 38.0) + 38.0).toFixed(1));
                                }
                            } else if (sensore.tipoDispositivo === 'stoccaggio') {
                                payloadJSON.temperatura = parseFloat((Math.random() * (6.0 - 2.0) + 2.0).toFixed(1));
                            } else {
                                payloadJSON.temperatura = parseFloat((Math.random() * (28.0 - 15.0) + 15.0).toFixed(1));
                            }
                            break;

                        case 'frequenza_cardiaca':
                            if (sensore.tipoDispositivo === 'indossabile') {
                                if (deveGenerareAnomalia()) {
                                    // Tachicardia / Stress (110 - 140 bpm)
                                    payloadJSON.frequenza_cardiaca = Math.floor(Math.random() * (140 - 110) + 110);
                                } else {
                                    // Battiti normali
                                    payloadJSON.frequenza_cardiaca = Math.floor(Math.random() * (84 - 48) + 48);
                                }
                            }
                            break;

                        case 'livello_passi':
                            // I passi hanno senso solo per animali in movimento
                            if (sensore.tipoDispositivo === 'indossabile') {
                                payloadJSON.livello_passi = Math.floor(Math.random() * (12000 - 2000) + 2000);
                            }
                            break;

                        case 'esposizione_solare':
                            // Ore di sole: varia casualmente (es. nuvole/sole)
                            payloadJSON.esposizione_solare = parseFloat((Math.random() * 8.0).toFixed(1));
                            break;

                        case 'posizione_gps':
                            // Le coordinate variano di pochissimo (simula un recinto o la stalla)
                            // Coordinate di base fittizie:
                            const latBase = 45.40; 
                            const lonBase = 10.98;
                            const lat = (latBase + (Math.random() * 0.005 - 0.0025)).toFixed(5);
                            const lon = (lonBase + (Math.random() * 0.005 - 0.0025)).toFixed(5);
                            payloadJSON.posizione_gps = `${lat},${lon}`;
                            break;
                    }
                });

                // Invia il pacchetto solo se contiene effettivamente dei dati
                if (Object.keys(payloadJSON).length > 0) {
                    const topicDispositivo = `${TOPIC_BASE}/${sensore._id}/data`;
                    client.publish(topicDispositivo, JSON.stringify(payloadJSON));
                }
            });
        } catch (error) {
            console.error('Errore nel simulatore hardware MQTT:', error.message);
        }
    }, 5000);
};

// Costanti per il Time-To-Live (TTL)
const SCADENZA_DATI_MS = 5 * 60 * 1000; 
let ttlIntervalId;

// Avvia l'intervallo di pulizia solo se non ci troviamo in un ambiente di test
if (process.env.NODE_ENV !== 'test') {
    ttlIntervalId = setInterval(() => {
        const oraAttuale = Date.now();
        for (const [id, dati] of ultimeLettureIot.entries()) {
            if (oraAttuale - dati.timestamp.getTime() > SCADENZA_DATI_MS) {
                ultimeLettureIot.delete(id);
            }
        }
    }, 60 * 1000);
}


export const fermaSimulatore = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    // Cancella anche l'intervallo TTL se è stato avviato
    if (ttlIntervalId) {
        clearInterval(ttlIntervalId);
        ttlIntervalId = null;
    }
    // Chiudiamo il client per evitare errori di import dopo il teardown
    if (client && typeof client.end === 'function') {
        client.end();
    }
};