# Plan 001: Anti-abuse defenses become non-bypassable (mandatory + fail-closed reCAPTCHA, trusted client IP)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- lib/utils/recaptcha.ts app/register/actions.ts app/api/auth/register/route.ts lib/auth/users.ts lib/auth/config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — touches the live registration flow; a too-strict gate could lock out real users. Mitigated by env-flag rollout (Step 4).
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

The commit history shows a deliberate anti-abuse effort ("defensas anti-abuso:
cupo semanal 2 turnos, throttle IP 4/24h, reCAPTCHA v3"). But as written, the
two strongest defenses are bypassable by any scripted client:

1. **reCAPTCHA is optional and fails open.** The token is only checked
   `if (recaptchaToken)`, and `verifyRecaptchaToken` returns `{ success: true }`
   when the secret env var is unset. A bot that simply omits the token — or any
   request when `RECAPTCHA_SECRET_KEY` is missing in prod — skips verification
   entirely.
2. **The IP throttle trusts a spoofable header.** `x-forwarded-for` is read raw
   and used as the throttle key. An attacker rotating `X-Forwarded-For` defeats
   the 4-accounts-per-24h cap completely.

The net effect: the registration endpoint can be scripted to create unlimited
accounts, which is exactly what these defenses were added to stop. This plan
makes reCAPTCHA mandatory + fail-closed in production and derives the throttle
IP from a trusted source.

## Current state

Files involved:

- `lib/utils/recaptcha.ts` — reCAPTCHA verification helper. **Fails open** when
  no secret is configured.
- `app/register/actions.ts` — the Server Action the registration form actually
  uses. reCAPTCHA check is conditional.
- `app/api/auth/register/route.ts` — a parallel REST endpoint with the same
  conditional check (see plan 008; this plan hardens it too so it isn't a
  bypass surface while it still exists).
- `lib/auth/users.ts` — `countRecentRegistrationsByIp` (the throttle query).
- `lib/auth/config.ts` — Google sign-in path also derives IP from `x-forwarded-for`.

`lib/utils/recaptcha.ts` (full file today):

```ts
export async function verifyRecaptchaToken(
  token: string,
): Promise<{ success: boolean; score: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) return { success: true, score: 1.0 };   // <-- fail OPEN
  // ...fetch siteverify, return { success: data.success, score: data.score }
}
export const RECAPTCHA_THRESHOLD = 0.5;
```

`app/register/actions.ts:58-64` (the conditional check):

```ts
const recaptchaToken = String(formData.get('g-recaptcha-response') ?? '');
if (recaptchaToken) {                       // <-- skipped entirely if absent
  const result = await verifyRecaptchaToken(recaptchaToken);
  if (!result.success || result.score < RECAPTCHA_THRESHOLD) {
    return { error: 'No se pudo verificar que seas humano. Intentá de nuevo.', fieldErrors: {} };
  }
}
const headersList = await headers();
const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown';
```

`app/api/auth/register/route.ts:34-41` (same pattern, JSON body, field
`recaptcha_token`):

```ts
if (parsed.data.recaptcha_token) {
  const result = await verifyRecaptchaToken(parsed.data.recaptcha_token);
  if (!result.success || result.score < RECAPTCHA_THRESHOLD) {
    return errorResponse('VALIDATION_ERROR', 'No se pudo verificar que seas humano');
  }
}
const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
```

**Conventions to match** (from reading the repo):
- Error responses in route handlers use `errorResponse(code, message, details?)`
  from `lib/utils/api.ts` — never raw `NextResponse.json`. Available codes
  include `'RATE_LIMITED'` (429) and `'VALIDATION_ERROR'` (400).
- Server Actions return `{ error, fieldErrors }` shaped state, not `errorResponse`.
- UI/user-facing strings are in Spanish.
- Env vars are read with `process.env.X` and a sensible fallback; this plan adds
  one new flag, `RECAPTCHA_REQUIRED`.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0              |
| Typecheck | `pnpm typecheck` | exit 0, no errors   |
| Build     | `pnpm build`     | compiles, exit 0    |

## Suggested executor toolkit

- Vercel docs on the real client IP: the platform sets `x-forwarded-for` with the
  client IP as the **first** entry; downstream proxies append. Use the first
  comma-separated segment, trimmed — not the whole header string.
- `zod` skill if you adjust the register schemas.

## Scope

**In scope:**
- `lib/utils/recaptcha.ts`
- `lib/utils/clientIp.ts` (create)
- `app/register/actions.ts`
- `app/api/auth/register/route.ts`
- `lib/auth/config.ts`

**Out of scope (do NOT touch):**
- `lib/auth/users.ts` query logic — the throttle *query* is fine; only the IP
  *value* passed into it changes, and that change happens at the call sites above.
- Deleting `app/api/auth/register/route.ts` — that's plan 008. Here you only
  harden it.
- The `MAX_REGISTRATIONS_PER_IP` constant / window — tuning is a separate concern.

## Git workflow

- Branch: `advisor/001-harden-anti-abuse`
- Commit style: conventional commits (repo uses `fix:`, `feat:`). Example from
  `git log`: `fix: cupo semanal -> limite de 2 turnos activos futuros`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make reCAPTCHA fail-closed in production

Edit `lib/utils/recaptcha.ts`. Replace the fail-open early return with a flag:

- Read `const required = process.env.RECAPTCHA_REQUIRED === 'true';`
- If no `secretKey`:
  - if `required` → return `{ success: false, score: 0 }` (fail CLOSED)
  - else → return `{ success: true, score: 1.0 }` (dev convenience; unchanged)
- Keep `RECAPTCHA_THRESHOLD = 0.5`.
- Add a typed return for the missing-token case used by callers in Step 2.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Make the token mandatory when required, in the Server Action

Edit `app/register/actions.ts`. Replace the `if (recaptchaToken) { ... }` block
so that:

- `const required = process.env.RECAPTCHA_REQUIRED === 'true';`
- if `required && !recaptchaToken` → return
  `{ error: 'No se pudo verificar que seas humano. Recargá la página e intentá de nuevo.', fieldErrors: {} }`
- otherwise, when a token exists, verify it exactly as today.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Same hardening in the REST route

Edit `app/api/auth/register/route.ts`. Mirror Step 2 using `errorResponse`:

- if `required && !parsed.data.recaptcha_token` →
  `errorResponse('VALIDATION_ERROR', 'No se pudo verificar que seas humano')`
- otherwise verify when a token is present.

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Derive the throttle IP from a trusted source

Create `lib/utils/clientIp.ts` exporting `getClientIp(headers: Headers): string`:

- Read `x-forwarded-for`; if present, return the **first** comma-separated
  segment `.trim()` (this is the client IP that the Vercel edge sets and that an
  intermediary cannot overwrite without also being the platform).
- Fall back to `x-real-ip`, then `'unknown'`.
- Add a one-line comment in Spanish explaining the leftmost-segment choice and
  that `x-forwarded-for` is only trustworthy because the app is deployed behind
  Vercel's proxy (note: if this app is ever self-hosted without a trusted proxy,
  this value is spoofable and the throttle must move to an authenticated signal).

Replace the three inline IP derivations:
- `app/register/actions.ts:67` → `const ip = getClientIp(await headers());`
- `app/api/auth/register/route.ts:41` → `const ip = getClientIp(request.headers);`
- `lib/auth/config.ts:45` → use `getClientIp(headersList)`.

**Verify**: `pnpm typecheck` → exit 0 and `pnpm build` → exit 0.

### Step 5: Document the new env var

Add `RECAPTCHA_REQUIRED=true` to the production env documentation. If plan 005
(`.env.example`) has already landed, add it there with a comment. Otherwise add
a one-line note in `README.md`'s env section.

**Verify**: `pnpm build` → exit 0.

## Test plan

No automated test harness exists yet (see plan 010). Until it lands, verify
manually against a local dev server (`pnpm dev`):

1. With `RECAPTCHA_REQUIRED=true` and **no** `RECAPTCHA_SECRET_KEY` set:
   `curl -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"a@b.com","username":"botbot","password":"secret1"}'`
   → expect HTTP 400 with `error.message` about verification (fail-closed, no token).
2. With `RECAPTCHA_REQUIRED` unset (dev): the same curl → registration proceeds
   (token optional in dev). Confirms backward-compatible dev experience.

If plan 010 has landed, add a unit test for `getClientIp` (spoofed multi-hop
`x-forwarded-for` returns the first segment) and a test that `verifyRecaptchaToken`
returns `success:false` when `RECAPTCHA_REQUIRED=true` and no secret — model it
after the test structure introduced in plan 010.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm build` exits 0
- [ ] `lib/utils/recaptcha.ts` no longer returns `{ success: true }` unconditionally
      when the secret is missing — it respects `RECAPTCHA_REQUIRED`
      (`grep -n "RECAPTCHA_REQUIRED" lib/utils/recaptcha.ts` returns a match).
- [ ] Both registration paths reject a missing token when `RECAPTCHA_REQUIRED=true`
      (manual curl test 1 above returns 400).
- [ ] No call site reads `x-forwarded-for` inline anymore for the throttle:
      `grep -rn "x-forwarded-for" app lib` returns matches **only** inside
      `lib/utils/clientIp.ts`.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

- The excerpts in "Current state" don't match the live code (drift).
- You find that registration is reachable through a third path not listed here
  (search `signIn('credentials'` and any other `createUser(` call site) — report
  it so the hardening covers every surface.
- `pnpm build` fails because `headers()` cannot be called in the context you
  moved it to — report rather than refactoring the action's structure.

## Maintenance notes

- When plan 008 deletes `app/api/auth/register/route.ts`, the Step 3 changes go
  with it — that's expected, not a regression.
- The IP throttle is only as trustworthy as the deployment's proxy. If the app
  moves off Vercel to a setup without a trusted edge, revisit `getClientIp` and
  consider a server-side rate limiter keyed on something non-spoofable.
- Reviewer should confirm `RECAPTCHA_REQUIRED=true` is actually set in the Vercel
  production environment, otherwise Step 1 changes nothing in prod.
