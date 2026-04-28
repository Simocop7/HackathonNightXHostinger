import { getSupabaseClient } from './supabase/client';
import { compressImage }     from './imageUtils';
import type {
  Profilo, Ticket, Assegnazione, Messaggio,
  RuoloUtente, SubscriptionTier, TipoCliente,
  TicketStato, TicketPriorita, TicketTipo,
} from './types';

// ── Mappers (DB snake_case → TypeScript camelCase) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfilo(row: any): Profilo {
  return {
    id:                  row.id,
    nome:                row.nome,
    cognome:             row.cognome,
    username:            row.username,
    ruolo:               row.ruolo               ?? 'cliente',
    biografia:           row.biografia           ?? '',
    foto:                row.foto_url            ?? undefined,
    linkedin:            row.linkedin            ?? undefined,
    punti:               row.punti               ?? 0,
    profiloCompleto:     row.profilo_completo    ?? false,
    // Clienti
    tipoCliente:         row.tipo_cliente        ?? undefined,
    partitaIva:          row.partita_iva         ?? undefined,
    codiceFiscale:       row.codice_fiscale      ?? undefined,
    ragioneSociale:      row.ragione_sociale     ?? undefined,
    subscriptionTier:    row.subscription_tier   ?? undefined,
    // Professionisti
    areeLegali:          row.aree_legali         ?? [],
    ordineProfessionale: row.ordine_professionale ?? undefined,
    qualifica:           row.qualifica           ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTicket(row: any): Ticket {
  return {
    id:                      row.id,
    clienteId:               row.cliente_id,
    tipo:                    row.tipo,
    areaLegale:              row.area_legale,
    titolo:                  row.titolo,
    descrizione:             row.descrizione,
    allegati:                row.allegati              ?? [],
    stato:                   row.stato,
    priorita:                row.priorita,
    professionistaId:        row.professionista_id     ?? undefined,
    rispostaProfessionista:  row.risposta_professionista ?? undefined,
    createdAt:               new Date(row.created_at).getTime(),
    updatedAt:               new Date(row.updated_at).getTime(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAssegnazione(row: any): Assegnazione {
  return {
    id:                     row.id,
    professionistaId:       row.professionista_id,
    clienteId:              row.cliente_id,
    ticketId:               row.ticket_id,
    stato:                  row.stato,
    confermaProfessionista: row.conferma_professionista,
    confermaCliente:        row.conferma_cliente,
    createdAt:              new Date(row.created_at).getTime(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessaggio(row: any): Messaggio {
  return {
    id:             row.id,
    assegnazioneId: row.assegnazione_id,
    mittenteId:     row.mittente_id,
    testo:          row.testo,
    ts:             new Date(row.ts).getTime(),
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUp(
  email:    string,
  password: string,
  meta: {
    nome:      string;
    cognome:   string;
    username:  string;
    ruolo:     RuoloUtente;
    // Clienti
    tipoCliente?:  TipoCliente;
    partitaIva?:   string;
    codiceFiscale?: string;
    ragioneSociale?: string;
  },
): Promise<{ user: Profilo | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Registrazione fallita' };

  // Aspetta che il trigger inserisca il profilo
  await new Promise((r) => setTimeout(r, 800));
  let user = await getCurrentUser();

  // Fallback manuale se il trigger non ha ancora completato
  if (!user && data.user) {
    await supabase.from('profiles').upsert({
      id:       data.user.id,
      nome:     meta.nome,
      cognome:  meta.cognome,
      username: meta.username,
      ruolo:    meta.ruolo,
    }, { onConflict: 'id' });
    user = await getCurrentUser();
  }
  return { user, error: null };
}

export async function signIn(
  email:    string,
  password: string,
): Promise<{ user: Profilo | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  const user = await getCurrentUser();
  return { user, error: null };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

// ── Profili ───────────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<Profilo | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data ? mapProfilo(data) : null;
}

export async function getProfilo(id: string): Promise<Profilo | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  return data ? mapProfilo(data) : undefined;
}

export async function getProfili(): Promise<Profilo[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('profiles').select('*');
  return (data ?? []).map(mapProfilo);
}

export async function getProfessionisti(): Promise<Profilo[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('ruolo', 'professionista')
    .eq('profilo_completo', true);
  return (data ?? []).map(mapProfilo);
}

export async function getSeedProfili(): Promise<Profilo[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_seed', true)
    .eq('profilo_completo', true);
  return (data ?? []).map(mapProfilo);
}

export async function updateProfilo(updated: Profilo): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('profiles').update({
    nome:                 updated.nome,
    cognome:              updated.cognome,
    username:             updated.username,
    biografia:            updated.biografia,
    foto_url:             updated.foto             ?? null,
    linkedin:             updated.linkedin          ?? null,
    punti:                updated.punti,
    profilo_completo:     updated.profiloCompleto,
    // Clienti
    tipo_cliente:         updated.tipoCliente       ?? null,
    partita_iva:          updated.partitaIva        ?? null,
    codice_fiscale:       updated.codiceFiscale     ?? null,
    ragione_sociale:      updated.ragioneSociale    ?? null,
    subscription_tier:    updated.subscriptionTier  ?? null,
    // Professionisti
    aree_legali:          updated.areeLegali,
    ordine_professionale: updated.ordineProfessionale ?? null,
    qualifica:            updated.qualifica          ?? null,
  }).eq('id', updated.id);
  return { error: error?.message ?? null };
}

export async function clearCurrentUser(): Promise<void> {
  await signOut();
}

// ── Tickets — lettura ─────────────────────────────────────────────────────────

export async function getTicket(id: string): Promise<Ticket | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('tickets').select('*').eq('id', id).single();
  return data ? mapTicket(data) : undefined;
}

/** Ticket del cliente autenticato, ordinati dal più recente. */
export async function getTicketsCliente(clienteId: string): Promise<Ticket[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapTicket);
}

/**
 * Ticket visibili a un professionista:
 *  – stato 'aperto' (senza assegnatario) nella sua area legale, O
 *  – già assegnati a lui (qualsiasi stato).
 */
export async function getTicketsProfessionista(
  professionista: Profilo,
): Promise<Ticket[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .or(
      `and(stato.eq.aperto,professionista_id.is.null),professionista_id.eq.${professionista.id}`,
    )
    .order('created_at', { ascending: false });

  // Filtra lato client solo per l'area legale del professionista
  // (la RLS garantisce già che il professionista veda tutto, qui restringiamo i risultati)
  const aree = new Set(professionista.areeLegali.map((a) => a.toLowerCase()));
  return (data ?? [])
    .map(mapTicket)
    .filter(
      (t: Ticket) =>
        t.professionistaId === professionista.id ||
        aree.has(t.areaLegale.toLowerCase()),
    );
}

// ── Tickets — scrittura ───────────────────────────────────────────────────────

/**
 * La CREAZIONE di un ticket avviene esclusivamente tramite POST /api/tickets
 * (che include rate-limit check e auto-assignment).
 * Questa funzione non esiste di proposito per evitare bypass della logica server.
 */

/** Aggiorna stato, priorita o risposta di un ticket esistente. */
export async function aggiornaTicket(
  id: string,
  patch: Partial<Pick<Ticket, 'stato' | 'priorita' | 'rispostaProfessionista'>>,
): Promise<void> {
  const supabase = getSupabaseClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.stato                !== undefined) dbPatch.stato                     = patch.stato;
  if (patch.priorita             !== undefined) dbPatch.priorita                  = patch.priorita;
  if (patch.rispostaProfessionista !== undefined)
    dbPatch.risposta_professionista = patch.rispostaProfessionista;
  await supabase.from('tickets').update(dbPatch).eq('id', id);
}

/**
 * Upload di un allegato al bucket privato 'allegati'.
 * Salva il PATH (non l'URL) nell'array allegati del ticket.
 * Path: {clienteId}/{ticketId}/{uuid}.{ext}
 * Per ottenere un URL di download usa getSignedUrl(path).
 */
export async function uploadAllegato(
  ticketId: string,
  clienteId: string,
  file: File,
): Promise<string> {
  const supabase = getSupabaseClient();
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${clienteId}/${ticketId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('allegati')
    .upload(path, file, { upsert: false, cacheControl: '3600' });
  if (error) throw error;

  // Salva il path (non URL) nell'array allegati del ticket
  const ticket = await getTicket(ticketId);
  if (ticket) {
    await supabase
      .from('tickets')
      .update({ allegati: [...ticket.allegati, path] })
      .eq('id', ticketId);
  }
  return path;
}

/** Genera un URL firmato valido 60 minuti per scaricare un allegato privato. */
export async function getSignedUrl(path: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from('allegati')
    .createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error('Errore generazione URL firmato');
  return data.signedUrl;
}

// ── Assegnazioni ──────────────────────────────────────────────────────────────

export async function getAssegnazioneByTicket(
  ticketId: string,
): Promise<Assegnazione | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('assegnazioni')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();
  return data ? mapAssegnazione(data) : undefined;
}

export async function getAssegnazioniPerUtente(
  userId: string,
): Promise<Assegnazione[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('assegnazioni')
    .select('*')
    .or(`professionista_id.eq.${userId},cliente_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapAssegnazione);
}

export async function aggiornaAssegnazione(
  id: string,
  patch: Partial<Pick<Assegnazione, 'stato' | 'confermaProfessionista' | 'confermaCliente'>>,
): Promise<void> {
  const supabase = getSupabaseClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.stato                  !== undefined) dbPatch.stato                    = patch.stato;
  if (patch.confermaProfessionista !== undefined) dbPatch.conferma_professionista  = patch.confermaProfessionista;
  if (patch.confermaCliente        !== undefined) dbPatch.conferma_cliente         = patch.confermaCliente;
  await supabase.from('assegnazioni').update(dbPatch).eq('id', id);
}

/**
 * Chiude un ticket in modo atomico tramite RPC Postgres:
 *  1. Imposta conferma_professionista = conferma_cliente = true.
 *  2. Porta il ticket a stato 'risolto'.
 *  3. Assegna +50 punti al professionista.
 */
export async function chiudiTicket(assegnazioneId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('chiudi_ticket', {
    p_assegnazione_id: assegnazioneId,
  });
  if (error) throw error;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function getChat(assegnazioneId: string): Promise<Messaggio[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('assegnazione_id', assegnazioneId)
    .order('ts', { ascending: true });
  return (data ?? []).map(mapMessaggio);
}

export async function sendMessage(
  assegnazioneId: string,
  mittenteId:     string,
  testo:          string,
): Promise<Messaggio> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({ assegnazione_id: assegnazioneId, mittente_id: mittenteId, testo: testo.trim() })
    .select()
    .single();
  if (error) throw error;
  return mapMessaggio(data);
}

/**
 * Upload di un documento di risposta dal professionista.
 * Path: prof/{profId}/{ticketId}/{uuid}.{ext}
 * I path prefissati con 'prof/' si distinguono dai file del cliente
 * nell'array ticket.allegati (cliente usa '{clienteId}/{ticketId}/...').
 */
export async function uploadAllegatoProfessionista(
  ticketId: string,
  profId:   string,
  file:     File,
): Promise<string> {
  const supabase = getSupabaseClient();
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `prof/${profId}/${ticketId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('allegati')
    .upload(path, file, { upsert: false, cacheControl: '3600' });
  if (error) throw error;
  const ticket = await getTicket(ticketId);
  if (ticket) {
    await supabase
      .from('tickets')
      .update({ allegati: [...ticket.allegati, path] })
      .eq('id', ticketId);
  }
  return path;
}

// ── Avatar upload ─────────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseClient();
  const base64 = await compressImage(file, 240);
  const blob   = await fetch(base64).then((r) => r.blob());
  const path   = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  return publicUrl;
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

export function subscribeToMessages(
  assegnazioneId: string,
  onMessage: (msg: Messaggio) => void,
): () => void {
  const supabase = getSupabaseClient();
  const uid = Math.random().toString(36).slice(2);
  const channel = supabase
    .channel(`messages:${assegnazioneId}:${uid}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `assegnazione_id=eq.${assegnazioneId}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => onMessage(mapMessaggio(payload.new)),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToAssegnazioneUpdates(
  userId:   string,
  onUpdate: () => void,
): () => void {
  const supabase = getSupabaseClient();
  const uid = Math.random().toString(36).slice(2);

  const ch1 = supabase
    .channel(`assegnazioni:prof:${userId}:${uid}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'assegnazioni',
      filter: `professionista_id=eq.${userId}`,
    }, onUpdate)
    .subscribe();

  const ch2 = supabase
    .channel(`assegnazioni:client:${userId}:${uid}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'assegnazioni',
      filter: `cliente_id=eq.${userId}`,
    }, onUpdate)
    .subscribe();

  return () => {
    supabase.removeChannel(ch1);
    supabase.removeChannel(ch2);
  };
}

export function subscribeToTicketUpdates(
  ticketId: string,
  onUpdate: (ticket: Ticket) => void,
): () => void {
  const supabase = getSupabaseClient();
  const uid = Math.random().toString(36).slice(2);
  const channel = supabase
    .channel(`tickets:${ticketId}:${uid}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => onUpdate(mapTicket(payload.new)),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Seed / demo ───────────────────────────────────────────────────────────────

export async function initSeedIfNeeded(): Promise<void> {
  try {
    await fetch('/api/seed', { method: 'POST' });
  } catch {
    // silently ignore — seed route non disponibile in build statica
  }
}

// ── Tipi re-esportati per comodità degli import nei componenti ────────────────

export type {
  Profilo, Ticket, Assegnazione, Messaggio,
  RuoloUtente, SubscriptionTier, TipoCliente,
  TicketStato, TicketPriorita, TicketTipo, AssegnazioneStato,
} from './types';
