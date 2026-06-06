import mqtt from 'mqtt';
import Sensore from '../models/sensore.js';
import IotDailyStat from '../models/iotDailyStat.js';

// Connessione a un broker MQTT pubblico di test
const client = process.env.NODE_ENV !== 'test' 
  ? mqtt.connect('mqtt://broker.hivemq.com:1883') 
  : { on: () => {}, subscribe: () => {}, publish: () => {}, end: () => {} };

// Cache in memoria per memorizzare l'ultima lettura reale arrivata via MQTT
export const ultimeLettureIot = new Map();

const TOPIC_BASE = 'unitn/muccapp/allevamento_smart/sensori';

const BENESSERE_KEYS = {
    steps: 'livello_passi',
    outdoor: 'esposizione_solare',
    temperature: 'temperatura',
    bpm: 'frequenza_cardiaca'
};

const asNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const startOfUtcDay = (date = new Date()) => {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);
    return day;
};

const phaseFromSensorType = (sensorType) => {
    switch (sensorType) {
        case 'indossabile':
            return 'benessere';
        case 'mungitura':
            return 'mungitura';
        case 'lavorazione':
            return 'lavorazione';
        case 'ambientale':
            return 'ambientale';
        case 'stoccaggio':
            return 'stoccaggio';
        default:
            return 'sconosciuta';
    }
};

const applyMetricValue = (window, value, { cumulative = false } = {}) => {
    if (value === null) {
        return;
    }

    if (!Number.isFinite(window.first)) {
        window.first = value;
    }

    window.last = value;
    window.min = Number.isFinite(window.min) ? Math.min(window.min, value) : value;
    window.max = Number.isFinite(window.max) ? Math.max(window.max, value) : value;
    window.sum = Number.isFinite(window.sum) ? window.sum + value : value;
    window.count = Number.isFinite(window.count) ? window.count + 1 : 1;

    if (cumulative && window.last < window.first) {
        // Se il contatore del dispositivo viene resettato, riallineiamo il baseline giornaliero.
        window.first = window.last;
    }
};

const updateDailyAggregate = async (sensoreId, misurazioni) => {
    try {
        const sensore = await Sensore.findById(sensoreId)
            .select('_id aziendaId animaleId tipoDispositivo stato');

        if (!sensore || sensore.stato !== 'attivo' || !sensore.animaleId || !sensore.aziendaId) {
            return;
        }

        const steps = asNumber(misurazioni?.[BENESSERE_KEYS.steps]);
        const outdoor = asNumber(misurazioni?.[BENESSERE_KEYS.outdoor]);
        const temperature = asNumber(misurazioni?.[BENESSERE_KEYS.temperature]);
        const bpm = asNumber(misurazioni?.[BENESSERE_KEYS.bpm]);

        if (steps === null && outdoor === null && temperature === null && bpm === null) {
            return;
        }

        const day = startOfUtcDay(new Date());
        let stat = await IotDailyStat.findOne({ sensoreId: sensore._id, day });
        if (!stat) {
            stat = new IotDailyStat({
                aziendaId: sensore.aziendaId,
                animaleId: sensore.animaleId,
                sensoreId: sensore._id,
                day,
                processPhase: phaseFromSensorType(sensore.tipoDispositivo)
            });
        }

        stat.aziendaId = sensore.aziendaId;
        stat.animaleId = sensore.animaleId;
        stat.processPhase = phaseFromSensorType(sensore.tipoDispositivo);

        applyMetricValue(stat.metrics.steps, steps, { cumulative: true });
        applyMetricValue(stat.metrics.outdoor, outdoor, { cumulative: true });
        applyMetricValue(stat.metrics.temperature, temperature);
        applyMetricValue(stat.metrics.bpm, bpm);

        if (steps !== null && steps < 2800) {
            stat.alerts.lowActivityCount += 1;
        }
        if (temperature !== null && temperature > 39.5) {
            stat.alerts.highTemperatureCount += 1;
        }
        if (bpm !== null && bpm > 100) {
            stat.alerts.highBpmCount += 1;
        }

        await stat.save();
    } catch (error) {
        console.error('Errore aggiornamento storico IoT giornaliero:', error.message);
    }
};

client.on('connect', () => {
    console.log('=== Connesso con successo al Broker MQTT ===');
    
    client.subscribe(`${TOPIC_BASE}/+/data`, (err) => {
        if (!err) {
            console.log(`Sottoscritto al topic MQTT: ${TOPIC_BASE}/+/data`);
        }
    });

    if (process.env.NODE_ENV !== 'test') {
        avviaSimulatoreHardware();
    }
});

// Ricezione e parsing dati MQTT
client.on('message', async (topic, message) => {
    try {
        const partiTopic = topic.split('/');
        const sensoreId = partiTopic[4];
        const misurazioni = JSON.parse(message.toString());

        ultimeLettureIot.set(sensoreId, {
            dati: misurazioni,
            timestamp: new Date()
        });

        await updateDailyAggregate(sensoreId, misurazioni);
    } catch (error) {
        console.error('Errore nel parsing JSON MQTT:', error.message);
    }
});

function deveGenerareAnomalia() {
    return Math.random() < 0.05; 
}

let intervalId;

export const avviaSimulatoreHardware = () => {
    if (process.env.NODE_ENV === 'test') return;
    if (intervalId) return; 
    
    intervalId = setInterval(async () => {
        try {
            const sensoriAttivi = await Sensore.find({ stato: 'attivo' });

            sensoriAttivi.forEach(sensore => {
                const payloadJSON = {};
                
                // Recuperiamo l'ultima lettura inviata da QUESTO sensore per fare i calcoli cumulativi
                const ultimaLettura = ultimeLettureIot.get(sensore._id.toString());
                const datiPrecedenti = ultimaLettura ? ultimaLettura.dati : {};

                sensore.capacita.forEach(cap => {
                    switch (cap.tipoDato) {
                        case 'temperatura':
                            if (sensore.tipoDispositivo === 'indossabile') {
                                if (deveGenerareAnomalia()) {
                                    payloadJSON.temperatura = parseFloat((Math.random() * (42.0 - 40.5) + 40.5).toFixed(1));
                                } else {
                                    payloadJSON.temperatura = parseFloat((Math.random() * (39.5 - 38.0) + 38.0).toFixed(1));
                                }
                            } else if (sensore.tipoDispositivo === 'stoccaggio') {
                                payloadJSON.temperatura = parseFloat((Math.random() * (15.0 - 5.0) + 5.0).toFixed(1));
                            } else {
                                payloadJSON.temperatura = parseFloat((Math.random() * (28.0 - 15.0) + 15.0).toFixed(1));
                            }
                            break;

                        case 'frequenza_cardiaca':
                            if (sensore.tipoDispositivo === 'indossabile') {
                                if (deveGenerareAnomalia()) {
                                    payloadJSON.frequenza_cardiaca = Math.floor(Math.random() * (140 - 110) + 110);
                                } else {
                                    payloadJSON.frequenza_cardiaca = Math.floor(Math.random() * (84 - 48) + 48);
                                }
                            }
                            break;

                        case 'livello_passi':
                            if (sensore.tipoDispositivo === 'indossabile') {
                                const passiAttuali = datiPrecedenti.livello_passi || 2000;
                                const incrementoPassi = Math.floor(Math.random() * 5); 
                                payloadJSON.livello_passi = passiAttuali + incrementoPassi;
                            }
                            break;

                        case 'peso':
                            // Parte da una base di 300 (es. 300 litri/kg nel tank) o dal valore precedente
                            const pesoAttuale = datiPrecedenti.peso || 300;
                            // Incremento decimale positivo ad ogni ciclo (es. da 0.1 a 0.5 kg/litri alla volta)
                            const incrementoPeso = parseFloat((Math.random() * (0.5 - 0.1) + 0.1).toFixed(2));
                            payloadJSON.peso = parseFloat((pesoAttuale + incrementoPeso).toFixed(2));
                            break;

                        case 'litri':
                        case 'litri_latte':
                            const latteAttuale = datiPrecedenti.litri || datiPrecedenti.litri_latte || 0.0;

                            // Incremento default
                            let minIncremento = 0.0;
                            let maxIncremento = 0.0;

                            if (sensore.tipoDispositivo === 'mungitura') {
                                minIncremento = 0.1; 
                                maxIncremento = 1.5;
                            } else if (sensore.tipoDispositivo === 'lavorazione') {
                                minIncremento = 5.0; 
                                maxIncremento = 25.0;
                            }

                            const incrementoLatte = parseFloat((Math.random() * (maxIncremento - minIncremento) + minIncremento).toFixed(2));
                            const totaleLatte = parseFloat((latteAttuale + incrementoLatte).toFixed(2));
                            
                            // Assegna il valore alla chiave corretta che hai nel DB
                            if (cap.tipoDato === 'litri') payloadJSON.litri = totaleLatte;
                            else payloadJSON.litri_latte = totaleLatte;
                            break;

                        case 'esposizione_solare':
                            // Parte da una base di 0.0 ore o recupera il valore accumulato in precedenza
                            const esposizioneAttuale = datiPrecedenti.esposizione_solare || 0.0;
                            
                            // Simuliamo un incremento di tempo (es. tra 0.0 e 0.2 ore di sole in più ogni 5 secondi)
                            // Se vuoi simulare il passaggio di una nuvola o la sera, l'incremento potrebbe essere spesso 0
                            const incrementoSole = Math.random() < 0.7 
                                ? parseFloat((Math.random() * 0.2).toFixed(1)) 
                                : 0.0; // 30% di possibilità che l'accumulo si fermi temporaneamente
                                
                            payloadJSON.esposizione_solare = parseFloat((esposizioneAttuale + incrementoSole).toFixed(1));
                            break;

                        case 'posizione_gps':
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

if (process.env.NODE_ENV !== 'test') {
    ttlIntervalId = setInterval(() => {
        const oraAttuale = Date.now();
        for (const [id, dati] of ultimeLettureIot.entries()) {
            // Modifica cautelativa: non cancelliamo i dati se contengono metriche cumulative importanti
            // o se il simulatore è attivo per evitare reset improvvisi dei contatori
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
    if (ttlIntervalId) {
        clearInterval(ttlIntervalId);
        ttlIntervalId = null;
    }
    if (client && typeof client.end === 'function') {
        client.end();
    }
};