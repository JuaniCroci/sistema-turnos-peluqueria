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

### Backend — `apps/api`

- **Runtime**: Node 24 (alineado con la tarea de la facultad, `.nvmrc`)
- **Lenguaje**: TypeScript `strict: true`, `target: es2020`, `module: ES2022`
- **Framework**: Express 5 (mismo que ya conocés)
- **DB**: `better-sqlite3` (sincrónico, cero config, ideal para practicar SQL real)
- **Auth**: `bcrypt` para hash de passwords + `jsonwebtoken` (JWT) stateless
- **Validación**: `zod` en todos los endpoints con body/query/params
- **CORS**: `cors` para que el front React pueda pegar

### Frontend — `apps/web`

- **Build**: Vite + React 18 + TypeScript
- **Routing**: `react-router-dom` v6
- **Server state**: `@tanstack/react-query` (v5)
- **HTTP**: `axios` (o `fetch` con un wrapper, lo que prefieras)
- **Estilos**: CSS plano / CSS Modules. **No** sumar Tailwind ni UI libs por ahora.

### Repo / tooling

- **Package manager**: `pnpm` 10 (workspaces)
- **Lint/format/test**: **no se configuran**. Verificación con `tsc --noEmit` + curl manual.
- **Monorepo**: `pnpm-workspace.yaml` con `apps/*`

---

## 3. Estructura del repo

```
sistema-turnos-peluqueria/
├── pnpm-workspace.yaml
├── package.json                  # root, solo scripts de orquestación
├── .nvmrc                        # 24.14.1
├── .gitignore
├── README.md                     # este archivo
│
├── apps/
│   ├── api/                      # backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── data/
│   │   │   └── turnos.db         # sqlite (gitignored, se genera)
│   │   └── src/
│   │       ├── index.ts          # entry: app.listen
│   │       ├── app.ts            # express app + middlewares
│   │       ├── config/
│   │       │   └── env.ts        # lectura de process.env con defaults
│   │       ├── db/
│   │       │   ├── connection.ts # better-sqlite3 instance
│   │       │   ├── migrations.ts # array de SQL ejecutados en orden
│   │       │   └── seed.ts       # datos iniciales
│   │       ├── middlewares/
│   │       │   ├── auth.ts             # verifica JWT, popula req.user
│   │       │   ├── requireAdmin.ts
│   │       │   ├── validate.ts         # helper para correr zod schemas
│   │       │   ├── notFound.ts
│   │       │   └── errorHandler.ts     # centralizado, último middleware
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── auth.routes.ts
│   │       │   │   ├── auth.controller.ts
│   │       │   │   └── auth.schema.ts
│   │       │   ├── users/
│   │       │   ├── categories/
│   │       │   ├── services/
│   │       │   └── appointments/
│   │       └── utils/
│   │           ├── jwt.ts
│   │           ├── password.ts
│   │           └── errors.ts     # clases AppError, NotFoundError, etc.
│   │
│   └── web/                      # frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/              # cliente HTTP + tipos compartidos
│           │   ├── client.ts     # axios instance con interceptor de JWT
│           │   └── types.ts
│           ├── auth/             # AuthContext, useAuth, RequireAuth
│           ├── components/       # Navbar, ServiceCard, AppointmentRow, etc.
│           ├── hooks/            # useServices, useAppointments, etc.
│           └── pages/
│               ├── HomePage.tsx
│               ├── ServicesListPage.tsx
│               ├── ServiceDetailPage.tsx
│               ├── LoginPage.tsx
│               ├── RegisterPage.tsx
│               ├── MyAppointmentsPage.tsx
│               ├── NewAppointmentPage.tsx
│               └── admin/
│                   ├── AdminServicesPage.tsx
│                   ├── AdminCategoriesPage.tsx
│                   └── AdminAppointmentsPage.tsx
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
  price_cents      INTEGER NOT NULL CHECK(price_cents >= 0),  -- SIEMPRE en centavos
  active           INTEGER NOT NULL DEFAULT 1,                  -- 1 = visible, 0 = soft delete
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE appointments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  service_id     INTEGER NOT NULL REFERENCES services(id),
  appointment_at TEXT    NOT NULL,                               -- ISO 8601
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

Base: `/api`. Todas las respuestas JSON. Todas las请求 con body llevan `Content-Type: application/json`.

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

| Método | Ruta                 | Auth    | Body                            | Respuesta             |
| ------ | -------------------- | ------- | ------------------------------- | --------------------- |
| POST   | `/api/auth/register` | público | `{ email, username, password }` | `201 { token, user }` |
| POST   | `/api/auth/login`    | público | `{ email, password }`           | `200 { token, user }` |
| GET    | `/api/auth/me`       | cliente | —                               | `200 { user }`        |

#### Categories

| Método | Ruta                    | Auth    | Notas                                |
| ------ | ----------------------- | ------- | ------------------------------------ |
| GET    | `/api/categories`       | público | Lista todas                          |
| GET    | `/api/categories/:slug` | público | Una por slug                         |
| POST   | `/api/categories`       | admin   | `{ name, slug, description? }`       |
| DELETE | `/api/categories/:id`   | admin   | Solo si no tiene servicios asociados |

#### Services

| Método | Ruta                | Auth    | Notas                                                                                                                                                                        |
| ------ | ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/services`     | público | Query: `category=<slug>`, `q=<texto>`, `page=1`, `limit=10`. Default solo `active=1` (admin puede pasar `?includeInactive=1`). Devuelve `{ data: [...], pagination: {...} }` |
| GET    | `/api/services/:id` | público |                                                                                                                                                                              |
| POST   | `/api/services`     | admin   | `{ category_id, name, description?, duration_minutes, price_cents }`                                                                                                         |
| PUT    | `/api/services/:id` | admin   | Edita cualquier campo                                                                                                                                                        |
| DELETE | `/api/services/:id` | admin   | Soft delete (`active = 0`)                                                                                                                                                   |

#### Appointments

| Método | Ruta                           | Auth          | Notas                                                                                                   |
| ------ | ------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/appointments`            | cliente       | Cliente ve los suyos. Admin ve todos. Query: `status`, `from`, `to`, `user_id` (solo admin)             |
| GET    | `/api/appointments/:id`        | cliente       | Cliente solo si es suyo; admin cualquiera                                                               |
| POST   | `/api/appointments`            | cliente       | `{ service_id, appointment_at, notes? }`. Valida que `appointment_at` sea futuro y no haya solapamiento |
| PATCH  | `/api/appointments/:id/status` | cliente/admin | Cliente solo puede pasar a `cancelled`. Admin puede pasar a cualquier estado                            |

#### Users (admin)

| Método | Ruta         | Auth  | Notas                                  |
| ------ | ------------ | ----- | -------------------------------------- |
| GET    | `/api/users` | admin | Lista todos (útil para el panel admin) |

### 5.3 Headers y auth

- Header: `Authorization: Bearer <jwt>`
- JWT payload: `{ sub: userId, role: 'client'|'admin' }`
- Expiración: 7 días
- El front guarda el token en `localStorage` y lo manda en cada request

---

## 6. Frontend

### 6.1 Rutas

| Ruta                | Página                                                | Acceso                                  |
| ------------------- | ----------------------------------------------------- | --------------------------------------- |
| `/`                 | Home (servicios destacados + CTA)                     | público                                 |
| `/servicios`        | Listado con filtros y búsqueda                        | público                                 |
| `/servicios/:id`    | Detalle + botón "Reservar"                            | público                                 |
| `/login`            | Login                                                 | público (redirige a `/` si ya logueado) |
| `/register`         | Registro                                              | público (redirige a `/` si ya logueado) |
| `/mis-turnos`       | Lista de turnos del usuario logueado                  | cliente                                 |
| `/mis-turnos/nuevo` | Form de reserva (servicio + fecha+hora + notas)       | cliente                                 |
| `/admin/servicios`  | Tabla CRUD de servicios                               | admin                                   |
| `/admin/categorias` | Tabla CRUD de categorías                              | admin                                   |
| `/admin/turnos`     | Tabla de todos los turnos, filtros y cambio de estado | admin                                   |

### 6.2 Componentes globales

- **Navbar** con links condicionales según `useAuth().user.role`
- **RequireAuth** / **RequireAdmin**: guards de ruta que redirigen a `/login` si corresponde
- **AuthProvider**: Context con `user`, `token`, `login()`, `logout()`, `register()`
- **apiClient**: instancia de axios con interceptor que agrega `Authorization` y maneja 401 → logout automático

### 6.3 Decisiones de UX

- Formularios con manejo de loading y errores inline (no alerts feos)
- Empty states para listas vacías
- Loading skeletons o spinners simples para fetching
- Filtros y búsqueda con debounce de 300ms
- Paginación clásica (prev/next + número) — no infinite scroll
- Fechas: `<input type="datetime-local">` nativo, sin librerías de calendario

---

## 7. Seed (datos iniciales)

Se ejecuta automáticamente al levantar el backend si la tabla `users` está vacía.

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
2. **No puede haber dos turnos a la misma hora con el mismo peluquero**. Como no hay "peluquero" asignado, el modelo es: **un solo turno activo por slot de tiempo para todo el negocio**. Validaló con una query que cuente `appointments` con `appointment_at = ?` y `status IN ('pending','confirmed')`.
3. **Cancelar** un turno es válido en cualquier momento. Pasar a `cancelled` libera el slot.
4. **El admin ve y puede editar todo.** El cliente solo ve y modifica lo propio.
5. **Soft delete de servicios**: los turnos viejos siguen mostrando el nombre del servicio aunque esté `active=0`. La query de detalle de turno hace `LEFT JOIN services` sin filtrar por `active`.
6. **Username y email únicos** (validación Zod + constraint UNIQUE).
7. **Password mínimo 6 caracteres** (validación Zod).
8. **No permitir borrar una categoría con servicios asociados** → `409`.

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

### Milestone 1 — Andamiaje (~1 sesión)

- `pnpm-workspace.yaml`, root `package.json` con scripts de orquestación
- `apps/api` con Express + endpoint `GET /api/health` → `{ ok: true, db: 'up' }`
- `apps/web` con Vite + React renderizando "Hola"
- `pnpm dev` levanta ambos en paralelo
- `.nvmrc`, `.gitignore`, tsconfigs

### Milestone 2 — DB + Auth (~2 sesiones)

- `db/connection.ts`, `db/migrations.ts`, `db/seed.ts`
- Módulo `auth/` completo: register, login, `/me`, middlewares `auth.ts` y `requireAdmin`
- Validación con Zod en cada endpoint
- Pruebas con `curl` o `.http` files

### Milestone 3 — Servicios y categorías (~1–2 sesiones)

- Endpoints de categories y services
- Paginación + búsqueda + filtro por categoría
- Página React `/servicios` con TanStack Query
- Páginas de detalle y admin CRUD

### Milestone 4 — Turnos (~2 sesiones)

- Endpoints de appointments con la regla anti-solapamiento
- UI cliente: reservar turno + "Mis turnos" + cancelar
- UI admin: ver todos, confirmar, marcar como completado

### Milestone 5 — Polish (~1 sesión)

- Guards de ruta en React según rol
- Manejo de errores prolijo en el front
- Loading / empty states
- README final con instrucciones exactas

**Total estimado:** 7–10 sesiones cortas.

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
# Levanta api (puerto 3000) y web (puerto 5173) en paralelo
pnpm dev
```

### Variables de entorno (api)

Crear `apps/api/.env` (opcional, hay defaults):

```
PORT=3000
JWT_SECRET=cambiame-en-prod
DB_PATH=./data/turnos.db
CORS_ORIGIN=http://localhost:5173
```

---

## 12. Scripts (root)

| Script              | Hace                                   |
| ------------------- | -------------------------------------- |
| `pnpm dev`          | Levanta `api` y `web` en paralelo      |
| `pnpm build`        | `tsc` en `api` + `vite build` en `web` |
| `pnpm typecheck`    | `tsc --noEmit` en ambos paquetes       |
| `pnpm -F api dev`   | Solo el backend                        |
| `pnpm -F web dev`   | Solo el frontend                       |
| `pnpm -F api build` | Compila el backend a `dist/`           |

> **No hay scripts de test, lint ni format.** No se configuran a menos que se pidan explícitamente.

---

## 13. Verificación manual

### Backend

```bash
# Health
curl -i http://localhost:3000/api/health

# Login
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barberia.test","password":"admin123"}'

# Listar servicios
curl -i http://localhost:3000/api/services
```

### Frontend

1. Abrir `http://localhost:5173`
2. Verificar que carga el home
3. Loguearse como admin, ir a `/admin/servicios`, crear uno nuevo
4. Logout, loguearse como cliente, ir a `/servicios`, reservar un turno
5. Loguearse como admin, ir a `/admin/turnos`, confirmar el turno

### Criterios de "andamiaje terminado"

- [ ] `pnpm dev` levanta los dos sin errores
- [ ] `pnpm typecheck` pasa sin errores
- [ ] El health check responde
- [ ] La home de React carga y muestra el navbar

---

## 14. Convenciones

- **TypeScript estricto** en ambos paquetes. Cero `any`.
- **Validación en backend con Zod**, no confiar en el cliente.
- **Errores uniformes** con códigos HTTP correctos.
- **Manejo de errores en frontend** con TanStack Query (`error`, `isError`) y mensajes al usuario.
- **Commits chicos y descriptivos** (sin convención estricta, pero que se entienda qué cambia cada uno).
- **Comentarios en español** en código, para mantener el estilo del repo.
