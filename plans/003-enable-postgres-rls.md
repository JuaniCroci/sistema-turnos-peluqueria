# Plan 003: Enable Row Level Security on all Supabase tables (defense in depth)

> **Executor instructions**: This plan is mostly SQL run in the Supabase project,
> plus a small code/doc change. Run every verification step. If anything in "STOP
> conditions" occurs, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- scripts/init.sql lib/supabase/server.ts lib/supabase/client.ts`
> On mismatch vs "Current state", STOP.

## Status

- **Priority**: P1
- **Effort**: M (mostly applying + verifying SQL against the live DB)
- **Risk**: MED — enabling RLS without policies blocks the roles it applies to.
  Because the app uses the **service-role key** (which bypasses RLS), enabling
  RLS will NOT break the app, but you must verify that, not assume it.
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

Every table (`users`, `categories`, `services`, `appointments`) is created in
`scripts/init.sql` **without RLS enabled**. The app currently survives this only
because all access goes through the Supabase service-role key, which bypasses
RLS, and because the public anon key (`lib/supabase/client.ts`) is unused and
not exposed to the browser.

That is a single point of failure. If the anon key is ever used client-side,
leaked, or someone later imports `supabaseClient`, **all data is readable and
writable by anyone** — including `users` rows with `password_hash` and
`ip_address`. Supabase's own dashboard flags tables without RLS as "unrestricted"
for exactly this reason. Enabling RLS with deny-by-default policies closes the
hole without changing app behavior (the service role still bypasses it).

## Current state

`scripts/init.sql` creates four tables and indexes but contains **no**
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and **no** `CREATE POLICY`
statements. Relevant excerpt (`scripts/init.sql:6-13`):

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('client', 'admin')) DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`lib/supabase/server.ts` (service-role client — bypasses RLS, used everywhere):

```ts
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```

`lib/supabase/client.ts` (anon client — **defined but never imported**; verify
with `grep -rn "supabase/client" app lib` → only the file itself).

**Convention**: schema changes are applied by hand in the Supabase SQL editor and
mirrored into `scripts/init.sql` (see the comments in `lib/db/migrations.ts`).

## Commands you will need

| Purpose            | Command / Action                         | Expected |
|--------------------|------------------------------------------|----------|
| Typecheck          | `pnpm typecheck`                         | exit 0   |
| Build              | `pnpm build`                             | exit 0   |
| Confirm anon unused| `grep -rn "supabase/client" app lib`     | only `lib/supabase/client.ts` |
| Apply SQL          | Supabase Dashboard → SQL Editor (manual) | success  |

## Scope

**In scope:**
- `scripts/init.sql` (append RLS statements so a fresh bootstrap is secure)
- `scripts/enable-rls.sql` (create — the idempotent script to run against the
  existing DB)
- A short note in `README.md` documenting that RLS is on and the app relies on
  the service role.

**Out of scope:**
- Removing the unused anon client — that's plan 008. (This plan only *verifies*
  it's unused so enabling RLS is safe.)
- Writing fine-grained per-user RLS policies that the app would depend on — the
  app's security model is app-layer + service-role; adding policies the app needs
  would be a larger architectural change. Here we only add **deny-by-default**
  (RLS on, no permissive policies for anon/authenticated), which the service role
  bypasses.

## Steps

### Step 1: Confirm the anon role is not relied upon

Run `grep -rn "supabase/client\|supabaseClient\|SUPABASE_ANON_KEY" app lib`.
Expected: matches only in `lib/supabase/client.ts`. If the anon client is used
anywhere else, **STOP** — enabling RLS could break that path and needs policies.

### Step 2: Write the idempotent enable-RLS script

Create `scripts/enable-rls.sql`:

```sql
-- Habilita RLS en todas las tablas. La app usa el service-role key, que
-- bypassa RLS, así que esto NO cambia el comportamiento de la app: solo
-- bloquea el acceso directo vía anon/authenticated si el anon key se filtra.
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- Sin políticas permisivas: deny-by-default para anon/authenticated.
-- (Opcional, futuro) lectura pública de catálogo:
-- CREATE POLICY "public read services" ON services FOR SELECT TO anon USING (active = true);
-- CREATE POLICY "public read categories" ON categories FOR SELECT TO anon USING (true);
```

### Step 3: Mirror into `init.sql`

Append the four `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` lines to the end of
`scripts/init.sql` (after the seed) so a fresh bootstrap is secure by default.

**Verify**: `pnpm typecheck` → exit 0 (no code changed, sanity only).

### Step 4: Apply to the live database

In the Supabase SQL editor, run `scripts/enable-rls.sql`. Then verify:

```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('users','categories','services','appointments');
```

Expected: `relrowsecurity = true` for all four.

### Step 5: Smoke-test the app still works

With the dev server running, exercise: list services (`/servicios`), log in,
create an appointment, admin lists appointments. All must work — they use the
service-role key, which bypasses RLS.

**Verify**: `pnpm build` → exit 0; the flows above succeed.

## Test plan

Manual (no harness yet). The decisive check is Step 4's `pg_class` query (RLS on)
plus Step 5 (app unaffected). If plan 010 has landed, no unit test applies here —
this is a database-state change; note that in the PR description instead.

## Done criteria

- [ ] `scripts/enable-rls.sql` exists and is idempotent (safe to run twice).
- [ ] `scripts/init.sql` ends with RLS enabled on all four tables
      (`grep -c "ENABLE ROW LEVEL SECURITY" scripts/init.sql` returns 4).
- [ ] Live DB: `relrowsecurity = true` on all four tables (Step 4 query).
- [ ] App flows in Step 5 still succeed (service role bypasses RLS).
- [ ] `pnpm build` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- Step 1 finds the anon client is actually used → STOP; this plan would break it
  without policies.
- After enabling RLS, any app flow in Step 5 breaks → it means some path is NOT
  using the service role; STOP and report which flow.

## Maintenance notes

- If a future feature moves any read to the browser via the anon key, it will hit
  the deny-by-default wall — that's the moment to add a scoped `CREATE POLICY`,
  not to disable RLS.
- Reviewer: confirm the SQL was actually applied to the live project, not just
  committed to the repo (the repo file alone changes nothing in prod).
