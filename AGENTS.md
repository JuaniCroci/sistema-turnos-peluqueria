# AGENTS.md

## Estado del repo

M1 cerrado y verificado. Estructura actual:
- `pnpm-workspace.yaml`, root `package.json`, `.nvmrc` (24.14.1), `.gitignore`, `tsconfig.base.json`
- `apps/api` — Express 5 + TypeScript (NodeNext/ESM) + `GET /api/health` → `{ ok, db: 'up' }` con check real a `SELECT 1` sobre better-sqlite3
- `apps/web` — Vite 6 + React 18 + TS estricto, renderiza `<h1>Sistema de Turnos — Peluquería</h1>` en `/`
- `pnpm dev` levanta ambos en paralelo (api :3000, web :5173)
- `pnpm typecheck` verde en ambos

El README es la spec completa (stack, schema SQL, endpoints, rutas, milestones). Antes de empezar un milestone nuevo, leer `README.md` de punta a punta — ahi esta todo.

Milestone actual: **M2 — DB + Auth** (migrations, seed, register/login/me, middlewares auth y requireAdmin, Zod en todos los endpoints).

## Convenciones no obvias

- **No hay tests, lint ni formatter configurados.** No ejecutar `pnpm test`, `pnpm lint`, `eslint`, `prettier` — no existen y daran error. La verificacion oficial es `pnpm typecheck` (corre `tsc --noEmit` en ambos paquetes) + curl manual. No agregarlos a menos que el usuario lo pida explicitamente.
- **TypeScript api usa `module: "NodeNext"`, web usa `module: "ESNext" + moduleResolution: "Bundler"`.** El README pedia `module: ES2022` que con tsc no agrega extensiones `.js` a los imports relativos y rompe Node ESM nativo. `NodeNext` lo arregla; el espiritu del README (ESM moderno) se mantiene. Los imports en api llevan `.js` al final (`from './foo.js'`).
- **Sin Tailwind ni UI libs.** Estilos en CSS plano o CSS Modules. No proponer MUI/Chakra/shadcn/etc.
- **TypeScript `strict: true`, cero `any`.** Aplica a api y web.
- **Comentarios y mensajes de UI en espanol.** Mantener el estilo del repo.
- **Plata siempre en centavos (`price_cents`, entero).** Nunca `REAL`/`FLOAT`/`number` con decimales para precios. El front formatea a moneda.
- **Soft delete en servicios**: `active = 0`, nunca `DELETE` real. Preserva historial de turnos.
- **Sin "barber"/staff**: regla de negocio = **un solo turno activo por slot de tiempo para todo el negocio**. Validar con count, no asumir asignacion.
- **`appointment_at` en ISO 8601** (ordenable, portable). En el front, `<input type="datetime-local">` nativo — no sumar react-datepicker/FullCalendar.
- **Validacion con Zod en TODOS los endpoints** (body/query/params). No confiar en la validacion del cliente.
- **Formato uniforme de error**: `{ error: { code, message, details? } }`. Codigos HTTP: 200/201/204/400/401/403/404/409/500.

## Stack y comandos

- **Node 24.14.1** (definido en `.nvmrc` que aun no existe pero hay que crear). Usar `nvm use` o tener esa version.
- **pnpm 10.x con workspaces** (`apps/*`). No npm ni yarn.
- **Backend**: Express 5 + TypeScript + `better-sqlite3` (sincronico, no async) + `bcrypt` + `jsonwebtoken` + `zod` + `cors`.
- **Frontend**: Vite + React 18 + `react-router-dom` v6 + `@tanstack/react-query` v5 + `axios`. Hooks en `src/hooks/`, cliente HTTP en `src/api/client.ts` con interceptor JWT y manejo de 401 → logout automatico.
- **Auth**: JWT en header `Authorization: Bearer <token>`, payload `{ sub, role }`, expiracion 7 dias. Token en `localStorage`. Roles: solo `client` y `admin` (no `barber`).
- **Seed automatico** al levantar el backend si la tabla `users` esta vacia. Credenciales por defecto:
  - Admin: `admin@barberia.test` / `admin123`
  - Cliente: `mariano@test.com` / `1234`

## Puertos y scripts utiles

- API: `http://localhost:3000` (prefijo `/api`).
- Web: `http://localhost:5173`.
- `pnpm dev` levanta ambos en paralelo. Para uno solo: `pnpm -F api dev` / `pnpm -F web dev`.
- `pnpm build` = `tsc` en api + `vite build` en web.
- `pnpm typecheck` = `tsc --noEmit` en ambos. **Este es el comando de verificacion por defecto**, no un lint.

## Variables de entorno (api)

`apps/api/.env` (opcional, hay defaults):
```
PORT=3000
JWT_SECRET=cambiame-en-prod
DB_PATH=./data/turnos.db
CORS_ORIGIN=http://localhost:5173
```

## Detalle no obvio: better-sqlite3 y prebuilds

- **Version pineada a `^12.10.0`**, no la 11.x del stack del README. Razon: v12.10.0 (mayo 2026) es la primera que publica prebuilds para el ABI 137 de Node 24. La 11.x no los tiene y no compila en este Windows sin VS Build Tools.
- **Hay un postinstall custom en `apps/api`**: `scripts/fetch-better-sqlite3-prebuild.mjs` baja el prebuild de `https://github.com/WiseLibs/better-sqlite3/releases/download/v{version}/better-sqlite3-v{version}-node-v{abi}-{platform}-{arch}.tar.gz` y lo deposita en `apps/api/node_modules/better-sqlite3/build/Release/better_sqlite3.node`. Reemplaza al `prebuild-install` que viene con el paquete, que en este entorno (pnpm 10) no encuentra el prebuild por su cuenta.
- **Root `package.json` tiene `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }`**. `better-sqlite3` NO esta en la lista a proposito — queremos que su `install` script (prebuild-install + node-gyp) NO corra, y que el postinstall del api haga el fetch manual.
- Si en el futuro se actualiza Node (cambia el ABI) o better-sqlite3, el postinstall detecta todo de `process.versions` y de la version declarada en `apps/api/package.json`. Solo hay que verificar que el `v{version}-node-v{abi}-{platform}-{arch}.tar.gz` exista en GitHub releases.
- Si el postinstall falla (ej. GitHub down, o nueva version sin prebuilds para nuestro ABI), el `pnpm dev` del api va a tirar error de "no se puede cargar better-sqlite3". Soluciones: (a) esperar a que publiquen prebuild, (b) instalar VS Build Tools y volver a poner `better-sqlite3` en `onlyBuiltDependencies` para que compile desde fuente, (c) cambiar a `node:sqlite` built-in de Node 22+.

## Fuera de alcance en esta etapa (no proponer ni agregar)

Pagos (Stripe/MercadoPago), emails/WhatsApp, upload de imagenes, calendario visual drag&drop, multiples peluqueros, WebSockets/tiempo real, i18n, E2E con Playwright, CI/CD, Docker. Lista completa en README seccion 9. **Pagos y notificaciones son la idea final del proyecto** (un solo barbero, dueno de su peluqueria), pero se acoplan mas adelante — ver seccion siguiente.

## Anotaciones para extensiones futuras

**MercadoPago / pagos:**
- `appointments.status` tiene `CHECK` fijo a `('pending','confirmed','cancelled','completed')`. Cuando entren pagos va a faltar un estado tipo `pending_payment` o `paid`. Migracion chica cuando llegue el momento.
- No hay endpoints de webhook en el spec. MercadoPago los necesita para confirmar pagos. Se agregan como rutas nuevas (no rompen nada existente).
- El token de MP va en `apps/api/.env` (sumar `MP_ACCESS_TOKEN` cuando se sume).
- La plata en centavos (`price_cents`) ya esta bien para integrar MP sin conversion extra.

**Notificaciones automaticas (email / WhatsApp):**
- `users` no tiene campo `phone`. Si el canal es WhatsApp, sumar columna con `ALTER TABLE` cuando se sume. Migracion trivial.
- Email podria sacarse del `email` que ya existe en `users`.
- El disparador natural es el alta de turno y los cambios de estado. Se engancha en el controller de appointments (`appointments.controller.ts`) despues del commit a la DB. No requiere refactor.
- Servicio de envio va en `apps/api/src/modules/notifications/` como modulo aparte. SDK a definir mas adelante (nodemailer / Resend / Twilio WhatsApp / etc).

**Regla 8.2 (un solo turno por slot):** ya es correcta para un solo barbero. **No tocarla** — es justo el caso de uso. Solo se rompe si el dueno suma un segundo peluquero, que no esta en el alcance.

## Reglas de negocio que se olvidan

1. Turno en el pasado → `400`.
2. Dos turnos activos en el mismo `appointment_at` → conflicto (no se permite).
3. Cancelar es siempre valido; libera el slot.
4. Cliente solo ve/modifica lo propio; admin ve y edita todo.
5. `username` y `email` unicos (Zod + `UNIQUE` en SQL).
6. Password minimo 6 caracteres (Zod).
7. Borrar categoria con servicios asociados → `409`.

## Donde mirar primero cuando se trabe algo

- **Schema/endpoints/rutas/milestones** → `README.md` (es la spec viva).
- **No buscar** configs de eslint/prettier/jest/vitest/cypress/playwright — no existen.
- **No buscar** `apps/api/src/...` o `apps/web/src/...` hasta haber completado el M1.
