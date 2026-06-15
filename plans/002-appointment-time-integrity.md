# Plan 002: Appointment slots are timezone-correct and business hours are enforced server-side

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- lib/db/appointments.ts app/api/appointments/route.ts app/api/appointments/slots/route.ts app/mis-turnos/nuevo/page.tsx`
> On any mismatch vs the "Current state" excerpts, treat as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — touches slot computation and booking validation; a wrong
  timezone constant could shift every slot. Mitigated by a single, explicit
  business-timezone constant and `TZ=UTC` verification.
- **Depends on**: none
- **Category**: bug (correctness)
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

The "available slots" UI and the server's occupied-slot computation disagree
about timezone, so in production the occupied-slot list is shifted by the
UTC offset (3 hours for Argentina). Two consequences:

1. A user can be shown a slot as "free" when it is actually taken (and vice
   versa), because the server computes the occupied hour in **server-local time
   (UTC on Vercel)** while the booking was made in **browser-local time (AR,
   UTC−3)**.
2. The server never validates business hours at all — the front limits choices
   to 09:00–20:00, but a scripted client can `POST /api/appointments` with any
   future ISO timestamp (e.g. 03:00), and it will be accepted.

This is **prod-only**: in local dev the server's timezone equals the developer's
machine (AR), so the bug is invisible. **You must verify with `TZ=UTC`** or you
will "confirm" a fix that does nothing.

## Current state

`lib/db/appointments.ts:187-222` — `getOccupiedSlots(date)`:

```ts
export const getOccupiedSlots = async (date: string): Promise<string[]> => {
  const db = getDb();
  const { data, error } = await db
    .from('appointments')
    .select(`appointment_at, service:service_id (duration_minutes)`)
    .gte('appointment_at', `${date}T00:00:00`) // <-- no timezone offset
    .lt('appointment_at', `${date}T23:59:59`)
    .in('status', ['pending', 'confirmed']);
  // ...
  for (const row of data ?? []) {
    const aptDate = new Date(aptAt);
    const startMinutes = aptDate.getHours() * 60 + aptDate.getMinutes(); // <-- server-local hours
    // ...spreads occupied 30-min slots
  }
};
```

`app/mis-turnos/nuevo/page.tsx:122` — the client builds the timestamp in
**browser-local** time:

```ts
const appointmentAt = new Date(`${date}T${time}:00`).toISOString();
```

`app/mis-turnos/nuevo/page.tsx:13-17` — the hardcoded slot grid (09:00–20:00,
every 30 min):

```ts
const TIME_SLOTS = Array.from({ length: 23 }, (_, i) => {
  const h = Math.floor((i * 30 + 540) / 60);
  const m = (i * 30 + 540) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});
```

`app/api/appointments/route.ts:94-103` — server validation for a client booking
checks only "not in the past" and the active-count limit; **no business-hours
check**:

```ts
if (!isAdmin) {
  const appointmentAt = parsed.data.appointment_at;
  if (new Date(appointmentAt) <= new Date()) {
    return errorResponse(
      'VALIDATION_ERROR',
      'No se puede reservar un turno en el pasado',
    );
  }
  // ...activeCount limit, then createAppointment
}
```

**Conventions to match:**

- `appointment_at` is stored as Postgres `TIMESTAMPTZ` (UTC instant). See
  `scripts/init.sql:37`.
- Money/format helpers live in `lib/utils/format.ts`; new shared helpers follow
  the same `lib/utils/` location.
- Error responses use `errorResponse(...)` from `lib/utils/api.ts`.

## Commands you will need

| Purpose            | Command           | Expected on success |
| ------------------ | ----------------- | ------------------- |
| Install            | `pnpm install`    | exit 0              |
| Typecheck          | `pnpm typecheck`  | exit 0              |
| Build              | `pnpm build`      | exit 0              |
| Run with UTC clock | `TZ=UTC pnpm dev` | dev server on :3000 |

## Suggested executor toolkit

- `supabase-postgres-best-practices` skill for the timestamptz range query.
- Decide the business timezone with the owner before coding (Step 1). Argentina
  is `America/Argentina/Buenos_Aires` (UTC−3, no DST currently).

## Scope

**In scope:**

- `lib/config/business.ts` (create — business timezone + open/close hours + slot size)
- `lib/utils/datetime.ts` (create — timezone-aware helpers)
- `lib/db/appointments.ts` (`getOccupiedSlots`)
- `app/api/appointments/route.ts` (add business-hours validation)
- `app/mis-turnos/nuevo/page.tsx` (derive `TIME_SLOTS` from the shared config)

**Out of scope (do NOT touch):**

- The DB unique-slot index or `hasActiveAppointmentAt` — slot _uniqueness_ is
  correct; this plan is about _display_ and _validation_ of times.
- Admin booking (`skipPastCheck` path) — admins intentionally bypass time rules.
- Adding a date-picker library — keep the native `<input type="date">` + `<select>`.

## Steps

### Step 1: Create a single source of truth for business hours

Create `lib/config/business.ts`:

```ts
// Zona horaria del negocio. La DB guarda TIMESTAMPTZ (UTC); todo el cálculo
// de slots se hace contra esta zona, no contra la del servidor.
export const BUSINESS_TZ = 'America/Argentina/Buenos_Aires';
export const OPEN_HOUR = 9; // 09:00 inclusive
export const CLOSE_HOUR = 20; // último slot empieza antes de las 20:00
export const SLOT_MINUTES = 30;
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add timezone-aware helpers

Create `lib/utils/datetime.ts` with two functions, using `Intl.DateTimeFormat`
with `timeZone: BUSINESS_TZ` (no external dep needed):

- `getLocalHourMinute(isoUtc: string): { hour: number; minute: number }` —
  formats a UTC instant into the business-tz wall-clock hour/minute.
- `utcRangeForLocalDate(date: string): { fromIso: string; toIso: string }` —
  given a `YYYY-MM-DD` business-local day, returns the UTC instant bounds for
  that local day (so the DB range query selects the correct rows).

Implementation note for the executor: derive the offset by formatting a probe
date in `BUSINESS_TZ` and comparing to UTC; do not hardcode `-03:00` (keeps it
correct if the owner later changes `BUSINESS_TZ`).

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Fix `getOccupiedSlots`

In `lib/db/appointments.ts`:

- Replace the `.gte('appointment_at', `${date}T00:00:00`)` / `.lt(... T23:59:59)`
  bounds with `utcRangeForLocalDate(date)` → `.gte(fromIso).lt(toIso)`.
- Replace `aptDate.getHours()*60 + aptDate.getMinutes()` with
  `getLocalHourMinute(aptAt)` so the occupied hour is computed in `BUSINESS_TZ`,
  not server-local.

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Enforce business hours + slot granularity on the server

In `app/api/appointments/route.ts`, inside the `if (!isAdmin)` branch, after the
past check, add a validation: compute `getLocalHourMinute(appointmentAt)` and
reject (`errorResponse('VALIDATION_ERROR', 'Horario fuera del horario de atención')`)
when the local hour is `< OPEN_HOUR`, `>= CLOSE_HOUR`, or the minute is not a
multiple of `SLOT_MINUTES`.

**Verify**: `pnpm typecheck` → exit 0.

### Step 5: Derive the client slot grid from the shared config

In `app/mis-turnos/nuevo/page.tsx`, replace the hardcoded `TIME_SLOTS` literal
with a derivation from `OPEN_HOUR`, `CLOSE_HOUR`, `SLOT_MINUTES`. Keep the same
visual output (09:00…19:30). Do not change the rest of the component.

**Verify**: `pnpm build` → exit 0.

## Test plan

Until plan 010 lands, verify manually **with `TZ=UTC pnpm dev`** (this is the
critical step — a local run without `TZ=UTC` will not reproduce the bug):

1. Book a slot at 17:30 (AR) through the UI. In Supabase, confirm the stored
   `appointment_at` is `...20:30:00Z`.
2. Reload `/mis-turnos/nuevo`, pick the same date → 17:30 must now be **absent**
   from the available list (occupied), and 17:00/18:00 present. Before this fix,
   17:30 would still show as free under `TZ=UTC`.
3. `curl -X POST .../api/appointments` (authenticated cookie) with
   `appointment_at` set to `03:00` AR (a UTC instant outside business hours) →
   expect 400 "Horario fuera del horario de atención".

If plan 010 has landed, add unit tests for `lib/utils/datetime.ts` (a 17:30 AR
instant maps to hour 17, and `utcRangeForLocalDate` brackets the right UTC span)
and a route test for the business-hours rejection. Model after plan 010's setup.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0 and `pnpm build` exits 0.
- [ ] `grep -n "getHours()" lib/db/appointments.ts` returns no match (server-local
      hour extraction removed).
- [ ] `getOccupiedSlots` uses `utcRangeForLocalDate` (grep confirms the import).
- [ ] The client booking POST handler rejects out-of-hours times (manual curl
      test 3 returns 400).
- [ ] Manual test 2 passes **under `TZ=UTC`**.
- [ ] No files outside the in-scope list modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

- The owner has not confirmed the business timezone — do not guess between
  `America/Argentina/Buenos_Aires` and anything else; ask and stop.
- Stored `appointment_at` values are NOT timestamptz / not UTC (inspect a row) —
  the whole approach assumes UTC storage; report if that's false.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If the salon ever spans DST changes or moves timezone, only `BUSINESS_TZ`
  should need to change — verify no `-03:00` literal crept in.
- When notifications (AGENTS.md mentions future email/WhatsApp) are added, they
  must format times in `BUSINESS_TZ` too — reuse `getLocalHourMinute`.
- Reviewer: confirm the verification was actually run under `TZ=UTC`, not a
  local AR clock.
