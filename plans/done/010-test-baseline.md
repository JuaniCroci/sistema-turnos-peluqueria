# Plan 010: Establish an automated test baseline with Vitest

> **⚠️ This plan intentionally OVERRIDES `AGENTS.md`.** `AGENTS.md:37` says
> _"No hay tests... No agregarlos a menos que el usuario lo pida explícitamente."_
> The project **owner has explicitly requested** a test baseline and instructed us
> to ignore `AGENTS.md`. Plan 013 updates `AGENTS.md` to match.
>
> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- package.json`
> Re-read `package.json` before editing scripts on any mismatch.

## Status

- **Priority**: P1 (unblocks regression tests for every other plan)
- **Effort**: M
- **Risk**: LOW — adds a test harness and a few tests; no app code changes.
- **Depends on**: none (lands cleanly before or after 009)
- **Category**: tests
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

The app has **zero automated tests**. The only verification is `tsc` + `next
build` + manual curl. For code that handles authentication, money (integer
cents), booking races, timezone math, and anti-abuse limits, that is a thin
safety net — every change risks a silent regression in logic the type-checker
can't see. This plan installs a fast unit-test harness (Vitest) and seeds it with
tests for the **pure, high-value logic** that's cheap to test and most dangerous
to get wrong. It deliberately does **not** attempt full integration/E2E coverage
(out of scope), only a credible baseline that later plans extend.

## Current state

- No test runner, no test files (`git ls-files | grep -iE '\.test\.|\.spec\.|vitest|jest'`
  → nothing). `package.json` has no `test` script.
- High-value pure logic that is currently untested and easy to unit-test:
  - `lib/utils/format.ts` — `formatPrice` (cents → currency), `formatDuration`,
    date/time formatters (es-AR).
  - `lib/utils/password.ts` — `hashPassword` / `verifyPassword` (bcryptjs).
  - `lib/db/flatten.ts` — `flattenRow` (recursive nested-object flattening used
    to shape Supabase joins).
  - `lib/auth/users.ts` — `generateUniqueUsername` logic (pure string handling;
    note it calls `findUserByUsername`, so test the slug/truncation via a mocked
    lookup, or extract the pure part).
- Stack: ESM, TypeScript `^5.7.2`, `@/*` alias, React 19, pnpm.

## Commands you will need

| Purpose          | Command              | Expected |
| ---------------- | -------------------- | -------- |
| Install dev deps | `pnpm add -D vitest` | exit 0   |
| Run tests        | `pnpm test`          | all pass |
| Typecheck        | `pnpm typecheck`     | exit 0   |

## Suggested executor toolkit

- Vitest is the right fit (fast, ESM-native, TS out of the box, Jest-compatible
  API). Configure the `@/*` alias in `vitest.config.ts` via `vite-tsconfig-paths`
  or an explicit `resolve.alias` mirroring `tsconfig.json`.

## Scope

**In scope:**

- `package.json` (add `vitest`, `vite-tsconfig-paths`; add `test` + `test:watch`
  scripts)
- `vitest.config.ts` (create)
- `lib/utils/format.test.ts`, `lib/utils/password.test.ts`,
  `lib/db/flatten.test.ts` (create — the seed tests)

**Out of scope:**

- Integration tests that hit Supabase or NextAuth — needs a test DB/mocks; a
  separate, larger plan.
- Component/DOM tests (`@testing-library/react`) — separate follow-up.
- Changing any source file to make it testable, beyond a **pure, behavior-preserving**
  extraction if one is unavoidable (and only with a STOP-and-confirm note).

## Steps

### Step 1: Install and configure Vitest

Add devDeps `vitest` and `vite-tsconfig-paths`. Create `vitest.config.ts` with
the tsconfig-paths plugin (so `@/...` imports resolve), `test.environment = 'node'`,
and `globals: true` (or import `describe/it/expect` explicitly).

**Verify**: `npx vitest run` → "no test files found" (config loads cleanly).

### Step 2: Add scripts

In `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.

**Verify**: `pnpm test` → runs (no files yet is acceptable this step).

### Step 3: Write the seed tests

- `lib/utils/format.test.ts` — `formatPrice(300000)` → the es-AR currency string
  the app expects (read `formatPrice` first and assert its **actual** output;
  don't assume). Cover 0 cents and a large value. Cover `formatDuration` for
  minutes < 60, exactly 60, and > 60.
- `lib/utils/password.test.ts` — `verifyPassword(plain, hashPassword(plain))` is
  `true`; a wrong password is `false`; two hashes of the same input differ (salt).
- `lib/db/flatten.test.ts` — a nested `{ service: { name, category: { name } } }`
  flattens to `service_name`, `service_category_name`; `null` nested values are
  preserved, arrays are not recursed.

**Verify**: `pnpm test` → all pass; at least 3 test files, ~10+ assertions.

### Step 4: Confirm typecheck still clean

**Verify**: `pnpm typecheck` → exit 0 (test files are typed too).

## Test plan

The deliverable _is_ the test suite. Success = `pnpm test` green with the three
seed files. These also become the **pattern** that every later plan references
for "model your new test after `lib/utils/format.test.ts`".

## Done criteria

- [ ] `pnpm test` exits 0 with ≥ 3 passing test files.
- [ ] `vitest.config.ts` resolves the `@/*` alias (a test importing `@/lib/...`
      passes).
- [ ] `pnpm typecheck` exits 0.
- [ ] `package.json` has `test` and `test:watch` scripts.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- A seed test reveals an actual bug (e.g. `formatPrice` output is wrong) → do NOT
  "fix" the source to make the test green; STOP and report it as a finding — the
  test documenting current behavior may be correct and the code wrong, which is a
  separate decision.
- `vitest` can't resolve `@/*` or chokes on the ESM/TS setup → report the exact
  error; do not switch to Jest without owner sign-off (Vitest is the chosen tool).

## Maintenance notes

- Later plans (002 datetime, 006 slot-conflict, 001 clientIp) explicitly say
  "if plan 010 has landed, add a regression test modeled after this suite." This
  plan is their enabler.
- Keep tests pure/fast; push DB-touching tests into a future integration-test
  plan with a dedicated test database.
- Reviewer: confirm the assertions check **real** outputs (the executor read the
  functions), not invented expected values.
