# AGENTS.md

## Estado del repo

M0 cerrado: el proyecto migro de monorepo pnpm (Vite+React+Express) a **Next.js 15 full stack** (App Router + route.ts + Server Components). Estructura actual:

- App Next.js unica en la raiz (no hay monorepo, no hay `pnpm-workspace.yaml`).
- Componentes dumb migrados de `apps/web` a `components/` (Card, Input, FormField, Spinner, Badge, Button, ServiceCard, Navbar con MobileMenu, StubPage).
- `app/` con 12 rutas: `/`, `/_not-found`, `/login`, `/register`, `/servicios`, `/servicios/[id]`, `/mis-turnos`, `/mis-turnos/nuevo`, `/admin/servicios`, `/admin/categorias`, `/admin/turnos`. Stubs usan `components/StubPage`.
- `app/layout.tsx` (root) tiene Navbar + footer, importa `app/globals.css` (que trae open-props/normalize, open-props/sizes, `styles/reset.css`, `styles/tokens.css`).
- `lib/types.ts` con los tipos compartidos (User, Service, Category, Appointment, Role, AppointmentStatus, Page).
- `lib/utils/format.ts` con formatters es-AR (precio, duracion, fecha, hora).
- `styles/tokens.css` y `styles/reset.css` movidos tal cual.
- `scripts/fetch-better-sqlite3-prebuild.mjs` reescrito en Node puro (gunzipSync + parseo manual de tar). Antes usaba `tar` externo que fallaba en Windows con paths `C:\...`.
- `data/turnos.db` gitignored, se regenera en M1 (M2 del README original).
- `next.config.ts` declara `serverExternalPackages: ['better-sqlite3']` para que no se intente bundlear el modulo nativo.
- `.nvmrc` = `24.14.1`.
- **Verificacion**: `pnpm typecheck` y `pnpm build` pasan verde. Smoke test: `pnpm start` arranca en `:3000` y `/`, `/login` devuelven 200; rutas inexistentes devuelven 404 via `app/not-found.tsx`.

Milestone actual: **Fase 1 (M2 del README original) — DB + Auth con NextAuth v5** (migrations, seed, register/login/me con CredentialsProvider, middleware, paginas de auth).

## Convenciones no obvias

- **No hay tests, lint ni formatter configurados.** No ejecutar `pnpm test`, `pnpm lint`, `eslint`, `prettier` — no existen y daran error. La verificacion oficial es `pnpm typecheck` (corre `tsc --noEmit`) + `pnpm build` (corre `next build`) + curl manual. No agregarlos a menos que el usuario lo pida explicitamente.
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
- **better-sqlite3 en server**: el modulo es nativo y NO corre en edge runtime. Cualquier route.ts o Server Action que lo toque debe correr en Node (por default en App Router, no hace falta `export const runtime`).
- **Fonts**: `next/font/google` para Inter y Fraunces, aplicados como CSS variables `--font-inter` y `--font-fraunces` en `<html>`. `styles/tokens.css` ya referencia esas variables.

## Stack y comandos

- **Node 24.14.1** (definido en `.nvmrc`). Usar `nvm use` o tener esa version.
- **pnpm 10.x**.
- **Next.js 15.5+** + **React 19** + TypeScript 5.7.
- **Backend embebido**: route.ts handlers en `app/api/<recurso>/route.ts`. `better-sqlite3@^12.10.0` (sync), `bcryptjs` (hash), `next-auth@beta` (v5, Auth.js), `zod` (validacion), `lucide-react` (iconos), `open-props` (CSS tokens), `next/font/google` (Inter, Fraunces).
- **NO usar**: `axios`, `react-router-dom`, `@tanstack/react-query`, `vite`, `express`, `cors`, `jwt` manual — todos eliminados en la migracion.
- **Auth**: NextAuth v5 con CredentialsProvider + JWT session strategy. Sesion en cookie httpOnly que NextAuth maneja. NO localStorage. NO interceptor. NO JWT manual.

## Scripts y puertos

- `pnpm dev` → `next dev` en `http://localhost:3000`.
- `pnpm build` → `next build` (produccion).
- `pnpm start` → `next start` (sirve el build de produccion).
- `pnpm typecheck` → `tsc --noEmit`. **Este es el comando de verificacion por defecto**, no un lint.

## Variables de entorno (api)

`.env` (opcional, defaults razonables):
```
PORT=3000
NEXTAUTH_SECRET=...                # requerido en prod, en dev NextAuth lo autogenera
NEXTAUTH_URL=http://localhost:3000
DB_PATH=./data/turnos.db
```

## Fuera de alcance en esta etapa (no proponer ni agregar)

Pagos (Stripe/MercadoPago), emails/WhatsApp, upload de imagenes, calendario visual drag&drop, multiples peluqueros, WebSockets/tiempo real, i18n, E2E con Playwright, CI/CD, Docker. Lista completa en README seccion 9. **Pagos y notificaciones son la idea final del proyecto** (un solo barbero, dueno de su peluqueria), pero se acoplan mas adelante — ver seccion siguiente.

## Anotaciones para extensiones futuras

**MercadoPago / pagos:**
- `appointments.status` tiene `CHECK` fijo a `('pending','confirmed','cancelled','completed')`. Cuando entren pagos va a faltar un estado tipo `pending_payment` o `paid`. Migracion chica cuando llegue el momento.
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

- **Schema/endpoints/rutas/milestones** → `README.md` (es la spec viva). Algunas partes van a quedar desactualizadas despues de la migracion a Next.js — el plan del switch esta en este `AGENTS.md` seccion "Estado del repo" y en git history.
- **Convenciones del backend en Next.js** → seccion "Convenciones no obvias" de este archivo.
- **No buscar** configs de eslint/prettier/jest/vitest/cypress/playwright — no existen.
- **No buscar** `apps/` ni `pnpm-workspace.yaml` — fueron borrados en M0.
