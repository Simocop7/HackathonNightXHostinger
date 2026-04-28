-- ── Fix: aggiungi i valori corretti all'enum subscription_tier ──────────────
--
--  Il vecchio schema aveva ('basic', 'premium').
--  Il codice TypeScript usa 'pro' | 'max' | 'enterprise'.
--  Questo mismatch causava il fallimento silenzioso di updateProfilo()
--  (l'intera UPDATE veniva rifiutata dal DB, incluso profilo_completo = true).
--
--  Eseguire UNA SOLA VOLTA nell'SQL Editor di Supabase.

ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'max';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'enterprise';
