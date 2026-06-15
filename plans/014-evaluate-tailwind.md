# Plan 014: Design spike — evaluate adopting Tailwind CSS (decision, not a rewrite)

> **⚠️ This plan revisits an `AGENTS.md` rule by owner request.** `AGENTS.md:38`
> says *"Sin Tailwind ni UI libs."* The owner flagged this as worth reconsidering.
> **This is a spike/decision plan, not a build-everything plan.** Its deliverable
> is a recommendation + a small proof-of-concept, so the owner can make an informed
> call. **Do not migrate the whole app's styling in this plan.**
>
> **Executor instructions**: This plan produces a written recommendation and a
> throwaway POC branch, not a sweeping change. Honor STOP conditions. Update
> `plans/README.md` when done.

## Status

- **Priority**: P3
- **Effort**: L (if adoption is later chosen); S for the spike itself
- **Risk**: N/A for the spike (no production code changes); HIGH for a full
  migration (touches every component's styling) — which is explicitly deferred.
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `28703d1`, 2026-06-15

## Honest framing (read before starting)

Not using Tailwind is **not a defect**. The current approach — CSS Modules +
`open-props` design tokens (`styles/tokens.css`) + `next/font` — is a legitimate,
maintainable, zero-runtime styling system with good encapsulation. Tailwind is a
*different* set of trade-offs, not a strict upgrade. The point of this plan is to
let the owner decide with evidence, not to assume Tailwind wins. Be even-handed.

**Trade-offs to weigh:**
- *For Tailwind*: faster iteration once learned, utility ergonomics, huge ecosystem
  (incl. shadcn/ui), colocation of styles with markup, easy responsive variants.
  First-class on Next.js/Vercel.
- *Against / cost*: a second styling paradigm alongside ~25 existing
  `*.module.css` files (migration is all-or-nothing-ish to avoid a split-brain
  codebase), `open-props` tokens would need mapping into the Tailwind theme,
  verbose className soup, and the current system already works. The repo's
  `interface-design` and design skills assume the current setup.

## Current state

- Styling = CSS Modules (`components/**/*.module.css`, `app/**/*.module.css`) +
  `open-props` + `styles/tokens.css` + `styles/reset.css`, imported via
  `app/globals.css`. ~25 `.module.css` files (`git ls-files | grep -c module.css`).
- No Tailwind, no PostCSS config beyond defaults, no UI component library.
- Design tokens already centralized in `styles/tokens.css` (colors, spacing,
  fonts) — these are the bridge if Tailwind is adopted.

## Scope

**In scope (the spike):**
- A written recommendation (in `plans/014-tailwind-decision.md` or the PR body)
  covering: effort to migrate, token-mapping strategy, whether to go incremental
  or big-bang, and a clear recommend / don't-recommend with reasons.
- An **isolated, throwaway** proof-of-concept on a separate branch: Tailwind set
  up + **one** component (e.g. `components/Button`) reimplemented with it, to
  measure real ergonomics and bundle impact. Not merged.

**Out of scope:**
- Migrating more than one component.
- Removing any existing `.module.css`.
- Adding a UI kit (shadcn/etc.) — that's a separate decision even if Tailwind is
  adopted.

## Steps

### Step 1: Confirm the owner wants the spike

This plan only makes sense if the owner is genuinely considering the change.
Confirm scope = "evaluate", not "migrate everything now". If they want a full
migration, that's a much larger, separately-scoped effort — STOP and re-scope.

### Step 2: Build the POC on a throwaway branch

On `spike/tailwind-poc` (do not merge): install Tailwind per the current Next.js
setup guide, map a handful of `styles/tokens.css` values into the Tailwind theme,
and reimplement `components/Button` with utilities. Keep the original Button
untouched on `main`.

**Verify**: `pnpm build` on the spike branch → exit 0; visually compare the POC
Button to the original.

### Step 3: Measure and write the recommendation

Capture: lines/files touched for one component, any bundle-size delta, how cleanly
`open-props` tokens mapped, and developer ergonomics. Write the recommendation
with a clear verdict and, if "adopt", an incremental migration outline (component
families in order) so it never leaves the app in a split-brain state for long.

## Test plan

The spike's "test" is the POC building green and a side-by-side visual/ergonomic
comparison. No production tests — nothing ships from this plan except a decision.

## Done criteria

- [ ] A written recommendation exists with an explicit adopt / don't-adopt verdict
      and reasons grounded in the POC.
- [ ] The POC branch builds (`pnpm build` exit 0) and reimplements exactly one
      component.
- [ ] `main` is unchanged (no `.module.css` removed, original Button intact).
- [ ] `plans/README.md` status row updated (with the verdict in the status note).

## STOP conditions

- Scope creep toward migrating multiple components → STOP; this is a decision
  spike.
- The owner actually wants a full migration → re-scope as a dedicated plan with a
  component-by-component checklist and a freeze on new `.module.css`.

## Maintenance notes

- If "adopt": plan the migration so CSS Modules and Tailwind don't coexist
  long-term in the same component tree; set a deadline to finish.
- If "don't adopt": record the decision and the reasons in `AGENTS.md` (plan 013)
  so it isn't re-litigated every few months.
- The current CSS-Modules + open-props system is a fine default; the burden of
  proof is on Tailwind to be *worth the switch*, not merely viable.
