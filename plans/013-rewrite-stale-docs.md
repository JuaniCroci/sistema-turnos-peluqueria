# Plan 013: Rewrite the stale `AGENTS.md` and `README.md` to match the Supabase reality

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- AGENTS.md README.md package.json`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — docs only. The risk is documenting something inaccurately;
  mitigated by deriving every claim from the actual code/config.
- **Depends on**: none (but if 009/010/011 land first, document the new commands)
- **Category**: docs
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

`AGENTS.md` actively misleads. It describes a `better-sqlite3` / local-SQLite
stack (`DB_PATH`, `serverExternalPackages: ['better-sqlite3']`, "data/turnos.db
gitignored") that **no longer exists** — the project migrated to Supabase/Postgres.
An agent or contributor following `AGENTS.md` will look for files and patterns
that aren't there and will misunderstand the data layer entirely (this audit
session hit exactly that confusion). Wrong docs are worse than no docs. This plan
makes the docs describe the system as it actually is.

## Current state — concrete inaccuracies to fix

In `AGENTS.md`:

- `:14` references `scripts/fetch-better-sqlite3-prebuild.mjs` — file does not
  exist.
- `:15` "data/turnos.db gitignored" — no SQLite DB; storage is Supabase.
- `:16` "next.config.ts declara serverExternalPackages: ['better-sqlite3']" —
  `next.config.ts` actually contains only `{ reactStrictMode: true }`.
- `:33` ".env con AUTH*SECRET... DB_PATH" — `DB_PATH` is obsolete; real env is
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `GOOGLE_CLIENT_ID/SECRET`, `RECAPTCHA*\*`, NextAuth secrets.
- `:49` "better-sqlite3 en server: el modulo es nativo..." — gone; DB access is
  the Supabase JS client (`lib/supabase/server.ts`, service-role).
- `:57` "better-sqlite3@^12.10.0 (sync)" in the stack list — not a dependency.
- `:75` `DB_PATH=./data/turnos.db` in the env block — obsolete.

The real stack (from `package.json` + code): Next.js 15.5.19, React 19, TypeScript
5.7 (`strict: true`), `@supabase/supabase-js`, `next-auth@5 beta` (Credentials +
Google), `zod`, `bcryptjs`, `lucide-react`, `open-props`. Verification today:
`pnpm typecheck` + `pnpm build`.

`README.md` should be checked for the same SQLite-era claims and corrected.

## Commands you will need

| Purpose | Command      | Expected                                 |
| ------- | ------------ | ---------------------------------------- |
| Build   | `pnpm build` | exit 0 (docs don't affect build, sanity) |

## Scope

**In scope:**

- `AGENTS.md` (rewrite the stale sections)
- `README.md` (correct SQLite-era references; align env + commands)

**Out of scope:**

- Inventing process/policy not evidenced in the repo. Document what _is_, not what
  _should be_.
- The `plans/` directory docs — this plan's own index is maintained separately.

## Steps

### Step 1: Rewrite `AGENTS.md` data-layer + stack sections

Replace every `better-sqlite3` / SQLite / `DB_PATH` reference with the Supabase
reality:

- Data layer: Supabase Postgres via `@supabase/supabase-js`, accessed through the
  **service-role key** in `lib/supabase/server.ts` (bypasses RLS — note that the
  route handlers are the security boundary; cross-reference that RLS is enabled
  per plan 003 if it has landed).
- Schema source of truth: `scripts/init.sql` (+ `scripts/enable-rls.sql` if 003
  landed). Remove the claim that `lib/db/migrations.ts`/`seed.ts` hold the schema
  (those are removed in plan 008).
- Env vars: list the real ones (see Current state). Remove `DB_PATH`.
- `next.config.ts`: correct it to its actual content.

### Step 2: Update the "conventions" + verification sections

- If plans 009/010/011 have landed, document `pnpm lint`, `pnpm test`,
  `pnpm format:check`, and CI as the verification path, and **remove** the "no
  tests/lint/formatter" rule. If they have NOT landed yet, note that the owner has
  decided to adopt them (point to `plans/`), so the old prohibition is rescinded.
- Add a one-line pointer to `plans/README.md` as the active improvement backlog.

### Step 3: Correct `README.md`

Scan `README.md` for SQLite/`better-sqlite3`/`DB_PATH` and the old monorepo
description; correct to the Supabase + single Next.js app reality. Keep the
business-rules/spec content that is still accurate.

**Verify**: `grep -rin "better-sqlite3\|DB_PATH\|turnos.db" AGENTS.md README.md`
→ no matches (except where intentionally describing history, clearly labeled).

## Test plan

Docs change — no automated test. Verification is the grep in Step 3 returning
clean, and a human read confirming the data-layer section now matches
`lib/supabase/server.ts` + `scripts/init.sql`.

## Done criteria

- [ ] `grep -rin "better-sqlite3\|DB_PATH\|turnos.db" AGENTS.md README.md` returns
      no live (non-historical) matches.
- [ ] `AGENTS.md` env list matches the real `process.env.*` reads in the code.
- [ ] `next.config.ts` description matches the file.
- [ ] If 009/010/011 landed: the "no tests/lint" prohibition is removed and the
      real commands documented.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- You find a doc claim you cannot verify against code either way → leave it,
  flag it in the PR as "unverified", don't guess.

## Maintenance notes

- Keep `AGENTS.md` in sync when the stack changes — stale agent docs caused real
  confusion (this audit). Treat it as code.
- Reviewer: spot-check three corrected claims against the actual files.
