# Plan 008: Remove dead and duplicate code

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- lib/db/migrations.ts lib/db/seed.ts lib/supabase/client.ts app/api/auth/register/route.ts`
> On mismatch vs "Current state", STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — removes code with no live importers; risk is removing something
  actually referenced, which Step 1 guards against.
- **Depends on**: none (but if plan 001 has not landed, see Step 3 note)
- **Category**: tech-debt
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

The migration from `better-sqlite3` to Supabase left behind several artifacts
that are now dead or duplicate, and each one is a trap for a future contributor
or agent:

1. `lib/db/migrations.ts` and `lib/db/seed.ts` are **reference-only files** (their
   own comments say so) that **duplicate** the schema in `scripts/init.sql`. Two
   copies of a schema drift; the SQL is the source of truth.
2. `lib/supabase/client.ts` exports an anon Supabase client that is **never
   imported**. As a latent security footgun (see plan 003) it's better gone.
3. `app/api/auth/register/route.ts` is a REST registration endpoint that **nothing
   in the app calls** — the registration form uses the Server Action
   (`app/register/actions.ts`). It re-implements registration with a _different_
   reCAPTCHA field name and is a second, easy-to-forget bypass surface.

## Current state

- `lib/db/migrations.ts:1-7` — header comment: _"Este archivo se mantiene como
  referencia pero no se importa en runtime"_; exports `MIGRATIONS_SQL` (a copy of
  the `CREATE TABLE`s in `scripts/init.sql`).
- `lib/db/seed.ts:1-7` — comment-only file: _"Se mantiene como referencia"_.
- `lib/supabase/client.ts` — exports `supabaseClient` (anon). `grep -rn
"supabase/client\|supabaseClient" app lib` → only the file itself.
- `app/api/auth/register/route.ts` — POST handler; `grep -rn "api/auth/register"
app components lib` (excluding the route file) → no callers.

## Commands you will need

| Purpose        | Command                                       | Expected  |
| -------------- | --------------------------------------------- | --------- |
| Find importers | `grep -rn "<symbol/path>" app lib components` | see steps |
| Typecheck      | `pnpm typecheck`                              | exit 0    |
| Build          | `pnpm build`                                  | exit 0    |

## Scope

**In scope (delete):**

- `lib/db/migrations.ts`
- `lib/db/seed.ts`
- `lib/supabase/client.ts`
- `app/api/auth/register/route.ts`

**Out of scope (keep):**

- `lib/db/connection.ts`, `lib/db/flatten.ts` — both **used** (`getDb`,
  `flattenRow`). Do NOT delete.
- `lib/supabase/server.ts` — the service-role client; used everywhere. Keep.
- `app/register/actions.ts` — the live registration path. Keep.
- `scripts/init.sql` — the schema source of truth. Keep.

## Steps

### Step 1: Prove each target is unreferenced

Run and confirm **zero** live importers for each (excluding the file itself):

```
grep -rn "db/migrations\|MIGRATIONS_SQL" app lib components
grep -rn "db/seed" app lib components
grep -rn "supabase/client\|supabaseClient" app lib components
grep -rn "api/auth/register" app lib components   # excluding the route.ts being deleted
```

If any returns a live importer, **STOP** and report — that target is not dead.

### Step 2: Delete the four files

Remove the four in-scope files.

**Verify**: `pnpm typecheck` → exit 0 (no broken imports).

### Step 3: Build

**Verify**: `pnpm build` → exit 0. Confirm the route `/api/auth/register` no
longer appears in the build's route list.

> **Note on plan 001**: plan 001 hardens `app/api/auth/register/route.ts`. If 001
> has already landed, deleting the file here removes that now-redundant hardening
> — expected. If this plan lands first, 001's Step 3 becomes a no-op; that's fine,
> the Server Action path is the one that matters.

## Test plan

Manual: after deletion, register a new user through the UI (`/register`) → still
works (it uses the Server Action, untouched). `curl -X POST
.../api/auth/register` → now returns 404 (route gone), which is acceptable since
nothing depended on it. No automated test needed for deletions; if plan 010 has
landed, ensure its suite still passes after removal.

## Done criteria

- [ ] The four in-scope files no longer exist (`git status` shows them deleted).
- [ ] `grep -rn "MIGRATIONS_SQL\|supabase/client\|db/seed" app lib components`
      returns no matches.
- [ ] `pnpm typecheck` and `pnpm build` exit 0.
- [ ] Registering via `/register` still works (manual).
- [ ] No files outside the in-scope deletions were modified beyond the index.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- Step 1 finds a live importer of any target → STOP; it isn't dead.
- `pnpm build` fails after deletion → a hidden import existed; restore and report
  which file referenced the deleted symbol.

## Maintenance notes

- The schema's single source of truth is now unambiguously `scripts/init.sql`
  (plus `scripts/enable-rls.sql` from plan 003). Keep it that way — don't
  reintroduce a TS copy of the schema.
- Reviewer: confirm `lib/db/connection.ts` and `lib/db/flatten.ts` were NOT
  deleted (they're load-bearing).
