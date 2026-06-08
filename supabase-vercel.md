# Migración a Supabase + Vercel

## Stack post-migración

| Capa | Tecnología |
|---|---|
| DB | Supabase PostgreSQL (vía `@supabase/supabase-js`) |
| Auth | NextAuth v5 (JWT, Credentials) — se mantiene |
| Queries | Supabase JS query builder (`.from().select()`) |
| JOINs complejos | Query builder + helper `flattenRow()` |
| Hosting | Vercel (serverless functions) |

## Fases

### Fase 1 — Crear proyecto Supabase

1. Ir a [supabase.com](https://supabase.com) → "New project"
2. Nombre: `sistema-turnos-peluqueria`
3. Database password segura
4. Región cercana (ej: São Paulo)
5. Anotar: Project URL, anon key, service_role key, connection string

### Fase 2 — Schema + seed en Supabase SQL Editor

- Ejecutar `scripts/init.sql` (DDL PostgreSQL)
- Ejecutar seed INSERTs

### Fase 3 — Dependencias y config

- Quitar `better-sqlite3`, `@types/better-sqlite3`, script `postinstall`
- Agregar `@supabase/supabase-js`
- Sacar `serverExternalPackages` de `next.config.ts`
- `.env`: reemplazar `DB_PATH` por variables Supabase
- Eliminar `scripts/fetch-better-sqlite3-prebuild.mjs`

### Fase 4 — Capa de infraestructura nueva

- `lib/supabase/client.ts` — cliente con anon key (client components)
- `lib/supabase/server.ts` — cliente con service_role key (server-side)
- `lib/db/connection.ts` — reescrito, exporta `getDb()` que retorna `supabaseAdmin`
- `lib/db/flatten.ts` — helper para aplanar objetos anidados de JOINs

### Fase 5 — Migrar DB queries a Supabase JS + async

Todas las funciones en `lib/db/*.ts` y `lib/auth/users.ts`:
- Pasan de sync → async
- Usan `supabase.from().select()` en vez de `db.prepare('SQL')`
- Las queries con JOIN usan `flattenRow()`

### Fase 6 — Actualizar callers (agregar await)

- 9 route handlers en `app/api/**/route.ts`
- 2 server components: `app/servicios/page.tsx`, `[id]/page.tsx`
- 1 server action: `app/register/actions.ts`
- Auth config: `lib/auth/config.ts` (authorize async)

### Fase 7 — Deploy a Vercel

- Push a GitHub
- Importar en Vercel
- Setear environment variables
- Deploy + verificar endpoints

## Archivos tocados

| Acción | Archivos |
|---|---|
| Crear | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/db/flatten.ts`, `scripts/init.sql` |
| Eliminar | `scripts/fetch-better-sqlite3-prebuild.mjs` |
| Reescribir (DB) | `connection.ts`, `migrations.ts`, `seed.ts`, `services.ts`, `categories.ts`, `appointments.ts` |
| Reescribir (auth) | `users.ts`, `config.ts` |
| Agregar await (routes) | 9 route handlers |
| Agregar await (pages) | `servicios/page.tsx`, `servicios/[id]/page.tsx` |
| Agregar await (actions) | `register/actions.ts` |
| Modificar (config) | `package.json`, `next.config.ts`, `.env` |
| Sin cambios | `middleware.ts`, `config.edge.ts`, `mis-turnos/page.tsx`, `admin/turnos/page.tsx` |
