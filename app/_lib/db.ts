import { getSupabaseClient } from './supabase/client';
import { compressImage } from './imageUtils';
import type { Utente, Match, ChatData, Messaggio, RichiestaAiuto } from './types';

// ── Mappers (DB snake_case → TypeScript camelCase) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): Utente {
  return {
    id:              row.id,
    nome:            row.nome,
    cognome:         row.cognome,
    username:        row.username,
    universita:      row.universita,
    facolta:         row.facolta ?? '',
    cercaAiutoIn:    row.cerca_aiuto_in ?? [],
    puoAiutareIn:    row.puo_aiutare_in ?? [],
    biografia:       row.biografia ?? '',
    foto:            row.foto_url ?? undefined,
    linkedin:        row.linkedin ?? undefined,
    punti:           row.punti ?? 0,
    profiloCompleto: row.profilo_completo ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMatch(row: any): Match {
  return {
    id:             row.id,
    helperId:       row.helper_id,
    seekerId:       row.seeker_id,
    stato:          row.stato,
    confermaHelper: row.conferma_helper,
    confermaSeeker: row.conferma_seeker,
    createdAt:      new Date(row.created_at).getTime(),
    materia:        row.materia ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(row: any): Messaggio {
  return {
    id:         row.id,
    mittenteId: row.mittente_id,
    testo:      row.testo,
    ts:         new Date(row.ts).getTime(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRichiesta(row: any): RichiestaAiuto {
  return {
    id:          row.id,
    userId:      row.user_id,
    materia:     row.materia,
    descrizione: row.descrizione,
    scadenza:    row.scadenza ?? undefined,
    createdAt:   new Date(row.created_at).getTime(),
    stato:       row.stato,
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  meta: { nome: string; cognome: string; username: string; universita: string },
): Promise<{ user: Utente | null; error: string | null }> {
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
  // Fallback: se il trigger non ha creato il profilo, lo creiamo direttamente
  if (!user && data.user) {
    await supabase.from('profiles').upsert({
      id:        data.user.id,
      nome:      meta.nome,
      cognome:   meta.cognome,
      username:  meta.username,
      universita: meta.universita,
    }, { onConflict: 'id' });
    user = await getCurrentUser();
  }
  return { user, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: Utente | null; error: string | null }> {
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

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<Utente | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data ? mapProfile(data) : null;
}

export async function getUser(id: string): Promise<Utente | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  return data ? mapProfile(data) : undefined;
}

export async function getUsers(): Promise<Utente[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('profiles').select('*');
  return (data ?? []).map(mapProfile);
}

export async function getSeedUsers(): Promise<Utente[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_seed', true)
    .eq('profilo_completo', true);
  return (data ?? []).map(mapProfile);
}

export async function updateUser(updated: Utente): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('profiles').update({
    nome:             updated.nome,
    cognome:          updated.cognome,
    username:         updated.username,
    universita:       updated.universita,
    facolta:          updated.facolta,
    cerca_aiuto_in:   updated.cercaAiutoIn,
    puo_aiutare_in:   updated.puoAiutareIn,
    biografia:        updated.biografia,
    foto_url:         updated.foto ?? null,
    linkedin:         updated.linkedin ?? null,
    punti:            updated.punti,
    profilo_completo: updated.profiloCompleto,
  }).eq('id', updated.id);
}

// No-op: la sessione è gestita dal cookie Supabase
export async function setCurrentUserId(_id: string): Promise<void> {}

export async function clearCurrentUser(): Promise<void> {
  await signOut();
}

// ── Skips ─────────────────────────────────────────────────────────────────────

export async function addSkip(fromUserId: string, toUserId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('skips').upsert({ from_user_id: fromUserId, to_user_id: toUserId });
}

export async function getMySkips(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('skips')
    .select('to_user_id')
    .eq('from_user_id', userId);
  return (data ?? []).map((r) => r.to_user_id as string);
}

export async function clearSkipsForUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('skips').delete().eq('from_user_id', userId);
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function getMatchById(id: string): Promise<Match | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('matches').select('*').eq('id', id).single();
  return data ? mapMatch(data) : undefined;
}

export async function getMatchBetween(aId: string, bId: string): Promise<Match | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('matches')
    .select('*')
    .or(`and(helper_id.eq.${aId},seeker_id.eq.${bId}),and(helper_id.eq.${bId},seeker_id.eq.${aId})`)
    .maybeSingle();
  return data ? mapMatch(data) : undefined;
}

export async function createMatch(
  helperId: string,
  seekerId: string,
  materia?: string,
): Promise<Match> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('matches')
    .insert({ helper_id: helperId, seeker_id: seekerId, materia: materia ?? null })
    .select()
    .single();
  if (error) throw error;
  return mapMatch(data);
}

export async function updateMatch(updated: Match): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('matches').update({
    stato:           updated.stato,
    conferma_helper: updated.confermaHelper,
    conferma_seeker: updated.confermaSeeker,
  }).eq('id', updated.id);
}

export async function getMatchesForUser(userId: string): Promise<Match[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('matches')
    .select('*')
    .or(`helper_id.eq.${userId},seeker_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapMatch);
}

// ── Session confirm (atomic via Postgres function) ────────────────────────────

export async function confirmSession(matchId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('conferma_sessione', { p_match_id: matchId });
  if (error) throw error;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function getChat(matchId: string): Promise<ChatData> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('ts', { ascending: true });
  return { matchId, messaggi: (data ?? []).map(mapMessage) };
}

export async function sendMessage(
  matchId: string,
  mittenteId: string,
  testo: string,
): Promise<Messaggio> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, mittente_id: mittenteId, testo: testo.trim() })
    .select()
    .single();
  if (error) throw error;
  return mapMessage(data);
}

// ── Richieste di aiuto ────────────────────────────────────────────────────────

export async function createRichiesta(
  userId: string,
  materia: string,
  descrizione: string,
  scadenza?: 'oggi' | 'domani' | 'settimana',
): Promise<RichiestaAiuto> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('richieste_aiuto')
    .insert({ user_id: userId, materia, descrizione, scadenza: scadenza ?? null })
    .select()
    .single();
  if (error) throw error;
  return mapRichiesta(data);
}

export async function chiudiRichiesta(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('richieste_aiuto').update({ stato: 'chiusa' }).eq('id', id);
}

export async function getRichiestaAttiva(userId: string): Promise<RichiestaAiuto | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('richieste_aiuto')
    .select('*')
    .eq('user_id', userId)
    .eq('stato', 'aperta')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapRichiesta(data) : undefined;
}

export async function getRichiesteVisibili(
  currentUser: Utente,
  forceAll = false,
): Promise<RichiestaAiuto[]> {
  const supabase = getSupabaseClient();

  // Prendi tutte le richieste aperte degli altri utenti
  const { data: all } = await supabase
    .from('richieste_aiuto')
    .select('*')
    .eq('stato', 'aperta')
    .neq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!all || all.length === 0) return [];

  // Carica match e skip in parallelo per filtrare lato client
  const [{ data: matches }, { data: skips }] = await Promise.all([
    supabase
      .from('matches')
      .select('helper_id, seeker_id')
      .or(`helper_id.eq.${currentUser.id},seeker_id.eq.${currentUser.id}`),
    supabase
      .from('skips')
      .select('to_user_id')
      .eq('from_user_id', currentUser.id),
  ]);

  const matchedUserIds = new Set<string>(
    (matches ?? []).flatMap((m) => [m.helper_id as string, m.seeker_id as string]),
  );
  const skippedUserIds = new Set<string>((skips ?? []).map((s) => s.to_user_id as string));

  const canHelp = (materia: string) =>
    currentUser.puoAiutareIn.some(
      (skill) =>
        skill.toLowerCase() === materia.toLowerCase() ||
        skill.toLowerCase().includes(materia.toLowerCase()) ||
        materia.toLowerCase().includes(skill.toLowerCase()),
    );

  const filtered = all
    .map(mapRichiesta)
    .filter((r) => !matchedUserIds.has(r.userId) && !skippedUserIds.has(r.userId))
    .filter((r) => forceAll || canHelp(r.materia));

  return filtered;
}

// ── Avatar upload ─────────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseClient();
  const base64 = await compressImage(file, 240);
  const blob = await fetch(base64).then((r) => r.blob());
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  return publicUrl;
}

// ── Demo helpers ──────────────────────────────────────────────────────────────

export async function seedOffersForUser(currentUser: Utente): Promise<void> {
  const supabase = getSupabaseClient();

  // Trova utenti seed che possono aiutare l'utente corrente
  const { data: seeds } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_seed', true)
    .neq('id', currentUser.id);

  if (!seeds || seeds.length === 0) return;

  const existingMatches = await getMatchesForUser(currentUser.id);
  const linkedIds = new Set(existingMatches.flatMap((m) => [m.helperId, m.seekerId]));

  const helpers = seeds
    .map(mapProfile)
    .filter((u) => !linkedIds.has(u.id))
    .filter((u) =>
      u.puoAiutareIn.some((s) =>
        currentUser.cercaAiutoIn.some(
          (c) =>
            s.toLowerCase() === c.toLowerCase() ||
            s.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(s.toLowerCase()),
        ),
      ),
    );

  const picked = helpers.slice(0, 2);
  for (const helper of picked) {
    const materia =
      helper.puoAiutareIn.find((s) =>
        currentUser.cercaAiutoIn.some(
          (c) =>
            s.toLowerCase() === c.toLowerCase() ||
            s.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(s.toLowerCase()),
        ),
      ) ?? currentUser.cercaAiutoIn[0];
    if (materia) {
      await supabase
        .from('matches')
        .insert({ helper_id: helper.id, seeker_id: currentUser.id, materia })
        .select();
    }
  }
}

export async function autoAcceptOutgoingAsHelper(currentUserId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('matches')
    .update({ stato: 'accettato' })
    .eq('helper_id', currentUserId)
    .eq('stato', 'richiesta');
}

export async function resetForDemoUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await Promise.all([
    supabase.from('skips').delete().eq('from_user_id', userId),
    supabase.from('matches').delete().eq('helper_id', userId),
    supabase.from('richieste_aiuto').update({ stato: 'aperta' }).eq('stato', 'chiusa'),
  ]);
}

export async function initSeedIfNeeded(): Promise<void> {
  try {
    await fetch('/api/seed', { method: 'POST' });
  } catch {
    // silently ignore if seed route not available
  }
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToMessages(
  matchId: string,
  onMessage: (msg: Messaggio) => void,
): () => void {
  const supabase = getSupabaseClient();
  const id = Math.random().toString(36).slice(2);
  const channel = supabase
    .channel(`messages:${matchId}:${id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => onMessage(mapMessage(payload.new)),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToMatchUpdates(
  userId: string,
  onUpdate: () => void,
): () => void {
  const supabase = getSupabaseClient();
  const id = Math.random().toString(36).slice(2);
  const ch1 = supabase
    .channel(`matches:helper:${userId}:${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `helper_id=eq.${userId}` }, onUpdate)
    .subscribe();
  const ch2 = supabase
    .channel(`matches:seeker:${userId}:${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `seeker_id=eq.${userId}` }, onUpdate)
    .subscribe();
  return () => {
    supabase.removeChannel(ch1);
    supabase.removeChannel(ch2);
  };
}
