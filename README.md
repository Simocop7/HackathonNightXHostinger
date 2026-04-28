# StudyMatch

**Trova aiuto. Dai aiuto. Guadagna.**

Web app desktop-first per matchare studenti universitari su bisogni di aiuto momentanei e specifici. Sviluppata per l'hackathon BLAB Bocconi in collaborazione con **UniversityBOX** e **Hostinger**.

---

## Idea

Gli studenti hanno spesso bisogno di aiuto su materie specifiche ("ho l'esame domani e non capisco gli integrali") ma non trovano facilmente chi può aiutarli. StudyMatch risolve questo con:

- **Richieste specifiche** — posti un problema concreto con materia, descrizione e scadenza
- **Swipe sulle richieste** — gli helper scorrono le richieste e offrono aiuto in un click
- **Rewarding reale** — chi aiuta guadagna punti → sconti UniversityBOX (5% / 10% / 20%)

---

## Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Storage**: `localStorage` — nessun backend
- **Lingua**: Italiano

---

## Struttura

```
/           Registrazione (split-screen con hero sponsor)
/setup      Setup profilo con anteprima live
/aiuta      "Aiuta qualcuno" — swipe su richieste aperte
/match      "Match" — messenger split-view con sezioni ruolo
/richiedi   "Richiedi aiuto" — form pubblica richiesta
/profilo    Dashboard punti + coupon UniversityBOX
```

---

## Flusso principale

1. **Registrati** e completa il profilo (competenze + cosa cerchi)
2. **Richiedi aiuto** — pubblica una richiesta con materia e descrizione del problema
3. **Aiuta qualcuno** — swipa le richieste nelle tue materie, premi ♥ o usa `→` per offrire aiuto
4. **Match** — accetta le offerte ricevute, chatta nella sezione "📚 Ricevi aiuto"
5. **Conferma sessione** — il richiedente conferma → l'helper guadagna +50 punti UniversityBOX

---

## Sezione Match

Il pannello sinistro è diviso in sezioni chiare:

- **Offerte ricevute** — qualcuno ha offerto di aiutarti, accetta o rifiuta inline
- **📚 Ricevo aiuto** — conversazioni attive in cui sei il richiedente; qui trovi il bottone "Conferma sessione"
- **🎓 Sto aiutando** — conversazioni in cui sei l'helper; i punti arrivano quando il richiedente conferma
- **Non disponibili** — offerte rifiutate

---

## Avvio locale

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

Al primo avvio vengono caricati automaticamente 9 utenti seed (inclusi 2 Bocconi) e 7 richieste aperte per una demo funzionante senza registrare altri account.

Per resettare i dati seed: `localStorage.clear()` dalla console del browser.

---

## Demo (90 secondi)

1. Apri → split-screen, badge UniversityBOX e Hostinger visibili prima ancora di registrarsi
2. Registrati + setup in 20 sec — anteprima profilo si aggiorna live
3. **Richiedi aiuto**: 3 campi, pubblica in 5 sec
4. **Aiuta qualcuno**: premi `→` su una richiesta seed → card vola, match creato
5. **Match**: accetta offerta ricevuta inline → chat nel pannello destro, sezione "📚 Ricevo aiuto"
6. Scrivi 2 messaggi → "Conferma sessione svolta" → animazione +50 punti
7. **Profilo**: coupon UniversityBOX sbloccato visibile

---

## Scoring

| Punti | Livello | Sconto UniversityBOX |
|-------|---------|----------------------|
| 0–49  | 🌱 Novizio | — |
| 50–199 | 🥉 Collaboratore | 5% |
| 200–499 | 🥈 Esperto | 10% |
| 500+ | 🥇 Mentore | 20% |

Solo l'helper guadagna punti (+50 per sessione confermata dal richiedente).
