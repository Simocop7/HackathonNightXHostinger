export interface Utente {
  id: string;
  nome: string;
  cognome: string;
  username: string;
  universita: string;
  facolta: string;
  cercaAiutoIn: string[];
  puoAiutareIn: string[];
  biografia: string;
  foto?: string;
  linkedin?: string;
  punti: number;
  profiloCompleto: boolean;
}

export interface Match {
  id: string;
  helperId: string;
  seekerId: string;
  stato: 'richiesta' | 'accettato' | 'rifiutato';
  confermaHelper: boolean;
  confermaSeeker: boolean;
  createdAt: number;
  materia?: string;
}

export interface Messaggio {
  id: string;
  mittenteId: string;
  testo: string;
  ts: number;
}

export interface ChatData {
  matchId: string;
  messaggi: Messaggio[];
}

export interface RichiestaAiuto {
  id: string;
  userId: string;
  materia: string;
  descrizione: string;
  scadenza?: 'oggi' | 'domani' | 'settimana';
  createdAt: number;
  stato: 'aperta' | 'chiusa';
}
