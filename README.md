# Deliverable D1

**Deadline:** 27/03/2026  
**Gruppo:** ID 13  

**Componenti del gruppo:**
- Stefania, Milani, 243506
- Alice, Bortolotti, 244397
- Elena, Carmagnani, 244462

## 1. Obiettivi del progetto

- **O1:** Monitorare il benessere delle mucche, raccogliendo dati vitali (come temperatura, frequenza cardiaca, attività e posizione) tramite sensori, e fornire alert in caso di anomalie o problemi di salute.
- **O2:** Tracciare e mostrare la filiera dei prodotti caseari, dalla creazione del lotto di latte fino al distributore, offrendo agli utenti – consumatori, allevatori e distributori – una panoramica trasparente sulla provenienza, qualità e sostenibilità.
- **O3:** Valorizzare i piccoli produttori locali, dando loro la possibilità di mostrare pratiche sostenibili e di differenziarsi dalla grande distribuzione grazie alla tracciabilità digitale e all’autenticità delle informazioni.
- **O4:** Offrire agli utenti non autenticati, consumatori e persone interessate, la possibilità di visualizzare le aziende, i prodotti e le pratiche adottate, supportando scelte consapevoli e preferendo produttori che rispettano il benessere animale, anche facilitando l’inclusione di alcuni prodotti nella dieta vegan tramite trasparenza.
- **O5:** Semplificare il processo di certificazione per i produttori, permettendo loro di dichiarare eventuali certificazioni possedute e organizzare i dati e documenti necessari per una futura richiesta, ma offrendo anche un sistema alternativo di verifica basato sulla tracciabilità dei processi e dati raccolti, rendendo la qualità garantita e verificabile anche senza certificazione ufficiale.
- **O6:** Fornire una dashboard intuitiva che permetta agli utenti (allevatori, distributori, consumatori) di gestire, monitorare e visualizzare i dati relativi agli animali, i prodotti, la filiera e le recensioni.

> //analisi di mercato/SWOT (opzionale)

### Punti di forza (Strengths)

- Soluzione innovativa che offre trasparenza sulla salute delle mucche e sulla qualità dei prodotti.
- Supporto ai piccoli produttori locali e promozione di pratiche sostenibili.
- Risponde alle esigenze di consumatori attenti al benessere animale e all’ambiente.
- Facilità di accesso alle informazioni tramite sistema digitale.
- Possibilità che anche persone che seguono una dieta vegana, grazie alla trasparenza e attenzione al benessere animale, possano valutare di reintrodurre alcuni cibi nella propria dieta in modo consapevole.
- Dashboard intuitiva per la gestione e monitoraggio dei dati da parte di allevatori, distributori e consumatori.
- Strumento che permette ai produttori di organizzare facilmente i dati e i documenti relativi al proprio allevamento, anche in vista di una futura richiesta di certificazione.

### Punti di debolezza (Weaknesses)

- Raccogliere dati affidabili sul benessere animale può essere difficile. Le condizioni che concorrono al benessere di un animale sono molteplici.
- Molti produttori si trovano in zone remote (come pascoli di alta montagna) e potrebbero essere poco disponibili ad adottare tecnologie digitali, preferendo metodi tradizionali.
- In molte aree rurali o di montagna la connessione internet è assente o scarsa, rendendo difficile l’implementazione di soluzioni digitali.
- La piattaforma potrebbe apparire troppo complessa o impegnativa per piccoli produttori privi di esperienza digitale.

### Opportunità (Opportunities)

- Crescita del mercato dei prodotti sostenibili, locali e trasparenti.
- Maggiore sensibilità dei consumatori verso il benessere animale.
- Possibilità di espansione verso altri tipi di allevamenti e filiere alimentari.
- Collaborazioni con associazioni ambientaliste e vegan.
- Potenziale collaborazione con enti certificatori o veterinari per aumentare il valore e la credibilità dei dati raccolti.
- Semplificazione del processo di certificazione grazie alla raccolta ordinata dei dati, incentivando nuovi produttori a ottenere riconoscimenti ufficiali.

### Minacce (Threats)

- Resistenza da parte di produttori che non vogliono condividere dati o adottare sistemi tecnologici.
- Concorrenti che offrono soluzioni simili o piattaforme di tracciabilità.
- Possibili cambiamenti nelle normative sul benessere animale.
- Non tutti i consumatori sono sensibili alla tematica del benessere animale, quindi potrebbe non interessare alcuni consumatori.
- Possibili cambiamenti nelle normative sul benessere animale.
- I parametri necessari per la certificazione potrebbero essere limitati o non pienamente noti, e il team potrebbe non avere una conoscenza approfondita delle procedure di certificazione ufficiale.

## 2. Attori del sistema

### Attori del sistema

- Consumatore (non autenticato)
    - Visualizza info su aziende e prodotti
- Consumatore (autenticato)
    - Salva aziende/prodotti tra i preferiti
    - Consulta dettagli avanzati (passi mucche, dati filiera)
    - Recensioni
    - Aggiunge distributori tra preferiti su Google Maps
- Allevatore (autenticato)
    - Registra allevamento
    - Inserisce dati animali (foto, razza, ID/tag)
    - Monitora salute (dati vitali, attività)
    - Gestisce filiera (tracciabilità lotti)
    - Riceve notifiche
    - Inserisce certificazioni
- Distributore/Caseificio (autenticato)
    - Riceve/aggiorna informazioni sulla filiera
    - Traccia lotti
    - Collabora con altri attori
    - Riceve recensioni
- Ente certificatore (autenticato)
    - Visualizza parametri/documenti
    - Valida certificazioni
    - Supporta allevatori nella certificazione

### Sistemi esterni

- Google Maps (geolocalizzazione, preferiti)
- Tag RFID/ID (identificazione animale)
- Sensori contapassi/attività (monitoraggio mucche)
- Raccolta dati vitali (temperatura, frequenza cardiaca, GPS, esposizione solare)
- Laboratori di analisi (qualità del latte/prodotti)

Qui si può inserire una mindmap.[1]

### 2.1 Utenti

**Consumatore**

- (utente non autenticato): può visualizzare informazioni sulle aziende locali e sui prodotti offerti, senza funzionalità avanzate.
- (utente autenticato): può salvare aziende e prodotti tra i preferiti, consultare dettagli avanzati (come i passi delle mucche e dati di filiera), interagire con la piattaforma (recensioni), aggiungere distributori tra i preferiti su Google Maps.

**Allevatore (utente autenticato):** può registrare il proprio allevamento, inserire dati degli animali (foto, razza, ID/tag), monitorare la salute (dati vitali, attività), gestire la filiera (creazione lotti, tracciabilità), ricevere notifiche e inserire certificazioni.

**Distributore/Caseificio (utente autenticato):** può ricevere e aggiornare informazioni sulla filiera, tracciare lotti, collaborare con altri attori e ricevere recensioni.

**Ente certificatore (utente autenticato):** può visualizzare, validare o suggerire parametri e documenti necessari alle certificazioni, monitorare processi e supportare allevatori nella preparazione delle richieste.

**Veterinario:** può collaborare fornendo dati di monitoraggio sanitario e supporto agli allevatori.

### 2.2 Sistemi esterni

- Ente certificatore (software o sistema esterno per la gestione delle certificazioni)
- Google Maps (per geolocalizzazione allevamenti e visualizzazione aree di pascolo)
- Tag RFID/ID (per identificazione degli animali)
- Sensori di contapassi e di attività (per monitoraggio animali) e per la raccolta dati vitali (temperatura, frequenza cardiaca, GPS, esposizione solare… tramite dispositivi IoT o sensoristica dedicata)
- Laboratori di analisi (per raccolta dati sulla qualità del latte/prodotti)
