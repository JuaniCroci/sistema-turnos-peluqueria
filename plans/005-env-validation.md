# Plan 005: Validate environment variables at startup (zod) and ship a `.env.example`

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- lib/supabase/server.ts lib/supabase/client.ts lib/utils/recaptcha.ts lib/auth/config.edge.ts`
> On mismatch vs "Current state", STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — adds a validation layer; the only failure mode is being too
  strict and refusing to boot when a var is legitimately optional (mitigated by
  marking optionals explicitly).
- **Depends on**: none
- **Category**: dx / security
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

Required secrets are read with silent empty-string fallbacks, so a
misconfigured deployment fails **late and cryptically** instead of refusing to
boot. `lib/supabase/server.ts` does
`process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''` — with the key missing, the app
builds and starts, then every DB call fails with an opaque Supabase auth error
that looks like a code bug, not a config problem. There is also no `.env.example`,
so a new contributor (or the owner on a fresh machine) has to reverse-engineer
the required variables from `grep`. This plan centralizes env access behind a
zod-validated module that fails fast with a clear message, and documents every
variable.

This overrides the `AGENTS.md` "defaults razonables" stance for secrets — by
owner decision, missing secrets should be a hard error, not a silent default.

## Current state

Env vars are read inline in several places with `?? ''` fallbacks:

- `lib/supabase/server.ts:3-4` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `lib/supabase/client.ts:3-4` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `lib/utils/recaptcha.ts:4` — `RECAPTCHA_SECRET_KEY`
- `lib/auth/config.edge.ts:13-14` — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `app/register/RegisterForm.tsx:22` — `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- NextAuth also expects `AUTH_SECRET` / `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

There is **no** `.env.example` in the repo (`ls -a` / `git ls-files | grep env`
→ nothing).

**Conventions:** `zod` is already a dependency and is the project's validation
tool (used in every route handler). Server-only modules live under `lib/`.

## Commands you will need

| Purpose   | Command          | Expected |
| --------- | ---------------- | -------- |
| Typecheck | `pnpm typecheck` | exit 0   |
| Build     | `pnpm build`     | exit 0   |

## Suggested executor toolkit

- `zod` skill for the schema. Note the **edge/runtime split**: `config.edge.ts`
  runs in the middleware (edge) context, so the env module it imports must not
  pull in Node-only APIs. Keep the env module dependency-light (zod only).

## Scope

**In scope:**

- `lib/config/env.ts` (create — zod-validated server env accessor)
- `.env.example` (create)
- Refactor the inline reads in `lib/supabase/server.ts`, `lib/supabase/client.ts`,
  `lib/utils/recaptcha.ts`, `lib/auth/config.edge.ts` to consume `lib/config/env.ts`.

**Out of scope:**

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in client components — `NEXT_PUBLIC_*` is
  inlined at build time and validated differently; leave the client read as-is,
  just document it in `.env.example`.
- Changing which variables are required vs optional beyond what's stated in Step 1.

## Steps

### Step 1: Create the validated env module

Create `lib/config/env.ts` that parses `process.env` with a zod schema and
exports a typed `env` object. Required (`z.string().min(1)`): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Optional (`.optional()`): `SUPABASE_ANON_KEY`,
`RECAPTCHA_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`AUTH_SECRET`/`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RECAPTCHA_REQUIRED`. On parse
failure, throw with a message that lists the missing/invalid keys (do NOT print
values). Parse once at module load.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Consume it from the Supabase clients and recaptcha

Replace the inline `process.env.X ?? ''` reads in `lib/supabase/server.ts`,
`lib/supabase/client.ts`, `lib/utils/recaptcha.ts`, `lib/auth/config.edge.ts`
with `env.X` from `lib/config/env.ts`. Keep behavior identical except that
missing **required** vars now throw at startup instead of producing `''`.

**Verify**: `pnpm typecheck` → exit 0 and `pnpm build` → exit 0.

### Step 3: Write `.env.example`

Create `.env.example` listing every variable with a short Spanish comment and a
placeholder (never a real value), grouped: Supabase, Auth/NextAuth, Google OAuth,
reCAPTCHA. Mark which are required for prod vs optional in dev.

**Verify**: `grep -c "=" .env.example` ≥ 8 (one line per variable).

### Step 4: Confirm `.env` stays ignored

Confirm `.gitignore` still excludes `.env*` except `.env.example`. If `.env.example`
is accidentally ignored, add a negation (`!.env.example`).

**Verify**: `git check-ignore .env.example` → no output (i.e. it is NOT ignored).

## Test plan

Manual until plan 010. With a deliberately-unset `SUPABASE_SERVICE_ROLE_KEY`,
`pnpm build` (or `pnpm dev`) should fail fast with a clear "missing
SUPABASE_SERVICE_ROLE_KEY" message rather than starting and erroring on first DB
call. If plan 010 has landed, add a unit test that `env.ts` throws on a missing
required var and parses a complete fixture — model after plan 010's setup.

## Done criteria

- [ ] `lib/config/env.ts` exists and is the single place `SUPABASE_*` and
      `RECAPTCHA_SECRET_KEY` are read on the server
      (`grep -rn "process.env.SUPABASE" lib app` returns matches only in
      `lib/config/env.ts`).
- [ ] `.env.example` exists, is tracked (`git check-ignore .env.example` empty),
      and contains no real secret values.
- [ ] `pnpm typecheck` and `pnpm build` exit 0.
- [ ] No files outside the in-scope list modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- `pnpm build` fails because `lib/config/env.ts` is imported into an edge/client
  bundle that can't access a var at build time — report; the module may need a
  server-only guard rather than eager parsing.
- A variable you marked "required" turns out to be legitimately unset in the
  working deployment — re-classify it as optional and note why.

## Maintenance notes

- New env vars should be added to `lib/config/env.ts` AND `.env.example` together
  — reviewers should reject a new `process.env.X` read that bypasses the module.
- Plan 001 introduces `RECAPTCHA_REQUIRED`; if 001 lands first, include it here;
  if this lands first, 001 adds it.
