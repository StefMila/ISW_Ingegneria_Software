import { jest } from '@jest/globals';
import Sensore from '../app/models/sensore.js';

//Catturiamo i callback direttamente nel mock
// Così sopravvivono al jest.clearAllMocks()!
let connectCallback;
let messageCallback;

const mockOn = jest.fn((event, cb) => {
    if (event === 'connect') connectCallback = cb;
    if (event === 'message') messageCallback = cb;
});

const mockSubscribe = jest.fn((topic, cb) => {
    if (cb) cb(null); 
});
const mockPublish = jest.fn();
const mockEnd = jest.fn();

jest.unstable_mockModule('mqtt', () => ({
    default: {
        connect: jest.fn(() => ({
            on: mockOn,
            subscribe: mockSubscribe,
            publish: mockPublish,
            end: mockEnd
        }))
    }
}));

describe('Service MQTT - Copertura Totale', () => {
    let mqttService;
    const OLD_ENV = process.env.NODE_ENV;

    beforeAll(async () => {
        // Forziamo l'ambiente a development
        process.env.NODE_ENV = 'development';
        
        // Avviare i fake timer prima dell'import, 
        // così il setInterval del file originale usa l'orologio di Jest
        jest.useFakeTimers(); 
        
        mqttService = await import('../app/services/mqttService.js');
    });

    afterAll(() => {
        process.env.NODE_ENV = OLD_ENV; 
        
        // Fermiamo il simulatore alla fine di TUTTO, per non uccidere
        // l'intervallo del TTL prima che l'ultimo test possa provarlo
        mqttService.fermaSimulatore();
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mqttService.ultimeLettureIot.clear(); 
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('Dovrebbe gestire la connessione e la sottoscrizione al topic', () => {
        // Usiamo la variabile catturata dal mock!
        connectCallback();
        
        expect(console.log).toHaveBeenCalledWith('=== Connesso con successo al Broker MQTT ===');
        expect(mockSubscribe).toHaveBeenCalledWith('unitn/muccapp/allevamento_smart/sensori/+/data', expect.any(Function));
    });

    test('Dovrebbe ricevere e parsare un messaggio MQTT valido', () => {
        const topicId = 'unitn/muccapp/allevamento_smart/sensori/SENS-123/data';
        const payloadStr = JSON.stringify({ temperatura: 38.5 });
        
        // Usiamo il callback catturato!
        messageCallback(topicId, Buffer.from(payloadStr));
        
        const salvataggio = mqttService.ultimeLettureIot.get('SENS-123');
        expect(salvataggio).toBeDefined();
        expect(salvataggio.dati.temperatura).toBe(38.5);
    });

    test('Dovrebbe gestire gli errori di parsing JSON sui messaggi MQTT', () => {
        messageCallback('topic/SENS-ERR/data', Buffer.from('non-sono-un-json'));
        
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Errore nel parsing JSON MQTT:'), 
            expect.any(String)
        );
    });

    test('Simulatore Hardware: Genera parametri NORMALI per tutti i tipi di sensore', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5); 

        jest.spyOn(Sensore, 'find').mockResolvedValueOnce([
            {
                _id: 'SENS-INDOSSABILE',
                tipoDispositivo: 'indossabile',
                stato: 'attivo',
                capacita: [
                    { tipoDato: 'temperatura' },
                    { tipoDato: 'frequenza_cardiaca' },
                    { tipoDato: 'livello_passi' },
                    { tipoDato: 'esposizione_solare' },
                    { tipoDato: 'posizione_gps' }
                ]
            },
            {
                _id: 'SENS-STOCCAGGIO',
                tipoDispositivo: 'stoccaggio',
                stato: 'attivo',
                capacita: [{ tipoDato: 'temperatura' }]
            },
            {
                _id: 'SENS-AMBIENTALE',
                tipoDispositivo: 'ambientale',
                stato: 'attivo',
                capacita: [{ tipoDato: 'temperatura' }]
            }
        ]);

        mqttService.avviaSimulatoreHardware();
        
        await jest.advanceTimersByTimeAsync(5000);

        expect(mockPublish).toHaveBeenCalledTimes(3); 
    });

    test('Simulatore Hardware: Genera parametri di ANOMALIA (es. Febbre, Tachicardia)', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.02); 

        jest.spyOn(Sensore, 'find').mockResolvedValueOnce([
            {
                _id: 'SENS-ANOMALO',
                tipoDispositivo: 'indossabile',
                stato: 'attivo',
                capacita: [
                    { tipoDato: 'temperatura' },
                    { tipoDato: 'frequenza_cardiaca' }
                ]
            }
        ]);

        mqttService.avviaSimulatoreHardware();
        await jest.advanceTimersByTimeAsync(5000);

        const argsPublish = mockPublish.mock.calls[0];
        const payloadGenerato = JSON.parse(argsPublish[1]);

        expect(payloadGenerato.temperatura).toBeGreaterThanOrEqual(40.5);
        expect(payloadGenerato.frequenza_cardiaca).toBeGreaterThanOrEqual(110);
    });

    test('Simulatore Hardware: Gestisce gli errori nel blocco try/catch', async () => {
        jest.spyOn(Sensore, 'find').mockRejectedValueOnce(new Error('DB Disconnesso'));

        mqttService.avviaSimulatoreHardware();
        await jest.advanceTimersByTimeAsync(5000);

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Errore nel simulatore hardware MQTT:'),
            'DB Disconnesso'
        );
    });

    test('Il TTL pulisce correttamente i dati obsoleti dalla Map', () => {
        // Dato di 10 minuti fa (scade a 5 minuti)
        const dataVecchia = new Date(Date.now() - (10 * 60 * 1000));
        mqttService.ultimeLettureIot.set('VECCHIO', { timestamp: dataVecchia, dati: {} });
        
        mqttService.ultimeLettureIot.set('NUOVO', { timestamp: new Date(), dati: {} });

        // Avanziamo il tempo di 1 minuto per far scattare il setInterval del TTL
        jest.advanceTimersByTime(60 * 1000);

        expect(mqttService.ultimeLettureIot.has('VECCHIO')).toBe(false);
        expect(mqttService.ultimeLettureIot.has('NUOVO')).toBe(true);
    });
});