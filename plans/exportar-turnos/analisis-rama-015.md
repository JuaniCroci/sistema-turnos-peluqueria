# Análisis completo: rama `015-exportar-turnos`

## Resumen ejecutivo

La rama agrega una pantalla admin para exportar disponibilidad semanal como imagen PNG (formato Stories 9:16). Incluye un endpoint de API, refactorización del modelo de horarios de negocio (de `OPEN_HOUR`/`CLOSE_HOUR` a bloques de tiempo múltiples), y un componente cliente con preview interactiva + descarga con `html-to-image`.

---

## Archivos modificados (12 archivos, +1205 -135 líneas)

| Archivo                                                                                                                          | Tipo                        | Cambio                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| [ExportClient.tsx](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx)               | Nuevo                       | Componente cliente principal (400 líneas)                              |
| [ExportClient.module.css](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.module.css) | Nuevo                       | Estilos + animaciones (445 líneas)                                     |
| [page.tsx](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/page.tsx)                               | Nuevo                       | Server Component con metadata                                          |
| [disponibilidad/route.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/export/disponibilidad/route.ts)     | Nuevo                       | Endpoint GET admin-only                                                |
| [business.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/config/business.ts)                                 | Refactor grande             | `OPEN_HOUR`/`CLOSE_HOUR` → `TimeBlock[]` + helpers                     |
| [appointments.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts)                             | Refactor + nuevas funciones | `SLOT_MINUTES` en `getOccupiedSlots` + nueva `getWeeklyAvailableSlots` |
| [appointments/route.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/appointments/route.ts)                | Modificado                  | Validación con `isWithinBusinessHours`                                 |
| [mis-turnos/nuevo/page.tsx](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/mis-turnos/nuevo/page.tsx)            | Modificado                  | `TIME_SLOTS` con `generateTimeSlots()`                                 |
| [AdminSidebar.tsx](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/AdminSidebar.tsx)                        | Modificado                  | Link a `/admin/exportar`                                               |
| [package.json](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/package.json)                                          | Modificado                  | +`html-to-image`                                                       |
| [015-plan-original.md](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/plans/exportar-turnos/015-plan-original.md)    | Actualizado                 | Documentación del plan                                                 |
| `pnpm-lock.yaml`                                                                                                                 | Auto-generado               | Lock file                                                              |

---

## Estado de verificación CI

| Check               | Resultado                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ |
| `pnpm typecheck`    | ✅ Pasa                                                                              |
| `pnpm lint`         | ❌ **1 error**: `SLOT_MINUTES` importado pero no usado en `appointments/route.ts:14` |
| `pnpm format:check` | ❌ **1 archivo**: `015-plan-original.md` con problemas de formato Prettier           |
| `pnpm test`         | ✅ 17/17 tests pasan (3 suites)                                                      |

---

## Problemas encontrados

### 🔴 Críticos

#### 1. `isWithinBusinessHours` no distingue día de la semana

En [appointments/route.ts:131](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/appointments/route.ts#L131), la validación del POST usa `isWithinBusinessHours(hour, minute)` **sin pasar el día de la semana**. Siempre valida contra los bloques de lunes-viernes (`TIME_BLOCKS_LUN_VIE`), incluso si el turno es un sábado. Si los horarios del sábado fueran distintos, un turno válido para sábado podría rechazarse, o uno inválido aceptarse.

#### 2. Validación de minutos removida sin reemplazo

El diff muestra que la validación anterior incluía:

```diff
-if (minute % SLOT_MINUTES !== 0) {
-  return errorResponse('VALIDATION_ERROR', 'El turno debe empezar en punto o media hora');
-}
```

Fue **eliminada por completo** en vez de reemplazarse. Un cliente ahora podría enviar un turno a las `08:37` y pasaría la validación de `isWithinBusinessHours` (está entre 08:20 y 13:00). No hay chequeo de que el minuto sea un slot válido.

#### 3. `getWeeklyAvailableSlots` empieza en `i = 1` (martes), no lunes

En [appointments.ts:369](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L369):

```typescript
for (let i = 1; i <= 6; i++) {
  const date = new Date(monday);
  date.setDate(monday.getDate() + i);
```

El lunes (`i = 0`) nunca se incluye. La semana devuelta es **martes a domingo** (pero `i = 6` se trata como sábado). Esto tiene un **off-by-one**: `monday + 1` = martes, `monday + 6` = domingo (no sábado). Sin embargo, el `date.getDay()` sería 0 (domingo), no 6 (sábado), así que el chequeo `isSabado = i === 6` **no coincide con el día real**.

> **Resultado**: El "sábado" del iterador es en realidad el domingo, y el lunes real se omite.

#### 4. El `SLOT_MINUTES` importado en `appointments/route.ts` ya no se usa → lint error

Import residual de la refactorización. ESLint lo detecta.

### 🟡 Moderados

#### 5. Fetch secuencial de 6 días (N+1 queries)

En [appointments.ts:379](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L379), `getOccupiedSlots` se llama **secuencialmente dentro del for** (6 queries separadas a Supabase, una por día). Debería hacerse un solo query con rango semanal, o al menos en paralelo con `Promise.all`.

#### 6. Datos hardcodeados de identidad del negocio

En [ExportClient.tsx:294](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L294) y [línea 380](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L380):

```tsx
<div className={styles.previewBrand}>THE BUNKER</div>
...
<span>WhatsApp: 3424 77-2489</span>
<span>@the.bunker1 · @tincholakd_</span>
```

Estos datos están hardcodeados en el componente. Deberían vivir en `lib/config/business.ts` o similar, para que sean fáciles de cambiar y consistentes con el resto del sistema.

#### 7. Los controles de horario del frontend son **aplanados** (1 bloque), pero el backend soporta **múltiples bloques**

El frontend envía `lunVieApertura` y `lunVieCierre` como un solo par, pero `business.ts` define **dos bloques** (08:20-13:00 y 16:00-20:00). En [disponibilidad/route.ts:66-73](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/export/disponibilidad/route.ts#L66-L73) se construye un array con un solo bloque, perdiendo el "hueco" del mediodía. El admin no puede editar el corte 13:00-16:00 desde la UI.

#### 8. Código muerto: `slotChunks` se computa pero nunca se renderiza

En [ExportClient.tsx:316-339](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L316-L339), hay una lógica completa de agrupación de slots (`slotChunks`) que **nunca se usa** en el JSX. El render usa `libreKeys.map(...)` directamente. Es lógica fantasma de una iteración anterior.

#### 9. `getMonday` duplicado en ruta y en componente

La función `getMonday(desde)` aparece tanto en [disponibilidad/route.ts:30](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/export/disponibilidad/route.ts#L30) como `getMondayISO()` en [ExportClient.tsx:29](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L29), con lógica idéntica. También se recalcula **otra vez** dentro de `getWeeklyAvailableSlots` en [appointments.ts:363-365](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L363-L365). Tres implementaciones del mismo cálculo.

#### 10. `generateSlotsForBlocks` duplica lógica de `generateTimeSlots`

[appointments.ts:305-325](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L305-L325) tiene `generateSlotsForBlocks` que es prácticamente la misma lógica que `generateTimeSlots` en [business.ts:42-58](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/config/business.ts#L42-L58), pero devuelve `SlotRange[]` en vez de `string[]`. Se puede unificar.

### 🟢 Menores

#### 11. Domingos excluidos silenciosamente

La lógica asume que el negocio no atiende domingos. Esto es correcto pero no está documentado ni validado. Si alguien intenta reservar un domingo, `isWithinBusinessHours` rechazaría los bloques de lun-vie, pero no hay un error claro de "no atendemos domingos".

#### 12. `pixelRatio: 2` genera 720×1280 × 2 = 1440×2560, no 1080×1920

En [ExportClient.tsx:161](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L161), el preview es 360×640px con `pixelRatio: 2` → genera **720×1280**. Para obtener exactamente 1080×1920 como dice el hint, necesitaría `pixelRatio: 3`. El texto del hint miente.

#### 13. URL de fondo: CORS potencial

Si el admin pone una URL de imagen cross-origin, `html-to-image` (`toPng`) puede fallar silenciosamente o generar una imagen sin el fondo por restricciones de tainted canvas. No hay feedback al usuario de por qué falla.

#### 14. No hay test unitario para ninguna función nueva

`getWeeklyAvailableSlots`, `isWithinBusinessHours`, `generateTimeSlots`, `generateSlotsForBlocks` — todas funciones puras que deberían tener tests. Actualmente hay 0 tests para la lógica de esta rama.

#### 15. `parseTime` duplicado

`parseTime` existe tanto en [business.ts:19](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/config/business.ts#L19) como implícitamente (con `.split(':')`) en [appointments.ts:308-313](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L308-L313).

---

## Plan detallado de modificaciones

### Fase 1 — Fixes críticos (bloquean merge)

#### 1.1 Corregir off-by-one en `getWeeklyAvailableSlots`

**Archivo**: [appointments.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L369)
**Cambio**: Iterar de `i = 0` a `i = 5` (lunes a sábado) en vez de `i = 1` a `i = 6` (martes a domingo).

```diff
-for (let i = 1; i <= 6; i++) {
+for (let i = 0; i <= 5; i++) {
   const date = new Date(monday);
   date.setDate(monday.getDate() + i);
```

Y ajustar la detección de sábado:

```diff
-const isSabado = i === 6;
+const isSabado = date.getDay() === 6;
```

#### 1.2 Restaurar validación de slot válido en POST appointments

**Archivo**: [appointments/route.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/appointments/route.ts#L130-L136)
**Cambio**: Después de `isWithinBusinessHours`, agregar chequeo de que el minuto sea un slot válido:

```typescript
if (minute % SLOT_MINUTES !== 0) {
  return errorResponse(
    'VALIDATION_ERROR',
    'El turno debe empezar en un horario de slot válido',
  );
}
```

Y quitar `SLOT_MINUTES` del import si no se usa, o usarlo aquí.

> **Nota**: Con slots de 40 min que arrancan a las 08:20, los minutos válidos son 20, 0, 40, 20, etc. — no son simplemente `% 40 === 0`. La validación real debería ser "el `HH:MM` del turno existe en `generateTimeSlots(blocks)`". Esto requiere obtener los bloques correctos según el día de la semana.

#### 1.3 `isWithinBusinessHours` debe recibir el día de la semana

**Archivo**: [business.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/config/business.ts#L24)
**Cambio**: Agregar parámetro `dayOfWeek` para seleccionar automáticamente entre `TIME_BLOCKS_LUN_VIE` y `TIME_BLOCKS_SAB`:

```typescript
export function isWithinBusinessHours(
  hour: number,
  minute: number,
  dayOfWeek: number,
  blocks?: TimeBlock[],
): boolean {
  const effectiveBlocks =
    blocks ?? (dayOfWeek === 6 ? TIME_BLOCKS_SAB : TIME_BLOCKS_LUN_VIE);
  // ...resto igual
}
```

Actualizar el call site en `appointments/route.ts` para pasar el día.

#### 1.4 Fix lint: remover import no usado

**Archivo**: [appointments/route.ts:14](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/api/appointments/route.ts#L14)
**Cambio**: Si 1.2 usa `SLOT_MINUTES`, mantenerlo. Si la validación pasa a ser con `generateTimeSlots`, quitar el import.

#### 1.5 Fix Prettier en plan

**Archivo**: [015-plan-original.md](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/plans/exportar-turnos/015-plan-original.md)
**Cambio**: `pnpm format` para auto-fix.

---

### Fase 2 — Calidad de código

#### 2.1 Eliminar código muerto (`slotChunks`)

**Archivo**: [ExportClient.tsx:316-339](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L316-L339)
**Cambio**: Borrar las ~25 líneas de `slotChunks` que se computan pero nunca se renderizan.

#### 2.2 Extraer `getMonday` a utility compartido

**Archivo nuevo**: `lib/utils/date.ts` (o añadir a `datetime.ts` existente)
**Cambio**: Una sola implementación de `getMonday(dateStr: string): string`, usada en:

- `disponibilidad/route.ts`
- `ExportClient.tsx` (como `getMondayISO()`)
- `appointments.ts` → `getWeeklyAvailableSlots` ya no recalcula

#### 2.3 Unificar `generateSlotsForBlocks` con `generateTimeSlots`

**Archivos**: [business.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/config/business.ts#L42) y [appointments.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L305)
**Cambio**: Hacer que `generateTimeSlots` devuelva tanto `string[]` como data estructurada, o tener un helper interno que devuelva minutos y dos wrappers. Eliminar `generateSlotsForBlocks` de appointments.ts.

#### 2.4 Extraer `parseTime` a utility compartido

**Archivos**: [business.ts:19](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/config/business.ts#L19) y [appointments.ts:308-313](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L308-L313)
**Cambio**: `lib/utils/datetime.ts` exporta `parseTime(t: string): { h: number; m: number }`.

#### 2.5 Extraer datos de identidad a config

**Archivo nuevo o existente**: `lib/config/business.ts`
**Cambio**: Mover `"THE BUNKER"`, teléfono, e Instagram a constantes exportadas.

```typescript
export const BUSINESS_NAME = 'The Bunker';
export const BUSINESS_PHONE = '3424 77-2489';
export const BUSINESS_SOCIALS = '@the.bunker1 · @tincholakd_';
```

---

### Fase 3 — Performance y UX

#### 3.1 Optimizar queries: un solo fetch semanal en vez de 6

**Archivo**: [appointments.ts](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/lib/db/appointments.ts#L369-L398)
**Cambio**: Hacer una sola query a Supabase con rango `WHERE appointment_at >= monday AND appointment_at < nextMonday`, y luego distribuir los resultados por día en JS. O al menos paralelizar con `Promise.all`.

#### 3.2 UI de horarios: soportar múltiples bloques (mañana/tarde)

**Archivo**: [ExportClient.tsx](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L61-L72)
**Cambio**: En vez de 2 inputs (apertura/cierre), mostrar los bloques reales:

- Bloque 1: 08:20 - 13:00
- Bloque 2: 16:00 - 20:00

Permitir editar cada bloque independientemente. Actualizar el endpoint para recibir arrays de bloques.

#### 3.3 Fix resolución PNG

**Archivo**: [ExportClient.tsx:159-163](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L159-L163)
**Cambio**: Usar `pixelRatio: 3` para que el preview de 360×640 genere exactamente 1080×1920, o cambiar el hint de descarga para reflejar la resolución real.

#### 3.4 Manejar error de CORS en imágenes de fondo

**Archivo**: [ExportClient.tsx:156-171](file:///C:/Users/mariano/Desktop/sistema-turnos-peluqueria/app/admin/exportar/ExportClient.tsx#L156-L171)
**Cambio**: Agregar catch específico para el error de tainted canvas y mostrar mensaje claro: "La imagen de fondo no se pudo incluir por restricciones del servidor de origen".

---

### Fase 4 — Tests

#### 4.1 Tests para `isWithinBusinessHours`

Casos: dentro de bloque 1, dentro de bloque 2, en el hueco, antes de apertura, después de cierre, edge case exacto en cierre, sábado vs lun-vie.

#### 4.2 Tests para `generateTimeSlots`

Casos: bloques default, bloque custom, bloque vacío (apertura === cierre), múltiples bloques.

#### 4.3 Tests para `getWeeklyAvailableSlots`

Tests con mock de Supabase para verificar que los días son lun-sáb, que los ocupados se restan bien, que los bloques custom funcionan.

---

## Resumen de prioridades

| Prioridad                    | Items                             | Esfuerzo   |
| ---------------------------- | --------------------------------- | ---------- |
| 🔴 Bloquea merge             | 1.1, 1.2, 1.3, 1.4, 1.5           | ~1-2 horas |
| 🟡 Debería ir antes de merge | 2.1, 2.5, 3.3                     | ~30 min    |
| 🟢 Puede ir en PR separado   | 2.2, 2.3, 2.4, 3.1, 3.2, 3.4, 4.x | ~3-4 horas |
