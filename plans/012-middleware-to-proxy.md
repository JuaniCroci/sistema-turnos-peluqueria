# Plan 012: Migrate `middleware.ts` → `proxy.ts` (Next.js 16 readiness)

> **Executor instructions**: Follow step by step, verify each step, honor STOP
> conditions, update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 28703d1..HEAD -- middleware.ts package.json lib/auth/config.edge.ts`

## Status

- **Priority**: P3 (low urgency on Next 15.5; **required** when upgrading to 16)
- **Effort**: S
- **Risk**: MED — middleware is the auth gate for `/admin` and `/mis-turnos`; a
  botched rename could disable route protection. Mitigated by verifying the
  protected routes still redirect after the change.
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `28703d1`, 2026-06-15

## Why this matters

The repo uses the `middleware.ts` file convention. Per the official Next.js docs
(version history table on the `proxy` file-convention page), **`middleware` was
deprecated and renamed to `proxy` in `v16.0.0`**; on the installed version
(`15.5.19`) `middleware.ts` is **still fully supported and not yet deprecated**.
So this is not a bug today — it's forward-compatibility debt. Doing the rename now
(or as part of a Next 16 upgrade) keeps the project off a deprecated convention
and is a mechanical change with an official codemod.

**Important nuance**: `proxy` runs on the **Node.js runtime only** (the edge
runtime is not supported in `proxy`). The current middleware deliberately imports
the **edge-safe** auth config (`authEdgeConfig`) to avoid pulling the DB into the
edge runtime. After moving to `proxy` (Node), that constraint relaxes, but you
should keep using `authEdgeConfig` for a minimal, behavior-preserving migration —
do not expand what runs in the proxy in this plan.

## Current state

`middleware.ts` (full file):

```ts
import NextAuth from 'next-auth';
import { authEdgeConfig } from '@/lib/auth/config.edge';

export const { auth: middleware } = NextAuth(authEdgeConfig);

export const config = {
  matcher: ['/mis-turnos/:path*', '/admin/:path*'],
};
```

The `authorized` callback in `lib/auth/config.edge.ts:40-52` is what enforces
`/admin` → admin-only and `/mis-turnos` → logged-in. The matcher limits the
middleware to those paths.

Installed: `next@15.5.19` (`pnpm-lock.yaml:380`). `package.json` allows
`"next": "^15.0.0"`.

## Commands you will need

| Purpose   | Command                                          | Expected                |
| --------- | ------------------------------------------------ | ----------------------- |
| Codemod   | `npx @next/codemod@canary middleware-to-proxy .` | renames file + function |
| Typecheck | `pnpm typecheck`                                 | exit 0                  |
| Build     | `pnpm build`                                     | exit 0                  |
| Dev       | `pnpm dev`                                       | :3000                   |

## Suggested executor toolkit

- Official migration reference: the Next.js `proxy` file-convention docs,
  "Migration to Proxy" section, and `nextjs.org/docs/messages/middleware-to-proxy`.
  The Vercel docs MCP (`search_vercel_documentation`, topic "proxy") is available
  if you need to re-confirm runtime constraints.

## Scope

**In scope:**

- Rename `middleware.ts` → `proxy.ts`, export name `middleware` → `proxy`.

**Out of scope:**

- Upgrading Next.js to 16 — that's a separate, larger change. This plan only does
  the file/convention rename, which works on 15.5 too.
- Changing the `authorized` callback, the matcher, or the auth config split.
- Moving the full (DB-backed) auth config into the proxy.

## Steps

### Step 1: Decide timing with the owner

This is **optional on Next 15.5**. If the owner is not planning a Next 16 upgrade
soon, this plan can stay TODO. If proceeding, continue.

### Step 2: Run the codemod (or rename by hand)

Run `npx @next/codemod@canary middleware-to-proxy .`. It renames `middleware.ts`
→ `proxy.ts` and the exported `middleware` → `proxy`. If the codemod doesn't fit
the NextAuth destructuring export, rename by hand:

```ts
// proxy.ts
import NextAuth from 'next-auth';
import { authEdgeConfig } from '@/lib/auth/config.edge';
export const { auth: proxy } = NextAuth(authEdgeConfig);
export const config = { matcher: ['/mis-turnos/:path*', '/admin/:path*'] };
```

**Verify**: `middleware.ts` no longer exists; `proxy.ts` exists with a `proxy`
export. `pnpm typecheck` → exit 0.

### Step 3: Verify route protection still works

`pnpm build` → exit 0, then `pnpm dev` and confirm:

- visiting `/admin` while logged out → redirected to `/login`;
- visiting `/mis-turnos` while logged out → redirected to `/login`;
- an admin can reach `/admin`; a client cannot.

**Verify**: all four behaviors hold (same as before the rename).

## Test plan

Manual route-protection checks in Step 3 are the test (middleware behavior is not
unit-testable here). Next provides `unstable_doesProxyMatch` for matcher testing;
optional — only if plan 010's harness is present and you want a matcher unit test.

## Done criteria

- [ ] `proxy.ts` exists, `middleware.ts` is gone
      (`git ls-files | grep -E 'middleware|proxy'` shows only `proxy.ts`).
- [ ] The export is named `proxy`.
- [ ] `pnpm typecheck` and `pnpm build` exit 0.
- [ ] Route protection verified (Step 3) — `/admin` and `/mis-turnos` still gated.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- After renaming, `/admin` or `/mis-turnos` is **no longer protected** → STOP and
  revert; the auth gate is more important than the rename.
- `pnpm build` warns/errors that `proxy` requires a runtime the config sets
  elsewhere → report; do not add `runtime` config to the proxy (it's unsupported).
- The installed Next version is still < 16 **and** the owner decided not to
  upgrade → leave as TODO; this is not urgent on 15.5.

## Maintenance notes

- Bundle this with the eventual Next 16 upgrade if one is planned — same blast
  radius, one verification pass.
- Reviewer: the single most important check is that the protected routes still
  redirect; the rename is cosmetic, the auth gate is not.
