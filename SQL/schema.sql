
-- ============================================================
--  LegalMatch — schema Supabase v2 (idempotente)
--  Migrazione da StudyMatch → piattaforma LegalTech SaaS
--  ⚠  Le istruzioni DROP in testa sono distruttive.
--     Eseguire su database pulito o dopo backup.
-- ============================================================


-- ── 1. CLEANUP: rimuove residui StudyMatch ───────────────────
--    (idempotente: IF EXISTS non fallisce su DB già migrato)

drop table if exists public.skips            cascade;
drop table if exists public.messages         cascade;
drop table if exists public.matches          cascade;
drop table if exists public.richieste_aiuto  cascade;
drop table if exists public.assegnazioni     cascade;
drop table if exists public.tickets          cascade;
drop table if exists public.profiles         cascade;

drop type if exists match_stato;
drop type if exists richiesta_scadenza;
drop type if exists richiesta_stato;


-- ── 2. ENUM TYPES ─────────────────────────────────────────────

-- Ruolo dell'utente nella piattaforma
do $$ begin
  create type ruolo_utente as enum ('cliente', 'professionista', 'admin');
exception when duplicate_object then null; end $$;

-- Tipo di cliente (persona fisica o giuridica)
do $$ begin
  create type tipo_cliente_enum as enum ('privato', 'azienda');
exception when duplicate_object then null; end $$;

-- Piano di abbonamento del cliente
do $$ begin
  create type subscription_tier as enum ('basic', 'premium');
exception when duplicate_object then null; end $$;

-- Tipo di ticket legale
do $$ begin
  create type ticket_tipo as enum ('domanda', 'revisione_documento');
exception when duplicate_object then null; end $$;

-- Stato del ciclo di vita del ticket
do $$ begin
  create type ticket_stato as enum ('aperto', 'in_lavorazione', 'risolto', 'richiede_info');
exception when duplicate_object then null; end $$;

-- Livello di urgenza del ticket
do $$ begin
  create type ticket_priorita as enum ('bassa', 'normale', 'urgente');
exception when duplicate_object then null; end $$;

-- Stato dell'assegnazione ticket → professionista
do $$ begin
  create type assegnazione_stato as enum ('in_attesa', 'accettata', 'rifiutata');
exception when duplicate_object then null; end $$;


-- ── 3. PROFILES (estende auth.users 1-a-1) ───────────────────
--
--  ruolo = 'cliente'        → azienda o privato che apre ticket
--  ruolo = 'professionista' → avvocato / notaio che gestisce ticket
--  ruolo = 'admin'          → operatore della piattaforma
--
--  I campi specifici per ruolo sono nullable:
--    - tipo_cliente / partita_iva / codice_fiscale / ragione_sociale /
--      subscription_tier  →  compilati solo dai clienti
--    - aree_legali / ordine_professionale / qualifica
--                         →  compilati solo dai professionisti
--
--  foto_url punta a Supabase Storage (URL), non base64.
--  is_seed  distingue gli utenti demo dai reali.

create table if not exists public.profiles (
  id                   uuid              primary key references auth.users(id) on delete cascade,
  nome                 text              not null,
  cognome              text              not null,
  username             text              not null,
  ruolo                ruolo_utente      not null default 'cliente',

  -- ── Campi comuni ─────────────────────────────────────────
  biografia            text              not null default '',
  foto_url             text,
  linkedin             text,
  punti                integer           not null default 0,
  profilo_completo     boolean           not null default false,
  is_seed              boolean           not null default false,
  created_at           timestamptz       not null default now(),

  -- ── Campi specifici CLIENTI (null per i professionisti) ──
  tipo_cliente         tipo_cliente_enum,
  partita_iva          text,
  codice_fiscale       text,
  ragione_sociale      text,
  subscription_tier    subscription_tier,

  -- ── Campi specifici PROFESSIONISTI (null per i clienti) ──
  aree_legali          text[]            not null default '{}',
  ordine_professionale text,
  qualifica            text,

  constraint profiles_username_unique unique (username),
  constraint profiles_punti_non_neg   check  (punti >= 0)
);

create index if not exists idx_profiles_username    on public.profiles(username);
create index if not exists idx_profiles_ruolo       on public.profiles(ruolo);
-- GIN index per ricerche tipo: WHERE 'Diritto del Lavoro' = ANY(aree_legali)
create index if not exists idx_profiles_aree_legali on public.profiles using gin(aree_legali);


-- ── 4. TRIGGER: crea profilo al signup ───────────────────────
--    Legge ruolo dai metadati di Supabase Auth (raw_user_meta_data).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, cognome, username, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome',    ''),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    coalesce(new.raw_user_meta_data->>'username',''),
    coalesce(new.raw_user_meta_data->>'ruolo', 'cliente')::ruolo_utente
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 5. TICKETS ────────────────────────────────────────────────
--
--  Sostituisce richieste_aiuto.
--  Rimossi: materia, scadenza (erano legati alla logica lezione/tutoraggio).
--  Aggiunti: tipo, titolo, allegati (URL file), stato esteso, priorita,
--            professionista_id (FK al professionista assegnato),
--            risposta_professionista, updated_at.
--
--  Vincolo «max 1 ticket attivo per cliente per giorno»:
--    partial unique index su (cliente_id, data_apertura)
--    filtrato sui soli stati attivi (escluso 'risolto').
--    Un ticket risolto nella stessa giornata libera lo slot.

create table if not exists public.tickets (
  id                      uuid            primary key default gen_random_uuid(),
  cliente_id              uuid            not null references public.profiles(id) on delete cascade,
  tipo                    ticket_tipo     not null,
  area_legale             text            not null,
  titolo                  text            not null,
  descrizione             text            not null,
  allegati                text[]          not null default '{}',
  stato                   ticket_stato    not null default 'aperto',
  priorita                ticket_priorita not null default 'normale',
  professionista_id       uuid            references public.profiles(id) on delete set null,
  risposta_professionista text,
  created_at              timestamptz     not null default now(),
  updated_at              timestamptz     not null default now(),

  constraint ticket_area_non_vuota   check (trim(area_legale) <> ''),
  constraint ticket_titolo_non_vuoto check (trim(titolo)      <> ''),
  constraint ticket_desc_non_vuota   check (trim(descrizione) <> '')
);

-- IMMUTABLE helper for UTC date extraction.
-- AT TIME ZONE / timestamptz::date are STABLE (session-TimeZone-dependent) and
-- are rejected inside index expressions even inside a declared-IMMUTABLE wrapper.
-- Subtracting two absolute timestamptz literals is genuinely IMMUTABLE:
-- it does not depend on any session GUC.
create or replace function public.to_utc_date(ts timestamptz)
returns date language sql immutable parallel safe as
$$
  select '1970-01-01'::date
       + (extract(epoch from (ts - '1970-01-01 00:00:00+00'::timestamptz)) / 86400)::int
$$;

-- Drop explicitly so a re-run replaces any stale version (IF NOT EXISTS would skip it).
drop index if exists public.idx_tickets_one_per_day;

-- Regola «1 ticket attivo per giorno per cliente»
create unique index idx_tickets_one_per_day
  on public.tickets (cliente_id, public.to_utc_date(created_at))
  where stato in ('aperto', 'in_lavorazione', 'richiede_info');

create index if not exists idx_tickets_cliente_id     on public.tickets(cliente_id);
create index if not exists idx_tickets_stato          on public.tickets(stato);
create index if not exists idx_tickets_area_legale    on public.tickets(area_legale);
create index if not exists idx_tickets_professionista on public.tickets(professionista_id);

-- Trigger: aggiorna updated_at ad ogni modifica del ticket
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute procedure public.set_updated_at();


-- ── 6. ASSEGNAZIONI ───────────────────────────────────────────
--
--  Sostituisce matches.
--  professionista_id = chi prende in carico il ticket (ex helper_id)
--  cliente_id        = chi ha aperto il ticket       (ex seeker_id)
--  ticket_id         = il ticket associato            (ex richiesta_id, ora NOT NULL)
--
--  conferma_professionista + conferma_cliente:
--    entrambi devono essere true → il ticket viene marcato 'risolto'
--    (gestito atomicamente dalla funzione chiudi_ticket).

create table if not exists public.assegnazioni (
  id                      uuid               primary key default gen_random_uuid(),
  professionista_id       uuid               not null references public.profiles(id) on delete cascade,
  cliente_id              uuid               not null references public.profiles(id) on delete cascade,
  ticket_id               uuid               not null references public.tickets(id)   on delete cascade,
  stato                   assegnazione_stato not null default 'in_attesa',
  conferma_professionista boolean            not null default false,
  conferma_cliente        boolean            not null default false,
  created_at              timestamptz        not null default now(),

  constraint assegnazioni_no_self check (professionista_id <> cliente_id)
);

create index if not exists idx_assegnazioni_prof   on public.assegnazioni(professionista_id);
create index if not exists idx_assegnazioni_client on public.assegnazioni(cliente_id);
create index if not exists idx_assegnazioni_ticket on public.assegnazioni(ticket_id);


-- ── 7. MESSAGES ───────────────────────────────────────────────
--
--  FK rinominata: match_id → assegnazione_id.
--  La chat è possibile solo su assegnazioni in stato 'accettata'
--  (verificato in RLS).

create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  assegnazione_id uuid        not null references public.assegnazioni(id) on delete cascade,
  mittente_id     uuid        not null references public.profiles(id)     on delete cascade,
  testo           text        not null,
  ts              timestamptz not null default now(),

  constraint messages_testo_non_vuoto check (trim(testo) <> '')
);

create index if not exists idx_messages_assegnazione_ts on public.messages(assegnazione_id, ts);


-- ── 8. ROW LEVEL SECURITY ─────────────────────────────────────

alter table public.profiles     enable row level security;
alter table public.tickets      enable row level security;
alter table public.assegnazioni enable row level security;
alter table public.messages     enable row level security;

-- ── profiles ─────────────────────────────────────────────────
drop policy if exists "profiles: chiunque legge" on public.profiles;
drop policy if exists "profiles: owner aggiorna" on public.profiles;

create policy "profiles: chiunque legge" on public.profiles
  for select using (true);

create policy "profiles: owner aggiorna" on public.profiles
  for update
  using      (auth.uid() = id)
  with check (auth.uid() = id);

-- ── tickets ───────────────────────────────────────────────────
-- Clienti: leggono solo i propri ticket.
-- Professionisti: leggono tutti i ticket (bacheca pubblica dei ticket).
drop policy if exists "tickets: lettura cliente e professionisti" on public.tickets;
drop policy if exists "tickets: cliente inserisce"                on public.tickets;
drop policy if exists "tickets: partecipanti aggiornano"          on public.tickets;

create policy "tickets: lettura cliente e professionisti" on public.tickets
  for select using (
    auth.uid() = cliente_id
    or exists (
      select 1 from public.profiles
       where id = auth.uid() and ruolo = 'professionista'
    )
  );

create policy "tickets: cliente inserisce" on public.tickets
  for insert with check (auth.uid() = cliente_id);

create policy "tickets: partecipanti aggiornano" on public.tickets
  for update
  using      (auth.uid() = cliente_id or auth.uid() = professionista_id)
  with check (auth.uid() = cliente_id or auth.uid() = professionista_id);

-- ── assegnazioni ──────────────────────────────────────────────
drop policy if exists "assegnazioni: partecipanti leggono"    on public.assegnazioni;
drop policy if exists "assegnazioni: professionista crea"     on public.assegnazioni;
drop policy if exists "assegnazioni: partecipanti aggiornano" on public.assegnazioni;

create policy "assegnazioni: partecipanti leggono" on public.assegnazioni
  for select using (auth.uid() = professionista_id or auth.uid() = cliente_id);

create policy "assegnazioni: professionista crea" on public.assegnazioni
  for insert with check (auth.uid() = professionista_id);

create policy "assegnazioni: partecipanti aggiornano" on public.assegnazioni
  for update
  using      (auth.uid() = professionista_id or auth.uid() = cliente_id)
  with check (auth.uid() = professionista_id or auth.uid() = cliente_id);

-- ── messages ──────────────────────────────────────────────────
drop policy if exists "messages: partecipanti leggono" on public.messages;
drop policy if exists "messages: partecipanti inviano" on public.messages;

create policy "messages: partecipanti leggono" on public.messages
  for select using (
    exists (
      select 1 from public.assegnazioni a
       where a.id = assegnazione_id
         and (a.professionista_id = auth.uid() or a.cliente_id = auth.uid())
    )
  );

create policy "messages: partecipanti inviano" on public.messages
  for insert with check (
    mittente_id = auth.uid()
    and exists (
      select 1 from public.assegnazioni a
       where a.id = assegnazione_id
         and (a.professionista_id = auth.uid() or a.cliente_id = auth.uid())
         and a.stato = 'accettata'
    )
  );


-- ── 9. FUNZIONE: chiudi ticket (atomica, ACID) ────────────────
--
--  Sostituisce conferma_sessione().
--  In un'unica transazione:
--    1. Imposta entrambi i flag di conferma sull'assegnazione.
--    2. Porta il ticket a stato 'risolto'.
--    3. Aggiunge +50 punti al professionista.
--  Chiamata via supabase.rpc('chiudi_ticket', { p_assegnazione_id }) dal client.

create or replace function public.chiudi_ticket(p_assegnazione_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.assegnazioni
     set conferma_cliente        = true,
         conferma_professionista = true
   where id = p_assegnazione_id;

  update public.tickets t
     set stato      = 'risolto',
         updated_at = now()
    from public.assegnazioni a
   where a.id = p_assegnazione_id
     and t.id  = a.ticket_id;

  update public.profiles p
     set punti = punti + 50
    from public.assegnazioni a
   where a.id = p_assegnazione_id
     and p.id = a.professionista_id;
end;
$$;


-- ── 10. REALTIME ──────────────────────────────────────────────

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.assegnazioni;
alter publication supabase_realtime add table public.tickets;


-- ── 11. STORAGE bucket "allegati" ────────────────────────────
--
--  Bucket PRIVATO per documenti legali caricati dai clienti.
--  Convenzione path: {clienteId}/{ticketId}/{nome_file}
--  Il primo segmento del path corrisponde all'UID del mittente
--  (usato dal policy check con storage.foldername).

insert into storage.buckets (id, name, public)
values ('allegati', 'allegati', false)
on conflict (id) do nothing;

drop policy if exists "allegati: cliente carica"      on storage.objects;
drop policy if exists "allegati: autenticati leggono" on storage.objects;
drop policy if exists "allegati: cliente elimina"     on storage.objects;

create policy "allegati: cliente carica" on storage.objects
  for insert with check (
    bucket_id = 'allegati'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Lettura: qualsiasi utente autenticato (l'accesso al ticket è controllato a livello app).
-- In una versione production si farebbe un join su assegnazioni.
create policy "allegati: autenticati leggono" on storage.objects
  for select using (
    bucket_id = 'allegati'
    and auth.role() = 'authenticated'
  );

create policy "allegati: cliente elimina" on storage.objects
  for delete using (
    bucket_id = 'allegati'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ── 12. STORAGE bucket "avatars" ─────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: lettura pubblica" on storage.objects;
drop policy if exists "avatars: upload proprio"   on storage.objects;
drop policy if exists "avatars: update proprio"   on storage.objects;

create policy "avatars: lettura pubblica" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars: upload proprio" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: update proprio" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
