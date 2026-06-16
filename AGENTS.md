# AGENTS.md

## Estado del repo

M0 cerrado: el proyecto migro de monorepo pnpm (Vite+React+Express) a **Next.js 15 full stack** (App Router + route.ts + Server Components). Estructura actual:

- App Next.js unica en la raiz (no hay monorepo, no hay `pnpm-workspace.yaml`).
- Componentes dumb migrados de `apps/web` a `components/` (Card, Input, FormField, Spinner, Badge, Button, ServiceCard, Navbar con MobileMenu, StubPage).
- `app/` con rutas: `/`, `/_not-found`, `/login`, `/register`, `/servicios`, `/servicios/[id]`, `/mis-turnos`, `/mis-turnos/nuevo`, `/admin/servicios`, `/admin/categorias`, `/admin/turnos`.
- `app/layout.tsx` (root) tiene Navbar + footer, importa `app/globals.css` (que trae open-props/normalize, open-props/sizes, `styles/reset.css`, `styles/tokens.css`).
- `lib/types.ts` con los tipos compartidos (User, Service, Category, Appointment, Role, AppointmentStatus, Page).
- `lib/utils/format.ts` con formatters es-AR (precio, duracion, fecha, hora).
- `styles/tokens.css` y `styles/reset.css` movidos tal cual.
- `proxy.ts` protege `/mis-turnos/:path*` y `/admin/:path*` via NextAuth (edge-safe).
- `next.config.ts` solo declara `reactStrictMode: true`.
- `.nvmrc` = `24.14.1`.
- **Verificacion**: `pnpm typecheck` + `pnpm lint` + `pnpm format:check` + `pnpm test` + `pnpm build` pasan verde. CI automatico via GitHub Actions en cada push/PR.

Milestone actual: **Fase 2 (M3 del README original) — Servicios y categorías** (endpoints públicos de services y categories, filtros, paginación, detalle de servicio, admin CRUD con soft delete). Fase 1 cerrada (ver entry de `prompts.md` del 2026-06-06).

**Estado de Fase 1 (cerrada 2026-06-06):**

- `lib/db/` con connection (singleton Supabase), queries de appointments, categories, services.
- `lib/auth/` con `config.edge.ts` (edge-safe, sin DB), `config.ts` (full con CredentialsProvider + Google), `index.ts` (re-exports `handlers`/`auth`/`signIn`/`signOut`), `users.ts` (queries de user).
- `app/api/auth/[...nextauth]/route.ts` + `register/route.ts` + `me/route.ts`.
- `proxy.ts` con `authEdgeConfig` (edge-safe). Matcher: `/mis-turnos/:path*`, `/admin/:path*`.
- `app/login/page.tsx` + `LoginForm.tsx` + `actions.ts` (server action con `signIn`).
- `app/register/page.tsx` + `RegisterForm.tsx` + `actions.ts` (server action con auto-login post-register).
- `app/auth.module.css` con estilos compartidos.
- `components/Navbar/LogoutButton.tsx` con `signOut` de `next-auth/react`, dos variantes (`desktop`/`mobile`).
- `app/layout.tsx` pasa `session.user.role` al Navbar.

## Convenciones no obvias

- **Verificacion al terminar una implementacion**: correr siempre `pnpm typecheck` + `pnpm lint` + `pnpm format:check`. Los tres deben pasar en verde antes de dar por terminado el trabajo. `pnpm typecheck` corre `tsc --noEmit`; `pnpm lint` corre ESLint con la config en `eslint.config.mjs`; `pnpm format:check` verifica formato con Prettier.
- **Sin Tailwind ni UI libs.** Estilos en CSS plano o CSS Modules. No proponer MUI/Chakra/shadcn/etc.
- **TypeScript `strict: true`, cero `any`.** Aplica a la app entera.
- **Comentarios y mensajes de UI en espanol.** Mantener el estilo del repo.
- **Plata siempre en centavos (`price_cents`, entero).** Nunca `REAL`/`FLOAT`/`number` con decimales para precios. El front formatea a moneda con `lib/utils/format.ts` (`formatPrice`).
- **Soft delete en servicios**: `active = 0`, nunca `DELETE` real. Preserva historial de turnos.
- **Sin "barber"/staff**: regla de negocio = **un solo turno activo por slot de tiempo para todo el negocio**. Validar con count, no asumir asignacion.
- **`appointment_at` en ISO 8601** (ordenable, portable). En el front, `<input type="datetime-local">` nativo — no sumar react-datepicker/FullCalendar.
- **Validacion con Zod en TODOS los endpoints** (body/query/params). No confiar en la validacion del cliente.
- **Formato uniforme de error**: `{ error: { code, message, details? } }`. Codigos HTTP: 200/201/204/400/401/403/404/409/500.
- **Next.js + Server Components**: por default las paginas son server components. Usar `"use client"` solo donde hay estado, eventos o APIs del browser. Importante en Navbar/MobileMenu/Button/StubPage (que llevan la directiva).
- **Imports**: `paths: { "@/*": ["./*"] }` permite `@/components/...`, `@/lib/...`. Preferir siempre sobre paths relativos.
- **Fonts**: `next/font/google` para Inter y Fraunces, aplicados como CSS variables `--font-inter` y `--font-fraunces` en `<html>`. `styles/tokens.css` ya referencia esas variables.
- **DB access via Supabase service-role key**: `lib/supabase/server.ts` exporta `supabaseAdmin` usando `SUPABASE_SERVICE_ROLE_KEY`. Bypassea RLS intencionalmente — los route handlers son la unica barrera de seguridad. RLS esta habilitado en todas las tablas como defensa en profundidad (plan 003).
- **Endpoint build steps usan Zod + safeParse**: toda request se valida con `z.object().safeParse()` y se devuelve `400 VALIDATION_ERROR` con `details` por campo.

## Stack y comandos

- **Node 24.14.1** (definido en `.nvmrc`). Usar `nvm use` o tener esa version.
- **pnpm 10.x**.
- **Next.js 15.5+** + **React 19** + TypeScript 5.7 (`strict: true`).
- **Backend embebido**: route.ts handlers en `app/api/<recurso>/route.ts`. DB: `@supabase/supabase-js` (service-role key). Hash: `bcryptjs`. Auth: `next-auth@beta` (v5, Credentials + Google). Validacion: `zod`. Iconos: `lucide-react`. CSS tokens: `open-props`. Fonts: `next/font/google` (Inter, Fraunces).
- **NO usar**: `axios`, `react-router-dom`, `@tanstack/react-query`, `vite`, `express`, `cors`, `jwt` manual — todos eliminados en la migracion.
- **Auth**: NextAuth v5 con CredentialsProvider + Google, JWT session strategy. Sesion en cookie httpOnly que NextAuth maneja. NO localStorage. NO interceptor. NO JWT manual.

## Scripts y puertos

- `pnpm dev` → `next dev` en `http://localhost:3000`.
- `pnpm build` → `next build` (produccion).
- `pnpm start` → `next start` (sirve el build de produccion).
- `pnpm typecheck` → `tsc --noEmit`.
- `pnpm lint` → `eslint .`
- `pnpm lint:fix` → `eslint . --fix`
- `pnpm format` → `prettier --write .`
- `pnpm format:check` → `prettier --check .`
- `pnpm test` → `vitest run`
- `pnpm test:watch` → `vitest`

## Variables de entorno (api)

`.env` — ver `.env.example` para valores de referencia:

```
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sk_xxxx
SUPABASE_ANON_KEY=eyJxxxx               # opcional en dev

# NextAuth v5
AUTH_SECRET=...                          # requerido en prod
NEXTAUTH_URL=http://localhost:3000

# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# reCAPTCHA v3
RECAPTCHA_SITE_KEY=6Lfxxxx
RECAPTCHA_SECRET_KEY=6Lfxxxx
RECAPTCHA_REQUIRED=false                 # false en dev; true en prod
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lfxxxx
```

## Fuera de alcance en esta etapa (no proponer ni agregar)

Pagos (Stripe/MercadoPago), emails/WhatsApp, upload de imagenes, calendario visual drag&drop, multiples peluqueros, WebSockets/tiempo real, i18n, E2E con Playwright, Docker. **Pagos y notificaciones son la idea final del proyecto** (un solo barbero, dueno de su peluqueria), pero se acoplan mas adelante — ver `README.md` seccion "Proximos pasos".

## Anotaciones para extensiones futuras

**MercadoPago / pagos:**

- `appointments.status` tiene CHECK fijo a `('pending','confirmed','cancelled','completed')`. Cuando entren pagos va a faltar un estado tipo `pending_payment` o `paid`. Migracion chica cuando llegue el momento.
- No hay endpoints de webhook en el spec. MercadoPago los necesita para confirmar pagos. Se agregan como rutas nuevas (no rompen nada existente).
- El token de MP va en `.env` (sumar `MP_ACCESS_TOKEN` cuando se sume).
- La plata en centavos (`price_cents`) ya esta bien para integrar MP sin conversion extra.

**Notificaciones automaticas (email / WhatsApp):**

- `users` no tiene campo `phone`. Si el canal es WhatsApp, sumar columna con `ALTER TABLE` cuando se sume. Migracion trivial.
- Email podria sacarse del `email` que ya existe en `users`.
- El disparador natural es el alta de turno y los cambios de estado. Se engancha en el handler de appointments (`app/api/appointments/route.ts`) despues del INSERT/UPDATE. No requiere refactor.
- Servicio de envio va en `lib/notifications/` como modulo aparte. SDK a definir mas adelante (nodemailer / Resend / Twilio WhatsApp / etc).

**Regla 8.2 (un solo turno por slot):** ya es correcta para un solo barbero. **No tocarla** — es justo el caso de uso. Solo se rompe si el dueno suma un segundo peluquero, que no esta en el alcance.

## Reglas de negocio que se olvidan

1. Turno en el pasado → `400`.
2. Dos turnos activos en el mismo `appointment_at` → conflicto (no se permite).
3. Cancelar es siempre valido; libera el slot.
4. Cliente solo ve/modifica lo propio; admin ve y edita todo.
5. `username` y `email` unicos (Zod + `UNIQUE` en SQL).
6. Password minimo 6 caracteres (Zod).
7. Borrar categoria con servicios asociados → `409`.
8. Las reglas pueden ser revisadas despues de un relevamiento real del sistema. No bloquear el avance de los milestones por esto.

## Donde mirar primero cuando se trabe algo

- **Schema/endpoints/rutas/milestones** → `README.md` (es la spec viva).
- **Convenciones del backend en Next.js** → seccion "Convenciones no obvias" de este archivo.
- **Planes de mejora pendientes** → `plans/README.md`.
- **No buscar** `apps/` ni `pnpm-workspace.yaml` — fueron borrados en M0.
