# Lezione 1: Ingegneria del Software (A.A. 2025-2026)

Sintesi Esecutiva

Il corso si configura come un percorso teorico-pratico finalizzato a fornire competenze metodologiche e tecnologiche per l'intero ciclo di vita del software. L'elemento centrale è un progetto di gruppo orientato allo sviluppo di servizi innovativi per il territorio trentino, con un forte accento sulla sostenibilità e le "Smart Cities". Il corso promuove il passaggio da modelli di sviluppo tradizionali (Waterfall) a metodologie agili (Scrum), integrando concetti di Design Thinking per stimolare la creatività e l'innovazione. La valutazione è interamente basata sul progetto, eliminando l'esame orale tradizionale e premiando la collaborazione effettiva verificata tramite strumenti di versionamento (Git/GitHub).

Obiettivi Didattici e Competenze

## Il corso mira a trasformare gli studenti in professionisti capaci di analizzare, progettare e sviluppare sistemi software complessi. Al termine delle lezioni, gli studenti saranno in grado di:

Definire processi di sviluppo: Identificare il modello più adatto per l'analisi e la progettazione.

Modellazione avanzata: Rappresentare requisiti, architettura, interazione tra componenti e deployment tramite diagrammi.

Gestione dei requisiti: Definire in modo coerente requisiti funzionali e non funzionali (robustezza, scalabilità), evidenziando priorità e criticità.

Design Architetturale: Adottare stili architetturali basati su principi di astrazione, modularità e indipendenza funzionale.

Sviluppo Agile: Implementare software con cicli di sviluppo brevi (sprint) per garantire consegne frequenti e di valore.

Competenze Web e Cloud: Progettare servizi web RESTful, automatizzare il testing e il deployment attraverso processi di Continuous Integration (CI/CD).

Il Progetto d'Esame: «Ideare la Trento del futuro»

Il fulcro dell'esperienza formativa è lo sviluppo di un'idea progettuale originale che abbia un impatto reale sui cittadini del territorio trentino.

Tematiche e Creatività

## Il progetto non deve limitarsi a risolvere problemi istituzionali del Comune, ma deve rivolgersi alla città in senso lato. Le aree di investigazione suggerite includono:

Sostenibilità: Gestione energetica, monitoraggio impianti fotovoltaici.

Smart Cities: Servizi urbani efficienti e innovativi.

Creatività cross-cutting: Soluzioni "smart" e "disruptive" nate da sessioni di brainstorming e Design Thinking.

La Sfida e le Opportunità

## Il progetto si configura come una vera e propria "challenge". Nelle edizioni precedenti, i gruppi vincitori hanno ricevuto:

Premi in denaro (fino a 10.000 euro).

Percorsi di coaching presso la School of Innovation e FBK Innovation.

Opportunità di trasformare l'idea in una startup (un caso di successo è già emerso dalla prima edizione).

Seminari dedicati per tirocini e tesi presso il Comune di Trento.

Calendario dei Deliverable (Scadenze 2026)

Metodologie di Sviluppo

Il corso evidenzia il passaggio critico dai modelli lineari a quelli iterativi.

Waterfall vs. Agile

Modello Waterfall (Cascata): Caratterizzato da fasi sequenziali (fattibilità, requisiti, design, coding, test). Il limite principale è l'assenza del cliente durante la fase produttiva, portando a rischi di fallimento tardivo e costi elevati se il prodotto finale non soddisfa le aspettative.



Metodologia Agile: Focalizzata su piccoli gruppi e cicli brevi (3 settimane). Il cliente è costantemente nel loop ("Principio #1: la priorità è soddisfare il cliente attraverso la consegna continua di software di valore"). Ogni sprint produce una release funzionante e dimostrabile.





Design Thinking

Utilizzato nelle fasi iniziali per esplorare il problema e definire il concept del servizio. Attraverso cinque fasi (Empathize, Define, Ideate, Prototype, Test), permette di arrivare alla fase di coding con mockup solidi che riflettono una visione innovativa.



Architettura e Stack Tecnologico

Il progetto richiede lo sviluppo di un servizio software basato su un'architettura client-server moderna.

Backend: Il cuore del progetto. Gli studenti devono sviluppare un servizio che esponga API (Application Programming Interface).

Frontend: Interfaccia utente (Web o Mobile) che interagisce con il backend. Può variare da HTML semplice a framework avanzati (React, Vue, ecc.).

Linguaggio e Dati: Utilizzo di JavaScript e database NoSQL (MongoDB). È scoraggiato l'uso di database relazionali (MySQL/PostgreSQL) per favorire l'apprendimento di nuovi paradigmi.

API Economy: Enfasi sulla stabilità delle interfacce e sull'integrazione di servizi esterni (es. Google Maps, motori LLM).

Deploy: Il software deployment comprende l'insieme di tutte le attività necessarie per rendere un sistema software disponibile all'uso per i destinatari finali. In termini pratici, rappresenta la fase conclusiva del ciclo di vita del software che porta il prodotto dall'essere semplice codice a essere "online" e funzionante su un server

DevOps e CI/CD: Nello sviluppo moderno, il deployment è strettamente integrato con le pratiche di DevOps, un approccio che unisce i team di sviluppo (Dev) e quelli operativi (Ops). In questo scenario, quando uno sviluppatore carica nuovo codice (commit) su una piattaforma come GitHub, il sistema avvia automaticamente dei test. Se i test hanno successo, il software viene rilasciato tramite un deploy automatico in cloud senza interventi manuali complessi.

Automazione del ciclo di vita tramite GitHub Actions: ogni commit può innescare test automatici e il deploy in ambiente cloud.

Qualità e Testing

Il corso sottolinea che il software deve essere non solo funzionante, ma robusto e manutenibile.

"Il testing può mostrare la presenza di bug, ma mai la loro assenza." (Dijkstra)

Viene portato l'esempio di SQLite, dove il codice di test è 640 volte superiore al codice sorgente (91.911 KSLOC di test contro 143,4 KSLOC di codice C), evidenziando lo sforzo necessario per garantire l'affidabilità. Gli studenti devono implementare una "test suite" completa che garantisca una copertura significativa delle linee di codice.

Modalità di Valutazione e Collaborazione

La valutazione è basata sui risultati del team, ma tiene conto dell'impegno individuale.

Sviluppo Collaborativo: L'uso di Git e GitHub è obbligatorio. Non è consentito lo scambio di codice via email.

Monitoraggio dei Commit: I docenti verificheranno il contributo di ogni membro attraverso l'analisi dei commit. Uno sbilanciamento eccessivo nel lavoro (es. un membro con pochissimi commit) può portare all'esclusione dalla valutazione o a penalizzazioni sul voto finale.

Self-evaluation: Gli studenti sono chiamati a presentare report di autovalutazione del contributo fornito al team.

Feedback continuo: È disponibile un modulo anonimo sempre aperto per segnalare dubbi o suggerimenti sul format delle lezioni.

Contesto Scientifico: Il Laboratorio HPCI

Il Prof. Fiore dirige l'HPCI Lab (High Performance Climate Informatics) a Trento, focalizzato sulla convergenza tra HPC, Big Data e Intelligenza Artificiale applicata al cambiamento climatico. Questa esperienza di ricerca su larga scala (gestione di petabyte di dati, supercalcolatori con milioni di core) permea il corso, offrendo una prospettiva sulla "Computational Sustainability": programmare meglio per ridurre i costi energetici e le emissioni di CO2 del software stesso.



# Lezione 2 – Design Thinking nell'Ingegneria del Software: Metodologia e Innovazione

Sintesi Esecutiva

Il Design Thinking (DT) emerge come una metodologia strutturata e disciplinata volta a risolvere problemi complessi attraverso l'innovazione e una profonda focalizzazione sull'utente. Contrariamente all'approccio scientifico tradizionale, che si concentra rigorosamente sulla definizione dei parametri del problema, il DT adotta un mindset orientato alla soluzione, bilanciando l'analisi quantitativa con l'immaginazione creativa.

I pilastri fondamentali del DT risiedono nel passaggio tra pensiero divergente (generazione di idee senza giudizio) e convergente (selezione della soluzione ottimale), e nell'integrazione di pensiero analitico e intuitivo. Nel contesto dell'Ingegneria del Software, il DT non è un elemento isolato, ma si integra sinergicamente con le metodologie Agile (come Scrum), arricchendo il ciclo di vita del software (Software Life Cycle) con una componente mirata all'innovazione delle interfacce e dell'esperienza utente. Il successo della metodologia dipende criticamente dalla "destrutturazione" mentale dei progettisti e dalla formazione di team interdisciplinari capaci di stabilire una connessione empatica con il cliente.

--------------------------------------------------------------------------------

Fondamenti e Definizioni del Design Thinking

Il Design Thinking è definito come una metodologia sistematica per il brainstorming e la risoluzione di problemi complessi legati alla progettazione e all'ingegneria del design. Il suo obiettivo primario è individuare soluzioni innovative, desiderabili e precedentemente mai concepite.



Caratteristiche Chiave

Semplicità nella Complessità: Trovare soluzioni lineari e accessibili all'interno di scenari problematici intricati.

Focalizzazione sulla Soluzione: Mentre molti falliscono concentrandosi eccessivamente sulla definizione del problema, il DT cerca un equilibrio, orientandosi verso il "cosa potrebbe essere" piuttosto che solo sul "cosa è".

## Integrazione tra Analisi e Sintesi:

Analisi: Processo di scomposizione di un intero in frammenti risolvibili singolarmente (riduzionismo).

Sintesi: Combinazione di elementi frammentati per formare un insieme coerente e aggregato alla fine del processo creativo.

Il Bilanciamento del Pensiero

## Il DT si posiziona a metà strada tra due estremi cognitivi:

Pensiero Analitico: Basato su ragionamento deduttivo e induttivo, utilizza metodologie quantitative per giungere a conclusioni replicabili nel presente.

Pensiero Intuitivo: Conoscenza immediata senza ragionamento lineare, fondamentale per l'invenzione del futuro e per superare i limiti della razionalità pura.

--------------------------------------------------------------------------------

Il Processo in Cinque Fasi

Il Design Thinking è una pratica disciplinata che segue un percorso strutturato in cinque step successivi. È fondamentale che i progettisti si concentrino esclusivamente sulla fase corrente, evitando di pensare alle soluzioni durante la definizione del problema.







## Dettaglio sulle fasi critiche:

Empathize: È il cuore del design human-centered. Non si limita a un'analisi superficiale, ma scava nelle motivazioni profonde dell'utente per inferire significati intangibili.

Ideate: In questa fase, le "idee selvagge" devono essere incoraggiate. Strumenti come le Mind Maps aiutano a stimolare visivamente il processo attraverso gerarchie radiali, colori e sottolineature per enfatizzare i concetti.

Prototype: I prototipi devono essere costruiti per e con l'utente finale. Servono a trasformare dati utili e idee vaghe in realtà fattibili.

--------------------------------------------------------------------------------

Meccanismi Cognitivi e Creatività



Pensiero Divergente vs. Convergente

## Il DT richiede l'alternanza di due modalità di pensiero:

Divergente: Generazione di molteplici soluzioni creative senza alcun giudizio o filtro. È un flusso libero di idee e connessioni inaspettate.

Convergente: Selezione della "risposta esatta" o della combinazione migliore di soluzioni tra quelle generate. Qui il giudizio è una componente essenziale per eliminare le ambiguità.

La Destrutturazione Mentale

Un ostacolo comune all'innovazione è la "strutturazione" eccessiva derivante dal background personale o accademico. Il design thinker deve saper mettere in discussione le assunzioni e identificare risorse inaspettate. Esercizi come il "problema dei 9 punti" (unire i punti con 4 linee senza staccare la penna) dimostrano la necessità di pensare fuori dagli schemi convenzionali.



--------------------------------------------------------------------------------

Applicazioni nell'Industria IT e Software

Nel moderno settore IT, il Design Thinking si sposa con la filosofia Agile per gestire l'intero ciclo di vita del software, dallo studio di fattibilità alla manutenzione.

Integrazione con Agile e Scrum

User Stories: I requisiti non sono semplici liste di funzioni, ma narrazioni che includono il "perché" (la necessità reale dell'utente), facilitando il rapporto empatico.

Sprint: All'interno del framework Scrum, il DT aiuta a innovare rapidamente all'interno di periodi ben definiti, mantenendo l'utente al centro della scena.

Team Interdisciplinari: Il successo richiede esperti di domini diversi (ingegneri, psicologi, filosofi). La diversità abbatte la rigidità ingegneristica e favorisce connessioni empatiche che un tecnico puro potrebbe non cogliere.

Fattibilità (Feasibility) vs. Viabilità (Viability)

## L'analisi del prodotto software deve distinguere tra:

Fattibilità: La possibilità tecnica ed economica di realizzare il prodotto (es: avere il budget per l'acquisto).

Viabilità: La capacità di sostenere e mantenere il prodotto nel lungo periodo (es: costi di gestione e manutenzione costante).

--------------------------------------------------------------------------------

Attributi e Principi Fondamentali

## Il DT si poggia su quattro regole cardine:

Human Rule (Regola Umana): Tutte le attività di design sono di natura sociale.

Ambiguity Rule (Regola dell'Ambiguità): Preservare l'ambiguità per esplorare diverse direzioni.

Re-design Rule (Regola del Re-design): Tutto il design è re-design di soluzioni esistenti a bisogni umani costanti.

Tangibility Rule (Regola della Tangibilità): Rendere le idee tangibili (prototipi) facilita la comunicazione.



Sfide: I "Wicked Problems"

I design thinkers affrontano spesso "problemi malvagi" (wicked), ovvero sfide mal definite in cui sia lo statement del problema che la soluzione sono sconosciuti all'inizio. Per risolverli, è necessario l'uso di analogie e la tecnica dei "5 Whys" (interrogazione iterativa per trovare le relazioni causa-effetto profonde).

L'Aha-Moment

È il momento in cui la soluzione o un'idea brillante colpisce la mente del pensatore, rendendo chiara la via d'uscita dall'ostruzione. Da questo punto in poi, la costruzione del prodotto finale diventa più lineare e focalizzata.

## Link:

https://www.tutorialspoint.com/

https://www.youtube.com/watch?v=_r0VX-aU_T8

https://www.youtube.com/watch?v=M66ZU2PCIcM



# Lezione 3 – Progetto Software Engineering – «Ideare la Trento del futuro»

Sintesi Esecutiva

«Ideare la Trento del futuro». Il progetto d’esame, condotto in collaborazione con il Comune di Trento, mira a intercettare esigenze reali del territorio per trasformarle in servizi software concreti.

I pilastri fondamentali del progetto includono l'applicazione della metodologia di Design Thinking, la centralità dello sviluppo back-end (API) e l'integrazione strategica dei dati. Gli studenti sono chiamati a bilanciare creatività e rigore tecnico, culminando in un "elevator pitch" alla presenza dei rappresentanti comunali e nella consegna di un prodotto software completo. La valutazione premierà l'impatto sulla cittadinanza, la completezza della visione e la capacità di andare oltre la semplice funzionalità di base per creare valore aggiunto.

--------------------------------------------------------------------------------

Obiettivi e Visione del Progetto

Il cuore del progetto non è servire l'ente amministrativo in quanto tale, ma la città di Trento e i suoi abitanti. Il Comune partecipa come partner istituzionale e facilitatore, rappresentando il punto di vista amministrativo e mettendo a disposizione competenze e potenziali dati.

Temi Portanti

Innovazione e Creatività: Ampio spazio è lasciato all'ideazione di soluzioni "smart", sostenibili ed efficienti.

Impatto Sociale: Si prediligono idee che dimostrino una userbase potenziale ampia e rilevante.

Sostenibilità: Un tema trasversale che ha già guidato i progetti vincitori delle edizioni precedenti (es. monitoraggio impianti fotovoltaici, segnalazione disservizi urbani, sistemi di incentivazione per la mobilità pedonale).

--------------------------------------------------------------------------------

Metodologia: Design Thinking e Approccio al Servizio

L'elaborazione dell'idea deve seguire i principi del Design Thinking (DT), un processo iterativo centrato sull'utente.

Dall'Esigenza al Servizio

Intercettare un'esigenza reale: Basandosi sull'esperienza quotidiana nella città, i gruppi devono identificare una problematica specifica.

Definizione del Servizio: L'idea deve tradursi in un "servizio" software (web service).

Empatia e Feedback: È caldamente consigliato raccogliere input esterni al gruppo (amici, parenti, potenziali utenti) per validare l'esigenza e affinare la soluzione.

Esercizio del Portafoglio ("Wallet Exercise"): Citato come riferimento metodologico per comprendere rapidamente il ciclo completo del design centrato sull'uomo: guadagnare empatia, definire il problema e prototipare rapidamente.

--------------------------------------------------------------------------------

Requisiti Tecnici e Architetturali

Il progetto richiede lo sviluppo di una soluzione software composta da back-end e front-end, con una gerarchia di importanza definita.

Back-end e API (Core)

Il back-end rappresenta il cuore della soluzione e l'aspetto centrale della valutazione.

Deve esporre un set consistente di funzionalità tramite API.

È fondamentale la gestione corretta delle informazioni e dei flussi di dati.

Front-end e User Interface (UI)

Il front-end (web o mobile) è obbligatorio ma funge principalmente da "dimostratore" delle capacità del back-end.

È possibile ottenere il massimo dei voti anche con una UI minimale, purché funzionale.

Bonus: Soluzioni UI avanzate o particolarmente curate possono beneficiare di punteggi extra.

Gestione dei Dati (Open Data)

## I dati sono definiti come "ingredienti posti sul tavolo". La loro integrazione segue regole flessibili:

Non obbligatorietà: Gli Open Data vanno usati solo se funzionali all'idea.

Dati Artificiali: È consentito generare dati sintetici/artificiali per supportare la demo se i dati reali non sono disponibili.

Analogia: È possibile utilizzare dati di altre città (es. Milano) come sostituti per quelli di Trento.

--------------------------------------------------------------------------------

Sicurezza e Classi di Utenza

La progettazione deve prevedere una chiara distinzione tra le tipologie di utenti che accedono al servizio.

Il Principio della Barriera: La sicurezza (login/registrazione) è una potenziale barriera all'uso. Deve essere introdotta strategicamente per abilitare servizi a valore aggiunto, permettendo però una navigazione libera per le funzioni informative di base.

--------------------------------------------------------------------------------

Presentazione e Valutazione

L'Elevator Pitch (1° Aprile)

## Ogni gruppo ha a disposizione 3 minuti per presentare la propria idea ai rappresentanti del Comune. La struttura consigliata delle 4 slide è:

Introduzione del Team: Titolo del progetto e nomi dei componenti.

Problema/Opportunità: Descrizione dell'esigenza supportata da statistiche o storytelling (fatti, notizie locali).

Soluzione: Descrizione tecnica e funzionale.

Valore Unico: Cosa rende la soluzione differente e utile.

Criteri di Valutazione del Gruppo

No Silos: È vietata la divisione netta del lavoro (es. uno solo al DB, uno solo al front-end). Ogni studente deve contribuire a più parti del progetto e la rotazione dei compiti deve essere evidente dai commit su GitHub.

Video Finale: È richiesta la produzione di un video narrativo che illustri il funzionamento della soluzione per la partecipazione alla challenge finale extra-corso.

Documentazione: Consegna dei deliverable tecnici e del codice.

--------------------------------------------------------------------------------

Opportunità Future

## Oltre l'esame, il Comune di Trento presenterà in un seminario a fine corso opportunità specifiche per:

Tirocini (Internship).

Tesi di laurea su tematiche emerse durante il corso o di interesse specifico per l'amministrazione.



# Lezione 4 – Fondamenti e Modelli dei Processi Software: Documento di Briefing

Riepilogo Esecutivo

Lo sviluppo di sistemi software di alta qualità è un’attività intrinsecamente complessa, specialmente nel contesto della "programmazione in grande" (programming-in-the-large), che coinvolge team numerosi, tempi superiori ai sei mesi e milioni di righe di codice. Nonostante l'evoluzione tecnologica, i dati dello Standish Group (2021) evidenziano una realtà critica: solo il 31% dei progetti IT ha successo, mentre il 50% risulta "challenged" (in ritardo, sopra budget o con funzionalità ridotte) e il 19% fallisce completamente.



L'analisi rivela che i fallimenti non derivano principalmente da limiti tecnici, ma da problemi di comunicazione e natura umana: difficoltà nel comprendere le reali necessità del cliente, gestione organizzativa carente e scarsa comprensione del dominio di business. L'ingegneria del software risponde a queste sfide attraverso l'adozione di processi strutturati che coprono l'intero ciclo di vita del prodotto: dalla specifica dei requisiti alla manutenzione. Il principio cardine è che la qualità del prodotto finale dipenda direttamente dalla qualità del processo utilizzato per realizzarlo.

--------------------------------------------------------------------------------

1. La Complessità e le Criticità dello Sviluppo Software

1.1 Statistiche di Progetto (Standish Group)

## Un'indagine condotta su 50.000 progetti a livello globale ha delineato il seguente scenario circa gli esiti dei progetti IT:

1.2 Le Cause dei Problemi

## I principali ostacoli al successo non sono legati alla complessità intrinseca del problema tecnico o alla scelta di linguaggi e framework, bensì a:

Comunicazione: Difficoltà tra gli stakeholder (utenti, tecnici, manager, venditori) e gli esperti IT.

Comprensione del Dominio: Difficoltà per i tecnici nel comprendere il "business domain" (es. concetti di fatturazione o protocolli sanitari).

Fattore Umano: Problemi nel lavoro di gruppo e nella gestione delle risorse.

Pianificazione: Errori nell'allocazione delle risorse e nella gestione organizzativa.

--------------------------------------------------------------------------------

2. Analisi dei Disastri Software Storici

La storia dell'informatica fornisce esempi estremi di come errori nel processo o nel codice possano portare a conseguenze catastrofiche.

Ariane 5 (1996): Un razzo da 7 miliardi di dollari esplose 37 secondi dopo il lancio. La causa tecnica fu un errore di arithmetic overflow (tentativo di memorizzare un valore floating point a 64 bit in un intero a 16 bit). Tuttavia, la causa profonda fu procedurale: per ragioni di efficienza, erano stati rimossi i controlli ("if") sulla dimensione dei valori durante i test finali.



Therac-25: Una macchina per radioterapia somministrò dosi di radiazioni 100 volte superiori alla norma, causando due decessi. Il problema risiedeva in un software scritto male che non implementava vincoli di sicurezza critici, permettendo l'attivazione di raggi X senza filtro tramite una specifica combinazione di tasti. E non c’era modo di fermarlo poi.

--------------------------------------------------------------------------------

SW Engineering

## è costruire un SW  come per costruire una casa:

Capire le necessità

Progettazione

Testing

Manutenzione

E’ una disciplina metodologica (si basa su teorie e metodi) ed empirica (si basa su storie pregresse).

E’ una tecnologia stratificata in quanto ha una serie di metodi e tools e copre tutte le fasi del ciclo del SW

History

65/68 nasce l'ing. Del SW

SW era per scopi militari --> non si parla di ing. Veniva fatto su bisogno

Nasce l'esigenza di ing come disciplina --> da conferenza NATO --> nasce il concetto di ing. SW

Far lavorare team da ambiti diversi

Uso del SW è più ampio - libro no Silver Bullet --> dice che il SW non si sviluppa più

Nasce il web

Miti e Leggi dell'Ingegneria del Software

## Fred Brooks, nel suo saggio The Mythical Man-Month, ha sfatato diversi miti comuni che ancora oggi influenzano la percezione dello sviluppo software:

Mito del personale aggiunto: "Aggiungere programmatori a un progetto in ritardo lo farà recuperare".

Realtà: Aggiungere persone aumenta il ritardo a causa dei tempi necessari per l'inserimento e la formazione dei nuovi membri.

Mito della codifica immediata: "Possiamo iniziare a scrivere codice subito; i dettagli emergeranno".

Realtà: La mancanza di una pianificazione accurata e di una definizione dei requisiti è la causa principale del fallimento.

Mito della flessibilità: "Il software è flessibile, cambiare i requisiti non costa nulla".

Realtà: Il costo del cambiamento aumenta esponenzialmente con l'avanzare delle fasi del progetto. Un cambiamento nei requisiti durante la fase di testing è drasticamente più oneroso rispetto alla fase di analisi iniziale.



Mito della manutenzione: "Se il software funziona, la manutenzione è un'attività marginale".

Realtà: I costi di manutenzione rappresentano tipicamente il 70% dei costi totali di un progetto, contro una stima iniziale che spesso si ferma al 10-15%.

--------------------------------------------------------------------------------

Il Processo Software: Definizione e Macro-Attività

## Un processo software è un insieme strutturato di attività, ruoli e documenti finalizzati alla realizzazione di un sistema. Si divide in quattro macro-fasi fondamentali comuni a quasi tutti i modelli:

Specifica (Engineering dei Requisiti): Definizione delle funzionalità e dei vincoli.

Progettazione e Implementazione (Design & Implementation): Definizione dell'architettura e scrittura del codice.

Validazione (Testing): Verifica della conformità del software ai requisiti. Test del sistema.

Evoluzione (Manutenzione): Modifica del sistema per rispondere a nuovi bisogni o cambiamenti ambientali.

4.0 oltre alle attività

Prodotti = quali sono gli output = le attività che il nostro sistema fa

Ruoli = responsabilità delle persone coinvolte nel processo

Condizione prima e dopo  questa verrà guardata meno



4.1 Classificazione dei Modelli di Processo

Le attività son o più o meno le stesse, cambia come vengono affrontate e questo determina il tipo di modello addottato.

Metodi Formali: Basati su dimostrazioni matematiche rigorose; definiscono input e output in modo estremamente preciso.

Modelli Plan-driven: Guidati da un piano rigido e focalizzati sulla documentazione (es. Modello a Cascata).

Metodi Agili: Focalizzati sulla velocità e sulla capacità di adattamento ai cambiamenti attraverso cicli brevi e meno rigorosi.

NB: Quality of the development process => Quality of the product

Ci aiutano ad aumentare la produttivita dei sviluppatori e la qualità del SW

--------------------------------------------------------------------------------

5. Esame Dettagliato delle Fasi del Ciclo di Vita

5.1 Specifica del Software (Ingegneria dei Requisiti)

## Questa fase deve rispondere alla domanda "Cosa deve fare il sistema?" e non al "Come". Si articola in:

Studio di Fattibilità: Valutazione tecnica e finanziaria.  l’idea è fattibile (risorse e tempi)

Elicitazione e Analisi: Raccolta dei bisogni tramite interviste con gli stakeholder.

Specifica: Scrittura esplicita dei requisiti (spesso in linguaggio naturale).

Validazione: Controllo che i requisiti scritti corrispondano alle reali necessità degli utenti.



## Gli attori:

Utenti

Analisti del SW

Questa fase è cruciale e difficile  SW realizza i requisiti

I requisiti devono essere in linea con quelli detti dai customer. I requisiti devono essere in linea con le necessità degli utenti.

Output è il documento dei requisiti = quello che il sistema deve fare

Deve descrivere solo il COSA non il come!!! (NB)

Il documento può avere una forma più light --> linguaggio informale con diagrammi che aiuta la comunicazione tra utente e programmatore

Oppure

In modo più formale e in linguaggio di programmazione



5.2 Progettazione (Design)  how

Il design traduce i requisiti in una struttura logica indipendente, quanto più possibile, dalla piattaforma specifica.

High-level Design: Definizione dell'architettura globale e dei componenti.

Low-level Design: Dettaglio del comportamento delle singole componenti (es. Diagrammi delle classi UML).



Attività di design

In generale nelle attività di design

Architettura

Design dell'interfaccia = come comunicano le diverse interfacce

Componenti --> diagramma delle classi

Database design



5.3 Validazione (Testing)

## Il testing è volto a identificare malfunzionamenti. Si divide in tre livelli:

Component Testing: Verifica dei singoli moduli (svolto solitamente dai programmatori).

System Testing: Verifica dell'intero sistema integrato.

Acceptance Testing: Test finale condotto con dati reali del cliente per convalidare il prodotto.



5.4 Evoluzione (Manutenzione)

La manutenzione è necessaria per correggere errori residui, adattare il software a nuove leggi o piattaforme (es. aggiornamento del sistema operativo) o rispondere a evoluzioni del business. Nel software moderno, il confine tra sviluppo iniziale e manutenzione è sempre più sfumato.



--------------------------------------------------------------------------------

6. Ruoli e Responsabilità

## Il successo di un processo software dipende dalla sinergia tra diversi attori:

Analisti: Interagiscono con gli utenti per definire i requisiti e partecipano alla progettazione e manutenzione.

Progettisti (Designers): Definiscono l'architettura e il design dettagliato.

Programmatori: Traducono il design in codice ed eseguono lo unit testing.

Tester: Pianificano ed eseguono i test di sistema e di accettazione.

Utenti Finali/Stakeholder: Forniscono la conoscenza del dominio e validano i requisiti e il prodotto finale.





Software process models

Un modello di processo software è una rappresentazione astratta di una famiglia di processi, descritta da particolari prospettive. Esiste una "babele terminologica": lo stesso modello può essere chiamato o spiegato in modi diversi a seconda del contesto.

## In generale, i modelli si dividono in due grandi filosofie:

Plan-driven (Guidati dal piano): Tutte le attività sono pianificate in anticipo e il progresso è misurato rispetto a tale piano. Puntano molto sul rigore, sulla qualità del processo e sulla documentazione.

Agile (Metodi agili): La pianificazione è incrementale ed è più facile cambiare il processo per riflettere i mutevoli requisiti del cliente. Si focalizzano più sul codice che sulla progettazione.



Inizialmente veniva usato il workflow “non va e lo sistemi”  andava bene per progetti piccoli

Con tanti sviluppatori questa cosa non funziona +



2. Il Modello a Cascata (Waterfall)

È stato storicamente il primo modello formale (Royce, 1970), derivato dai processi manifatturieri e dalle catene di montaggio.

Struttura: Prevede fasi separate e distinte (Requisiti, Progettazione, Implementazione, Test, Manutenzione) che devono essere eseguite in sequenza. Una fase non dovrebbe iniziare finché la precedente non è terminata.

Pro: Pone grande enfasi sull'analisi dei requisiti e sulla progettazione; il processo è visibile grazie alla documentazione.

Contro: È molto rigido e monolitico; il cliente vede il prodotto finale solo alla fine del ciclo (spesso dopo anni), rendendo difficile gestire cambiamenti dei requisiti in corso d'opera.



Varianti del Waterfall

Per mitigare la rigidità, sono nate varianti come il modello con feedback (consente di tornare alle fasi precedenti se emergono problemi) e il V-Model. Quest'ultimo rende esplicite le corrispondenze tra le fasi di sviluppo (a sinistra) e quelle di test (a destra), sottolineando come ogni verifica possa richiedere modifiche alla progettazione corrispondente. I requisititi si possono cambiare solo la acceptance testing. Comunque permane che il user vede solo alla fine il prodotto





3. Modelli Evolutivi

Questi modelli mirano a sviluppare un'implementazione iniziale, mostrarla all'utente e raffinarla attraverso rilasci successivi.

Prototipazione (Prototyping): Si crea una versione iniziale (prototipo) per dimostrare concetti o provare opzioni di design. Questo non deve avere tutte le funzionalità. Ed è previsto che una volta capito in che direzione andare, venga buttato via.

Vantaggi: Migliore comprensione dei bisogni reali e dell'usabilità.

Rischi: Spesso i prototipi, che dovrebbero essere "usa e getta" (throwaway), vengono mantenuti come base del sistema finale per pressione sui costi, degradando la qualità architettonica.



## Incrementale vs. Iterativo:

Incrementale: Ogni rilascio aggiunge nuove funzionalità (es. un editor di testo che aggiunge prima la creazione, poi il copia-incolla e poi la formattazione).

Iterativo: Tutte le funzioni sono presenti da subito ma vengono perfezionate gradualmente (es. si passa da un'interfaccia a riga di comando a una grafica più performante).

Vantaggi comuni: Consegne più veloci e feedback precoce del cliente.





Il Modello a Spirale (Boehm)



Rappresenta il processo come una spirale invece che come una sequenza lineare.

Risk-driven: È il primo approccio che mette il rischio al centro del processo; ogni ciclo include una fase di analisi dei rischi per decidere se proseguire.

Fasi principali: Determinazione degli obiettivi, analisi dei rischi, ingegnerizzazione (sviluppo del modello scelto) e pianificazione della fase successiva col cliente.

È adatto a sistemi complessi ma richiede alte competenze per stimare correttamente i rischi.  Ma se il rischio non viene identificato, si sprecano risorse.

5. Sviluppo Basato sul Riuso (Reuse-oriented)



Si basa sull'integrazione sistematica di componenti esistenti o sistemi COTS (Commercial-off-the-shelf).

Processo: Prevede l'analisi dei componenti disponibili, la modifica dei requisiti per adattarli a ciò che esiste sul mercato e la progettazione del sistema tramite composizione.

Pro: Riduce drasticamente i costi, i rischi e i tempi di sviluppo poiché si scrive meno codice nuovo.

Contro: Si perde il controllo sull'evoluzione dei componenti (aggiornamenti decisi dal produttore esterno)  se c’è quale release e non è in linea con il nostro cliente   i requisiti originali potrebbero non essere soddisfatti pienamente, richiedendo compromessi col cliente.



# Lezione 5 – Analisi dei Requisiti del Software

Riepilogo Esecutivo

Di seguito si sintetizza i concetti fondamentali relativi ai requisiti del software. La corretta definizione dei requisiti emerge come la fase più critica e complessa dell'intero ciclo di vita del software.

## I punti chiave includono:

Definizione: Un requisito specifica cosa il sistema deve fare, non come deve farlo. Si distingue tra obiettivi di business del cliente e funzionalità tecniche del sistema.

Importanza Strategica: Errori nei requisiti sono responsabili di circa il 44,1% dei fallimenti dei progetti software. Identificare un errore in fase di manutenzione può costare fino a 20 volte di più rispetto alla sua correzione durante la fase dei requisiti.

Classificazione: I requisiti si dividono in Utente (linguaggio naturale per i clienti) e Sistema (dettagli tecnici per gli sviluppatori), nonché in Funzionali (servizi offerti) e Non Funzionali (vincoli di performance, affidabilità e standard).

Complessità: Come affermato da Fred Brooks, decidere cosa costruire è la parte più difficile e influente di tutto il lavoro di ingegneria.

--------------------------------------------------------------------------------

1. Natura e Definizione dei Requisiti

Un requisito software non è semplicemente un desiderio, ma una condizione o capacità specifica necessaria a un utente per risolvere un problema o raggiungere un obiettivo (secondo lo standard IEEE 610).

Il Principio Fondamentale

La distinzione cruciale risiede nel focus: il requisito deve descrivere COSA il sistema farà e NON COME lo farà.

Relazione tra Obiettivi e Funzionalità

Obiettivi (Business Objectives) (requirement): Esprimono i bisogni del cliente (es: "Voglio leggere un libro").

Funzionalità (feature): Sono l'insieme di specifiche (requirement) progettate per raggiungere l'obiettivo.

Analisi dei requisiti: Studia la relazione che permette di trasformare gli obiettivi in funzionalità concrete.

Differenza tra Feature e Requisito

Requisito: Descrive una capacità che il sistema deve possedere per essere testata in scenari specifici.

Feature (Funzionalità): È un insieme di requisiti logicamente connessi che descrive una funzionalità del prodotto.

Esempio: La feature "Carrello" di un e-commerce include i requisiti "L'utente può aggiungere articoli" e "L'utente può rimuovere articoli".

Esempi di requirements

## Sistema ATM/ bancomat:

Deve verificare la validità della carta

Non deve prelevare più di 250€ giornalieri

Costruire un sistema che calcoli il numero di Fibonacci (n)

F(0) = 1

F(1) = 1

F(n) = F(n-1) + F(n-2)

Esempi di non requisiti

Architetture di sistemi

Vincoli tecnologici

Sviluppo dei processi

Sviluppo dell’ambiente

OS

Aspetti relativi alla Riusabilità e portabilità

Nota: Le descrizioni del dominio del mondo reale sono invece considerate parte integrante dei requisiti.

--------------------------------------------------------------------------------

2. Tipologie di Requisiti

Il software richiede diversi livelli di documentazione a seconda del destinatario e dello scopo.

Requisiti Utente (User requirement) vs. Requisiti di Sistema (System requirment)

Nota critica: Se entrambi esistono, devono essere perfettamente allineati per evitare discrepanze tra aspettative del cliente e implementazione.

## Esempio:

## Abbiamo un editor grafico e vogliamo descrivere la funzionalità dell’aggiunta di un nodo:





Requisiti Funzionali e Non Funzionali

## Requisiti Funzionali :

Definiscono i servizi, le reazioni agli input e il comportamento in situazioni specifiche.

Possono anche specificare cosa il sistema non deve fare.

Sono indipendenti dall'implementazione.

## Requisiti Non Funzionali (NFR) :

Vincoli sui servizi o funzioni offerti (es: tempi di risposta, affidabilità, standard di sviluppo).

Spesso si applicano al sistema nel suo complesso piuttosto che a singole feature.

Se non soddisfatti, possono rendere il sistema inutile, risultando talvolta più critici dei requisiti funzionali.

## Sottocategorie dei Requisiti Non Funzionali:

Requisiti di Prodotto: Specificano il comportamento del prodotto consegnato (velocità di esecuzione, affidabilità).

Requisiti Organizzativi: Derivano da politiche e procedure aziendali (standard di processo, linguaggi di programmazione).

Requisiti Esterni: Derivano da fattori esterni al sistema e al suo sviluppo (legislazione, interoperabilità).

--------------------------------------------------------------------------------

3. L'Impatto Critico dei Requisiti sul Successo del Progetto

La fase dei requisiti è identificata come la più complessa nella costruzione di un sistema software. Fred Brooks sottolinea che nessun'altra parte del lavoro influisce così tanto sul risultato finale se eseguita in modo errato, né è così difficile da correggere in seguito.

Fattori di Fallimento dei Progetti (Sondaggio Standish, 1994)

## Il 44,1% delle cause di fallimento di un progetto software è riconducibile ai requisiti. Tra i principali fattori di compromissione del progetto figurano:

Requisiti Incompleti (13,1%)

Mancanza di coinvolgimento dell'utente (12,4%)

Aspettative irrealistiche (9,9%)

Cambiamento dei requisiti e delle specifiche (8,7%)

Analisi dei Costi e dei Difetti

## L'efficienza economica nella scoperta degli errori segue una progressione esponenziale:

Rapporto di risparmio 20:1: Trovare un errore nella fase dei requisiti invece che nella fase di manutenzione permette un risparmio massiccio.

Costo relativo della riparazione: Se riparare un difetto durante la fase dei requisiti costa 1, il costo sale a 6,5 in fase di implementazione, 15 in fase di testing e fino a 100 (o 20 secondo altri modelli come Boehm) in fase di manutenzione.

Oltre la metà dei bug totali può essere fatta risalire a errori commessi durante la fase dei requisiti.

--------------------------------------------------------------------------------

4. Esempi Pratici e Casistiche

Sistema ATM

Funzionale: Il sistema deve controllare la validità della carta; deve fornire funzioni di prelievo, saldo e stampa record.

Non Funzionale: Il sistema non può restituire più di 250 euro al giorno; deve garantire un tempo di risposta inferiore al minuto; deve essere accessibile a persone con disabilità; deve essere sviluppato su architettura X86.

Sistema Mentcare (Gestione Salute Mentale)

Requisito Utente: Generare report mensili sui costi dei farmaci prescritti da ogni clinica.

Requisito Sistema: Generazione automatica di un riepilogo costi l'ultimo giorno lavorativo del mese dopo le 17:30, includendo farmaci, costi e cliniche prescriventi.

Requisito Non Funzionale: Il sistema deve essere facile da usare per il personale medico; deve implementare le disposizioni sulla privacy dei pazienti (standard HStan-03-2006-priv).

Calcolo di Fibonacci(n)

Requisiti matematici funzionali: F(0)=1, F(1)=1, F(n)=F(n-1)+F(n-2).

--------------------------------------------------------------------------------

Requirements Engineering

La Requirements Engineering (RE) è l'insieme delle attività necessarie per raccogliere, documentare e mantenere l'insieme dei requisiti di un sistema software. È considerata la fase più complessa e critica dello sviluppo: decidere cosa costruire influisce sull'esito del progetto più di ogni altra attività, e gli errori commessi in questa fase sono i più difficili e costosi da correggere in seguito.

## Di seguito una sintesi dei concetti principali:

1. Il Processo di Requirements Engineering



## Il processo non è lineare ma spesso iterativo (rappresentato come una spirale) e comprende diverse attività chiave:

Studio di fattibilità: Valuta se il sistema può essere realizzato con il budget e le tecnologie disponibili.

Elicitazione (=tirare fuori) e analisi: Interazione con gli stakeholder per scoprire le loro necessità e i vincoli del dominio. Include la classificazione, l'organizzazione e la prioritizzazione dei requisiti.

Specifica: Processo di scrittura dei requisiti in un documento ufficiale, il Software Requirements Specification (SRS).

Validazione: Verifica che i requisiti riflettano realmente i bisogni del cliente e siano realizzabili, consistenti e completi.

2. Tipi di Requisiti

## Esistono due distinzioni fondamentali per classificare i requisiti:

## Livello di dettaglio:

User Requirements: Espressioni in linguaggio naturale per il cliente; descrivono cosa il sistema deve fare ad alto livello.

System Requirements: Documenti strutturati e dettagliati per gli sviluppatori; definiscono con precisione le funzioni e i vincoli operativi.

## Natura del requisito:

Funzionali: Servizi che il sistema deve fornire e come deve reagire a certi input (es. "il sistema deve generare report mensili").

Non Funzionali: Vincoli sui servizi, come prestazioni, affidabilità o standard (es. "la risposta deve essere fornita entro 3 secondi"). Se non soddisfatti, possono rendere l'intero sistema inutilizzabile.

3. Forme dei Requisiti

## A seconda della metodologia di sviluppo, i requisiti possono assumere forme diverse:

Classica: Template testuali strutturati (es. "Il sistema deve <funzione>").

User Story: Usate nei metodi Agile, descrivono un'esigenza dal punto di vista dell'utente con la formula: "Come , voglio , così da ".

Use Case: Tecnica basata su scenari (UML) che identifica gli attori e descrive l'interazione tra loro e il sistema.

4. Problemi comuni nell'Elicitazione

Il processo di raccolta dei requisiti affronta spesso sfide come l'ambiguità (termini interpretati diversamente da utenti e sviluppatori), requisiti incompleti, conflitti tra stakeholder o cambiamenti continui delle necessità durante lo sviluppo



Software Requirements Document

Il Software Requirements Specification (SRS), o documento dei requisiti software, è la dichiarazione ufficiale che descrive ciò che è richiesto agli sviluppatori del sistema. Rappresenta l'output principale dell'intero processo di Requirements Engineering.

## Di seguito una sintesi delle sue caratteristiche principali:

1. Natura e Scopo del Documento

Cosa vs Come: L'SRS non è un documento di progettazione (design); deve stabilire COSA il sistema deve fare e non COME deve essere implementato.

Contenuto: Solitamente include sia i requisiti utente (espressi in linguaggio naturale per il cliente) sia i requisiti di sistema (specifiche dettagliate per gli sviluppatori).

Funzione Contrattuale: Serve come base per il contratto tra il cliente e lo sviluppatore, definendo ufficialmente i servizi e i vincoli del sistema.

2. Destinatari dell'SRS

## Il documento viene utilizzato da diverse figure professionali con scopi differenti:

Clienti: Per verificare che i requisiti soddisfino le loro necessità.

Manager: Per pianificare l'offerta e il processo di sviluppo.

Ingegneri di sistema: Per capire cosa deve essere costruito.

Tester: Per sviluppare i test di validazione.

Manutentori: Per comprendere il sistema e le relazioni tra le sue parti.

3. Variabilità e Standard

## Il livello di dettaglio di un SRS dipende fortemente dall'approccio di sviluppo scelto:

Sistemi critici o in outsourcing: Richiedono requisiti estremamente dettagliati.

Sviluppo Agile/Incrementale: In questi contesti, il documento è spesso meno dettagliato e focalizzato sulle User Stories, lasciando molti dettagli alla conoscenza implicita del team.

Standard: Esistono modelli standardizzati per la sua redazione, come quelli definiti dall'IEEE, particolarmente utili per grandi progetti ingegneristici.

4. Problemi Comuni da Evitare

## La stesura di un buon SRS è complessa e può presentare diverse criticità:

Mancanza di chiarezza e ambiguità: Termini interpretati diversamente da utenti e sviluppatori.

Verbocità o eccessiva generalizzazione.

Assunzioni nascoste o requisiti tecnici mescolati a requisiti funzionali.

Più requisiti accorpati in una singola frase, rendendo difficile la verifica individuale.

In sintesi, l'SRS è un documento vivo che deve essere mantenuto aggiornato per riflettere le funzionalità e i servizi del sistema che deve essere realizzato

The requirements elicitation and analysis process

Il processo di Requirements Elicitation and Analysis (elicitazione e analisi dei requisiti) rappresenta un ciclo iterativo fondamentale per comprendere cosa il sistema debba fare. Spesso questo processo viene chiamato anche Requirement Discovery.

## Di seguito sono spiegate le quattro attività principali che compongono questo ciclo:

1. Requirements Discovery (Elicitazione)

In questa fase il personale tecnico collabora con gli stakeholder (utenti finali, manager, esperti di dominio) per scoprire le necessità e i vincoli del sistema.

Tecniche utilizzate: Le principali tecniche includono interviste (formali o informali), osservazioni sul campo, analisi dei prodotti concorrenti e workshop.

Tipi di intervista: Possono essere chiuse, basate su domande predefinite, o aperte, in cui si esplorano vari temi senza un ordine rigido.

Problemi comuni: Spesso gli stakeholder non sanno cosa vogliono realmente, si esprimono con termini propri (difficili da capire per i tecnici) o presentano richieste in conflitto tra loro. Inoltre, i requisiti tendono a cambiare durante il processo a causa di cambiamenti nel mercato o nell'organizzazione.

2. Requirements Classification and Organization

Questa attività consiste nel raggruppare i requisiti correlati in cluster coerenti. L'obiettivo è organizzare la massa informe di informazioni raccolta nella fase di scoperta per dare una struttura logica all'analisi.

3. Prioritization and Negotiation (Prioritizzazione e Negoziazione)

Poiché raramente è possibile soddisfare tutte le richieste contemporaneamente, è necessario stabilire delle priorità e risolvere i conflitti.

Esempio di conflitto: Un requisito potrebbe richiedere di minimizzare il numero di chip per risparmiare energia, mentre un altro potrebbe esigere tempi di risposta rapidissimi che richiedono più potenza di calcolo. In questi casi, è necessaria una negoziazione per trovare un compromesso.

## Strategie di prioritizzazione (Scala MoSCoW):

Must (Necessari): Requisiti che devono essere implementati obbligatoriamente.

Should (Desiderabili): Sarebbe meglio averli, ma non sono critici.

Could (Possibili): Da implementare solo se avanzano tempo e risorse.

Won’t (Non previsti): Funzionalità che si è deciso esplicitamente di non implementare in questa fase.

4. Requirements Specification (Specifica)

I requisiti vengono infine documentati ufficialmente per essere utilizzati nel ciclo successivo dello sviluppo.

Il documento deve essere comprensibile sia per i clienti (requisiti utente in linguaggio naturale) sia per gli sviluppatori (requisiti di sistema più tecnici e dettagliati).

È cruciale che la specifica sia il più completa possibile, poiché spesso funge da base per il contratto di sviluppo.

Il processo si conclude (o riparte) con la Requirement Validation (slide 71), che serve a dimostrare che i requisiti definiti corrispondano effettivamente a ciò che il cliente desidera realmente.

--------------------------------------------------------------------------------

Requirements Engineering (RE)

La Requirements Engineering (RE) è l'insieme delle attività necessarie per raccogliere, documentare e mantenere l'insieme dei requisiti di un sistema software. Questo processo serve a stabilire quali servizi il cliente richiede al sistema e i relativi vincoli operativi. La RE si focalizza sul cosa il sistema deve fare e non sul come debba essere implementato tecnicamente. È considerata la parte più complessa dello sviluppo software, poiché gli errori commessi in questa fase sono i più difficili e costosi da correggere in seguito.

## Il processo di Requirements Engineering viene spesso rappresentato come un modello a spirale o un ciclo iterativo composto da quattro fasi principali:

Elicitazione (o Discovery): consiste nel collaborare con gli stakeholder (utenti, manager, esperti di dominio) per scoprire le loro necessità e i vincoli del sistema. Per farlo si utilizzano tecniche come interviste, osservazioni sul campo, workshop e analisi dei prodotti concorrenti.

## Le interview possono essere:

Formali, Informali ,Domande aperte, domande chiuse  solitamente si parte con delle domande chiuse e si finisce con delle domande aperte, che portano a un dialogo.

Analisi: i requisiti raccolti vengono analizzati per verificarne la fattibilità e la correttezza rispetto ai desideri del cliente. In questa fase si classificano e organizzano i requisiti in cluster coerenti, si identificano quelli mancanti o poco chiari e si risolvono eventuali conflitti tra richieste diverse.

Si deve capire se i requisiti raccolti sono fattibili/ realizzabili, se sono in linea con i bisogni dell’utente, chiarire requisiti poco chiari, risolvere i conflitti, stabilire delle priorità  Moscow scale

Specifica: è il processo di scrittura ufficiale dei requisiti in un documento chiamato Software Requirements Specification (SRS). I requisiti vengono distinti in User Requirements (espressi in linguaggio naturale per il cliente) e System Requirements (più dettagliati e tecnici per gli sviluppatori).

Devono essere comprensibili a tutti, linguaggio non troppo tecnico, a volte è usato anche come contratto

Validazione: serve a dimostrare che i requisiti definiti corrispondano effettivamente a ciò che l'utente desidera realmente. Durante la validazione si controllano proprietà fondamentali come la completezza(abbiamo pensato a tutto quello che ci ha chiesto il customer), la consistenza (che non ci siano conflitti), il realismo (che sia realizzabile considerato budget e tempo) e l'assenza di ambiguità.

## Caratteristiche dei requirements:

Comprensibilità   facile da comprendere a tutti

Verificabile usare delle metriche, più precisi possibili

Tracciabilità  da quale stakeholder è partito quel requisito

Adattabilità  possiamo cambiare il requisito senza avere largo impatto sul sistema e altre componenti

Problemi

Il problema principale è l’ambiguità.

Evitare requisiti molto prolissi

Termini troppo tecnici

Se ci sono assunzioni, queste devono essere esplicite

Evitare elementi di design --> solo il cosa e non il come

A volte accorpiamo più requisiti in un solo requisito  vanno separati per concetto. E distinguere i funzionali dai non funzionali

Forme

All'interno della specifica, i requisiti si dividono ulteriormente in funzionali, che descrivono i servizi forniti dal sistema, e non funzionali, che pongono vincoli come prestazioni, affidabilità o standard di sicurezza. Per gestire le risorse limitate, i requisiti vengono spesso prioritizzati utilizzando scale numeriche o il metodo MoSCoW (Must, Should, Could, Won’t).

## Infine, i requisiti possono assumere diverse forme a seconda della metodologia di sviluppo:

Forma classica: frasi strutturate del tipo "<ID> Il sistema deve <funzione>".

Vanno sempre numerate tramite ID così da poterle referenziare

User Story: usate nei metodi Agile, seguono il template "Come <ruolo>, voglio <obiettivo>, così da <valore>".

È semplice per l’user da scrivere

User stories non devono essere troppo complesse perché poi abbiamo un solo mese per realizzarle

Product owner - accetta o non accetta il SW --> tramite la definition of done

Use Case: tecniche basate su scenari (UML) che descrivono l'interazione passo dopo passo tra un attore e il sistema per raggiungere un obiettivo  è più dettagliato.

Scrivere in formato testuale non vieta poi cmq scrivere le use case. Siamo sempre sul livello di cosa e non come. Ma vediamo le interazioni con il sistema.  Forniscono dei casi di interazione = quali sono gli scenari.



# Lezione 6 – Analisi dei Modelli Concettuali e dei Diagrammi dei Casi d'Uso

Sintesi Esecutiva

Deliniamo i principi fondamentali della modellazione del software, con un focus specifico sui Diagrammi dei Casi d'Uso (Use Case Diagrams). La modellazione è definita come un'attività di astrazione volta a ridurre la complessità della realtà per scopi di comprensione e comunicazione tra gli stakeholder. Il linguaggio di riferimento è l'UML (Unified Modeling Language), una notazione grafica standard che permette di descrivere i sistemi da diverse prospettive (interazione, strutturale, comportamentale ed esterna).

I diagrammi dei casi d'uso rappresentano lo strumento principale nella fase di analisi dei requisiti, permettendo di definire chiaramente i confini del sistema (boundaries), gli attori coinvolti (actors) e le funzionalità offerte (use cases). L'efficacia di questi modelli risiede nella loro capacità di facilitare la validazione dei requisiti con utenti non tecnici, a patto di mantenere una prospettiva focalizzata sull'utente e un livello di astrazione coerente.

--------------------------------------------------------------------------------

1. Fondamenti della Modellazione Concettuale

1.1 Definizione e Scopo

## Secondo le definizioni classiche citate nelle fonti (Stachowiak, 1973; Mylopoulos, 1992), un modello è una "mappatura semplificativa della realtà per servire uno scopo specifico". Le caratteristiche principali dei modelli includono:

Astrazione: Riduzione della complessità selezionando solo gli aspetti rilevanti del mondo reale.

Target: Ogni modello è sviluppato per un pubblico specifico e con un obiettivo preciso.

Comunicazione: Funge da linguaggio comune per descrivere aspetti fisici e sociali, facilitando la discussione tra sviluppatori e stakeholder.

1.2 Scelta del Linguaggio di Modellazione

## La scelta del linguaggio dipende da tre fattori critici:

Facilità d'uso: Semplicità sia nella scrittura che nella lettura del modello.

Comprensibilità: Deve supportare la comunicazione con utenti e clienti non tecnici.

Livello di formalità: Se formale e preciso, il linguaggio permette analisi approfondite e potenzialmente la generazione di codice.

--------------------------------------------------------------------------------

2. Il Linguaggio UML (Unified Modeling Language)

L'UML è una famiglia di notazioni grafiche standard (gestite dall'OMG) utilizzate per descrivere e progettare sistemi software, in particolare quelli orientati agli oggetti (OO).

2.1 Cosa NON è l'UML

## È fondamentale chiarire i limiti dell'UML per evitarne un uso improprio:

Non è una metodologia: È una notazione, non un metodo di sviluppo. Può essere usato sia in contesti Agile che Plan-driven.

Non è un linguaggio di programmazione: È un linguaggio di modellazione.

2.2 Modalità di Utilizzo

## L'UML può essere impiegato a diversi livelli di dettaglio:

Sketch (Schizzo): Per facilitare la comunicazione e la discussione rapida (spesso su lavagna). Contiene solo le informazioni essenziali.

Blueprint (Progetto dettagliato): Modelli completi che servono come guida per l'implementazione meccanica del codice. Usato per documentare il progetto.

Verso il linguaggio di programmazione: Modelli eseguibili che possono essere trasformati direttamente in codice tramite tool specifici.

--------------------------------------------------------------------------------

3. Prospettive di Modellazione del Sistema

## Il sistema software può essere analizzato attraverso quattro prospettive principali, ognuna supportata da specifici diagrammi UML:





## Visione completa:







Studio del dominio (BPMN) in fase di ricerca dei requisiti

Con gli use case, dettagliamo gli scenari con i UML sequence diagra, e BPMN process models --> danno una vista dinamica del sistema

## Nel design:

Components diagram

Design

Ci si focalizza di più sulla parte statica



--------------------------------------------------------------------------------

4. Diagrammi dei Casi d'Uso (Use Case Diagrams)

I diagrammi dei casi d'uso descrivono il comportamento del sistema dal punto di vista dell'utente, specificando "cosa" il sistema fa senza indicare "come" verrà implementato.

4.1 Componenti del Diagramma

Attori (Actors): Entità esterne che interagiscono con il sistema. Possono essere umani o sistemi automatici (hardware/software).  no attore che interagisce con l’attore che interagisce con il sistema = questo non è un attore

Nota: L'attore rappresenta un ruolo, non una persona specifica. Un individuo può ricoprire più ruoli (es. tecnico e cliente).

Attori Primari: Avviano un caso d'uso per raggiungere un obiettivo.

Attori Secondari: Ricevono informazioni o notifiche dal caso d'uso (attori passivi).

Casi d'Uso (Use Cases): Singole unità di funzionalità fornite dal sistema. Graficamente rappresentati da ellissi.

Confini del Sistema (System Boundaries): Un rettangolo che racchiude i casi d'uso, separando ciò che è interno (da implementare) da ciò che è esterno (attori).  rettangoli

Associazioni: Linee continue che collegano attori e casi d'uso.

4.2 Convenzioni e Buone Pratiche

Nomenclatura: Il nome del caso d'uso deve seguire la convenzione Verbo + Oggetto (es. Ordina Prodotti).

Prospettiva dell'Attore: I nomi devono riflettere l'azione dell'utente, non del sistema. Ad esempio, è preferibile "Esegui Pagamento" (punto di vista utente) rispetto a "Accetta Pagamento" (punto di vista sistema).

Livello di Astrazione: Tutti i casi d'uso in un diagramma dovrebbero mantenere un livello di dettaglio coerente.

4.3 Benefici

Facilitano la validazione dei requisiti con il cliente.

Definiscono chiaramente l'ambito (scope) del progetto.

Identificano problemi di comunicazione o lacune nell'analisi dei requisiti già nelle fasi iniziali.

--------------------------------------------------------------------------------

5. Descrizione dei Casi d'Uso e Scenari

Un diagramma dei casi d'uso non è completo senza una descrizione testuale dettagliata (spesso in forma tabellare) che espanda l'ellisse in una sequenza di passi.

5.1 Flussi di Interazione

Main Success Scenario (Happy Path): Il flusso principale dove tutto procede come previsto senza errori.

Flussi Alternativi/Eccezionali: Descrivono situazioni di errore (es. PIN errato in un ATM) o casi speciali.

Scenario: Ogni possibile cammino (principale o alternativo) attraverso un caso d'uso.

5.2 Struttura della Descrizione

Le descrizioni dovrebbero essere numerate e specificare chiaramente il soggetto (attore o sistema) e l'azione compiuta. L'interazione inizia tipicamente con una richiesta dell'attore e termina con una risposta del sistema che soddisfa l'obiettivo dell'attore.

--------------------------------------------------------------------------------

6. Altre Notazioni e Strumenti Correlati

## Per dettagliare la parte dinamica e i vincoli del sistema, si utilizzano notazioni complementari:

Sequence Diagrams: Mostrano l'interazione dettagliata e lo scambio di messaggi tra attore e componenti del sistema nel tempo.

Activity Diagrams: Utili per rappresentare la logica procedurale, i punti di decisione e le attività parallele.

BPMN (Business Process Model and Notation): Una notazione più ricca per modellare processi aziendali, ruoli e dati, spesso usata per lo studio del dominio.

OCL (Object Constraint Language): Un linguaggio formale (estensione di UML) per specificare vincoli, invarianti, pre-condizioni e post-condizioni che non possono essere espressi graficamente.

Diagrammi Statici: I Class Diagrams e i Component Diagrams sono utilizzati principalmente nella fase di progettazione (design) per descrivere la struttura interna e le interfacce del sistema.

# Lezione 7 –  Ingegneria del Software: Obiettivi, Attori e Modellazione dei Casi d'Uso

Vediamo i principi metodologici per la definizione dei progetti software, l'analisi strategica del contesto e la modellazione delle interazioni tra attori e sistema, con particolare focus sulla struttura del primo deliverable (D1).

Sintesi Esecutiva

Il processo di ingegneria del software inizia con la trasformazione di un'idea progettuale in obiettivi misurabili e realistici. Attraverso l'analisi SWOT, si identificano i fattori interni ed esterni che influenzano il successo del progetto. La fase di analisi prosegue con l'identificazione degli attori del sistema e la definizione dei Casi d'Uso (Use Cases), che descrivono le interazioni dinamiche tra gli utenti (o sistemi esterni) e il software. La documentazione di tali interazioni richiede una struttura semistrutturata che includa flussi principali (happy paths) e flussi alternativi per la gestione delle eccezioni. Per il Deliverable D1, è fondamentale mantenere la coerenza tra diagrammi e descrizioni, focalizzandosi su un livello di astrazione che eviti dettagli tecnologici prematuri.

--------------------------------------------------------------------------------

1. Definizione degli Obiettivi del Progetto

## Il passaggio fondamentale per l'avvio di un progetto software è la transizione dall'idea progettuale agli obiettivi concreti. Gli obiettivi devono seguire i criteri SMART:

Specific (Specifici)

Measurable (Misurabili)

Achievable (Raggiungibili)

Realistic (Realistici)

Timely (Definiti nel tempo)

Esempi di Obiettivi per Applicazioni Software

## Il materiale analizzato propone due ambiti applicativi:

--------------------------------------------------------------------------------

2. Analisi SWOT

L'analisi SWOT è una tecnica di valutazione strategica che identifica i fattori favorevoli e sfavorevoli al raggiungimento degli obiettivi.



## Fattori Interni:

Strengths (Punti di forza): Aspetti positivi controllabili (es. tecnologie avanzate, consapevolezza del mercato).

Weaknesses (Punti di debolezza): Limiti interni (es. costi elevati, dipendenza da infrastrutture esistenti).

## Fattori Esterni:

Opportunities (Opportunità): Tendenze di mercato o collaborazioni esterne.

Threats (Minacce): Fattori esterni avversi (es. concorrenza low-cost, cambiamenti normativi).

--------------------------------------------------------------------------------

3. Gli Attori del Sistema

Gli attori sono entità o componenti che interagiscono con il sistema. Possono essere utenti umani, altri sistemi software, hardware o componenti interni.

## Fasi per l'identificazione degli attori:

Identificare gli utenti: Chi utilizzerà il sistema?

Identificare sistemi esterni: Software o hardware che integrano il sistema.

Definire i ruoli: Ogni attore deve avere un ruolo specifico.

Analizzare le interazioni: Definire quali informazioni l'attore visualizza o inserisce.

Identificare i permessi: Stabilire i livelli di accesso per garantire la sicurezza.

L'uso di Mappe Mentali è raccomandato in questa fase per stimolare il brainstorming senza preoccuparsi inizialmente della struttura, aiutando il team a mappare idee e funzionalità per ogni ruolo.

--------------------------------------------------------------------------------

4. Modellazione dei Casi d'Uso (Use Cases)

I diagrammi dei casi d'uso rappresentano il "cosa" fa il sistema, non il "come". Essi vedono il sistema come una "black box" all'interno di un boundary (confine).

4.1. Componenti del Diagramma

Attori: Rappresentati graficamente (stickman), collegati agli use case tramite associazioni (linee continue).

Casi d'Uso: Rappresentati da ellissi contenenti un verbo e un oggetto (es. "Preleva Contanti").

Associazioni: Indicano l'interazione. Solitamente non sono direzionate perché la comunicazione è bidirezionale.

4.2. Relazioni Avanzate

Generalizzazione (Attori/Use Cases): Un attore "figlio" eredita le funzionalità del "padre". Negli Use Case, il figlio eredita e specializza gli step del padre.

Inclusione (<<include>>): Utilizzata per fattorizzare comportamenti comuni. Lo use case base non è completo senza quello incluso. La freccia tratteggiata va dal base all'incluso.

Estensione (<<extend>>): Utilizzata per comportamenti opzionali o condizionali. Lo use case base è completo di per sé. La freccia va dall'estensione al caso base.

--------------------------------------------------------------------------------

5. Descrizione Semistrutturata dei Casi d'Uso

Ogni caso d'uso nel diagramma deve essere accompagnato da una descrizione dettagliata. Si raccomanda un formato semistrutturato (spesso gestito tramite template Excel o tabelle).

5.1. Struttura del Template

ID e Nome: Identificativo progressivo e nome corrispondente al diagramma.

Descrizione: Breve riassunto della funzionalità.

Attori Primari e Secondari: Chi avvia il caso d'uso e chi vi partecipa passivamente.

Precondizioni e Postcondizioni: Cosa deve essere vero prima e dopo l'esecuzione.

Flusso Principale (Happy Path): Sequenza numerata di passi (azione dell'attore vs reazione del sistema).

Flussi Alternativi/Eccezionali: Gestione di errori o varianti (es. PIN errato, fondi insufficienti).

5.2. Logica dei Flussi e Parole Chiave

## Per descrivere deviazioni minori o cicli nel flusso principale, si utilizzano costrutti logici:

IF / OTHERWISE: Per deviazioni semplici (es. se il libro è trovato mostralo, altrimenti avvisa l'utente).

FOR EACH: Per iterazioni su collezioni (es. per ogni libro trovato, mostra i dettagli).

AS LONG AS: Per cicli condizionali (es. finché i dati inseriti non sono validi, richiedi inserimento).





Deviazioni nel contesto del user case

Nel contesto degli Use Case, si verifica una deviazione ogni volta che l'interazione tra l'attore e il sistema si allontana dallo scenario principale, ovvero dal cosiddetto "happy path" o "mondo perfetto" in cui tutto procede come desiderato.



## Si distinguono tra due tipologie di deviazioni, a seconda della loro entità e di come vengono documentate:

1. Deviazioni Semplici (Piccole)

Si tratta di piccole variazioni rispetto alla sequenza principale che solitamente si ricollegano al flusso primario dopo aver gestito la condizione specifica.

Come si documentano: Vengono scritte direttamente all'interno della sequenza del Main Flow (flusso principale) utilizzando parole chiave strutturate.

Parole chiave: Si utilizzano i costrutti if (se) e otherwise (altrimenti).

Esempio: Nello use case "Cerca libro", se il sistema trova i risultati, li mostra (if); altrimenti (otherwise), comunica all'utente che non ci sono libri corrispondenti ai criteri. In entrambi i casi, lo scostamento è minimo e non richiede una tabella a parte.

2. Deviazioni Complesse

Queste rappresentano scostamenti più consistenti, solitamente dovuti a situazioni di errore, eccezioni o casi speciali che spesso portano alla fine dello use case senza tornare al flusso principale.

Come si documentano: Vengono gestite come Alternative Flows (flussi alternativi) e documentate in una tabella o sezione separata rispetto al Main Flow.

## Identificazione e Collegamento:

Ogni flusso alternativo deve avere un proprio ID numerico correlato allo use case principale (ad esempio, se lo use case principale è l'ID 9, il suo primo flusso alternativo sarà il 9.1).

È fondamentale indicare il punto di innesto (ancora), ovvero il numero del passo del Main Flow in cui la deviazione ha inizio.

Esempio: Durante la "Creazione di un nuovo account", un flusso alternativo complesso potrebbe essere l'inserimento di un "indirizzo email non valido" o l'azione di "annullamento" da parte dell'utente. Questi scenari richiedono una descrizione dettagliata di passi specifici per gestire l'errore o l'uscita dal sistema.

Sintesi delle differenze













--------------------------------------------------------------------------------

I 3 tipi di relazioni

In un diagramma dei casi d'uso UML, le relazioni tra gli elementi servono a gestire la complessità, isolare funzionalità specifiche e condividere comportamenti tra diversi scenari.

Di seguito viene spiegata la generalizzazione (per attori e casi d'uso) e i tre tipi principali di relazioni: inclusiva, estensiva e generica (generalizzazione).

1. La Generalizzazione (Relazione "Generica")

La generalizzazione viene utilizzata quando diversi elementi (attori o casi d'uso) condividono caratteristiche comuni ma presentano specializzazioni distinte.

Generalizzazione degli Attori: Si usa per creare un "attore padre" che contiene le similitudini e "attori figli" che rappresentano ruoli specifici. L'attore figlio eredita tutte le associazioni con i casi d'uso del padre. Ad esempio, un attore generico "Buyer" può essere il padre di "Customer" e "Agent", i quali ereditano le funzioni base di acquisto ma possono avere responsabilità aggiuntive. Graficamente è rappresentata da una freccia con la punta a triangolo vuoto che va dal figlio al padre.

Generalizzazione dei Casi d'Uso: Diversi casi d'uso possono condividere lo stesso comportamento base. Il caso d'uso figlio eredita tutti i passi del padre, ma può aggiungerne di nuovi o ridefinire quelli ereditati. I figli sono solitamente mutuamente esclusivi (es. il caso d'uso "Paga" può essere specializzato in "Paga con carta" o "Paga in contanti"). La notazione è una freccia con punta a triangolo vuoto dal figlio al padre.

2. Relazione Inclusiva (<<include>>)

La relazione di inclusione viene utilizzata per fattorizzare pezzi di funzionalità che sono comuni a più casi d'uso, simili al concetto di procedura o subroutine.

Scopo: Estrarre frammenti di comportamento duplicati per renderli riutilizzabili.

Funzionamento: Il caso d'uso principale (inlcudente) esegue i suoi passi fino al punto di inclusione, passa il controllo al caso d'uso incluso e, una volta terminato quest'ultimo, il controllo torna al principale.

Caratteristiche: Il caso d'uso principale è incompleto senza quello incluso. L'inclusione non è opzionale: se il flusso arriva a quel punto, il caso incluso deve essere eseguito.

Notazione: Una freccia tratteggiata che va dal caso d'uso sorgente (quello che include) al target (quello incluso), etichettata con la parola chiave <<include>>.



3. Relazione Estensiva (<<extend>>)

La relazione di estensione aggiunge un comportamento extra o opzionale a un caso d'uso base esistente.

Scopo: Aggiungere modularmente nuove caratteristiche a una capacità iniziale definita.

Funzionamento: L'estensione avviene solo in determinati punti di estensione (extension points) e solitamente solo se si verifica una specifica condizione. Ad esempio, il caso d'uso "Restituisci libro" può essere esteso con "Emissione multa" solo se il libro è in ritardo.

Caratteristiche: Il caso d'uso base è significativo e completo di per sé, indipendentemente dall'estensione. Il comportamento aggiunto è considerato opzionale.

Notazione: Una freccia tratteggiata etichettata con <<extend>>. Attenzione alla direzione: a differenza dell'include, la freccia va dal caso d'uso che estende (l'estensione) verso il caso d'uso base.





Confronto Sintetico tra Inclusione ed Estensione









-----------------------------------------------------------------------------------------------

Suggerimenti

Il Processo di Sviluppo (Slide 127)

## Il processo suggerito per costruire un modello dei casi d'uso segue quattro fasi logiche:

Estrarre i requisiti funzionali: Identificare le funzionalità di base che il sistema deve offrire.

Identificare gli attori: Individuare chi (umano o sistema esterno) interagirà con tali funzionalità.

Definire le relazioni: Stabilire i legami tra i requisiti funzionali utilizzando meccanismi come la specializzazione (generalizzazione), l'inclusione (<<include>>) o l'estensione (<<extend>>).

Documentare gli scenari: Redigere le descrizioni testuali in formato tabellare per ogni caso d'uso.

Suggerimenti per Modelli Efficaci

## Nelle fonti vengono forniti diversi consigli pratici per migliorare la qualità del lavoro:

Livello di astrazione: È fondamentale trovare il giusto equilibrio: i casi d'uso non devono essere né troppo astratti né troppo dettagliati.

Focus sull'interazione: I casi d'uso devono descrivere l'interazione tra attore e sistema, non le funzionalità interne o i processi che il sistema compie "dietro le quinte".

"Cosa" vs "Come": Bisogna descrivere cosa l'utente vuole fare e non come lo fa tecnicamente. Ad esempio, è corretto scrivere "il sistema chiede conferma", mentre è sbagliato scrivere "l'utente preme il bottone OK", poiché quest'ultima è una scelta di design dell'interfaccia.

Evitare la decomposizione funzionale: Non bisogna creare casi d'uso ad alto livello (es. "Gestione Biblioteca") per poi scomporli infinitamente. I casi d'uso troppo astratti non sono utili perché non permettono di definire un flusso di eventi significativo; solo i livelli più bassi (es. "Aggiungi libro") hanno valore operativo.

Approccio Actor-Centric: Sebbene si possa partire dai casi d'uso (use-case centric), l'audio suggerisce che partire dagli attori (actor-based centric) sia spesso più semplice. Identificando un attore specifico e tutte le sue funzionalità si evita di creare diagrammi troppo complessi e ripetitivi, facilitando la scomposizione di sistemi ampi.

Errori Tipici da Evitare (Slide 133, 134)

## Le fonti elencano le sviste più frequenti divise tra diagrammi e descrizioni:

## Nel Diagramma degli Use Case:

Nomi ripetuti: Inserire lo stesso nome di un caso d'uso più volte nello stesso diagramma.

Frecce errate: Usare linee continue tra i casi d'uso invece di quelle tratteggiate previste per <<include>> ed <<extend>>.

Direzione delle frecce: Ricordare che l'include punta verso il caso incluso (la procedura richiamata), mentre l'extend punta verso il caso base (quello che viene arricchito).

Confini del sistema: Dimenticare di disegnare il rettangolo che rappresenta i confini del sistema (boundary).

## Negli Scenari (Descrizioni):

Mancanza di precondizioni: Omettere lo stato necessario del sistema affinché il caso d'uso possa iniziare.

Inconsistenza: Creare una descrizione testuale che non corrisponde a quanto rappresentato graficamente nel diagramma.

Mancanza di ancoraggio: Nei flussi alternativi (eccezionali), non indicare con precisione il numero del passo del flusso principale in cui avviene la deviazione