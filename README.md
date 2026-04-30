# All In One Consulting

**All your business consultants, in one platform.**

B2B SaaS platform that connects SMEs with verified legal, tax, safety, and financial consultants. Clients open tickets and get a response from a specialist within hours. Built for the Hostinger Hackathon Night.

---

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **Language**: English UI

---

## Routes

```
/              Login / Register
/setup         Complete profile (client or consultant)
/dashboard     Client — ticket list + detail panel
/bacheca       Consultant — open tickets board
/ticket/nuovo  Open a new ticket
/aiuta         Consultant — respond to a ticket
/assegnazioni  Assignment management
/chat/:id      Real-time chat between client and consultant
/notifiche     Notifications
/profilo       User profile + points
/piani         Plans & pricing
```

---

## User roles

| Role | Flow |
|------|------|
| **Cliente** | Register → Setup (plan, type) → Dashboard → Open tickets → Chat with consultant |
| **Professionista** | Register → Setup (areas, credentials) → Bacheca → Pick tickets → Respond + Chat |

---

## Subscription plans

| Plan | Price | Response | Doc review | Video call |
|------|-------|----------|------------|------------|
| Pro | €999/year | 24h | 50 pages/mo | 30 min |
| Max | €1,499/year | 12h | 100 pages/mo | 1 hour |
| Enterprise | €2,999/year | 3h | 300 pages/mo | 2 hours |

All plans include the **Legal Vault** — a library of pre-approved templates (NDA, T&Cs, Cookie Policy, etc.).

**Add-on tokens** available for Pro & Max: +10 pages (€29/mo), +30 call minutes (€39/mo), +50 pages (€99/mo).

---

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Supabase setup

1. Run `SQL/schema.sql` in the Supabase SQL Editor (creates all tables, triggers, RLS policies, storage buckets)
2. **Authentication → Settings → disable "Enable email confirmations"**
3. If upgrading an existing DB, also run `SQL/fix_subscription_tier_enum.sql`

---

## Key features

- **Auto-assignment** — tickets are automatically routed to a matching consultant on creation
- **Realtime** — ticket status and chat update live via Supabase Realtime
- **File attachments** — clients and consultants upload documents to private Supabase Storage
- **Points system** — consultants earn +50 points per confirmed session via atomic Postgres RPC
- **Rate limiting** — 1 active ticket per client per day (enforced via partial unique index)
