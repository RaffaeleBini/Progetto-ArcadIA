# Requisiti di sicurezza — ArcadIA

Documento di lavoro, pensato per essere integrato nello sviluppo prima di introdurre pagamenti reali. Non sostituisce il [capitolato tecnico](capitolato-tecnico.md): lo estende con un audit di sicurezza mirato.

**Base dell'audit:** lettura diretta del codice sorgente (`backend/src`) allo stato del commit `ba8b013` (26 settembre 2026) — non una checklist generica, ma osservazioni verificate riga per riga sul codice esistente.

## Come leggere questo documento

Ogni requisito ha una priorità:

- 🔴 **Bloccante** — da risolvere prima di collegare un fornitore di pagamento reale (Stripe/Paddle). Con soldi veri in ballo, questi punti diventano responsabilità legale, non solo tecnica.
- 🟡 **Da fare a breve** — non impedisce il lancio, ma va programmato nelle settimane successive.
- 🟢 **Facoltativo** — utile, non urgente.

Per ogni punto: stato attuale (con riferimento al file), rischio concreto, cosa fare, sforzo stimato.

---

## 1. Requisiti bloccanti

### 1.1 🔴 Header di sicurezza HTTP mancanti

**Stato attuale:** `backend/src/app.ts` non monta nessun middleware di sicurezza sugli header di risposta. Il pacchetto `helmet` non è tra le dipendenze (`backend/package.json`).

**Rischio:** senza questi header il browser dello studente non riceve indicazioni per bloccare comportamenti pericolosi: mancano protezioni contro il *clickjacking* (un sito malevolo potrebbe incorporare ArcadIA in un iframe invisibile e indurre un clic), manca `X-Content-Type-Options` (un browser potrebbe interpretare erroneamente un file caricato come script eseguibile), manca una Content-Security-Policy di base.

**Cosa fare:**
```bash
npm install helmet
```
```ts
// app.ts, prima delle route
import helmet from "helmet";
app.use(helmet());
```
Da configurare con attenzione la policy CSP se in futuro si incorporano script di terze parti (es. per Stripe/Paddle: entrambi richiedono domini specifici in whitelist per il loro widget di checkout).

**Sforzo:** basso (poche righe, da testare che non rompa embed video YouTube/Vimeo nella pagina lezione).

---

### 1.2 🔴 Rate limiting solo su login/registrazione

**Stato attuale:** `authRateLimiter` (`middleware/rateLimit.ts`) è applicato solo in `routes/auth.routes.ts`. Tutte le altre rotte (creazione post in bacheca, commenti, upload avatar/copertina, verifica certificato) non hanno alcun limite di frequenza.

**Rischio:** un utente autenticato (o uno script che automatizza la registrazione) può oggi generare un volume illimitato di post/commenti/upload in poco tempo — spam, esaurimento di spazio Cloudinary, carico anomalo sul database. Con contenuti a pagamento in gioco, anche l'endpoint di verifica certificato pubblico (`/api/verify/:certificateId`) merita un limite, per scoraggiare tentativi automatizzati di indovinare codici validi.

**Cosa fare:** aggiungere un rate limiter generico più permissivo (es. 100 richieste/15 minuti per IP) su tutta l'app in `app.ts`, e uno più stretto specificamente su upload (`middleware/upload.ts`) e su `/api/verify`.

**Sforzo:** basso (`express-rate-limit` è già una dipendenza, si tratta di istanziarlo di nuovo con parametri diversi e montarlo).

---

### 1.3 🔴 Audit delle dipendenze non ancora eseguito

**Stato attuale:** non verificabile da questo ambiente (nessun accesso di rete al database di vulnerabilità). Da eseguire manualmente.

**Rischio:** dipendenze con vulnerabilità note (specialmente su pacchetti che gestiscono autenticazione, upload o parsing di input esterno) sono un vettore di attacco comune e a basso sforzo per un attaccante.

**Cosa fare:**
```bash
cd backend && npm audit
cd ../frontend && npm audit
```
Correggere quanto segnalato come `high`/`critical`; valutare caso per caso i `moderate`. Ripetere periodicamente (es. mensilmente, o con un'azione automatica GitHub Dependabot, gratuita per repository pubblici e privati).

**Sforzo:** variabile, dipende da cosa emerge. Da fare comunque prima di collegare un fornitore di pagamento.

---

## 2. Da fare a breve

### 2.1 🟡 Nessuna revoca reale dei token di sessione

**Stato attuale:** `utils/jwt.ts` firma un JWT valido 7 giorni. Il logout (`controllers/auth.controller.ts`, funzione `logout`) si limita a cancellare il cookie lato client (`res.clearCookie`): il token in sé resta valido fino a scadenza naturale. Se un token venisse copiato (es. da un dispositivo condiviso, o da un cookie intercettato), resterebbe utilizzabile fino a 7 giorni anche dopo un logout esplicito.

**Rischio:** basso in pratica oggi (il cookie è `httpOnly`, quindi non leggibile da script), ma diventa rilevante se in futuro si aggiunge un endpoint di cambio password (vedi 2.2): senza un meccanismo di revoca, cambiare la password non invaliderebbe le sessioni già aperte altrove.

**Cosa fare:** la soluzione più semplice, senza introdurre uno store di sessioni separato (Redis), è aggiungere un campo `tokenVersion` (numero) sul modello `User`, includerlo nel payload del JWT alla firma, e verificarlo a ogni richiesta in `requireAuth` confrontandolo con il valore attuale salvato sull'utente. Incrementare `tokenVersion` invalida istantaneamente tutti i token precedenti di quell'utente (utile su logout esplicito "da tutti i dispositivi", cambio password, o sospetta compromissione).

**Sforzo:** medio (tocca `models/User.ts`, `utils/jwt.ts`, `middleware/auth.ts`).

---

### 2.2 🟡 Manca un endpoint di cambio password

**Stato attuale:** verificato in `controllers/users.controller.ts` e `routes/users.routes.ts`: non esiste alcuna rotta per cambiare la password di un account già registrato.

**Rischio:** non è di per sé una falla, ma è un requisito minimo di igiene di sicurezza che oggi manca del tutto: un utente che sospetta un accesso non autorizzato al proprio account non ha modo di reagire.

**Cosa fare:** aggiungere `PUT /api/users/me/password`, protetto da `requireAuth`, che richiede la password attuale (verificata con `bcrypt.compare`) prima di impostarne una nuova, e che incrementa `tokenVersion` (punto 2.1) per invalidare le altre sessioni.

**Sforzo:** basso-medio.

---

### 2.3 🟡 Costo di bcrypt a 10 invece di 12

**Stato attuale:** `bcrypt.hash(password, 10)` in `controllers/auth.controller.ts`.

**Rischio:** basso nell'immediato (10 è ancora un valore accettato), ma è sceso sotto lo standard raccomandato attuale (12) per resistere ad hardware di attacco sempre più veloce, nell'ipotesi di un furto del database.

**Cosa fare:** alzare a 12. Attenzione: non invalida gli hash già salvati (bcrypt gestisce costi diversi nello stesso database senza conflitti), quindi è un cambiamento sicuro da fare in qualsiasi momento, anche senza migrazione dei dati esistenti.

**Sforzo:** trascurabile (una cifra).

---

### 2.4 🟡 Nessuna autenticazione a due fattori per l'amministratore

**Stato attuale:** l'account con `role: "admin"` (unico ruolo con pieno controllo su corsi, lezioni e assegnazione abbonamenti — `controllers/admin.controller.ts`) si protegge solo con email+password, come un account normale.

**Rischio:** è l'account più critico del sistema: chi lo compromette può modificare qualunque corso o assegnarsi un abbonamento premium gratuito. Con un solo amministratore (presumibilmente l'unico account con questo ruolo), aggiungere un secondo fattore è un investimento contenuto per una protezione importante.

**Cosa fare:** TOTP (Google Authenticator/Authy) con una libreria come `otplib`, richiesto solo per gli account con `role: "admin"` al login.

**Sforzo:** medio.

---

### 2.5 🟢 Nessun log/allarme sui tentativi di accesso sospetti

**Stato attuale:** i tentativi di login falliti non vengono registrati oltre al rate limiting generico (che blocca per IP, non traccia per account).

**Rischio:** basso con i volumi attuali; diventa rilevante quando ci sono account con abbonamenti a pagamento da proteggere.

**Cosa fare:** registrare (anche solo su file di log, non serve infrastruttura dedicata subito) i login falliti con email e IP; valutare un avviso email all'utente dopo N tentativi falliti consecutivi sul suo account.

**Sforzo:** basso, rimandabile.

---

## 3. Buone pratiche già presenti (non regredire)

Verificate nel codice, da mantenere come sono:

- Password con hash `bcrypt`, mai in chiaro né nei log né nelle risposte API (`utils/publicUser.ts` esclude esplicitamente `passwordHash` dagli oggetti restituiti al client).
- Cookie di sessione `httpOnly`, `secure` in produzione, `sameSite` coerente con l'ambiente.
- Validazione di **ogni** input in ingresso con Zod prima di toccare il database (`middleware/validate.ts` e gli schemi in ciascun controller).
- Controllo di autorizzazione admin lato server su ogni mutazione sensibile (`requireAdmin`), non delegato all'interfaccia.
- Controllo di accesso ai contenuti premium enforced lato server (`utils/access.ts` + `lessons.controller.ts`), non solo un'icona nascosta nel frontend.
- CORS ristretto a un'origine esplicita (`FRONTEND_URL`), non aperto a `*`.
- Upload immagini limitato per tipo MIME e dimensione (`middleware/upload.ts`).
- Variabili segrete fuori dal repository (`.env` in `.gitignore`, solo `.env.example` tracciato), chiavi diverse tra sviluppo e produzione.
- Gestore di errori generico in produzione: non espone stack trace né dettagli interni al client (`app.ts`).
- Endpoint pubblico di verifica certificato (`/api/verify/:certificateId`) che restituisce solo i campi necessari (nome, corso, data), non l'email né altri dati personali dell'utente.

---

## 4. Checklist prima del lancio commerciale

- [ ] `helmet` montato in `app.ts` (1.1)
- [ ] Rate limiting esteso oltre l'autenticazione (1.2)
- [ ] `npm audit` eseguito ed eventuali `high`/`critical` risolti, su backend e frontend (1.3)
- [ ] Meccanismo di revoca token (`tokenVersion` o equivalente) (2.1)
- [ ] Endpoint di cambio password (2.2)
- [ ] Costo bcrypt portato a 12 (2.3)
- [ ] 2FA sull'account amministratore (2.4)
- [ ] Policy di aggiornamento periodico delle dipendenze definita (es. Dependabot attivo)
