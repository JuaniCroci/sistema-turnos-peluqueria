# Registro de prompts

Log cronologico de los prompts que le mando al agente (opencode / MiniMax-M3) durante el desarrollo de **sistema-turnos-peluqueria**. Lo escribo yo a mano al final de cada sesion copiando lo que me acuerdo, o se lo pido al agente que lo actualice en el momento.

## Por que existe

- Tener trazabilidad de que le pedi al agente y en que orden.
- Poder retomar rapido si paso semanas sin tocar el proyecto.
- Detectar cuando el agente "alucina" contexto que nunca existio (si una decision aparece aca, existe; si no, es invento).
- Justificar decisiones tecnicas en el TP de la facultad ("en tal fecha le pedi X por tal motivo").

## Como se lee cada entrada

- **Fecha**: dia que se hizo el prompt (no cuando se completo el trabajo).
- **Prompt**: copia textual de lo que le mande al agente.
- **Contexto**: estado del proyecto en ese momento + que respondio / hizo el agente.
- **Decision / follow-up**: si surgio algo a raiz de la respuesta, queda anotado aca.

> Nota: este archivo empieza con fecha 2026-06-06. Los prompts anteriores a esa fecha no estan registrados (los recuerdo a grandes rasgos pero no los transcribo retroactivamente para no inventar).

---

## 2026-06-06 — Creacion del registro + consulta de fase

**Prompt:**

> Quiero un registro de prompts.md mio desde que arranco el proyecto para tener registro en un futuro. Comenza con la fase 2 si no hay nada que revisar

**Contexto:**

- M0 cerrado (migracion de monorepo pnpm Vite+Express a Next.js 15 full stack). Estructura actual documentada en `AGENTS.md`.
- AGENTS.md declara como milestone actual: "Fase 1 (M2 del README original) — DB + Auth con NextAuth v5".
- `package.json` tiene `better-sqlite3` y `lucide-react` ya instalados. NO tiene `next-auth`, NO tiene `bcryptjs`, NO tiene `zod`.
- `lib/` solo tiene `types.ts` y `utils/format.ts`. No existe `lib/db/`, no hay migrations, no hay seed.
- Todas las paginas de `app/` (`/login`, `/register`, `/servicios`, `/servicios/[id]`, `/mis-turnos/*`, `/admin/*`) son stubs que usan `components/StubPage`.
- Tipos compartidos (`User`, `Service`, `Category`, `Appointment`, `Page<T>`) ya definidos en `lib/types.ts`.

**Resultado del agente:**

- Creo este `prompts.md` con la presente entrada.
- Flagueo que **Fase 1 no esta terminada** (sin DB, sin auth, sin zod, sin migraciones, sin seed) → "si no hay nada que revisar" en realidad **si hay**: cerrar Fase 1 antes de arrancar Fase 2.
- Pregunto al usuario como seguir.

**Decision del usuario:** cerrar Fase 1 primero (Recommended).

**Resultado del agente (cierre Fase 1):**

- Instalo deps: `next-auth@5.0.0-beta.31`, `bcryptjs@3.0.3`, `zod@4.4.3`, `@types/bcryptjs@3.0.0` (deprecado pero anda).
- Capa DB:
  - `lib/db/migrations.ts` — array de SQL con las 4 tablas + 6 indices del README seccion 4.
  - `lib/db/connection.ts` — singleton via `globalThis.__turnosDb`, abre el DB en `DB_PATH` (default `./data/turnos.db`), `mkdirSync` recursivo, `journal_mode=WAL`, `foreign_keys=ON`, corre migrations y seed en la primera apertura.
  - `lib/db/seed.ts` — siembra admin (`admin@barberia.test`/`admin123`), cliente (`juani@test.com`/`1234`), 4 categorias (Cabello, Barba, Coloracion, Tratamientos) y 9 servicios con precios en centavos (ej. Keratina 120min = 1800000 cents = $18.000). Solo corre si `users` esta vacio. Transaccion con rollback.
- `lib/utils/password.ts` — `bcryptjs` con `SALT_ROUNDS=10` (sync).
- `lib/utils/api.ts` — `errorResponse(code, message, details?)` y `zodDetails(zodError)`. Cumplen el formato uniforme `{ error: { code, message, details? } }` del README seccion 5.1. Codigos: `VALIDATION_ERROR`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`INTERNAL_ERROR` mapeados a 400/401/403/404/409/500.
- Auth:
  - `lib/auth/config.edge.ts` — NextAuth config **edge-safe** (sin DB, sin `node:fs`, sin `node:path`). Tiene `pages.signIn='/login'`, `session.strategy='jwt'`, callbacks `jwt`/`session`/`authorized`, y `trustHost:true` (sin esto rompe `/api/auth/providers` con `UntrustedHost` en `next start`).
  - `lib/auth/config.ts` — extends edge con el `Credentials` provider que hace `safeParse` con Zod, llama `findUserByEmail` y `verifyPassword`. Si todo OK devuelve `{ id, email, name, role }`.
  - `lib/auth/index.ts` — `NextAuth(authConfig)` y re-exporta `handlers`, `auth`, `signIn`, `signOut`.
  - `lib/auth/users.ts` — `findUserByEmail`, `findUserByUsername`, `findUserById`, `createUser`. Email siempre se guarda lowercased.
  - `lib/auth/types.ts` — (borrado en favor de `.d.ts`).
  - `types/next-auth.d.ts` — module augmentation de `next-auth`. Define un `AppUser` con `id: number` (sobreescribiendo el `id?: string` del default), `role: Role`, `username: string | null`, mas `name/email/image` opcional. La intencion era `Session.user & DefaultSession['user']` pero generaba `id: never` por interseccion incompatible con `AdapterUser.id: string` — solucione definiendo `AppUser` explicito y reasignando todo el `Session.user`. **Anotacion para futuro**: si NextAuth arregla el callback type, se puede volver al patron `& DefaultSession['user']` mas limpio.
- API:
  - `app/api/auth/[...nextauth]/route.ts` — re-exporta `GET`/`POST` de `handlers`.
  - `app/api/auth/register/route.ts` — POST con Zod (`email`, `username` regex `^[a-zA-Z0-9_.-]+$`, `password` min 6). Devuelve `201 { user }` o `409` (email/username duplicado) o `400` con `details`.
  - `app/api/auth/me/route.ts` — GET que devuelve `200 { user }` desde `auth()` o `401` si no hay sesion.
- `middleware.ts` — usa el `authEdgeConfig` (NO el full, para no jalar DB al edge runtime). Matcher: `/mis-turnos/:path*` y `/admin/:path*`. El callback `authorized` redirige:
  - `/admin/*` requiere `role === 'admin'`
  - `/mis-turnos/*` requiere estar logueado
  - resto: pasa
- Paginas de auth:
  - `app/login/page.tsx` (server) — si ya hay sesion redirige a `callbackUrl ?? '/'`. Pasa un `LoginForm` adentro de un `Card` con titulo + subtitulo.
  - `app/login/actions.ts` (`'use server'`) — `loginAction(prev, formData)` que llama `signIn('credentials', { email, password, redirectTo: '/' })`. Si tira `AuthError` con `type==='CredentialsSignin'` devuelve `{ error: 'Email o contraseña incorrectos' }`. Otros `AuthError` → `'No se pudo iniciar sesion'`. Re-throw de todo lo demas (incluido el `NEXT_REDIRECT` que internamente usa `signIn`).
  - `app/login/LoginForm.tsx` (`'use client'`) — `useActionState` + UI con `FormField`/`Input`/`Button`. Lee `?registered=1` para mostrar confirmacion verde tras register, y `?callbackUrl=...` para preservarlo en el link a `/register`.
  - `app/register/page.tsx` (server) — idem, redirige si ya hay sesion.
  - `app/register/actions.ts` (`'use server'`) — `registerAction(prev, formData)` que valida con Zod (reusando la logica de la ruta API, **duplicacion intencional** para no acoplar el server action al shape de la respuesta HTTP), hashea, crea el user con `role:'client'`, y al final llama `signIn` con las mismas credenciales para auto-login. Devuelve `fieldErrors` por campo si Zod falla, o `error` generico si choca UNIQUE.
  - `app/register/RegisterForm.tsx` (`'use client'`) — `useActionState` + form con `fieldErrors` por campo (muestra `error` del `FormField`).
  - `app/auth.module.css` — estilos compartidos para el wrapper, card centrada, header, form, error/success banner con border rgba, footer con link de acento.
- Navbar / logout:
  - `app/layout.tsx` — `const session = await auth()` y pasa `{ role: session.user.role }` al `Navbar`.
  - `components/Navbar/LogoutButton.tsx` (nuevo, client) — `signOut({ callbackUrl: '/' })` desde `next-auth/react`. Dos variantes: `desktop` (boton con estilo navLink) y `mobile` (boton con icono `LogOut`).
  - `components/Navbar/Navbar.tsx` — el `<span>Salir</span>` placeholder ahora usa `<LogoutButton variant='desktop' />`. Agregada la clase `.navLinkButton` al CSS module.
  - `components/Navbar/MobileMenu.tsx` — el boton placeholder "Cerrar sesion" ahora usa `<LogoutButton variant='mobile' />`. Removido el import de `LogOut` que ahora vive en `LogoutButton`.
- Env:
  - `.env` — `PORT=3000`, `DB_PATH=./data/turnos.db`, `AUTH_SECRET=dev-only-secret...`, `AUTH_URL=http://localhost:3000`, `NEXTAUTH_URL` como alias documentado.
  - `AUTH_URL` es la variable que usa NextAuth v5; `NEXTAUTH_URL` se mantiene como alias para no romper el README/AGENTS.md.

**Verificacion:**

- `pnpm typecheck` → verde.
- `pnpm build` → verde, 14 rutas (incluyendo 3 API de auth), middleware 87.2 kB.
- Smoke test con `next start`:
  - `GET /` → 200
  - `GET /login` → 200
  - `GET /register` → 200
  - `GET /admin/servicios` sin sesion → 307 a `/login?callbackUrl=...`
  - `GET /mis-turnos` sin sesion → 307 a `/login?callbackUrl=...`
  - `GET /api/auth/providers` → lista el provider `credentials`
  - `GET /api/auth/csrf` → devuelve token
  - `POST /api/auth/register` con data valida → 201 `{ user: { id, email, username, role } }`
  - `POST /api/auth/register` con email duplicado → 409 `CONFLICT`
  - `POST /api/auth/register` con username duplicado → 409 `CONFLICT`
  - `POST /api/auth/register` con email invalido y password corto → 400 `VALIDATION_ERROR` con `details` por campo
  - `POST /api/auth/register` con body no-JSON → 400 `VALIDATION_ERROR`
  - `POST /api/auth/callback/credentials` con admin@barberia.test/admin123 → 302, session cookie seteada
  - `GET /api/auth/session` con cookie → `{ user: { id: 1, email, name:'admin', role:'admin', username:'admin' } }`
  - `GET /api/auth/me` con cookie → mismo payload
  - Con sesion admin: `GET /admin/servicios` → 200, `GET /admin/categorias` → 200, `GET /admin/turnos` → 200, `GET /mis-turnos` → 200
  - Con sesion cliente: `GET /mis-turnos` → 200, `GET /admin/servicios` → 307 (cliente NO es admin)
  - Login con password incorrecto → 302 a pagina de error, session queda null
  - `POST /api/auth/signout` con CSRF valido → 302, session queda null, rutas protegidas vuelven a redirigir
  - DB creada en `data/turnos.db` con WAL (`turnos.db-wal`, `turnos.db-shm`). Tablas `users`, `categories`, `services`, `appointments` + 6 indices. Seed aplicada con 2 users, 4 categorias, 9 servicios.

**Decisiones / follow-up:**

- **Fase 1 cerrada.** M2 (DB + Auth) completo. Falta actualizar `AGENTS.md` para reflejar el milestone actual = "Fase 2 — Servicios y categorias".
- **Anotacion para Fase 2** (servicios + categorias): ya tenemos `lib/types.ts` con `Service` y `Category` y la DB sembrada con 4 categorias + 9 servicios. La UI `/servicios` y `/servicios/[id]` sigue siendo stub, hay que reemplazarla con una lista SSR + filtros (categoria, busqueda, paginacion) y un detalle. `/admin/servicios` y `/admin/categorias` tambien son stubs, hay que hacer el CRUD con soft delete para servicios y `409` si la categoria tiene servicios asociados.
- **Anotacion tecnica**: el `auth()` de NextAuth se cachea por request, asi que se puede llamar multiples veces en una misma renderizacion (layout + page) sin penalty. Ya lo usa el layout y lo usaran las paginas de Fase 2.
- **Anotacion tecnica**: el `getDb()` tiene el patron `globalThis.__turnosDb` para sobrevivir el HMR de Next dev. En prod no importa porque es un unico proceso largo. Confirmado que `data/turnos.db` se crea lazy en la primera llamada a `getDb()` (la primera vez que alguien pega `/api/auth/register` o hace login).
- **Anotacion para pago futuro** (MercadoPago): el endpoint `/api/auth/me` ya existe y devuelve `{ id, email, username, role }`. Si en algun momento hace falta un `phone` en el payload (para WhatsApp), se agrega al `User` type, al DTO de `me` y al seed — sin romper lo actual.
