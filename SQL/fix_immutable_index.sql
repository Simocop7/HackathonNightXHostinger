-- ── Fix: replace non-IMMUTABLE index on tickets.created_at ──────────────────
--
--  Run this on an existing database to patch idx_tickets_one_per_day without
--  executing the full destructive schema.sql.
--
--  Root cause: timestamptz::date and AT TIME ZONE are STABLE in PostgreSQL
--  (they depend on the session TimeZone GUC), so PostgreSQL rejects them in
--  index expressions with ERROR 42P17.
--  Fix: use epoch arithmetic — subtracting two absolute timestamptz values
--  is genuinely IMMUTABLE regardless of session settings.

create or replace function public.to_utc_date(ts timestamptz)
returns date language sql immutable parallel safe as
$$
  select '1970-01-01'::date
       + (extract(epoch from (ts - '1970-01-01 00:00:00+00'::timestamptz)) / 86400)::int
$$;

drop index if exists public.idx_tickets_one_per_day;

create unique index idx_tickets_one_per_day
  on public.tickets (cliente_id, public.to_utc_date(created_at))
  where stato in ('aperto', 'in_lavorazione', 'richiede_info');
