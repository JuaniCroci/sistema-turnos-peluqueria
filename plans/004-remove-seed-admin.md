# Plan 004: Remove the committed seed admin account; secure the DB bootstrap

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- scripts/init.sql`
> On mismatch vs "Current state", STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — removes seed data from a bootstrap script; does not touch app
  code. The only risk is leaving an environment with no admin (Step 3 addresses).
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

`scripts/init.sql` seeds an `admin@barberia.test` account **with a committed
bcrypt password hash** (a hardcoded credential living in version control). If
this script is ever run against the production database — which is exactly its
stated purpose ("Ejecutar en Supabase SQL Editor") — the production system ships
with a known default administrator whose credential is in the repo's git history.
Anyone who reads the repo can attempt to authenticate as that admin. A second
seeded account (`juani`) has the same problem at lower severity (client role).

**Secret-handling note for the executor**: do NOT copy the hash value anywhere
(not into commits, not into the PR description). Reference it only by location.
Because the credential has been in git history, treat it as **burned** — the fix
is removal *plus* ensuring no live environment still has that account with that
password.

## Current state

`scripts/init.sql:62-66` inserts two seed users with committed `password_hash`
values (a hardcoded admin credential and a client credential — values not
reproduced here per the secret-handling rule). The seed uses
`ON CONFLICT (email) DO NOTHING`.

The categories/services seed in the same file (`scripts/init.sql:68-92`) is
**legitimate demo content** and is fine to keep or make optional — it contains no
credentials.

## Commands you will need

| Purpose   | Command          | Expected |
|-----------|------------------|----------|
| Typecheck | `pnpm typecheck` | exit 0   |
| Build     | `pnpm build`     | exit 0   |

## Scope

**In scope:**
- `scripts/init.sql` (remove the user seed; add an admin-bootstrap note)
- `scripts/create-admin.sql` (create — a parameterized, run-by-hand admin creator)

**Out of scope:**
- App auth code — unchanged.
- The categories/services demo seed — keep (no credentials).
- `lib/db/seed.ts` — that's plan 008 (dead code).

## Steps

### Step 1: Remove the user seed from `init.sql`

Delete the `INSERT INTO users (...) VALUES (...) ON CONFLICT ...` block
(`scripts/init.sql:62-66`). Leave the `categories` and `services` seeds intact.

**Verify**: `grep -n "INSERT INTO users" scripts/init.sql` → no match.

### Step 2: Provide a safe, parameterized admin-bootstrap script

Create `scripts/create-admin.sql` with a clearly-marked placeholder and an
instruction comment (Spanish) telling the operator to generate a bcrypt hash
locally and paste it, and to use a strong unique password — never a value from
the repo:

```sql
-- Crear el admin inicial. NO commitear el hash real.
-- Generá el hash localmente (ver README) y reemplazá <PEGAR_HASH_BCRYPT>.
INSERT INTO users (email, username, password_hash, role)
VALUES ('CAMBIAR@dominio.real', 'admin', '<PEGAR_HASH_BCRYPT>', 'admin')
ON CONFLICT (email) DO NOTHING;
```

Add a one-paragraph note to `README.md` explaining how to generate the hash with
the repo's existing `bcryptjs` (a tiny `node -e` snippet) and that the seed admin
was intentionally removed for security.

**Verify**: `grep -n "PEGAR_HASH_BCRYPT" scripts/create-admin.sql` → match.

### Step 3: Rotate / verify the live environment

This step is operational, not code. In the PR description, instruct the owner to:
- check whether `admin@barberia.test` (and `juani`) exist in the production DB;
- if so, either delete them or reset their passwords to strong unique values;
- create the real admin via `scripts/create-admin.sql`.

Do NOT perform destructive DB actions yourself unless the owner explicitly asks.

**Verify**: PR description contains the rotation checklist.

## Test plan

Manual. After Step 1–2, a fresh bootstrap (`init.sql` then `create-admin.sql`
with a real hash) yields exactly one admin with an operator-chosen password and
no repo-known credentials. No automated test applies (bootstrap script change).

## Done criteria

- [ ] `grep -n "INSERT INTO users" scripts/init.sql` returns no match.
- [ ] `scripts/create-admin.sql` exists with a placeholder (no real hash).
- [ ] No bcrypt hash value appears in any file changed by this plan
      (`git diff` review — locations/placeholders only).
- [ ] `README.md` documents admin creation + the rotation note.
- [ ] `pnpm build` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- You discover app code depends on the seeded `admin@barberia.test` (e.g. a test
  or hardcoded reference): `grep -rn "barberia.test\|juani@test" .` — if found in
  code, report before removing the seed.

## Maintenance notes

- Never reintroduce credentialed seeds into a script meant to run against prod.
- Reviewer: confirm the rotation checklist (Step 3) was actually executed against
  the live DB before closing — the code change alone doesn't remove an account
  that already exists in production.
