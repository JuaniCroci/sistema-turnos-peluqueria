# Plan 009: Add an ESLint + Prettier baseline

> **⚠️ This plan intentionally OVERRIDES `AGENTS.md`.** `AGENTS.md:37` states
> _"No hay tests, lint ni formatter configurados... No agregarlos a menos que el
> usuario lo pida explícitamente."_ The project **owner has explicitly requested**
> lint/formatter for this round and instructed us to ignore `AGENTS.md` (it was
> authored by a third party and is out of date). Plan 013 updates `AGENTS.md`.
>
> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- package.json`
> On mismatch, re-read `package.json` before editing scripts.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — a strict config can surface dozens of pre-existing violations.
  Mitigated by starting from Next.js's recommended config and **not** turning the
  initial run into a blocking gate until violations are triaged (Step 4).
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

There is no linter or formatter, so style is enforced only by reviewer attention
and `tsc`. For a codebase with `strict: true` TypeScript and a "cero `any`"
intent, a linter catches the violations the type-checker doesn't (unused vars,
floating promises, exhaustive-deps, accidental `any`), and a formatter ends
style debates. This sets up the baseline that plan 011 (CI) will enforce.

## MANDATORY rule — ban `any` (non-negotiable, owner-required)

The project is 100% TypeScript with `strict: true`. The owner has made one rule
**mandatory and not downgradeable**: explicit `any` is a lint **error**. Without
it, agents and contributors quietly produce "JavaScript camouflaged as
TypeScript" — `any` escape hatches that defeat the entire point of the type
system. This rule must ship as an `error` (not `warn`, not `off`) and must
survive the Step 4 triage no matter how many violations it surfaces:

- `@typescript-eslint/no-explicit-any: 'error'` — bans explicit `any`.
- `@typescript-eslint/ban-ts-comment: 'error'` — bans `@ts-ignore`/`@ts-nocheck`
  without an explanatory description (another common type-system escape hatch).

If enabling these surfaces many pre-existing violations, the fix is to **type the
code properly** (or use `unknown` + narrowing), not to disable the rule. If the
volume is genuinely unmanageable in one pass, see the STOP condition — the
resolution is owner sign-off on a phased cleanup, never silently turning the rule
off.

## Current state

`package.json` scripts today:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit"
}
```

Stack facts: Next.js `15.5.19`, React 19, TypeScript `^5.7.2`, pnpm `10.x`, ESM,
`@/*` path alias. No `.eslintrc*`, no `eslint.config.*`, no `.prettierrc` exist
(`git ls-files | grep -iE 'eslint|prettier'` → nothing).

## Commands you will need

| Purpose         | Command             | Expected  |
| --------------- | ------------------- | --------- |
| Install dev dep | `pnpm add -D <pkg>` | exit 0    |
| Typecheck       | `pnpm typecheck`    | exit 0    |
| Lint (new)      | `pnpm lint`         | see steps |
| Format check    | `pnpm format:check` | see steps |

## Suggested executor toolkit

- Next.js ships an ESLint config (`eslint-config-next`) wired for the App Router.
  On Next 15.5 prefer the **flat config** (`eslint.config.mjs`). Use
  `next lint` only if you keep the legacy setup — note `next lint` is itself being
  deprecated in favor of the ESLint CLI, so prefer invoking `eslint` directly.

## Scope

**In scope:**

- `package.json` (add devDeps + `lint`, `lint:fix`, `format`, `format:check` scripts)
- `eslint.config.mjs` (create — flat config)
- `.prettierrc.json` + `.prettierignore` (create)
- `.eslintignore` or flat-config `ignores` (build output, `pnpm-lock.yaml`, etc.)

**Out of scope:**

- Auto-fixing the entire codebase in this plan beyond `--fix` safe fixes +
  formatting (Step 3). Do NOT hand-edit logic to satisfy a rule; if a rule fights
  the code, downgrade the rule (Step 4) and note it.
- Adding pre-commit hooks (Husky) — separate, optional follow-up.

## Steps

### Step 1: Install and configure ESLint (flat) + Prettier

Add devDeps: `eslint`, `eslint-config-next`, `prettier`, `eslint-config-prettier`,
and **`typescript-eslint`** (required — it provides the `no-explicit-any` and
`ban-ts-comment` rules that are mandatory per the section above). Create
`eslint.config.mjs` extending Next's recommended + core-web-vitals **and**
`typescript-eslint`'s recommended config, with `eslint-config-prettier` last to
disable formatting rules. Respect the `@/*` alias and ignore `.next/`,
`node_modules/`, `pnpm-lock.yaml`.

In the config's `rules`, explicitly set (these override any milder default):

```js
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/ban-ts-comment': 'error',
```

Note: `no-explicit-any` is a syntactic rule and does **not** require type-aware
linting (`parserOptions.project`), so it works without the heavier type-checked
config. If you also want the `no-unsafe-*` family (catches `any` flowing in from
untyped values), that needs type-aware linting — optional, propose it but don't
block this plan on it.

**Verify**: `npx eslint . --max-warnings=9999` runs (non-zero exit OK at this
point — you're measuring, not gating).

### Step 2: Add scripts

In `package.json` add:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Create `.prettierrc.json` matching the repo's observed style (2-space indent,
single quotes, semicolons, trailing commas — confirm against existing files).

**Verify**: `pnpm format:check` runs and reports (pass/fail both acceptable now).

### Step 3: Apply safe auto-fixes + formatting

Run `pnpm lint:fix` and `pnpm format`. Review the diff — it should be
**formatting and trivially-safe fixes only**. If `--fix` wants to change logic,
revert that file and handle the rule in Step 4.

**Verify**: `pnpm typecheck` → exit 0 (formatting must not break types).

### Step 4: Triage remaining violations to reach a green `pnpm lint`

For each remaining error, either fix it if trivial and safe, or downgrade the
rule to `warn`/`off` in `eslint.config.mjs` with a `// TODO` comment naming what
to revisit. Goal: `pnpm lint` exits 0 (warnings allowed, errors not). Record any
downgraded rule in the PR description so the team can re-tighten later.

**Exception — `no-explicit-any` and `ban-ts-comment` may NOT be downgraded.**
These are mandatory `error` rules (see the "MANDATORY rule" section). Every
`any` violation must be resolved by giving the value a real type or using
`unknown` + narrowing — never by relaxing the rule. If the codebase currently
contains explicit `any`s, fixing them is part of this plan's work, not optional.

**Verify**: `pnpm lint` → exit 0; `pnpm typecheck` → exit 0; `pnpm build` → exit 0.

## Test plan

This plan _is_ tooling. Verification is the four commands exiting cleanly. No app
behavior changes; confirm `pnpm build` still produces the same routes.

## Done criteria

- [ ] `pnpm lint` exits 0.
- [ ] `pnpm format:check` exits 0.
- [ ] `pnpm typecheck` and `pnpm build` exit 0.
- [ ] `package.json` has `lint`, `lint:fix`, `format`, `format:check` scripts.
- [ ] **`@typescript-eslint/no-explicit-any` is set to `'error'`** in
      `eslint.config.mjs` (`grep -n "no-explicit-any" eslint.config.mjs` shows
      `'error'`), and `@typescript-eslint/ban-ts-comment` is `'error'`.
- [ ] **No explicit `any` remains in the codebase**: with the rule at `error`,
      `pnpm lint` passing already proves this. As a cross-check,
      `grep -rn ": any\| as any\|<any>" app lib components` returns no matches in
      source files.
- [ ] Any rule downgraded from error is documented in the PR description —
      **except** `no-explicit-any`/`ban-ts-comment`, which must NOT be downgraded.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- The number of pre-existing violations is large enough that triage would mean
  rewriting logic across many files → STOP, report the count and the noisiest
  rules, and let the owner decide which to enable. Do not silently rewrite app
  logic to satisfy a linter. **Exception**: for `no-explicit-any`/`ban-ts-comment`,
  "disable the rule" is never the resolution — if there are too many `any`s to fix
  in one pass, STOP and propose a phased cleanup for owner sign-off (e.g. rule at
  `error` for new code via overrides, tracked TODOs for the rest), keeping the
  end-state at zero `any`.
- `eslint-config-next` pulls an ESLint version incompatible with the installed
  toolchain → report the version conflict rather than forcing resolutions.

## Maintenance notes

- Plan 011 (CI) will run `pnpm lint` and `pnpm format:check` as gates — keep them
  green.
- Re-tighten downgraded rules over time; the `// TODO`s mark where.
- Reviewer: confirm Step 3's diff is formatting/safe-fix only, with no logic edits
  smuggled in.
