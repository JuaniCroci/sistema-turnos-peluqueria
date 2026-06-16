<div align="center">

# 💈 Sistema de Turnos — Peluquería

**App fullstack para reservar turnos en una peluquería.**  
Clientes se registran, eligen servicios, reservan fecha/hora y ven su historial.  
Admin gestiona el catálogo completo y los turnos.

<br>

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-EF4444?logo=next.js&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-✓-3068B7?logo=zod&logoColor=white)
![Node](https://img.shields.io/badge/Node-24.14.1-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

## 🎯 Motivación

Campo de entrenamiento para el **trabajo final de la facultad** (e-commerce en grupo).  
Los patrones se reusan:

| Peluquería     | E-commerce         |
| -------------- | ------------------ |
| Servicio       | Producto           |
| Categoría      | Categoría          |
| Reservar turno | Checkout / orden   |
| "Mis turnos"   | "Mis órdenes"      |
| Panel admin    | Panel admin        |
| Disponibilidad | Stock / inventario |

Lo que **sí** vas a tener que sumar en el e-commerce: integración de pagos (Stripe / MercadoPago), gestión de stock y envíos.

---

## 🧱 Stack

| Capa                | Tecnología                                                       |
| ------------------- | ---------------------------------------------------------------- |
| **Runtime**         | Node 24.14.1 (`.nvmrc`)                                          |
| **Lenguaje**        | TypeScript 5.7, `strict: true`, cero `any`                       |
| **Framework**       | Next.js 15.5+ (App Router, route.ts, Server Components)          |
| **Base de datos**   | Supabase Postgres via `@supabase/supabase-js` (service-role key) |
| **Autenticación**   | NextAuth v5 beta (Auth.js) — Credentials + Google, JWT           |
| **Validación**      | Zod en todos los endpoints                                       |
| **CSS**             | `open-props` + CSS Modules planos (sin Tailwind)                 |
| **Iconos**          | `lucide-react`                                                   |
| **Fonts**           | `next/font/google` (Inter + Fraunces)                            |
| **Package manager** | pnpm 10.x                                                        |

---

## 📁 Estructura del repo

```
sistema-turnos-peluqueria/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Navbar + footer + fonts)
│   ├── globals.css               # Reset + tokens + normalize
│   ├── page.tsx                  # Home
│   ├── not-found.tsx             # 404
│   ├── (auth)/                   # Login + Register
│   ├── servicios/                # Listado público con filtros
│   │   └── [id]/                 # Detalle de servicio
│   ├── mis-turnos/               # Turnos del cliente
│   │   └── nuevo/                # Formulario de reserva
│   ├── admin/
│   │   ├── servicios/            # CRUD de servicios
│   │   ├── categorias/           # CRUD de categorías
│   │   └── turnos/               # Gestión de turnos
│   └── api/
│       ├── auth/                 # [...nextauth], register, me
│       ├── categories/           # GET, POST, DELETE
│       ├── services/             # GET, POST, PUT, DELETE
│       ├── appointments/         # GET, POST, PATCH status
│       └── users/                # GET (admin)
│
├── components/                   # Componentes reutilizables
│   ├── Badge/ Button/ Card/ FormField/ Input/
│   ├── Navbar/ (con MobileMenu + LogoutButton)
│   ├── ServiceCard/ Skeleton/ Spinner/ StubPage/
│
├── lib/
│   ├── auth/                     # Config, queries, re-exports
│   ├── config/                   # Env validation, business rules
│   ├── db/                       # Queries de appointments, categories, services
│   ├── supabase/                 # Cliente Supabase (service-role)
│   ├── utils/                    # api helpers, format, password, datetime, recaptcha, logger
│   └── types.ts                  # Tipos compartidos
│
├── proxy.ts                      # Route protection (NextAuth edge)
├── styles/                       # tokens.css + reset.css
├── types/                        # next-auth.d.ts
└── scripts/                      # init.sql, enable-rls.sql, create-admin.sql
```

---

## 🗄️ Modelo de datos

```sql
-- 4 tablas: users, categories, services, appointments
-- price_cents entero (nunca float para plata)
-- soft delete en services (active = 0)
-- appointment_at en ISO 8601
-- índices en todas las FK y columnas de búsqueda
```

<details>
<summary>Ver esquema SQL completo</summary>

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('client', 'admin')) DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE services (
  id               SERIAL PRIMARY KEY,
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
  price_cents      INTEGER NOT NULL CHECK(price_cents >= 0),
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointments (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  service_id     INTEGER NOT NULL REFERENCES services(id),
  appointment_at TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled','completed')) DEFAULT 'pending',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category  ON services(category_id);
CREATE INDEX idx_services_name      ON services(name);
CREATE INDEX idx_services_active    ON services(active);
CREATE INDEX idx_appointments_user  ON appointments(user_id);
CREATE INDEX idx_appointments_date  ON appointments(appointment_at);
CREATE INDEX idx_appointments_status ON appointments(status);
```

</details>

---

## 🌐 API REST

Formato uniforme de errores:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [{ "path": "email", "message": "Email inválido" }]
  }
}
```

| Recurso          | Endpoints públicos                                 | Endpoints protegidos               |
| ---------------- | -------------------------------------------------- | ---------------------------------- |
| **Auth**         | `POST /api/auth/register`, `POST /api/auth/login`  | `GET /api/auth/me`                 |
| **Categories**   | `GET /api/categories`, `GET /api/categories/:slug` | `POST`, `DELETE` (admin)           |
| **Services**     | `GET /api/services`, `GET /api/services/:id`       | `POST`, `PUT`, `DELETE` (admin)    |
| **Appointments** | —                                                  | `GET`, `POST`, `PATCH /:id/status` |
| **Users**        | —                                                  | `GET` (admin)                      |

<details>
<summary>Ver detalles de cada endpoint</summary>

### Auth

| Método | Ruta                 | Auth    | Body / Query                    | Respuesta              |
| ------ | -------------------- | ------- | ------------------------------- | ---------------------- |
| POST   | `/api/auth/register` | público | `{ email, username, password }` | `201 { data }`         |
| POST   | `/api/auth/login`    | público | `{ email, password }`           | (NextAuth credentials) |
| GET    | `/api/auth/me`       | cliente | —                               | `200 { data }`         |

### Categories

| Método | Ruta                    | Auth    | Body / Query                   | Notas                           |
| ------ | ----------------------- | ------- | ------------------------------ | ------------------------------- |
| GET    | `/api/categories`       | público | —                              | `{ data: [...] }`               |
| GET    | `/api/categories/:slug` | público | —                              | Una por slug                    |
| POST   | `/api/categories`       | admin   | `{ name, slug, description? }` | —                               |
| DELETE | `/api/categories/:id`   | admin   | —                              | Solo si sin servicios asociados |

### Services

| Método | Ruta                | Auth    | Body / Query                                                             | Notas                        |
| ------ | ------------------- | ------- | ------------------------------------------------------------------------ | ---------------------------- |
| GET    | `/api/services`     | público | `?category=<slug>&q=<texto>&page=1&limit=10&includeInactive=1` (admin)   | Paginado. Admin ve inactivos |
| GET    | `/api/services/:id` | público | —                                                                        | —                            |
| POST   | `/api/services`     | admin   | `{ category_id, name, description?, duration_minutes, price_cents }`     | —                            |
| PUT    | `/api/services/:id` | admin   | `{ category_id?, name?, description?, duration_minutes?, price_cents? }` | Edición parcial              |
| DELETE | `/api/services/:id` | admin   | —                                                                        | Soft delete (`active = 0`)   |

### Appointments

| Método | Ruta                           | Auth          | Body / Query                                                           | Notas                                   |
| ------ | ------------------------------ | ------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| GET    | `/api/appointments`            | cliente       | `?status=pending&from=...&to=...&user_id=...` (admin) &page=1&limit=20 | Cliente ve los suyos. Admin filtra      |
| GET    | `/api/appointments/:id`        | cliente       | —                                                                      | Cliente solo si es suyo                 |
| POST   | `/api/appointments`            | cliente       | `{ service_id, appointment_at, notes? }`                               | Valida futuro, activo, sin solapamiento |
| PATCH  | `/api/appointments/:id/status` | cliente/admin | `{ status }`                                                           | Cliente solo `cancelled`                |

### Users

| Método | Ruta         | Auth  | Notas                    |
| ------ | ------------ | ----- | ------------------------ |
| GET    | `/api/users` | admin | Lista todos los usuarios |

</details>

---

## 🖥️ Frontend — Rutas

| Ruta                | Página                                                 | Acceso  |
| ------------------- | ------------------------------------------------------ | ------- |
| `/`                 | Home (hero + cómo funciona)                            | público |
| `/servicios`        | Listado con búsqueda, filtro por categoría, paginación | público |
| `/servicios/:id`    | Detalle + botón "Reservar"                             | público |
| `/login`            | Login                                                  | público |
| `/register`         | Registro                                               | público |
| `/mis-turnos`       | Lista de turnos del usuario                            | cliente |
| `/mis-turnos/nuevo` | Formulario de reserva                                  | cliente |
| `/admin`            | Redirige a `/admin/servicios`                          | admin   |
| `/admin/servicios`  | Tabla CRUD de servicios                                | admin   |
| `/admin/categorias` | Tabla CRUD de categorías                               | admin   |
| `/admin/turnos`     | Todos los turnos, filtros y cambio de estado           | admin   |

---

## 🧪 Seed (datos de demostración)

Solo categorías y servicios. No se siembran usuarios por seguridad.

> ⚠️ **Los seed users fueron eliminados** (commit `28703d1`). Ya no existe un admin ni cliente
> pre-creados con contraseñas hardcodeadas en el repositorio. Ver [Creación del admin inicial](#creación-del-admin-inicial) abajo.

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

## 👤 Creación del admin inicial

Los seed users con contraseñas hardcodeadas fueron eliminados del repositorio por seguridad
(commit `28703d1`). Para crear el primer admin en un entorno nuevo:

1. Ejecutá `scripts/init.sql` en Supabase SQL Editor (crea tablas + categorías + servicios).
2. Ejecutá `scripts/create-admin.sql` **pero antes** reemplazá los placeholders:

   - `CAMBIAR@dominio.real` → el email real del admin
   - `<PEGAR_HASH_BCRYPT>` → un hash bcrypt generado localmente

   Para generar el hash con `bcryptjs` (ya instalado en el proyecto):

   ```bash
   node -e "const b=require('bcryptjs'); b.hash('contraseña-segura',10).then(console.log)"
   ```

   Copiá el output y pegálo donde dice `<PEGAR_HASH_BCRYPT>`.

3. Ejecutá el script modificado en Supabase SQL Editor.

> ⚠️ **Rotación en producción**: Si ya tenés un admin existente con `admin@barberia.test`
> en la base de producción (por haber corrido `init.sql` antes de este cambio),
> **cambiale la contraseña o borralo** y creá uno nuevo con `create-admin.sql`.
> El hash hardcodeado que estaba en el repo se considera comprometido.

---

## 📏 Reglas de negocio

1. **Sin turnos en el pasado** → `400`
2. **Un solo turno activo por slot** — count de `appointments` con `status IN ('pending','confirmed')`
3. **Cancelar libera el slot** — cualquier turno puede cancelarse
4. **Admin ve/edita todo; cliente solo lo suyo**
5. **Soft delete** en servicios — los turnos viejos preservan el nombre
6. **Username y email únicos** (Zod + constraint UNIQUE)
7. **Password mínimo 6 caracteres** (Zod)
8. **No borrar categoría con servicios** → `409`
9. **Cliente solo cancela; admin transiciona cualquier estado**

---

## 🚀 Setup

### Prerrequisitos

- Node `24.14.1` (`nvm use`)
- pnpm `10.x` (`npm i -g pnpm`)
- Proyecto Supabase (gratuito) con las credenciales en `.env`

### Instalación y desarrollo

```bash
pnpm install       # instalar dependencias
pnpm dev           # http://localhost:3000
```

### Producción

```bash
pnpm build         # next build
pnpm start         # next start en :3000
```

### Verificación

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm test          # Vitest
```

### Variables de entorno (`.env`)

Ver `.env.example` para valores de referencia:

```
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sk_xxxx
SUPABASE_ANON_KEY=eyJxxxx

# NextAuth v5
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# reCAPTCHA v3
RECAPTCHA_SITE_KEY=6Lfxxxx
RECAPTCHA_SECRET_KEY=6Lfxxxx
RECAPTCHA_REQUIRED=false
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lfxxxx
```

> **Seguridad**: Toda la interacción con la DB usa la **service-role key** de Supabase
> (bypassea RLS). Las tablas tienen **Row Level Security** habilitado con deny-by-default
> para evitar accesos no autorizados si la anon key se filtrara.

---

## 📜 Scripts

| Comando             | Descripción          |
| ------------------- | -------------------- |
| `pnpm dev`          | `next dev`           |
| `pnpm build`        | `next build`         |
| `pnpm start`        | `next start`         |
| `pnpm typecheck`    | `tsc --noEmit`       |
| `pnpm lint`         | `eslint .`           |
| `pnpm lint:fix`     | `eslint . --fix`     |
| `pnpm format`       | `prettier --write .` |
| `pnpm format:check` | `prettier --check .` |
| `pnpm test`         | `vitest run`         |
| `pnpm test:watch`   | `vitest`             |

CI automático via GitHub Actions (`.github/workflows/ci.yml`) en cada push/PR.

---

## ✅ Verificación manual

```bash
# Health check
curl -i http://localhost:3000/

# Listar servicios públicos
curl -i http://localhost:3000/api/services

# Listar categorías
curl -i http://localhost:3000/api/categories
```

### Flujo completo

1. Abrir `http://localhost:3000`
2. Registrarse como cliente
3. Explorar servicios en `/servicios`
4. Reservar un turno desde `/mis-turnos/nuevo`
5. Ver turnos en `/mis-turnos`
6. Loguearse como admin (ver [Creación del admin inicial](#creación-del-admin-inicial))
7. Ir a `/admin/turnos`, confirmar o completar turnos
8. CRUD de servicios en `/admin/servicios` y categorías en `/admin/categorias`

---

## 📐 Convenciones del proyecto

- **TypeScript estricto** en toda la app. Cero `any`.
- **Validación con Zod** en todos los endpoints (nunca confiar en el cliente).
- **Errores uniformes** con códigos HTTP correctos.
- **Precios en centavos** (`price_cents`, entero). Formateo con `formatPrice()`.
- **Server Components** por defecto. `"use client"` solo donde es necesario.
- **Imports** con alias `@/` (`tsconfig.json` paths).
- **Commits chicos y descriptivos**.
- **Comentarios y UI en español**.

---

## 🔮 Próximos pasos (fuera de alcance por ahora)

| Funcionalidad                     | ¿Por qué después?                      |
| --------------------------------- | -------------------------------------- |
| Pagos (MercadoPago / Stripe)      | Se acopla al final                     |
| Notificaciones (email / WhatsApp) | Depende de pagos                       |
| Imágenes de servicios             | Sin CDN ni storage definido            |
| Múltiples peluqueros              | Modelo actual es un solo barbero       |
| WebSockets / tiempo real          | Sin necesidad detectada                |
| Tests E2E (Playwright)            | Se agregan cuando la app se estabilice |
| Docker                            | Corre nativo, sin necesidad            |
