# Plan 015 — Exportar Turnos (refinado)

## Resumen

Dividido en dos fases: **A) Prerrequisitos** (limpieza + cambios de dominio) y **B) Export feature** (generación de imagen Stories-style).

El mockup de la Stories esta en [`mockup.svg`](./mockup.svg).

---

## Fase A — Prerrequisitos

### A1. Eliminar sistema de categorias

**DB (`scripts/init.sql`)**
- Lines 15-20: eliminar `CREATE TABLE IF NOT EXISTS categories (…)`
- Line 24: `category_id` debe pasar a ser nullable (`INTEGER REFERENCES categories(id)` → `INTEGER`), o eliminar la columna
- Eliminar FK constraint `REFERENCES categories(id)` (no existe mas la tabla categories)
- Lines 62-68: eliminar seed de categories
- Lines 70-86: servicios seed (antes usaban JOIN con categories) → cambiar a INSERT directo sin JOIN (solo pasa category_id a null o elimina el campo)
- Line 45: eliminar `idx_services_category`

**`scripts/enable-rls.sql`**
- Line 10: eliminar `ALTER TABLE categories ENABLE ROW LEVEL SECURITY;`

**`lib/types.ts`**
- Lines 11-16: eliminar `Category` interface
- Line 20: `category_id: number` → eliminar del `Service` type (o hacerlo opcional)

**`lib/db/categories.ts`** — ELIMINAR archivo completo

**`lib/db/services.ts`**
- Lines 64-70: `CreateServiceInput` — eliminar `category_id`
- Lines 72-91: `createService` — eliminar `category_id` del insert
- Lines 93-99: `UpdateServiceInput` — eliminar `category_id`
- Lines 101-129: `updateService` — eliminar la logica de category_id

**`lib/db/appointments.ts`**
- Line 11: `AppointmentRow` — eliminar `category_name`
- Lines 14-17: `AppointmentAdminRow` se mantiene igual
- Lines 37-44 y 46-52: `APPOINTMENT_SELECT` y `LIST_APPOINTMENT_SELECT` — eliminar el nested join `category:category_id (name)`

**`lib/db/flatten.test.ts`**
- Lines 11, 19, 26, 29: eliminar referencias a `service_category_name` y `service_category`

**API routes a ELIMINAR:**
- `app/api/categories/route.ts`
- `app/api/categories/[slug]/route.ts`

**`app/api/services/route.ts`**
- Line 5: eliminar `import { findCategoryById }`
- Line 17: eliminar `category_id` del `createSchema`
- Lines 85-91: eliminar validacion `findCategoryById(parsed.data.category_id)`

**`app/api/services/[id]/route.ts`**
- Line 9: eliminar `import { findCategoryById }`
- Line 14: eliminar `category_id` del `updateSchema`
- Lines 92-100: eliminar validacion de categoria

**Frontend pages a ELIMINAR:**
- `app/admin/categorias/page.tsx`
- `app/admin/categorias/AdminCategories.module.css`

**`app/admin/servicios/page.tsx`**
- Line 9: eliminar `Category` de import
- Line 13: eliminar `category_id` de `FormData`
- Line 21: eliminar `category_id` de `emptyForm`
- Line 30: eliminar `categories` state
- Lines 53-62: eliminar `fetchCategories`
- Line 67: eliminar llamada a `fetchCategories()`
- Lines 78-84: eliminar `category_id` del form en `handleEdit`
- Lines 94, 102-105: eliminar validacion de `category_id`
- Line 118: eliminar `category_id` del body
- Lines 217-234: eliminar categoria `<select>`
- Lines 337-339: eliminar `categories.find(…)`
- Line 346: eliminar celda de categoria de la tabla

**`app/servicios/[id]/page.tsx`**
- Line 6: eliminar `import { findCategoryById }`
- Line 48: eliminar `findCategoryById(service.category_id)`
- Lines 68-73: eliminar conditional category badge

**`app/mis-turnos/page.tsx`**
- Lines 149-153: eliminar `apt.category_name` conditional rendering

---

### A2. Simplificar servicios

Post-eliminacion de categorias, servicios son una flat list. No cambia la funcionalidad de `GET /api/services` ni el front. Solo se pierde la columna categoria en admin y el badge en detalle publico.

---

### A3. Redisenar AdminSidebar

**`app/admin/AdminSidebar.tsx`**
- Agregar icono `FileDown` (de lucide-react) para "Exportar Turnos"
- Agregar ruta `{ href: '/admin/exportar', label: 'Exportar Turnos', icon: FileDown }`
- La seccion de servicios queda como `{ href: '/admin/servicios', label: 'Servicios', icon: Scissors }`

---

### A4. Slot duration 40 min + midday break

**`lib/config/business.ts`** — cambiar constantes:
- `SLOT_MINUTES = 40` (antes 30)
- Agregar `BREAK_START = 14`, `BREAK_END = 16` (pausa de 14 a 16 hs)

**`app/mis-turnos/nuevo/page.tsx`** — slot generation:
- Importar `BREAK_START`, `BREAK_END`
- En `TIME_SLOTS`, filtrar slots que caen dentro del break (14:00 a 15:20 inclusive, ya que con slots de 40 min los que caen en break son: 14:00, 14:40, 15:20 → el de 15:20 termina a las 16:00, que es justo la reapertura... hmm)
  - Regla: un slot esta en break si `startMinutes >= breakStartMinutes && startMinutes < breakEndMinutes`
  - `BREAK_START = 14`, `BREAK_END = 16` → el slot de las 15:20 arranca a las 15:20 y termina a las 16:00. El negocio abre a las 16:00. Como el turno terminaria justo a las 16:00, se podria considerar valido? Por simplicidad, excluimos todo slot que empiece ANTES de `BREAK_END`. Entonces 15:20 esta excluido (empieza a las 15:20, antes de 16:00). 16:00 esta incluido.
- El mensaje de error de hora en `app/api/appointments/route.ts` linea 134 deberia actualizarse para reflejar el break
- `SLOT_COUNT` se calcula dinamicamente en base a los slots disponibles (mañana + tarde, excluyendo break)

**`app/api/appointments/route.ts`** (POST para clients, lines 130-141):
- Agregar validacion de break: si la hora esta entre `BREAK_START` y `BREAK_END`, rechazar con mensaje "Horario de descanso (14:00 a 16:00)"

**`app/api/appointments/slots/route.ts`** (GET):
- `getOccupiedSlots` en `lib/db/appointments.ts` itera con `m += 30` hardcoded. Deberia usar `SLOT_MINUTES` en vez de 30 (line 248). However, this is only for the occupied set building — if we change the iteration step to 40, it changes which occupied slots are reported. Let's think...
  - If a 40-min service starts at 09:00, it occupies 09:00-09:40. With 30-min step: marks 09:00 and 09:30. With 40-min step: marks only 09:00.
  - But the client now generates 40-min slots (09:00, 09:40, 10:20...). So if 09:00 is occupied, both 09:00 and 09:30 should NOT appear in the slot list (since 09:30 is not even a valid slot anymore).
  - Actually, with 40-min slots, the client's TIME_SLOTS are [09:00, 09:40, 10:20, 11:00, ...]. The server's `getOccupiedSlots` just returns `["09:00", "09:30", ...]` for a service that starts at 09:00 and lasts 40 min.
  - The client then does `occupiedSlots.includes(slot)` — 09:00 is in the occupied list, so it's disabled. But 09:30 isn't even a valid slot anymore (it was removed from TIME_SLOTS). So `getOccupiedSlots` doesn't strictly need to change its 30-min iteration... BUT a service that spans 09:40-10:20 would mark 09:40, 10:00, 10:20 in the old system. With 40-min slots, only 09:40 and 10:20 are valid. Since 10:00 isn't in TIME_SLOTS anymore, it doesn't matter.
  - Wait, the occupied list is still useful for marking actual slot starts as occupied. If a service starts at 09:00 and lasts 80 min, it occupies 09:00 AND 09:40. With the current code (30-min step), it marks 09:00, 09:30, 09:40, 10:00, 10:10? No wait: `endMinutes = startMinutes + duration` = 540 + 80 = 620. Loop: m=540 (09:00), m=570 (09:30), m=600 (10:00), m=610 is not < 620. So it marks 09:00, 09:30, 10:00. But 10:00 and 09:30 aren't valid 40-min slots. So we'd incorrectly have only 09:00 marked as occupied when really both 09:00 AND 09:40 should be occupied.
  - So YES, `getOccupiedSlots` needs to use `SLOT_MINUTES` instead of the hardcoded 30 on line 248.

  Actually wait, let me reconsider. The purpose of `getOccupiedSlots` is to return which slot START TIMES are occupied. A service from 09:00 to 09:40 occupies the 09:00 slot. The next 40-min slot starts at 09:40. So only 09:00 is occupied. With 30-min iteration: marks 09:00 and 09:30. 09:30 is NOT a valid slot start but it would be in the occupied list. The client code on line 97 does `occupiedSlots.includes(slot)` — since 09:30 is not in TIME_SLOTS, the includes check doesn't matter. But for the case of a 80-min service: it marks 09:00, 09:30, 10:00. The valid 40-min slots are 09:00, 09:40. 09:40 is NOT in the occupied list! So a client could select 09:40 even though the service from 09:00-10:20 is still running! That's a bug.

  So yes, we must change line 248 from `m += 30` to `m += SLOT_MINUTES` (or to 40, since we're importing from business config). But actually, `getOccupiedSlots` doesn't import `SLOT_MINUTES` — it's in `lib/db/appointments.ts`. It would need to import it.

  Actually, we should be consistent. Let's use `SLOT_MINUTES` from business config in `getOccupiedSlots` instead of the hardcoded `30`.

  So change line 248: `for (let m = startMinutes; m < endMinutes; m += 30)` → `for (let m = startMinutes; m < endMinutes; m += SLOT_MINUTES)` and import `SLOT_MINUTES` at the top.

---

## Fase B — Export feature

### B1. Mockup

Ver [`mockup.svg`](./mockup.svg) — diseno Stories-style (1080x1920, formato 9:16 para Instagram).

La imagen generada incluye:
- Header con nombre de la peluqueria y fecha
- Tabla de turnos: hora, servicio, cliente, precio
- Totales: cantidad de turnos, ingreso total, duracion total
- Footer con horas de atencion y descanso (reutiliza la info del negocio)

### B2. Instalar dependencia

```
pnpm add @vercel/og
```

`@vercel/og` provee `ImageResponse` que genera PNG via Satori + resvg-wasm. No requiere config adicional en Next.js.

### B3. Endpoint de export

**`app/api/admin/export/turnos/route.ts`** — `GET /api/admin/export/turnos?fecha=YYYY-MM-DD`

- Protegido: solo admin (session check)
- Valida `fecha` con Zod (formato YYYY-MM-DD, default hoy)
- Busca turnos `confirmed` + `completed` del dia via `findAppointments({ from, to, status: undefined })` con filtro de fecha
- Construye JSX con Tailwind-like classes (Satori las soporta via `@vercel/og`)
- Retorna `new ImageResponse(jsx, { width: 1080, height: 1920 })`

La query de turnos necesita soportar filtro por fecha sin user_id (para admin). El `findAppointments` actual requiere `userId` cuando no es admin. Para admin, si no se pasa `userId`, deberia devolver todos. Veamos el codigo actual:

```ts
const userId = isAdmin ? parsed.data.user_id : Number(session.user.id);
```

Si `parsed.data.user_id` es `undefined` y es admin, `userId` es `undefined`. Luego en `findAppointments`, si `options.userId === undefined`, no filtra por user. Correcto: devuelve todos. Entonces el endpoint puede usar `GET /api/appointments?from=...&to=...&limit=500` pasando fechas ISO.

O podemos hacer una query directa a DB para no pasar por la REST API internamente (DRY pero mas limpio que un fetch interno). Usaremos `findAppointments` directamente.

Necesitamos pasar `from` y `to` como ISO strings del dia en cuestion. Podemos usar `utcRangeForLocalDate`.

### B4. Admin UI

**`app/admin/exportar/page.tsx`** — client component
- Date picker (input type date)
- Boton "Generar resumen"
- Muestra la imagen generada en un contenedor con scroll
- Boton de descarga (usando `<a download>` con la URL de la imagen, o descargando el blob)

**`app/admin/exportar/Exportar.module.css`** — estilos

La imagen se obtiene asi:
```ts
const res = await fetch(`/api/admin/export/turnos?fecha=${fecha}`);
const blob = await res.blob();
const url = URL.createObjectURL(blob);
```

O mejor: el endpoint devuelve la imagen directamente, y el front la muestra con `<img src="/api/admin/export/turnos?fecha=...">`. Pero `ImageResponse` devuelve un `Response` con content-type `image/png`, asi que el `<img>` puede apuntar directamente al endpoint. Sin embargo, el endpoint requiere auth (session check), y `<img src>` no envia cookies de sesion automaticamente en todas las condiciones. Mejor hacer un fetch programatico y mostrar la imagen via blob URL.

Alternativa: el endpoint devuelve JSON con una URL firmada / temporal... muy complejo. Mejor fetch + blob.

### B5. Sidebar link

En `AdminSidebar.tsx`, link a `/admin/exportar` con icono `FileDown`.

---

## Archivos a crear

| Archivo | Proposito |
|---|---|
| `plans/exportar-turnos/mockup.svg` | Mockup visual de la Stories |
| `app/api/admin/export/turnos/route.ts` | Endpoint que genera PNG |
| `app/admin/exportar/page.tsx` | UI de exportacion |
| `app/admin/exportar/Exportar.module.css` | Estilos de la UI |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `scripts/init.sql` | Eliminar tabla categories, actualizar services |
| `scripts/enable-rls.sql` | Eliminar categories RLS |
| `lib/types.ts` | Eliminar Category, category_id de Service |
| `lib/db/services.ts` | Eliminar category_id de inputs/queries |
| `lib/db/appointments.ts` | Eliminar category_name, SLOT_MINUTES en getOccupiedSlots |
| `lib/db/flatten.test.ts` | Eliminar tests de category |
| `lib/config/business.ts` | SLOT_MINUTES=40, agregar BREAK_START/BREAK_END |
| `app/mis-turnos/nuevo/page.tsx` | Slot generation con break y 40 min |
| `app/api/appointments/route.ts` | Validacion de break |
| `app/api/appointments/slots/route.ts` | Sin cambios (getOccupiedSlots usa SLOT_MINUTES) |
| `app/api/services/route.ts` | Eliminar category_id de schema y validacion |
| `app/api/services/[id]/route.ts` | Eliminar category_id de schema y validacion |
| `app/admin/AdminSidebar.tsx` | Agregar Exportar link |
| `app/admin/servicios/page.tsx` | Eliminar categoria del form y tabla |
| `app/servicios/[id]/page.tsx` | Eliminar category badge |
| `app/mis-turnos/page.tsx` | Eliminar category_name display |
| `package.json` | Agregar @vercel/og |

## Archivos a eliminar

| Archivo |
|---|
| `lib/db/categories.ts` |
| `app/api/categories/route.ts` |
| `app/api/categories/[slug]/route.ts` |
| `app/admin/categorias/page.tsx` |
| `app/admin/categorias/AdminCategories.module.css` |

## Diferimiento

**Business hours configurables** (horario standard + break desde DB/admin): postergado. El owner define los horarios y por ahora quedan hardcodeados en `lib/config/business.ts`. Cuando el owner los defina, se agrega una migracion SQL y una UI admin. El mockup de Stories ya incluye el horario de atencion/descanso en el footer para que no tengamos que redisenar despues.
