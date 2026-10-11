<div align="center">

<img src="docs/assets/home-screenshot.png" alt="Home page di ArcadIA" width="720" />

# ArcadIA

Piattaforma di formazione online sull'Intelligenza Artificiale.

**[🔗 Prova la piattaforma → arcadia-jet.vercel.app](https://arcadia-jet.vercel.app)**

</div>

---

## Cos'è ArcadIA

ArcadIA è una piattaforma e-learning dove seguire corsi strutturati in lezioni — video, teoria in testo, notebook Jupyter — organizzati in **percorsi formativi**, tracciare il proprio avanzamento, ottenere un certificato di completamento e discutere con gli altri utenti in una bacheca comune. Tutti i contenuti sono disponibili in italiano e spagnolo.

## Guida rapida

### Registrazione e accesso

Vai su **Registrati** dalla home, inserisci nome, email e una password di almeno 8 caratteri. Al primo accesso riceverai una notifica di benvenuto. Da **Accedi** puoi rientrare in qualsiasi momento con le tue credenziali; la sessione resta attiva per 7 giorni.

### La home

La home accoglie i visitatori con una finestra sul ponte di comando: un campo di stelle animato che si ferma se il sistema chiede di ridurre le animazioni.

### Percorsi formativi

Dal menu **Percorsi** trovi sequenze di corsi pensate per un obiettivo preciso (ad esempio entrare nel mondo dei dati e del machine learning). Ogni percorso indica a chi è rivolto, le ore e le settimane stimate, e l'elenco ordinato dei corsi, con quelli facoltativi segnalati e, dove serve, solo alcune lezioni di un corso. Nella pagina del percorso vedi l'avanzamento complessivo. Gli amministratori creano e modificano i percorsi dall'interfaccia, e nuovi percorsi restano in bozza finché non vengono pubblicati.

### Esplorare i corsi

Dal menu **Corsi** trovi l'elenco di tutti i corsi disponibili, con una barra di ricerca per filtrarli per titolo o descrizione. I corsi con il badge **Premium** richiedono un abbonamento attivo: senza abbonamento se ne vede solo un'anteprima (titolo, descrizione e copertina).

### Seguire una lezione e tracciare l'avanzamento

Ogni corso è composto da lezioni in ordine. Una lezione ha fino a tre materiali: la **teoria** in testo, il **notebook della lezione** e il **notebook di esercizi**, entrambi apribili con il pulsante **Apri in Colab**, oltre al video quando è presente. I contenuti hanno una versione italiana e una spagnola, e seguono la lingua scelta nell'interfaccia. Segnando le lezioni come completate, la barra di avanzamento del corso si aggiorna automaticamente.

### Certificato di completamento

Al 100% di avanzamento di un corso, compare il pulsante per scaricare il **certificato** in PDF, con il tuo nome, il titolo del corso e la data. Ogni certificato ha un codice di verifica univoco, controllabile pubblicamente anche da chi non ha un account ArcadIA, all'indirizzo `/verify/<codice>`.

### Bacheca e notifiche

Nella sezione **Bacheca** puoi pubblicare messaggi e commentare quelli degli altri utenti. Quando ricevi un commento a un tuo post, o quando viene pubblicato un nuovo corso, ricevi una notifica: il contatore accanto alla campanella nell'header ti avvisa di quelle non ancora lette.

### Lingua e tema

In alto a destra puoi cambiare lingua (italiano/spagnolo) e passare dal tema scuro a quello chiaro in qualsiasi momento. Se sei registrato, la scelta viene salvata sul tuo profilo; da visitatore resta comunque memorizzata nel browser.

### Il tuo profilo

Da **Profilo** puoi modificare nome, bio, avatar, lingua preferita e tema in un unico posto, e cambiare la password. Cambiando la password le altre sessioni aperte vengono chiuse.

### Cookie e statistiche

Al primo accesso compare un banner per il consenso ai cookie. Google Analytics viene caricato solo se accetti i cookie analitici, e puoi cambiare idea in qualsiasi momento da **Gestisci i cookie** in fondo alla pagina.

### Contenuti premium

I corsi premium restano oggi ad attivazione manuale: l'assegnazione di un abbonamento è gestita da un amministratore. Se vuoi accedere a un corso premium, contatta chi amministra la tua istanza di ArcadIA. L'accesso con pagamento non è ancora attivo.

---

## Documentazione tecnica

Per approfondire architettura, stack tecnico, modello dati, sicurezza e deployment, consulta la [relazione tecnica di progetto](docs/capitolato-tecnico.md). Per i percorsi formativi e il modello dati dei contenuti c'è lo [schema dei percorsi](docs/schema-percorsi-formativi.md). Prima di collegare un fornitore di pagamento reale, consulta anche i [requisiti di sicurezza](docs/requisiti-sicurezza.md) emersi dall'audit del codice: gli interventi indicati come bloccanti sono già stati realizzati.

Gli aggiornamenti delle dipendenze sono gestiti da Dependabot, con una pull request settimanale per `backend/` e `frontend/`.

---

## Author

- [@RaffaeleBini](https://www.github.com/RaffaeleBini)

## 🔗 Links

[![portfolio](https://img.shields.io/badge/my_homepage-000?style=for-the-badge&logo=ko-fi&logoColor=yellow)](https://www.raffaelebini.com/)
[![linkedin](https://img.shields.io/badge/linkedin-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/raffaelebini/)

## Feedback

If you have any feedback, please reach out to me
