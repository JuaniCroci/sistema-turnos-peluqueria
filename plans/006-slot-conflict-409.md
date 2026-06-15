# Plan 006: Return 409 (not 500) on a slot collision; close the active-limit race

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- lib/db/appointments.ts app/api/appointments/route.ts`
> On mismatch vs "Current state", STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — narrows error handling and adds DB-level error mapping; no
  behavior change on the happy path.
- **Depends on**: none
- **Category**: bug (correctness)
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

Slot uniqueness is correctly enforced at the database by a partial unique index
(`scripts/init.sql:54-56`). But the application only recognizes the conflict it
detects in its own pre-check (`hasActiveAppointmentAt`). When two requests race
**past** that pre-check, the second `INSERT` violates the unique index and
Postgres raises error code `23505`. The handler's catch only matches
`e.message.includes('Ya existe un turno')`, which a raw `23505` does **not**
contain — so the user gets a confusing **500 Internal Error** instead of a clean
**409 Conflict** for what is a normal "someone just took that slot" situation.

Separately, the 2-active-appointments limit is a non-atomic check-then-act
(count, then insert), so a determined client firing concurrent requests can
exceed it. Lower severity (it's an anti-abuse cap, and the slot index still
prevents true double-booking), but worth tightening while here.

## Current state

`app/api/appointments/route.ts:105-118` (client path) and `:135-150` (admin path)
both wrap `createAppointment` in:

```ts
try {
  const appointment = await createAppointment({ ... });
  return NextResponse.json({ data: appointment }, { status: 201 });
} catch (e) {
  if (e instanceof Error && e.message.includes('Ya existe un turno')) {
    return errorResponse('CONFLICT', e.message);
  }
  throw e;     // <-- a raw Postgres 23505 falls through to the outer catch -> 500
}
```

`lib/db/appointments.ts:154-185` — `createAppointment` does the app-level
pre-check then inserts; a DB unique violation surfaces as a Supabase error
object (it has a `.code === '23505'`), not an `Error` whose message contains
"Ya existe un turno":

```ts
if (await hasActiveAppointmentAt(appointmentAt)) {
  throw new Error('Ya existe un turno confirmado o pendiente en ese horario');
}
const { data, error } = await db.from('appointments').insert(insertData).select('*').single();
if (error) throw error;   // <-- on a race, error.code === '23505'
```

`lib/db/appointments.ts:230-242` — `countActiveAppointments` (used by the
non-atomic limit check at `route.ts:100-103`).

**Convention:** error codes map to HTTP status via `lib/utils/api.ts`
(`CONFLICT` → 409). Postgres unique-violation code is `23505`.

## Commands you will need

| Purpose   | Command          | Expected |
|-----------|------------------|----------|
| Typecheck | `pnpm typecheck` | exit 0   |
| Build     | `pnpm build`     | exit 0   |

## Scope

**In scope:**
- `lib/db/appointments.ts` (`createAppointment` — normalize the unique violation)
- `app/api/appointments/route.ts` (both conflict catches)

**Out of scope:**
- The partial unique index itself — it's correct; don't touch the SQL.
- Converting the limit check to a DB constraint/transaction beyond what Step 2
  describes — a full transactional rewrite is a larger change; this plan only
  reduces the race window.

## Steps

### Step 1: Normalize the DB unique violation into the app's conflict error

In `lib/db/appointments.ts`, in `createAppointment`, after the insert, when
`error` is present check for the unique-violation code and rethrow as the app's
recognizable conflict:

```ts
if (error) {
  if ((error as { code?: string }).code === '23505') {
    throw new Error('Ya existe un turno confirmado o pendiente en ese horario');
  }
  throw error;
}
```

This makes the raced path produce the same `Error` message the handler already
maps to 409.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Reduce the active-limit race window

In `app/api/appointments/route.ts`, the limit check stays, but make the failure
mode safe: ensure that if a concurrent insert pushes the user over the limit, the
extra appointment is not silently allowed. The simplest robust approach without a
transaction: after a successful insert in the client path, re-count and if the
user now has `> 2` active future appointments, cancel the just-created one and
return `LIMIT_EXCEEDED`. Keep it scoped to the non-admin branch.

Document this as a pragmatic mitigation, not a true atomic guarantee, with a
one-line comment pointing at the maintenance note.

**Verify**: `pnpm typecheck` → exit 0 and `pnpm build` → exit 0.

## Test plan

Manual until plan 010:
- Simulate the race by booking the same slot from two terminals near-simultaneously
  (or temporarily comment the pre-check locally to force the DB path) → the losing
  request must return **409**, not 500.

If plan 010 has landed, add tests in a new `lib/db/appointments.test.ts` (or a
route test) covering: (a) a mocked insert returning `{ code: '23505' }` produces
the conflict error; (b) the handler maps that to HTTP 409. Model after plan 010's
setup. This is the cleanest place to add the first regression test.

## Done criteria

- [ ] `createAppointment` maps `error.code === '23505'` to the conflict message
      (`grep -n "23505" lib/db/appointments.ts` → match).
- [ ] A raced insert returns HTTP 409 (manual test) — never 500.
- [ ] `pnpm typecheck` and `pnpm build` exit 0.
- [ ] No files outside the in-scope list modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- The Supabase error object does not expose `.code` for unique violations in this
  client version (inspect a real raced error) → report; the mapping key may
  differ (`details`/`message`), adjust accordingly and note it.
- Step 2's compensating cancel would require touching admin logic → keep it
  strictly in the non-admin branch or report.

## Maintenance notes

- The truly atomic fix for the limit is a Postgres constraint or a
  `SELECT ... FOR UPDATE` transaction / RPC; deferred intentionally to keep this
  plan small. If abuse via the limit becomes real, escalate to that.
- Reviewer: confirm the 409 path is exercised, and that the compensating cancel
  in Step 2 can't itself throw and mask the original response.
