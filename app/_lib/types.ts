// ── Enum types (specchio 1:1 dei tipi PostgreSQL) ─────────────────────────────

export type RuoloUtente      = 'cliente' | 'professionista' | 'admin';
export type TipoCliente      = 'privato' | 'azienda';
export type SubscriptionTier = 'pro' | 'max' | 'enterprise';
export type TicketTipo       = 'domanda' | 'revisione_documento';
export type TicketStato      = 'aperto' | 'in_lavorazione' | 'risolto' | 'richiede_info';
export type TicketPriorita   = 'bassa' | 'normale' | 'urgente';
export type AssegnazioneStato = 'in_attesa' | 'accettata' | 'rifiutata';

// ── Profilo (ex Utente) ───────────────────────────────────────────────────────
//
//  Campi condizionali per ruolo:
//    cliente       → tipoCliente, partitaIva, codiceFiscale, ragioneSociale, subscriptionTier
//    professionista → areeLegali, ordineProfessionale, qualifica

export interface Profilo {
  id:               string;
  nome:             string;
  cognome:          string;
  username:         string;
  ruolo:            RuoloUtente;
  biografia:        string;
  foto?:            string;
  linkedin?:        string;
  punti:            number;
  profiloCompleto:  boolean;

  // Clienti
  tipoCliente?:     TipoCliente;
  partitaIva?:      string;
  codiceFiscale?:   string;
  ragioneSociale?:  string;
  subscriptionTier?: SubscriptionTier;

  // Professionisti
  areeLegali:            string[];
  ordineProfessionale?:  string;
  qualifica?:            string;
}

// ── Ticket (ex RichiestaAiuto) ────────────────────────────────────────────────
//
//  allegati: array di URL pubblici o privati su Supabase Storage.
//  professionistaId: valorizzato dall'auto-assignment al momento della creazione.
//  rispostaProfessionista: compilata dal professionista durante la lavorazione.

export interface Ticket {
  id:                       string;
  clienteId:                string;
  tipo:                     TicketTipo;
  areaLegale:               string;
  titolo:                   string;
  descrizione:              string;
  allegati:                 string[];
  stato:                    TicketStato;
  priorita:                 TicketPriorita;
  professionistaId?:        string;
  rispostaProfessionista?:  string;
  createdAt:                number;
  updatedAt:                number;
}

// ── Assegnazione (ex Match) ───────────────────────────────────────────────────
//
//  Creata automaticamente dal server al momento della creazione del ticket.
//  stato 'accettata' di default (auto-assignment non richiede conferma manuale).

export interface Assegnazione {
  id:                     string;
  professionistaId:       string;
  clienteId:              string;
  ticketId:               string;
  stato:                  AssegnazioneStato;
  confermaProfessionista: boolean;
  confermaCliente:        boolean;
  createdAt:              number;
}

// ── Messaggio ─────────────────────────────────────────────────────────────────

export interface Messaggio {
  id:             string;
  assegnazioneId: string;
  mittenteId:     string;
  testo:          string;
  ts:             number;
}

// ── Payload risposta POST /api/tickets ────────────────────────────────────────

export interface CreaTicketResponse {
  ticket:      Ticket;
  assegnatoId: string | null;
}

// ── Struttura errore 429 (rate limit) ────────────────────────────────────────

export interface RateLimitError {
  error:    string;
  code:     'DAILY_LIMIT_EXCEEDED';
  detail:   string;
  limit:    number;
  current:  number;
  resetsAt: string;
}
