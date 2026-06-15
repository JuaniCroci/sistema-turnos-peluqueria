# Plan 011: Add a CI pipeline (GitHub Actions) that gates typecheck, lint, test, build

> **⚠️ This plan intentionally OVERRIDES `AGENTS.md`.** `AGENTS.md:80` lists
> "CI/CD" as out of scope. The project **owner has explicitly requested** CI and
> instructed us to ignore `AGENTS.md`. Plan 013 updates `AGENTS.md`.
>
> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- package.json .github`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW — adds a CI workflow; affects PR checks only, not runtime.
- **Depends on**: **009** (provides `pnpm lint` / `format:check`) and **010**
  (provides `pnpm test`). Do NOT add those steps to CI before the scripts exist.
- **Category**: dx
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

The project deploys to Vercel but has no pre-merge verification — a PR can break
the typecheck or build and only fail at deploy time. Once plans 009 and 010 add
lint and tests, a CI workflow turns all four verification commands into an
automatic gate on every push/PR, which is the cheapest possible insurance against
regressions and the natural home for the verification baseline this audit kept
referencing.

## Current state

- No `.github/workflows/` directory (`git ls-files | grep github` → nothing).
- `package.json` engines: `"node": ">=24.14.1"`, `"pnpm": ">=10"`;
  `"packageManager": "pnpm@10.33.0"`. `.nvmrc` = `24.14.1`.
- Scripts available **after 009 + 010**: `typecheck`, `lint`, `format:check`,
  `test`, `build`.

## Commands you will need

| Purpose              | Command                                                                  | Expected                          |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| Verify scripts exist | `cat package.json` (check scripts)                                       | typecheck/lint/test/build present |
| Local dry run        | `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build` | all exit 0                        |

## Scope

**In scope:**

- `.github/workflows/ci.yml` (create)

**Out of scope:**

- Deployment in CI — Vercel's Git integration already handles deploys; CI here is
  verification only. Do not add a deploy job.
- Caching beyond pnpm's built-in `actions/setup-node` cache — keep it simple.
- Secrets — none are needed for typecheck/lint/test/build (the test suite from
  plan 010 is pure and needs no DB). If a step needs a secret, STOP (see below).

## Steps

### Step 1: Confirm prerequisites

Confirm `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm format:check`
all exist and pass locally. If `lint`/`test` are missing, plans 009/010 haven't
landed — **STOP** and do those first.

**Verify**: the local dry-run command above exits 0.

### Step 2: Write the workflow

Create `.github/workflows/ci.yml` triggered on `push` and `pull_request`:

- `runs-on: ubuntu-latest`
- `pnpm/action-setup@v4` with version from `packageManager` (10.33.0)
- `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: pnpm`
- `pnpm install --frozen-lockfile`
- run, as separate steps so failures are legible: `pnpm typecheck`,
  `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`.

**Verify**: YAML is valid (`npx --yes yaml-lint .github/workflows/ci.yml` or a
GitHub Actions linter) and the job list matches the five commands.

### Step 3: Confirm green on a branch

Push the branch and confirm the Actions run passes all steps. (If you cannot push
per operator policy, note in the PR that CI must be confirmed green before merge.)

## Test plan

CI _is_ the test infrastructure. Success = the workflow runs all five steps green
on a pushed branch. No app code changes.

## Done criteria

- [ ] `.github/workflows/ci.yml` exists and runs typecheck, lint, format:check,
      test, build as distinct steps.
- [ ] `pnpm install --frozen-lockfile` succeeds in CI (lockfile is in sync).
- [ ] The workflow passes green on a branch (or the PR notes it must, if pushing
      is disallowed).
- [ ] `plans/README.md` status row updated.

## STOP conditions

- `pnpm install --frozen-lockfile` fails in CI → the lockfile drifted; report
  rather than regenerating it inside CI.
- Any verification step needs a secret/env var to pass (it shouldn't — keep the
  test suite pure per plan 010) → STOP and report which step and why.

## Maintenance notes

- When integration tests (future plan) need a database, add a `services:` Postgres
  container or Supabase test project and the required secrets — that's a deliberate
  extension, not part of this baseline.
- Reviewer: confirm the Node version comes from `.nvmrc` so CI matches local/Vercel.
