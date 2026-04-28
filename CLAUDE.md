@AGENTS.md
# StudyMatch — Project Spec for Claude Code

## Cos'è questa app
StudyMatch è una web-app stile Tinder per studenti universitari che vogliono trovarsi a vicenda per studiare insieme o darsi una mano sui corsi. È sviluppata per un hackathon in collaborazione con la piattaforma **UniversityBox**.

---

## Stack tecnico
- **Framework**: React + Vite
- **Styling**: CSS Modules oppure Tailwind CSS
- **Backend**: nessuno — tutto su `localStorage`
- **Routing**: React Router v6
- **Lingua dell'interfaccia**: Italiano

---

## Struttura delle schermate

### 1. Schermata di registrazione (`/`)
Campi da compilare:
- Nome
- Cognome
- Username
- Università

Bottone: **"Entra"** → salva i dati in localStorage e porta alla schermata 2 (se è la prima volta) oppure direttamente alla schermata di swipe (se il profilo è già completo).

---

### 2. Setup profilo (`/setup`)
Mostrata solo se l'utente non ha ancora completato il profilo. Campi:
- Facoltà
- In cosa ti serve aiuto? (es. "Analisi Matematica 2", "Diritto Privato")
- In cosa puoi dare aiuto? (es. "Programmazione Python", "Storia dell'Arte")
- Biografia (testo libero, max 300 caratteri)

Bottone: **"Inizia la ricerca"** → salva e porta allo swipe.

---

### 3. Swipe (`/swipe`)
Funzionamento stile Tinder:
- Mostra un profilo alla volta con: nome, università, facoltà, "cerca aiuto in", "può aiutare in", biografia
- **Swipe sinistra** (o bottone ✕) = skip → l'utente skippato non potrà mai più matchare con te
- **Swipe destra** (o bottone ♥) = richiesta di match inviata → l'altro utente riceve una notifica

Il sistema mostra solo utenti il cui campo "può aiutare in" corrisponde al tuo "cerco aiuto in" (e viceversa).

Usa animazioni CSS per lo swipe (card che si inclina e vola fuori dallo schermo).

---

### 4. Notifiche e gestione match (`/notifiche`)
Ogni utente vede:
- Richieste di match in entrata → può **accettare** o **rifiutare**
- Match rifiutati (tuoi): notifica che "X non è disponibile"
- Match accettati: notifica con link alla chat

---

### 5. Chat (`/chat/:matchId`)
- Chat testuale tra i due utenti matchati (salvata in localStorage)
- In fondo alla chat: bottone **"Conferma sessione svolta"** — entrambi gli utenti devono premere il bottone
- Quando entrambi confermano → l'utente che ha dato aiuto riceve **+50 punti UniversityBox**

---

### 6. Profilo e punti (`/profilo`)
- Riepilogo dati utente
- Punti accumulati (UniversityBox points)
- Storico sessioni confermate
- Bottone per modificare "cerco aiuto in" e "posso aiutare in"

---

## Logica del matching (localStorage)

```js
// Struttura utente in localStorage
{
  id: "uuid",
  nome: "Mario",
  cognome: "Rossi",
  username: "marioros",
  universita: "Politecnico di Milano",
  facolta: "Ingegneria Informatica",
  cercaAiutoIn: ["Analisi 2", "Fisica"],
  puoAiutareIn: ["Programmazione C", "Algoritmi"],
  biografia: "...",
  punti: 0,
  skip: ["uuid2", "uuid3"],        // utenti skippati da me
  matchInviati: ["uuid4"],          // richieste inviate
  matchRicevuti: ["uuid5"],         // richieste ricevute
  matchAccettati: ["uuid6"],        // match confermati
}
```

Regole:
- Un utente A appare nello swipe di B solo se: `A.puoAiutareIn` ha almeno un elemento in comune con `B.cercaAiutoIn`
- A non appare se B lo ha già skippato, o se c'è già una richiesta/match in corso
- Se B skippa A → A non potrà mai più vedere B nel suo swipe

---

## Sistema punti UniversityBox
- Ogni sessione confermata da entrambi gli utenti: **+50 punti** all'utente che ha dato aiuto
- I punti si accumulano nel profilo
- In futuro (fuori scope hackathon): i punti si convertono in sconti su UniversityBox

---

## Dati fake per la demo
Popola il localStorage con almeno **6 utenti fake** al primo avvio, con profili variati (università, facoltà, materie diverse), così la demo dello swipe funziona subito senza dover registrare più account.

---

## Tono e UX
- UI moderna, pulita, mobile-first
- Animazioni swipe fluide (CSS transform + transition)
- Colori: usa una palette fresca e universitaria (es. blu/verde o arancione/bianco)
- Nessun backend reale: tutto deve funzionare offline con localStorage
- Placeholder per il nome della piattaforma: **"StudyMatch"** (da cambiare se decidiamo un nome definitivo)

---

## Priorità di sviluppo per l'hackathon
1. Registrazione + setup profilo
2. Swipe con animazione
3. Sistema match (invia/accetta/rifiuta)
4. Chat base
5. Conferma sessione + punti
6. Pagina profilo