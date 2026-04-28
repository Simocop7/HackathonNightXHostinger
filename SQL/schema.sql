
-- ============================================================
--  StudyMatch — schema Supabase (idempotente)
-- ============================================================

-- ── ENUM TYPES ────────────────────────────────────────────────

do $$ begin
  create type match_stato as enum ('richiesta', 'accettato', 'rifiutato');
exception when duplicate_object then null; end $$;

do $$ begin
  create type richiesta_scadenza as enum ('oggi', 'domani', 'settimana');
exception when duplicate_object then null; end $$;

do $$ begin
  create type richiesta_stato as enum ('aperta', 'chiusa');
exception when duplicate_object then null; end $$;

-- ── PROFILES (estende auth.users 1-a-1) ──────────────────────
-- foto_url punta a Supabase Storage (URL), non base64.
-- is_seed distingue gli utenti demo dai reali.

create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  nome             text        not null,
  cognome          text        not null,
  username         text        not null,
  universita       text        not null default '',
  facolta          text        not null default '',
  cerca_aiuto_in   text[]      not null default '{}',
  puo_aiutare_in   text[]      not null default '{}',
  biografia        text        not null default '',
  foto_url         text,
  linkedin         text,
  punti            integer     not null default 0,
  profilo_completo boolean     not null default false,
  is_seed          boolean     not null default false,
  created_at       timestamptz not null default now(),

  constraint profiles_username_unique unique (username),
  constraint profiles_punti_non_neg   check  (punti >= 0)
);

create index if not exists idx_profiles_username on public.profiles(username);

-- ── TRIGGER: crea profilo al signup ──────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, cognome, username, universita)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome',     ''),
    coalesce(new.raw_user_meta_data->>'cognome',  ''),
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'universita','')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RICHIESTE_AIUTO ───────────────────────────────────────────

create table if not exists public.richieste_aiuto (
  id          uuid               primary key default gen_random_uuid(),
  user_id     uuid               not null references public.profiles(id) on delete cascade,
  materia     text               not null,
  descrizione text               not null,
  scadenza    richiesta_scadenza,
  stato       richiesta_stato    not null default 'aperta',
  created_at  timestamptz        not null default now(),

  constraint richiesta_materia_non_vuota     check (trim(materia)     <> ''),
  constraint richiesta_descrizione_non_vuota check (trim(descrizione) <> '')
);

create index if not exists idx_richieste_user_stato on public.richieste_aiuto(user_id, stato);
create index if not exists idx_richieste_stato       on public.richieste_aiuto(stato);

-- ── MATCHES ───────────────────────────────────────────────────
-- helper_id = chi offre aiuto (swipe destra)
-- seeker_id = chi ha pubblicato la richiesta

create table if not exists public.matches (
  id              uuid        primary key default gen_random_uuid(),
  helper_id       uuid        not null references public.profiles(id) on delete cascade,
  seeker_id       uuid        not null references public.profiles(id) on delete cascade,
  richiesta_id    uuid        references public.richieste_aiuto(id) on delete set null,
  stato           match_stato not null default 'richiesta',
  conferma_helper boolean     not null default false,
  conferma_seeker boolean     not null default false,
  materia         text,
  created_at      timestamptz not null default now(),

  constraint matches_no_self check (helper_id <> seeker_id)
);

create index if not exists idx_matches_helper_id on public.matches(helper_id);
create index if not exists idx_matches_seeker_id on public.matches(seeker_id);

-- ── MESSAGES ──────────────────────────────────────────────────

create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  mittente_id uuid        not null references public.profiles(id) on delete cascade,
  testo       text        not null,
  ts          timestamptz not null default now(),

  constraint messages_testo_non_vuoto check (trim(testo) <> '')
);

create index if not exists idx_messages_match_ts on public.messages(match_id, ts);

-- ── SKIPS ─────────────────────────────────────────────────────

create table if not exists public.skips (
  from_user_id uuid        not null references public.profiles(id) on delete cascade,
  to_user_id   uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (from_user_id, to_user_id),
  constraint skips_no_self check (from_user_id <> to_user_id)
);

create index if not exists idx_skips_from_user on public.skips(from_user_id);

-- ── RLS ───────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.richieste_aiuto enable row level security;
alter table public.matches         enable row level security;
alter table public.messages        enable row level security;
alter table public.skips           enable row level security;

-- profiles
drop policy if exists "profiles: chiunque legge"  on public.profiles;
drop policy if exists "profiles: owner aggiorna"  on public.profiles;
create policy "profiles: chiunque legge" on public.profiles for select using (true);
create policy "profiles: owner aggiorna" on public.profiles for update
  using  (auth.uid() = id) with check (auth.uid() = id);

-- richieste_aiuto
drop policy if exists "richieste: chiunque legge"  on public.richieste_aiuto;
drop policy if exists "richieste: owner inserisce" on public.richieste_aiuto;
drop policy if exists "richieste: owner aggiorna"  on public.richieste_aiuto;
create policy "richieste: chiunque legge"  on public.richieste_aiuto for select using (true);
create policy "richieste: owner inserisce" on public.richieste_aiuto for insert with check (auth.uid() = user_id);
create policy "richieste: owner aggiorna"  on public.richieste_aiuto for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- matches
drop policy if exists "matches: partecipanti leggono"   on public.matches;
drop policy if exists "matches: helper crea"            on public.matches;
drop policy if exists "matches: partecipanti aggiornano" on public.matches;
create policy "matches: partecipanti leggono" on public.matches for select
  using (auth.uid() = helper_id or auth.uid() = seeker_id);
create policy "matches: helper crea" on public.matches for insert
  with check (auth.uid() = helper_id);
create policy "matches: partecipanti aggiornano" on public.matches for update
  using  (auth.uid() = helper_id or auth.uid() = seeker_id)
  with check (auth.uid() = helper_id or auth.uid() = seeker_id);

-- messages
drop policy if exists "messages: partecipanti leggono" on public.messages;
drop policy if exists "messages: partecipanti inviano" on public.messages;
create policy "messages: partecipanti leggono" on public.messages for select
  using (exists (
    select 1 from public.matches m
     where m.id = match_id
       and (m.helper_id = auth.uid() or m.seeker_id = auth.uid())
  ));
create policy "messages: partecipanti inviano" on public.messages for insert
  with check (
    mittente_id = auth.uid()
    and exists (
      select 1 from public.matches m
       where m.id = match_id
         and (m.helper_id = auth.uid() or m.seeker_id = auth.uid())
         and m.stato = 'accettato'
    )
  );

-- skips
drop policy if exists "skips: owner legge"    on public.skips;
drop policy if exists "skips: owner inserisce" on public.skips;
drop policy if exists "skips: owner elimina"  on public.skips;
create policy "skips: owner legge"    on public.skips for select using (auth.uid() = from_user_id);
create policy "skips: owner inserisce" on public.skips for insert with check (auth.uid() = from_user_id);
create policy "skips: owner elimina"  on public.skips for delete  using (auth.uid() = from_user_id);

-- ── FUNZIONE: conferma sessione (atomica, ACID) ───────────────
-- Aggiorna flags E assegna +50 punti all'helper in un'unica transazione.
-- Chiamata via supabase.rpc() dal client.

create or replace function public.conferma_sessione(p_match_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.matches
     set conferma_seeker = true,
         conferma_helper = true
   where id = p_match_id;

  update public.profiles p
     set punti = punti + 50
    from public.matches m
   where m.id = p_match_id and p.id = m.helper_id;
end;
$$;

-- ── REALTIME ──────────────────────────────────────────────────

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;

-- ── STORAGE bucket "avatars" ──────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: lettura pubblica" on storage.objects;
drop policy if exists "avatars: upload proprio"   on storage.objects;
drop policy if exists "avatars: update proprio"   on storage.objects;
create policy "avatars: lettura pubblica" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars: upload proprio" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars: update proprio" on storage.objects for update
  using  (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);