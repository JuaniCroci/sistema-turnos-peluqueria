# Plan 007: Add structured server-side error logging to API route handlers

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- app/api lib/utils/api.ts`
> On mismatch vs the "Current state" pattern, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — adds logging only; no control-flow or response changes.
- **Depends on**: none
- **Category**: dx (observability)
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

Every route handler ends with a bare `catch { return errorResponse('INTERNAL_ERROR', ...) }`
that **swallows the actual error**. In production, a 500 leaves no trace —
no message, no stack, no request context — so debugging an incident requires
reproducing it locally or adding logging after the fact. For an app handling
auth and bookings, "we got a 500 and have no idea why" is a real operational
cost. This plan adds a single structured logging helper and threads it through
the catch blocks, **without leaking error details to clients** (responses stay
generic; details go to the server log only).

## Current state

The pattern repeats across all handlers, e.g. `app/api/appointments/route.ts:59-61`:

```ts
} catch {
  return errorResponse('INTERNAL_ERROR', 'Error al obtener turnos');
}
```

Affected files (every `route.ts` under `app/api/`):
- `app/api/appointments/route.ts`, `app/api/appointments/[id]/route.ts`,
  `app/api/appointments/[id]/status/route.ts`, `app/api/appointments/slots/route.ts`
- `app/api/services/route.ts`, `app/api/services/[id]/route.ts`
- `app/api/categories/route.ts`, `app/api/categories/[slug]/route.ts`
- `app/api/users/route.ts`
- `app/api/auth/register/route.ts`

Most use `catch {` (no binding), so the error is discarded entirely.

**Conventions:** error responses go through `errorResponse` in `lib/utils/api.ts`.
Comments/strings in Spanish. The runtime is Node (App Router handlers), so
`console.error` lands in Vercel's function logs.

## Commands you will need

| Purpose   | Command          | Expected |
|-----------|------------------|----------|
| Typecheck | `pnpm typecheck` | exit 0   |
| Build     | `pnpm build`     | exit 0   |

## Scope

**In scope:**
- `lib/utils/logger.ts` (create — minimal structured logger)
- The ten `route.ts` files listed above (bind the error and log it before
  returning the generic response).

**Out of scope:**
- Adding a logging dependency (pino/winston) — keep it to `console.error` with a
  structured payload; a logging library is a separate decision.
- Changing any response body or status — clients must still receive the generic
  `INTERNAL_ERROR` with no internal details (data-exposure rule).
- Server Actions and pages — scope is API route handlers.

## Steps

### Step 1: Create a minimal structured logger

Create `lib/utils/logger.ts`:

```ts
// Log de errores del servidor. NO exponer detalles al cliente: esto va solo
// a los logs de la función (Vercel). El handler sigue devolviendo un error
// genérico.
export const logError = (scope: string, err: unknown): void => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(JSON.stringify({ level: 'error', scope, message, stack }));
};
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Thread it through each catch block

In each in-scope route, change `} catch {` to `} catch (err) {` and add
`logError('<METHOD /api/route>', err);` immediately before the `return
errorResponse('INTERNAL_ERROR', ...)`. Use a descriptive scope per handler, e.g.
`logError('GET /api/appointments', err)`. Do **not** change the returned message.

Apply to every `catch` that currently returns `INTERNAL_ERROR`. Leave the
validation/expected catches (`catch { return errorResponse('VALIDATION_ERROR', 'Body JSON invalido') }`)
unlogged — those are normal client errors, not incidents.

**Verify**: `pnpm typecheck` → exit 0 and `pnpm build` → exit 0.

## Test plan

Manual until plan 010. Trigger a 500 locally (e.g. point `SUPABASE_URL` at an
unreachable host and hit `/api/services`) → confirm a structured JSON error line
appears in the server console **and** the HTTP response body is still the generic
`{ error: { code: 'INTERNAL_ERROR', ... } }` with no stack/details. If plan 010
has landed, a unit test can assert `logError` formats the payload and never
returns error internals — model after plan 010's setup.

## Done criteria

- [ ] `lib/utils/logger.ts` exists.
- [ ] Every `INTERNAL_ERROR` catch in the in-scope routes binds and logs the
      error: `grep -rn "catch {" app/api` returns **no** matches on the
      INTERNAL_ERROR handlers (they now bind `err`).
- [ ] Response bodies are unchanged (no internal details leaked) — spot-check one
      handler's diff.
- [ ] `pnpm typecheck` and `pnpm build` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- A handler turns out to already log via a different mechanism → don't duplicate;
  report.
- Binding `err` triggers a "declared but never read" lint error after plan 009
  lands → ensure `err` is actually used by `logError` (it is); if a route has a
  catch that genuinely shouldn't log, leave it `catch {`.

## Maintenance notes

- If the project later adopts a real logger or an error-tracking service (Sentry),
  `logError` is the single chokepoint to upgrade.
- Reviewer: confirm no `logError` call passes user-supplied secrets (none of the
  current catches do, but new ones might).
