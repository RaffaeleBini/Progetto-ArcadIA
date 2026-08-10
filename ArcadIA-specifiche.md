# ArcadIA — Specifiche di Progetto

> Piattaforma di formazione online sull'Intelligenza Artificiale.
> Documento di specifiche per sviluppo guidato (Spec-Driven Development) con Claude Code.

---

## 1. Panoramica del progetto

ArcadIA è una web app multi-page che permette agli utenti di:
- registrarsi, accedere e disconnettersi in modo sicuro;
- consultare corsi/lezioni sull'IA (contenuti base gestiti da un admin);
- gestire il proprio profilo personale;
- interagire su una bacheca pubblica con post e commenti;
- ricevere notifiche in-app relative alle proprie attività;
- usare l'app in Italiano o Spagnolo;
- scegliere tra tema chiaro e scuro.

Progetto personale, MVP (Minimum Viable Product) da pubblicare online gratuitamente.

---

## 2. Stack tecnico

| Livello | Tecnologia | Note |
|---|---|---|
| Frontend | React + TypeScript | Multi-page (React Router) |
| Backend | Node.js + Express | API RESTful |
| Database | MongoDB Atlas | Free tier (M0), NoSQL |
| Storage file/immagini | Cloudinary | Free tier, solo per avatar e copertine corsi (immagini) |
| Storage materiale didattico | GitHub (repository pubblico) | Notebook `.ipynb`, aperti tramite link "Apri in Colab" |
| Generazione certificati PDF | `pdfkit` (libreria Node.js) | Genera il PDF del certificato al volo, nessun servizio esterno |
| Autenticazione | JWT (JSON Web Token) | Salvato in cookie httpOnly |
| i18n | react-i18next | Italiano (default) e Spagnolo |
| Hosting frontend | Vercel | Account già disponibile |
| Hosting backend | Render | Free tier |
| Versionamento | GitHub | Repository pubblico o privato |

**Perché queste scelte:**
- *MongoDB Atlas*: gratuito, schema flessibile, perfetto per dati eterogenei come post, commenti e notifiche.
- *Cloudinary*: gratuito fino a una soglia generosa, ottimizza automaticamente le immagini, integrazione semplice via SDK. Usato solo per avatar e copertine corsi.
- *GitHub per i notebook*: i file `.ipynb` vengono versionati in un repository pubblico. Colab ha un'integrazione nativa che apre direttamente un notebook da GitHub (`https://colab.research.google.com/github/...`), quindi non serve nessuna API di upload: l'admin carica il notebook nel repo e incolla il link nella lezione. In più, quando uno studente apre ed esegue il notebook, lo fa sul proprio account Google Colab, senza costi di calcolo per te.
- *Render* per il backend: Express ha bisogno di un server "always-on" con stato (sessioni, cookie); Vercel è ottimizzato per funzioni serverless stateless, quindi è più adatto solo al frontend React.
- *JWT + cookie httpOnly*: il token non è accessibile via JavaScript lato client, riducendo il rischio di attacchi XSS.

---

## 3. Architettura generale

```
[React + TS] --(Axios, HTTPS)--> [Express API su Render] --> [MongoDB Atlas]
                                        |
                                        --> [Cloudinary] (upload immagini: avatar, copertine)

[Notebook .ipynb] --(caricati manualmente)--> [Repository GitHub pubblico] --(link)--> [Google Colab] (esecuzione lato studente)
```

- Comunicazione frontend-backend tramite API RESTful in JSON.
- Autenticazione basata su JWT salvato in cookie httpOnly (durata: 7 giorni).
- CORS configurato per accettare richieste solo dal dominio Vercel del frontend.

---

## 4. Modelli dati (MongoDB)

### User
```
{
  _id, 
  name: string,
  email: string (unique),
  passwordHash: string,
  role: "user" | "admin" (default: "user"),
  avatarUrl: string (opzionale, Cloudinary),
  bio: string (opzionale),
  preferredLanguage: "it" | "es" (default: "it"),
  theme: "light" | "dark" (default: "light"),
  subscriptionPlan: "free" | "premium" (default: "free"),
  subscriptionExpiresAt: date | null (default: null),
  createdAt: date
}
```
Nota: `subscriptionPlan` e `subscriptionExpiresAt` sono predisposti fin da ora ma **non collegati a nessun pagamento reale** nell'MVP. Servono a preparare il terreno per un futuro sistema di abbonamento (vedi sezione 13).

### Course
```
{
  _id,
  title: string,               (es. "IA per principianti")
  description: string,
  coverImageUrl: string (opzionale, Cloudinary),
  accessLevel: "free" | "premium" (default: "free"),
  createdBy: ObjectId (ref User, role admin),
  createdAt: date
}
```

### Lesson (materiale formativo di un corso)
```
{
  _id,
  course: ObjectId (ref Course),
  title: string,                (es. "Lezione 1: Cos'è il Machine Learning")
  order: number,                (posizione nella sequenza del corso)
  videoUrl: string (opzionale, link YouTube/Vimeo non in elenco/privato),
  description: string (opzionale, testo introduttivo alla lezione),
  notebookGithubUrl: string (opzionale, link al notebook su GitHub, es. "https://github.com/tuo-utente/repo/blob/main/lezione1.ipynb"),
  createdAt: date
}
```
Note:
- I video **non** vengono caricati su Cloudinary ma collegati tramite URL (YouTube/Vimeo, impostati come "non in elenco"/privati) ed embeddati nella pagina della lezione.
- I notebook `.ipynb` **non** passano dal backend: l'admin li carica manualmente nel repository GitHub del materiale didattico, poi incolla il link GitHub nel campo `notebookGithubUrl` quando crea/modifica la lezione.
- Il frontend genera automaticamente il pulsante "Apri in Colab" trasformando il link salvato: sostituisce `https://github.com/` con `https://colab.research.google.com/github/`.

### Post (bacheca)
```
{
  _id,
  author: ObjectId (ref User),
  text: string,
  createdAt: date
}
```

### Comment
```
{
  _id,
  post: ObjectId (ref Post),
  author: ObjectId (ref User),
  text: string,
  createdAt: date
}
```
(Commenti su un solo livello, nessuna risposta annidata)

### Notification
```
{
  _id,
  recipient: ObjectId (ref User),
  type: "new_comment" | "welcome" | "course_added" | "course_completed",
  message: string,
  read: boolean (default: false),
  relatedId: ObjectId (opzionale, es. id del post),
  createdAt: date
}
```

### Progress (avanzamento e certificati)
```
{
  _id,
  user: ObjectId (ref User),
  course: ObjectId (ref Course),
  completedLessons: [ObjectId] (ref Lesson),
  isCompleted: boolean (default: false),        (true quando tutte le lezioni sono completate)
  completedAt: date (opzionale, valorizzato al completamento),
  certificateId: string (UUID, generato al completamento, usato per la verifica pubblica),
  createdAt: date
}
```
Un documento per ogni coppia utente-corso. Creato automaticamente al primo accesso dell'utente a una lezione del corso.

---

Prefisso comune: `/api`

### Autenticazione (`/api/auth`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| POST | `/auth/register` | Crea nuovo utente | No |
| POST | `/auth/login` | Login, imposta cookie JWT | No |
| POST | `/auth/logout` | Cancella cookie JWT | Sì |
| GET | `/auth/me` | Restituisce dati utente loggato | Sì |

### Utenti / Profilo (`/api/users`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| GET | `/users/:id` | Dati pubblici profilo | Sì |
| PUT | `/users/me` | Aggiorna nome, bio, lingua, tema | Sì |
| POST | `/users/me/avatar` | Carica avatar (Cloudinary) | Sì |

### Corsi (`/api/courses`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| GET | `/courses` | Lista corsi (mostra tutti, anche i premium bloccati, con badge). Supporta `?search=testo` | Sì |
| GET | `/courses/:id` | Dettaglio corso. Se `accessLevel: "premium"` e l'utente non ha un abbonamento attivo, restituisce solo titolo/descrizione/copertina (anteprima), senza elenco lezioni | Sì |
| POST | `/courses` | Crea corso (incl. `accessLevel`) | Sì (solo admin) |
| PUT | `/courses/:id` | Modifica corso | Sì (solo admin) |
| DELETE | `/courses/:id` | Elimina corso (e lezioni collegate) | Sì (solo admin) |

### Lezioni / materiale formativo (`/api/courses/:courseId/lessons`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| GET | `/courses/:courseId/lessons` | Lista lezioni del corso (ordinate). Se il corso è premium e l'utente non ha accesso → `403` con `error: "subscription_required"` | Sì |
| GET | `/courses/:courseId/lessons/:id` | Dettaglio lezione (video + link notebook). Stesso controllo accessi | Sì |
| POST | `/courses/:courseId/lessons` | Crea lezione (titolo, video, link GitHub notebook, ordine) | Sì (solo admin) |
| PUT | `/courses/:courseId/lessons/:id` | Modifica lezione | Sì (solo admin) |
| DELETE | `/courses/:courseId/lessons/:id` | Elimina lezione | Sì (solo admin) |

### Gestione manuale abbonamenti (`/api/admin/users`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| PUT | `/admin/users/:id/subscription` | Imposta manualmente `subscriptionPlan` e `subscriptionExpiresAt` di un utente | Sì (solo admin) |

Questo endpoint serve per l'MVP: senza un vero sistema di pagamento, sei tu (admin) a poter "regalare" manualmente l'accesso premium a chi vuoi (es. per test o beta tester), semplicemente aggiornando il piano dell'utente dal pannello admin.

### Avanzamento e certificati (`/api/courses/:courseId/progress`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| GET | `/courses/:courseId/progress` | Avanzamento dell'utente loggato nel corso (lezioni completate, %) | Sì |
| PUT | `/courses/:courseId/lessons/:lessonId/complete` | Segna una lezione come completata per l'utente loggato | Sì |
| PUT | `/courses/:courseId/lessons/:lessonId/uncomplete` | Rimuove il completamento (opzionale, per correggere errori) | Sì |
| GET | `/courses/:courseId/certificate` | Scarica il certificato PDF (solo se corso completato al 100%) | Sì |
| GET | `/verify/:certificateId` | Verifica pubblica di un certificato (nome utente, corso, data) | No |

### Bacheca (`/api/posts`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| GET | `/posts` | Lista post (più recenti prima) | Sì |
| POST | `/posts` | Crea post | Sì |
| DELETE | `/posts/:id` | Elimina post (solo autore o admin) | Sì |
| GET | `/posts/:id/comments` | Lista commenti di un post | Sì |
| POST | `/posts/:id/comments` | Aggiungi commento | Sì |
| DELETE | `/comments/:id` | Elimina commento (solo autore o admin) | Sì |

### Notifiche (`/api/notifications`)
| Metodo | Endpoint | Descrizione | Autenticazione |
|---|---|---|---|
| GET | `/notifications` | Lista notifiche utente loggato | Sì |
| PUT | `/notifications/:id/read` | Segna come letta | Sì |
| PUT | `/notifications/read-all` | Segna tutte come lette | Sì |

**Nota su "Sì" per autenticazione:** il middleware verifica il JWT nel cookie; se assente o non valido, risponde `401 Unauthorized`. Gli endpoint admin-only rispondono `403 Forbidden` se l'utente non ha `role: "admin"`.

**Formato errori standard:**
```json
{ "error": true, "message": "Descrizione leggibile dell'errore" }
```

---

## 6. Pagine frontend (routing)

| Percorso | Pagina | Accesso |
|---|---|---|
| `/` | Home / benvenuto | Pubblico |
| `/register` | Registrazione | Pubblico |
| `/login` | Login | Pubblico |
| `/dashboard` | Dashboard utente (benvenuto + link rapidi) | Privato |
| `/profile` | Profilo utente (modifica dati, avatar) | Privato |
| `/courses` | Lista corsi (griglia con copertine, barra di ricerca, indicatore % completamento, badge "Premium" con lucchetto sui corsi bloccati) | Privato |
| `/courses/:id` | Dettaglio corso: descrizione + elenco lezioni + barra di avanzamento + bottone certificato (se completato al 100%). Se premium e non abbonato: solo anteprima + CTA verso `/pricing` | Privato |
| `/courses/new` | Crea/modifica corso (incl. selezione `accessLevel`) | Privato (admin) |
| `/courses/:id/lessons/:lessonId` | Pagina lezione: video embed + descrizione + pulsante "Apri in Colab" + checkbox/bottone "Segna come completata" | Privato |
| `/courses/:id/lessons/new` | Crea/modifica lezione (video URL, link GitHub notebook) | Privato (admin) |
| `/pricing` | Pagina informativa sui piani (free/premium). Per l'MVP è solo descrittiva, senza pagamento reale | Pubblico |
| `/verify/:certificateId` | Pagina pubblica di verifica certificato (nome, corso, data) | Pubblico |
| `/board` | Bacheca (post + commenti) | Privato |
| `/notifications` | Lista notifiche | Privato |

**Componenti condivisi:**
- Header con: logo, menu navigazione, selettore lingua (IT/ES), toggle tema chiaro/scuro, icona notifiche (con badge non lette), pulsante logout (se loggato).
- Route protette: redirect automatico a `/login` se non autenticato.

---

## 7. Requisiti funzionali dettagliati

### 7.1 Autenticazione
- Registrazione: nome, email, password (validazione: email valida, password minimo 8 caratteri).
- Password salvata con hash (bcrypt).
- Login: email + password → cookie JWT httpOnly.
- Logout: cancella il cookie.
- Messaggi di errore chiari (es. "Email già registrata", "Credenziali non valide").
- Dopo la registrazione, viene creata automaticamente una notifica di benvenuto.

### 7.2 Profilo utente
- L'utente può modificare: nome, bio, lingua preferita, tema, avatar.
- L'avatar viene caricato su Cloudinary e l'URL salvato nel DB.

### 7.3 Corsi e materiale formativo
- Ogni corso (es. "IA per principianti", "Machine Learning con Python") ha un titolo, una descrizione e una copertina.
- Ogni corso contiene una sequenza ordinata di **lezioni**.
- Ogni lezione può avere:
  - un video (link YouTube/Vimeo privato/non in elenco, mostrato tramite embed nella pagina);
  - una breve descrizione testuale;
  - un notebook Jupyter (`.ipynb`) collegato tramite un pulsante **"Apri in Colab"**.
- Il materiale didattico in formato notebook non passa dal backend/database: l'admin carica il file `.ipynb` in un repository GitHub pubblico dedicato al progetto, poi incolla il link GitHub del file nel campo corrispondente della lezione. Il frontend genera automaticamente il link "Apri in Colab" a partire da quello GitHub.
- Nota di sicurezza: essendo il repository pubblico, chiunque abbia il link diretto al notebook può aprirlo, anche senza essere registrato su ArcadIA — coerente con l'approccio già scelto per i video "non in elenco". Se in futuro servirà un accesso realmente riservato, si potrà valutare un repository privato (con complessità aggiuntiva per l'autenticazione GitHub degli studenti).
- Solo l'admin può creare/modificare/eliminare corsi e lezioni.
- Tutti gli utenti autenticati possono visualizzare corsi, lezioni, guardare i video e aprire i notebook in Colab — **tranne i corsi contrassegnati come `premium`**, visibili solo come anteprima a chi non ha un abbonamento attivo (vedi 7.3bis).
- Nella pagina del corso, le lezioni sono elencate in ordine (campo `order`) e mostrano un'icona diversa se contengono video e/o notebook.
- Nella lista corsi è presente una barra di ricerca che filtra per titolo/descrizione (query in tempo reale o al submit, a scelta in fase di implementazione).
- Quando un admin pubblica un nuovo corso, tutti gli utenti ricevono una notifica "course_added" (per l'MVP: opzionale, valutare se implementarlo subito o in una fase successiva).

### 7.3bis Predisposizione contenuti free/premium
Per l'MVP **non viene implementato nessun pagamento reale**: tutti i contenuti restano gratuiti nella pratica. Tuttavia l'architettura è già pronta per attivare un modello freemium in futuro, con il minimo sforzo:

- Ogni corso ha un campo `accessLevel` (`free` o `premium`), impostabile dall'admin in fase di creazione/modifica.
- Ogni utente ha un campo `subscriptionPlan` (`free` o `premium`) e una data di scadenza opzionale `subscriptionExpiresAt`.
- Esiste **un'unica funzione di controllo accessi** (es. `hasAccessToCourse(user, course)`) usata da tutti gli endpoint relativi a lezioni: se il corso è `free`, l'accesso è sempre permesso; se è `premium`, viene concesso solo se l'utente ha `subscriptionPlan: "premium"` e (se presente) `subscriptionExpiresAt` non ancora scaduta.
- Nella lista corsi, i corsi premium sono comunque visibili a tutti (con un badge/icona lucchetto dorato, coerente con lo stile grafico), per mostrare cosa offre la piattaforma e invogliare all'upgrade.
- Se un utente senza abbonamento prova ad aprire un corso premium, vede un'**anteprima** (titolo, descrizione, copertina) invece dell'elenco delle lezioni, con un messaggio del tipo "Contenuto riservato agli abbonati" e un bottone (per ora senza funzione reale, o collegato a una semplice pagina `/pricing` informativa).
- In assenza di un vero sistema di pagamento, l'admin può assegnare manualmente l'abbonamento premium a un utente tramite l'endpoint dedicato (sezione 5), utile per test o per dare accesso gratuito a persone specifiche.

Grazie a questa struttura, quando in futuro deciderai di integrare un vero sistema di pagamento (es. Stripe), **non sarà necessario modificare la logica di controllo accessi**: basterà collegare un webhook di pagamento che aggiorna automaticamente `subscriptionPlan` e `subscriptionExpiresAt` dell'utente, al posto dell'aggiornamento manuale da parte dell'admin. Vedi sezione 13 per i dettagli.

### 7.4 Avanzamento e completamento lezioni
- Ogni utente può segnare una lezione come "completata" (checkbox/bottone nella pagina lezione).
- Il sistema calcola automaticamente la percentuale di avanzamento nel corso (lezioni completate / totale lezioni).
- La barra di avanzamento è visibile sia nella pagina del corso sia nella lista corsi.
- Quando l'utente completa l'ultima lezione mancante, il corso viene marcato come `isCompleted: true` e viene generato un `certificateId` univoco.
- Alla conferma di completamento corso, l'utente riceve una notifica "course_completed".

### 7.5 Certificato di completamento
- Al completamento del 100% delle lezioni di un corso, l'utente può scaricare un certificato in PDF (generato al volo con `pdfkit`, non salvato permanentemente su storage esterno per semplicità/MVP).
- Il certificato contiene: nome utente, titolo del corso, data di completamento, un codice univoco di verifica (`certificateId`).
- Esiste una pagina pubblica `/verify/:certificateId` (senza login) dove chiunque può inserire/aprire il link e verificare che il certificato sia autentico, vedendo nome, corso e data — utile per condividere il certificato con terzi (es. su LinkedIn) mantenendo credibilità.

### 7.6 Bacheca
- Ogni utente autenticato può pubblicare un post di testo.
- Ogni utente può commentare un post (un solo livello, no risposte annidate).
- Solo l'autore di un post/commento (o un admin) può eliminarlo.
- Quando qualcuno commenta un post, l'autore del post riceve una notifica "new_comment" (se non è lui stesso a commentare).

### 7.7 Notifiche
- Sistema semplice basato su polling: il frontend controlla nuove notifiche ogni 30 secondi (o al focus della finestra).
- Badge con conteggio non lette nell'header.
- Pagina dedicata per vedere/segnare come lette tutte le notifiche.
- Tipi di notifica previsti: `welcome`, `new_comment`, `course_added` (opzionale), `course_completed`.

### 7.8 Internazionalizzazione (i18n)
- Tutti i testi statici dell'interfaccia tradotti in Italiano e Spagnolo tramite `react-i18next`.
- Selettore lingua sempre visibile nell'header.
- La lingua scelta viene salvata nel profilo utente (se loggato) e riproposta ai login successivi.

### 7.9 Tema chiaro/scuro
- Toggle visibile nell'header.
- Preferenza salvata nel profilo utente (se loggato) o in memoria per sessione (se ospite).

### 7.10 Identità visiva: stile sci-fi "plancia di comando"
L'interfaccia deve richiamare lo schermo di comando di un'astronave: pannelli netti, linee sottili luminose, sensazione "tecnologica" e ordinata, non caotica.

**Palette colori:**
| Ruolo | Colore | Uso |
|---|---|---|
| Sfondo primario (tema scuro, default) | Nero / grigio quasi nero (`#0a0a0a` – `#121212`) | Sfondo pagina |
| Superficie/pannelli | Nero leggermente più chiaro (`#1a1a1a`) | Card, header, sidebar |
| Accento principale | Giallo dorato (`#d4af37` – `#f2c94c`) | Bottoni primari, bordi attivi, icone, badge notifiche, link, focus states |
| Testo primario | Bianco (`#f5f5f5`) | Testo su sfondo scuro |
| Testo secondario | Grigio chiaro (`#a0a0a0`) | Sottotitoli, testo meno importante |
| Bordi/divisori | Giallo dorato a bassa opacità o grigio scuro | Separatori tra sezioni, come "linee di un HUD" |

Nel **tema chiaro**, invertire la logica: sfondo bianco/grigio chiarissimo, testo quasi nero, accenti sempre in giallo dorato (leggermente più scuro/saturo per garantire contrasto sufficiente).

**Elementi stilistici consigliati:**
- Font: uno sans-serif tecnico/geometrico per i titoli (es. Orbitron, Rajdhani, Exo 2 — font "futuristici" gratuiti su Google Fonts) e un sans-serif leggibile per il corpo del testo (es. Inter, Roboto).
- Bordi netti o leggermente smussati, mai troppo arrotondati (evitare uno stile "morbido"/consumer).
- Sottili linee o bordi dorati che delimitano pannelli, come i contorni di un'interfaccia di bordo.
- Effetti glow/ombra leggera in giallo dorato su elementi attivi o in hover (bottoni, card selezionate).
- Icone lineari/minimali (es. libreria `lucide-react`), coerenti con lo stile tecnico.
- Badge di notifica e indicatori di stato con accento dorato, per richiamare "segnali luminosi" di un pannello di controllo.
- Evitare gradienti eccessivi o colori pastello: la palette resta rigorosamente nero/bianco/dorato, con eventuali grigi neutri di supporto.

Questa sezione va data come riferimento di design a Claude Code insieme alla sezione 12 (fasi di sviluppo), in particolare nella fase di rifinitura UI/UX.

---

## 8. Requisiti non funzionali

- **Sicurezza:**
  - Password hashate con bcrypt.
  - JWT firmato con secret in variabile d'ambiente.
  - Validazione input lato backend su ogni endpoint (es. con `express-validator` o `zod`).
  - CORS limitato al dominio del frontend.
  - Rate limiting sugli endpoint di login/registrazione per prevenire brute-force (es. `express-rate-limit`).
- **Gestione errori:** ogni chiamata API deve restituire codici HTTP corretti (400, 401, 403, 404, 500) e messaggi comprensibili.
- **Responsive design:** l'interfaccia deve funzionare bene su desktop e mobile.
- **Accessibilità di base:** contrasto colori adeguato in entrambi i temi, label sui form.

---

## 9. Piano di test

- **Test manuali funzionali** (checklist da eseguire prima del deploy):
  1. Registrazione con dati validi → successo.
  2. Registrazione con email già esistente → errore gestito.
  3. Login con credenziali corrette → successo, redirect a dashboard.
  4. Login con credenziali errate → messaggio di errore.
  5. Logout → cookie cancellato, redirect a login.
  6. Accesso a pagina privata senza login → redirect automatico.
  7. Modifica profilo → dati aggiornati e persistenti dopo refresh.
  8. Creazione corso come admin → visibile nella lista.
  9. Tentativo di creare corso come utente normale → errore 403.
  10. Creazione post e commento → visibili subito, notifica generata correttamente.
  11. Cambio lingua → tutti i testi cambiano correttamente.
  12. Cambio tema → applicato e persistente.
  13. Ricerca corsi → risultati filtrati correttamente.
  14. Completamento di tutte le lezioni di un corso → barra al 100%, corso segnato completato, notifica ricevuta.
  15. Download certificato → PDF generato correttamente con nome utente, corso e data corretti.
  16. Apertura link `/verify/:certificateId` → mostra correttamente i dati del certificato, anche senza essere loggati.
  17. Tentativo di scaricare certificato per un corso non completato al 100% → errore gestito correttamente.
  18. Pulsante "Apri in Colab" su una lezione con notebook → apre correttamente il notebook su Google Colab in una nuova scheda.
  19. Accesso a un corso `premium` con utente `subscriptionPlan: "free"` → vede solo l'anteprima, non le lezioni.
  20. Admin assegna manualmente `subscriptionPlan: "premium"` a un utente → l'utente ottiene accesso completo al corso premium.
  21. Abbonamento con `subscriptionExpiresAt` nel passato → l'utente torna a vedere solo l'anteprima dei corsi premium.
- **Test automatici (consigliati, opzionali per l'MVP):**
  - Backend: test unitari su controller di autenticazione con Jest + Supertest.
  - Frontend: test componenti principali con React Testing Library.

---

## 10. Deployment

1. **Repository GitHub:** un unico repo con due cartelle: `/frontend` e `/backend` (monorepo semplice).
2. **Repository per i notebook:** creare un secondo repository GitHub pubblico (es. `arcadia-materiali`) dove caricare i file `.ipynb` dei corsi. I link ai singoli notebook vengono poi incollati nel pannello admin di ArcadIA.
3. **Database:** creare cluster gratuito su MongoDB Atlas, ottenere connection string.
4. **Storage immagini:** creare account Cloudinary, ottenere API key/secret.
5. **Backend su Render:**
   - Collegare il repo GitHub (cartella `/backend`).
   - Impostare variabili d'ambiente (vedi sezione 11).
   - Build command: `npm install`, Start command: `npm start`.
6. **Frontend su Vercel:**
   - Collegare il repo GitHub (cartella `/frontend`).
   - Impostare variabile d'ambiente con l'URL dell'API backend (es. `VITE_API_URL`).
7. Verificare CORS: il backend deve accettare richieste dal dominio Vercel del frontend.

---

## 11. Variabili d'ambiente

### Backend (`/backend/.env`)
```
PORT=5000
MONGODB_URI=<connection string Atlas>
JWT_SECRET=<stringa segreta lunga e casuale>
CLOUDINARY_CLOUD_NAME=<...>
CLOUDINARY_API_KEY=<...>
CLOUDINARY_API_SECRET=<...>
FRONTEND_URL=<url del frontend su Vercel>
```

### Frontend (`/frontend/.env`)
```
VITE_API_URL=<url del backend su Render>
```

---

## 12. Fasi di sviluppo consigliate (per Claude Code)

1. **Setup progetto:** struttura cartelle, configurazione TypeScript, Express base, connessione MongoDB.
2. **Autenticazione:** modelli User, endpoint register/login/logout/me, middleware JWT.
3. **Frontend autenticazione:** pagine register/login, gestione sessione, route protette.
4. **Profilo utente:** endpoint e pagina profilo, upload avatar su Cloudinary.
5. **i18n e tema:** integrazione react-i18next, toggle tema chiaro/scuro.
6. **Corsi e lezioni:** modelli Course e Lesson, endpoint CRUD (corsi + lezioni con link video e link notebook GitHub), controllo accessi free/premium (`accessLevel`, `hasAccessToCourse`), endpoint admin per gestione manuale abbonamenti, pagine lista corsi (con ricerca e badge premium)/dettaglio corso (con anteprima per contenuti bloccati)/pagina lezione con video embed e pulsante "Apri in Colab"/creazione (admin)/pagina `/pricing` informativa.
7. **Avanzamento e certificati:** modello Progress, endpoint di completamento lezioni, calcolo percentuale, generazione certificato PDF con `pdfkit`, pagina pubblica di verifica.
8. **Bacheca:** modelli Post/Comment, endpoint, pagina bacheca.
9. **Notifiche:** modello Notification, endpoint, generazione automatica su eventi (incluso `course_completed`), pagina/badge.
10. **Rifinitura UI/UX:** applicazione stile sci-fi (sezione 7.10), responsive, feedback visivi (loading, errori, successi).
11. **Test manuali** secondo checklist sezione 9.
12. **Deployment** secondo sezione 10.

---

## 13. Roadmap futura: monetizzazione con abbonamenti

Questa sezione **non fa parte dell'MVP** ma documenta come attivare in futuro un vero sistema di abbonamento, sfruttando l'architettura già predisposta (sezione 7.3bis).

**Cosa è già pronto:**
- Campo `accessLevel` sui corsi (free/premium).
- Campi `subscriptionPlan` e `subscriptionExpiresAt` sugli utenti.
- Un'unica funzione di controllo accessi usata ovunque serva, invece di controlli sparsi nel codice.

**Cosa andrebbe aggiunto quando vorrai attivare i pagamenti reali:**
1. **Provider di pagamento consigliato:** Stripe (Checkout + Billing) — gestisce automaticamente abbonamenti ricorrenti mensili/annuali, fatture, rinnovi e cancellazioni, con un piano gratuito di base (nessun costo fisso, solo una commissione sulle transazioni).
2. **Pagina `/pricing` reale:** con bottoni "Abbonati" che avviano una sessione Stripe Checkout.
3. **Webhook Stripe** (nuovo endpoint es. `POST /api/webhooks/stripe`): riceve gli eventi di pagamento (abbonamento attivato, rinnovato, cancellato) e aggiorna automaticamente `subscriptionPlan` e `subscriptionExpiresAt` dell'utente — sostituendo l'aggiornamento manuale dell'admin usato nell'MVP.
4. **Pagina "Il mio abbonamento"** nel profilo utente: stato abbonamento, data di rinnovo/scadenza, link al portale clienti Stripe per gestire/cancellare l'abbonamento autonomamente.
5. **Job pianificato (opzionale):** controllo periodico per notificare agli utenti l'imminente scadenza dell'abbonamento.

Poiché la logica di controllo accessi (`hasAccessToCourse`) resta identica, l'integrazione dei pagamenti reali richiederà di toccare solo il livello di pagamento/webhook, senza dover rivedere corsi, lezioni o permessi già costruiti nell'MVP.

---

*Documento generato per sviluppo guidato con Claude Code. Ogni fase può essere richiesta separatamente a Claude Code per mantenere il contesto gestibile.*
