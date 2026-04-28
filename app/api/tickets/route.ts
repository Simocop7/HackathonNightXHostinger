import { NextRequest, NextResponse } from 'next/server';
import { createClient }             from '@supabase/supabase-js';
import { getSupabaseServer }        from '../../_lib/supabase/server';
import type { TicketTipo, TicketPriorita, SubscriptionTier } from '../../_lib/types';

// ── Limiti giornalieri per subscription tier ──────────────────────────────────

const DAILY_LIMITS: Record<SubscriptionTier, number> = {
  pro:        3,
  max:        10,
  enterprise: 50,
};
const DEFAULT_LIMIT = 1; // fallback for users without a plan

// ── Helper: client Supabase con service role (bypassa RLS) ────────────────────

function getAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── POST /api/tickets ─────────────────────────────────────────────────────────
//
//  Body atteso (JSON):
//  {
//    tipo:        'domanda' | 'revisione_documento',
//    area_legale: string,
//    titolo:      string,
//    descrizione: string,
//    priorita?:   'bassa' | 'normale' | 'urgente',   (default: 'normale')
//    allegati?:   string[],                           (default: [])
//  }
//
//  Risposta 201:  { ticket, assegnatoId }
//  Risposta 400:  { error, field? }           – validazione
//  Risposta 401:  { error }                   – non autenticato
//  Risposta 403:  { error }                   – ruolo non cliente
//  Risposta 429:  { error, code, detail, limit, current, resetsAt } – rate limit
//  Risposta 500:  { error }                   – errore DB

export async function POST(req: NextRequest) {

  // ── 1. Parse e validazione body ───────────────────────────────────────────

  let body: {
    tipo?:        TicketTipo;
    area_legale?: string;
    titolo?:      string;
    descrizione?: string;
    priorita?:    TicketPriorita;
    allegati?:    string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const { tipo, area_legale, titolo, descrizione, priorita = 'normale', allegati = [] } = body;

  const missing = (['tipo', 'area_legale', 'titolo', 'descrizione'] as const)
    .filter((f) => !body[f]?.trim());

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Campi obbligatori mancanti: ${missing.join(', ')}`, fields: missing },
      { status: 400 },
    );
  }

  // ── 2. Autenticazione: verifica sessione cookie del cliente ───────────────

  const userClient = await getSupabaseServer();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  // ── 3. Carica il profilo con admin client (bypass RLS) ────────────────────

  const admin = getAdminClient();

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('ruolo, subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 });
  }

  if (profile.ruolo !== 'cliente') {
    return NextResponse.json(
      { error: 'Solo i clienti possono aprire ticket' },
      { status: 403 },
    );
  }

  // ── 4. Rate limit: conteggio ticket nelle ultime 24 ore ───────────────────

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: ticketsOggi, error: countErr } = await admin
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', user.id)
    .gte('created_at', since);

  if (countErr) {
    console.error('[tickets] rate-limit count error:', countErr);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  const tier  = (profile.subscription_tier as SubscriptionTier) ?? null;
  const limit = tier ? (DAILY_LIMITS[tier] ?? DEFAULT_LIMIT) : DEFAULT_LIMIT;

  if ((ticketsOggi ?? 0) >= limit) {
    const tierLabel = tier ? (tier.charAt(0).toUpperCase() + tier.slice(1)) : 'Free';
    const resetsAt  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return NextResponse.json(
      {
        error:    'Daily limit reached',
        code:     'DAILY_LIMIT_EXCEEDED',
        detail:   `The ${tierLabel} plan allows ${limit} ticket(s) every 24 hours. Upgrade your plan to increase the limit.`,
        limit,
        current:  ticketsOggi ?? 0,
        resetsAt,
      },
      {
        status: 429,
        headers: {
          'Retry-After':       '86400',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Reset': resetsAt,
        },
      },
    );
  }

  // ── 5. Auto-assignment: professionista con meno ticket aperti nell'area ───
  //
  //  Step A – professionisti competenti per area_legale (1 query)
  //  Step B – ticket aperti di tutti i candidati in un solo round-trip (1 query)
  //  Step C – scelta del professionista con workload minimo (con tie-break random)

  let assegnatoId: string | null = null;

  const { data: candidates } = await admin
    .from('profiles')
    .select('id')
    .eq('ruolo', 'professionista')
    .eq('profilo_completo', true)
    .contains('aree_legali', [area_legale]);

  if (candidates && candidates.length > 0) {
    const candidateIds = candidates.map((c) => c.id as string);

    // Carica tutti i ticket attivi dei candidati in una sola query
    const { data: openTickets } = await admin
      .from('tickets')
      .select('professionista_id')
      .in('professionista_id', candidateIds)
      .in('stato', ['aperto', 'in_lavorazione', 'richiede_info']);

    // Costruisce mappa workload: { professionistaId → conteggio }
    const loads: Record<string, number> = Object.fromEntries(
      candidateIds.map((id) => [id, 0]),
    );
    (openTickets ?? []).forEach((t) => {
      if (t.professionista_id) loads[t.professionista_id] = (loads[t.professionista_id] ?? 0) + 1;
    });

    // Seleziona i candidati con il carico minimo
    const minLoad = Math.min(...Object.values(loads));
    const tied    = candidateIds.filter((id) => loads[id] === minLoad);

    // Tie-break casuale tra professionisti con ugual carico
    assegnatoId = tied[Math.floor(Math.random() * tied.length)];
  }

  // ── 6. Inserimento ticket ─────────────────────────────────────────────────

  const { data: ticket, error: insertErr } = await admin
    .from('tickets')
    .insert({
      cliente_id:        user.id,
      tipo,
      area_legale:       area_legale!.trim(),
      titolo:            titolo!.trim(),
      descrizione:       descrizione!.trim(),
      allegati,
      stato:             assegnatoId ? 'in_lavorazione' : 'aperto',
      priorita,
      professionista_id: assegnatoId,
    })
    .select()
    .single();

  if (insertErr) {
    // Codice 23505 = violazione UNIQUE (partial index one_per_day)
    if (insertErr.code === '23505') {
      return NextResponse.json(
        {
          error:   'Limite giornaliero raggiunto',
          code:    'DAILY_LIMIT_EXCEEDED',
          detail:  'Hai già un ticket attivo aperto oggi. Attendi che venga risolto prima di aprirne un altro.',
          limit,
          current: limit,
          resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { status: 429 },
      );
    }
    console.error('[tickets] insert error:', insertErr);
    return NextResponse.json({ error: 'Errore nella creazione del ticket' }, { status: 500 });
  }

  // ── 7. Creazione assegnazione (se trovato un professionista) ─────────────

  if (assegnatoId && ticket) {
    const { error: assErr } = await admin
      .from('assegnazioni')
      .insert({
        professionista_id: assegnatoId,
        cliente_id:        user.id,
        ticket_id:         ticket.id,
        stato:             'accettata', // auto-assignment = accettata immediatamente
      });

    if (assErr) {
      // Il ticket è creato: logghiamo l'errore ma non blocchiamo la risposta.
      // L'assegnazione può essere ripristinata manualmente o da un job di retry.
      console.error('[tickets] assegnazione insert error:', assErr);
    }
  }

  return NextResponse.json({ ticket, assegnatoId }, { status: 201 });
}

// ── GET /api/tickets ──────────────────────────────────────────────────────────
//
//  Restituisce i ticket del cliente autenticato (o tutti se professionista).
//  Query params: ?stato=aperto|in_lavorazione|risolto|richiede_info
//               ?area_legale=<string>

export async function GET(req: NextRequest) {
  const userClient = await getSupabaseServer();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('ruolo, aree_legali')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 });

  const url        = new URL(req.url);
  const statoParam = url.searchParams.get('stato');
  const areaParam  = url.searchParams.get('area_legale');

  let query = admin.from('tickets').select('*');

  if (profile.ruolo === 'cliente') {
    query = query.eq('cliente_id', user.id);
  } else if (profile.ruolo === 'professionista') {
    // Professionista: vede i propri ticket + quelli aperti nella sua area
    query = query.or(
      `professionista_id.eq.${user.id},and(stato.eq.aperto,professionista_id.is.null)`,
    );
  }
  // admin: vede tutto

  if (statoParam) query = query.eq('stato', statoParam);
  if (areaParam)  query = query.eq('area_legale', areaParam);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Errore lettura ticket' }, { status: 500 });

  return NextResponse.json({ tickets: data ?? [] });
}
