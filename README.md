# Sistema de Turnos — Peluquería

App fullstack para reservar turnos en una peluquería. Los clientes se registran, eligen un servicio (corte, barba, coloración, etc.), reservan fecha y hora, y ven el historial de sus turnos. El admin gestiona el catálogo de servicios y los turnos.

---

## 1. Motivación y conexión con el e-commerce

Este proyecto es **un campo de entrenamiento** para el trabajo final de la facultad: un e-commerce en grupo. La mayoría de los patrones se reusan tal cual:

| Peluquería                    | E-commerce             |
| ----------------------------- | ---------------------- |
| Servicio                      | Producto               |
| Categoría                     | Categoría              |
| Reservar turno                | Crear orden / checkout |
| "Mis turnos"                  | "Mis órdenes"          |
| Panel admin                   | Panel admin            |
| Disponibilidad por fecha/hora | Stock / inventario     |

Lo que **sí** vas a tener que sumar en el e-commerce y que **no** se hace acá: integración de pagos (Stripe / MercadoPago), gestión de stock y envíos.

---

## 2. Stack

### Fullstack — Next.js 15 (App Router)

- **Runtime**: Node 24.14.1 (`.nvmrc`)
- **Lenguaje**: TypeScript 5.7, `strict: true`, cero `any`
- **Framework**: Next.js 15.5+ (App Router con route.ts + Server Components)
- **DB**: `better-sqlite3` v12 (sincrónico, cero config)
- **Auth**: NextAuth v5 beta (Auth.js) con CredentialsProvider + JWT
- **Validación**: `zod` en todos los endpoints con body/query/params
- **Iconos**: `lucide-react`
- **CSS tokens**: `open-props` + CSS Modules planos (sin Tailwind ni UI libs)
- **Fonts**: `next/font/google` (Inter + Fraunces)

### Package manager

- **pnpm** 10.x (sin workspaces, app única en la raíz)

---

## 3. Estructura del repo

```
sistema-turnos-peluqueria/
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env                         # AUTH_SECRET, DB_PATH, etc.
├── .nvmrc                       # 24.14.1
├── .gitignore
├── README.md
├── AGENTS.md                    # Instrucciones para agentes de IA
│
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout (Navbar + footer + fonts)
│   ├── globals.css              # Reset + tokens + normalize
│   ├── page.tsx                 # Home
│   ├── not-found.tsx            # 404
│   ├── auth.module.css
│   │
│   ├── login/                   # Login (server action + form)
│   ├── register/                # Registro (server action + form)
│   │
│   ├── servicios/               # Listado público con filtros
│   │   └── [id]/                # Detalle de servicio
│   │
│   ├── mis-turnos/              # Lista de turnos del cliente
│   │   └── nuevo/               # Formulario de reserva
│   │
│   ├── admin/
│   │   ├── page.tsx             # Redirige a /admin/servicios
│   │   ├── servicios/           # CRUD de servicios
│   │   ├── categorias/          # CRUD de categorías
│   │   └── turnos/              # Gestión de turnos (admin)
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/   # NextAuth handlers
│       │   ├── register/        # POST /api/auth/register
│       │   └── me/              # GET /api/auth/me
│       ├── categories/          # GET, POST
│       │   └── [slug]/          # GET by slug, DELETE
│       ├── services/            # GET (lista), POST
│       │   └── [id]/            # GET, PUT, DELETE
│       ├── appointments/        # GET (lista), POST
│       │   └── [id]/
│       │       └── status/      # PATCH
│       └── users/               # GET (admin)
│
├── components/
│   ├── Badge/                   # Badge con tonos (success, danger, etc.)
│   ├── Button/                  # Botón con variantes, loading, iconos
│   ├── Card/                    # Contenedor con paddings
│   ├── FormField/               # Label + input + error
│   ├── Input/                   # Input estilizado
│   ├── Navbar/                  # Navbar + MobileMenu + LogoutButton
│   ├── ServiceCard/             # Card de servicio (listado público)
│   ├── Skeleton/                # Skeleton loader
│   ├── Spinner/                 # Spinner SVG
│   └── StubPage/                # Placeholder para páginas futuras
│
├── lib/
│   ├── auth/
│   │   ├── config.ts            # Auth config full (con CredentialsProvider)
│   │   ├── config.edge.ts       # Auth config edge-safe (middleware)
│   │   ├── index.ts             # Re-exports auth, handlers, signIn, signOut
│   │   └── users.ts             # Queries de usuarios
│   ├── db/
│   │   ├── connection.ts        # Singleton better-sqlite3 (globalThis)
│   │   ├── migrations.ts        # Schema SQL
│   │   ├── seed.ts              # Datos iniciales
│   │   ├── services.ts          # Queries de servicios (cache)
│   │   ├── categories.ts        # Queries de categorías (cache)
│   │   └── appointments.ts      # Queries de turnos
│   ├── utils/
│   │   ├── api.ts               # errorResponse, zodDetails helpers
│   │   ├── format.ts            # formatPrice, formatDuration, etc.
│   │   └── password.ts          # bcrypt hash/verify
│   └── types.ts                 # Tipos compartidos (User, Service, etc.)
│
├── middleware.ts                # Route protection (NextAuth edge)
├── styles/
│   ├── tokens.css               # CSS custom properties semánticos
│   └── reset.css                # Reset básico
│
├── types/
│   └── next-auth.d.ts           # Module augmentation de next-auth
│
├── data/
│   └── turnos.db                # SQLite (gitignored, se regenera)
│
└── scripts/
    └── fetch-better-sqlite3-prebuild.mjs  # Helper Windows para prebuilds
```

---

## 4. Modelo de datos

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    UNIQUE NOT NULL,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('client', 'admin')) DEFAULT 'client',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE services (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  name             TEXT    NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
  price_cents      INTEGER NOT NULL CHECK(price_cents >= 0),
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE appointments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  service_id     INTEGER NOT NULL REFERENCES services(id),
  appointment_at TEXT    NOT NULL,
  status         TEXT    NOT NULL CHECK(status IN
                    ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  notes          TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_services_category  ON services(category_id);
CREATE INDEX idx_services_name      ON services(name);
CREATE INDEX idx_services_active    ON services(active);
CREATE INDEX idx_appointments_user  ON appointments(user_id);
CREATE INDEX idx_appointments_date  ON appointments(appointment_at);
CREATE INDEX idx_appointments_status ON appointments(status);
```

### Decisiones de diseño

- **`price_cents` en vez de float**: nunca guardes plata en `REAL`/`FLOAT`. Trabajá siempre en centavos (entero) y formateá a moneda en el front.
- **`active` en servicios**: borrado lógico. Nunca `DELETE` real; el admin "elimina" poniendo `active = 0`. Esto preserva el historial de turnos.
- **`appointment_at` ISO 8601** (ej. `2026-06-15T14:30:00.000Z`). Más portable y ordenable.
- **Roles**: `client` y `admin`. No se prevee `barber` ni multi-tenant.

---

## 5. API REST

Todas las rutas son `NextResponse` JSON dentro de `app/api/`. Autenticación vía NextAuth (cookie httpOnly, JWT). Ver `middleware.ts` para protección de rutas.

### 5.1 Formato uniforme de errores

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [{ "path": "email", "message": "Email inválido" }]
  }
}
```

Códigos HTTP usados: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `500`.

### 5.2 Endpoints

#### Auth

| Método | Ruta                     | Auth    | Body / Query                      | Respuesta             |
| ------ | ------------------------ | ------- | --------------------------------- | --------------------- |
| POST   | `/api/auth/register`     | público | `{ email, username, password }`   | `201 { data }`        |
| POST   | `/api/auth/login`        | público | `{ email, password }`             | (NextAuth credentials) |
| GET    | `/api/auth/me`           | cliente | —                                 | `200 { data }`        |

#### Categories

| Método | Ruta                      | Auth    | Body / Query                        | Notas                                |
| ------ | ------------------------- | ------- | ----------------------------------- | ------------------------------------ |
| GET    | `/api/categories`         | público | —                                   | Devuelve `{ data: [...] }`           |
| GET    | `/api/categories/:slug`   | público | —                                   | Una por slug                         |
| POST   | `/api/categories`         | admin   | `{ name, slug, description? }`      | —                                    |
| DELETE | `/api/categories/:id`     | admin   | —                                   | Solo si no tiene servicios asociados |

#### Services

| Método | Ruta                | Auth    | Body / Query                                                              | Notas                                                                 |
| ------ | ------------------- | ------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/services`     | público | `?category=<slug>&q=<texto>&page=1&limit=10&includeInactive=1` (admin)   | Devuelve `{ data: [...], pagination: {...} }`. Admin ve inactivos.   |
| GET    | `/api/services/:id` | público | —                                                                         | —                                                                     |
| POST   | `/api/services`     | admin   | `{ category_id, name, description?, duration_minutes, price_cents }`      | —                                                                     |
| PUT    | `/api/services/:id` | admin   | `{ category_id?, name?, description?, duration_minutes?, price_cents? }`  | Edita cualquier campo                                                 |
| DELETE | `/api/services/:id` | admin   | —                                                                         | Soft delete (`active = 0`)                                            |

#### Appointments

| Método | Ruta                               | Auth          | Body / Query                                                                  | Notas                                                                |
| ------ | ---------------------------------- | ------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/appointments`                | cliente       | `?status=pending&from=...&to=...&user_id=...` (admin) &page=1&limit=20        | Cliente ve los suyos. Admin ve todos (filtro `user_id` solo admin). |
| GET    | `/api/appointments/:id`            | cliente       | —                                                                             | Cliente solo si es suyo; admin cualquiera                            |
| POST   | `/api/appointments`                | cliente       | `{ service_id, appointment_at, notes? }`                                      | Valida futuro, servicio activo, sin solapamiento                     |
| PATCH  | `/api/appointments/:id/status`     | cliente/admin | `{ status }`                                                                  | Cliente solo `cancelled`. Admin cualquier estado                     |

#### Users (admin)

| Método | Ruta         | Auth  | Notas                                  |
| ------ | ------------ | ----- | -------------------------------------- |
| GET    | `/api/users` | admin | Lista todos los usuarios               |

---

## 6. Frontend

### 6.1 Rutas

| Ruta                | Página                                                | Acceso                                  |
| ------------------- | ----------------------------------------------------- | --------------------------------------- |
| `/`                 | Home (hero + cómo funciona)                           | público                                 |
| `/servicios`        | Listado con búsqueda, filtro por categoría, paginación | público                                 |
| `/servicios/:id`    | Detalle + botón "Reservar"                            | público                                 |
| `/login`            | Login                                                 | público (redirige a `/` si ya logueado) |
| `/register`         | Registro                                              | público (redirige a `/` si ya logueado) |
| `/mis-turnos`       | Lista de turnos del usuario logueado                  | cliente                                 |
| `/mis-turnos/nuevo` | Form de reserva (servicio + fecha+hora + notas)       | cliente                                 |
| `/admin`            | Redirige a `/admin/servicios`                         | admin                                   |
| `/admin/servicios`  | Tabla CRUD de servicios                               | admin                                   |
| `/admin/categorias` | Tabla CRUD de categorías                              | admin                                   |
| `/admin/turnos`     | Tabla de todos los turnos, filtros y cambio de estado | admin                                   |

### 6.2 Componentes globales

- **Navbar** con links dinámicos según `session.user.role`
- **Middleware** protege `/mis-turnos/*` (requiere auth) y `/admin/*` (requiere rol admin)
- **Server Components** por defecto. `"use client"` solo donde hay estado o eventos del browser.

### 6.3 Decisiones de UX

- Formularios con manejo de loading y errores inline
- Empty states para listas vacías
- Loading states (texto o esqueletos) para fetching
- Filtros y búsqueda con submit explícito (sin debounce automático)
- Paginación clásica (prev/next + número de página)
- Fechas: `<input type="datetime-local">` nativo, sin librerías de calendario

---

## 7. Seed (datos iniciales)

Se ejecuta automáticamente al levantar el backend si la tabla `users` está vacía (vía `lib/db/seed.ts`).

**Usuarios:**

- Admin: `admin@barberia.test` / `admin123`
- Cliente: `juani@test.com` / `1234`

**Categorías:**

- `Cabello`
- `Barba`
- `Coloración`
- `Tratamientos`

**Servicios:**

| Categoría    | Nombre             | Duración | Precio  |
| ------------ | ------------------ | -------- | ------- |
| Cabello      | Corte caballero    | 30 min   | $3.000  |
| Cabello      | Corte dama         | 45 min   | $5.000  |
| Cabello      | Corte niño         | 20 min   | $2.000  |
| Barba        | Perfilado de barba | 20 min   | $2.000  |
| Barba        | Barba completa     | 30 min   | $3.500  |
| Coloración   | Tinte de raíces    | 60 min   | $8.000  |
| Coloración   | Color completo     | 90 min   | $12.000 |
| Tratamientos | Hidratación        | 40 min   | $6.000  |
| Tratamientos | Keratina           | 120 min  | $18.000 |

---

## 8. Reglas de negocio (importantes)

1. **No se puede reservar un turno en el pasado** → `400`.
2. **No puede haber dos turnos activos en el mismo horario**. El modelo es: un solo turno activo por slot de tiempo para todo el negocio. Se valida con count de `appointments` con `appointment_at = ?` y `status IN ('pending','confirmed')`.
3. **Cancelar** un turno es válido en cualquier momento. Pasar a `cancelled` libera el slot.
4. **El admin ve y puede editar todo.** El cliente solo ve y modifica lo propio.
5. **Soft delete de servicios**: los turnos viejos siguen mostrando el nombre del servicio aunque esté `active=0`. Las queries de turnos hacen JOIN con services sin filtrar por `active`.
6. **Username y email únicos** (validación Zod + constraint UNIQUE).
7. **Password mínimo 6 caracteres** (validación Zod).
8. **No permitir borrar una categoría con servicios asociados** → `409`.
9. **Cliente solo puede cancelar turnos** (no confirmar/completar). Admin puede transicionar a cualquier estado.

---

## 9. Fuera de alcance (NO se hace)

- Pagos / MercadoPago / Stripe
- Notificaciones por email o WhatsApp
- Subida de imágenes de servicios
- Calendario visual drag&drop / time-picker custom
- Múltiples peluqueros / asignación de staff
- WebSockets / tiempo real
- i18n (todo en español, hardcodeado)
- Tests E2E con Playwright
- CI/CD
- Docker (corre nativo, no necesita container)

---

## 10. Milestones de implementación

### Fase 1 — DB + Auth (~cerrada 2026-06-06)

DB (connection, migrations, seed), Auth (NextAuth v5, register, login, me), middleware protección de rutas, páginas de login/register, migración a Next.js full stack.

### Fase 2 — Servicios y categorías (~cerrada)

Endpoints CRUD de services y categories con filtros, paginación, soft delete. Páginas públicas `/servicios` y `/servicios/[id]`. Admin CRUD en `/admin/servicios` y `/admin/categorias`.

### Fase 3 — Turnos (~cerrada)

Endpoints CRUD de appointments con validación anti-solapamiento y reglas por rol. Páginas cliente `/mis-turnos` y `/mis-turnos/nuevo`. Admin panel `/admin/turnos` con filtros y cambio de estado.

### Fase 4 — Polish (~cerrada)

Redirección `/admin` → `/admin/servicios`, metadata en todas las páginas, errores inline en vez de `alert()`, README actualizado.

---

## 11. Setup

### Prerrequisitos

- Node `24.14.1` (usar `nvm use` o tener la versión instalada)
- pnpm `10.x` (`npm i -g pnpm`)

### Instalación

```bash
pnpm install
```

### Desarrollo

```bash
pnpm dev    # next dev en http://localhost:3000
```

### Producción

```bash
pnpm build  # next build
pnpm start  # next start en http://localhost:3000
```

### Variables de entorno

Crear `.env` (opcional, defaults razonables):

```
AUTH_SECRET=cambiame-en-prod          # requerido en prod, en dev NextAuth lo autogenera
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
DB_PATH=./data/turnos.db
```

---

## 12. Scripts (package.json)

| Script           | Hace                          |
| ---------------- | ----------------------------- |
| `pnpm dev`       | `next dev`                    |
| `pnpm build`     | `next build`                  |
| `pnpm start`     | `next start`                  |
| `pnpm typecheck` | `tsc --noEmit` (verificación) |

> **No hay scripts de test, lint ni format.** No se configuran a menos que se pidan explícitamente.

---

## 13. Verificación manual

```bash
# Health — revisar que la app responde
curl -i http://localhost:3000/

# Login como admin
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barberia.test","password":"admin123","username":"admin"}'

# Listar servicios públicos
curl -i http://localhost:3000/api/services

# Listar categorías
curl -i http://localhost:3000/api/categories
```

### Flujo completo

1. Abrir `http://localhost:3000`
2. Registrarse como cliente o loguearse con `juani@test.com` / `1234`
3. Explorar servicios en `/servicios`
4. Reservar un turno desde `/mis-turnos/nuevo`
5. Ver turnos en `/mis-turnos`
6. Loguearse como admin (`admin@barberia.test` / `admin123`)
7. Ir a `/admin/turnos`, confirmar o completar turnos
8. CRUD de servicios en `/admin/servicios` y categorías en `/admin/categorias`

---

## 14. Convenciones

- **TypeScript estricto** en toda la app. Cero `any`.
- **Validación en backend con Zod**, no confiar en el cliente.
- **Errores uniformes** con códigos HTTP correctos.
- **Precios en centavos** (`price_cents`, entero). Formateo con `formatPrice()`.
- **Next.js Server Components** por defecto. `"use client"` solo donde es necesario.
- **Imports** con alias `@/` (configurado en `tsconfig.json` paths).
- **Commits chicos y descriptivos** (sin convención estricta, pero que se entienda qué cambia).
- **Comentarios y mensajes de UI en español**, manteniendo el estilo del repo.
