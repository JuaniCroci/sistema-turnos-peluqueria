# Plan 015: Exportar turnos disponibles para Stories

> Vista de administración para generar imágenes 9:16 con los cupos libres semanales,
> descargables como PNG para Instagram Stories.

## Estado

**Implementado en rama `015-exportar-turnos`** (2026-06-17). Pendiente merge a main hasta
que el barbero tenga fotos del local y defina servicios reales.

## Arquitectura final

| Componente | Enfoque | Herramienta |
|---|---|---|
| Generación PNG | **Client-side** (captura del DOM) | `html-to-image` (~10 KB) |
| Preview interactiva | React + CSS Modules | Animaciones CSS nativas |
| Disponibilidad | Server-side API con Supabase | Zod + Supabase queries |

**Decisión clave**: Se usó `html-to-image` en vez de `@vercel/og` porque:
- El preview en browser ES la imagen final (mismo render)
- Sin limitaciones de Satori (sombras, textos multi-línea)
- Admin edita slots (marcar OCUPADO/SEMANAL) antes de capturar

## Datos de identidad (The Bunker)

| Campo | Valor |
|---|---|
| Nombre | The Bunker |
| Teléfono | 3424 77-2489 |
| Instagram | @the.bunker1 / @tincholakd_ |
| Timezone | `America/Argentina/Buenos_Aires` |
| Horarios lun-vie | 8:20-13:00 y 16:00-20:00 (defaults editables) |
| Horarios sábado | 8:20-13:00 y 16:00-20:00 (defaults editables) |
| Slot | 40 min (SLOT_MINUTES = 40) |

## Archivos creados

| Archivo | Propósito |
|---|---|
| `app/admin/exportar/page.tsx` | Server Component, metadata |
| `app/admin/exportar/ExportClient.tsx` | Preview 9:16 + toggle slots + descarga PNG |
| `app/admin/exportar/ExportClient.module.css` | Estilos + animaciones |
| `app/api/export/disponibilidad/route.ts` | GET con disponibilidad semanal |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/config/business.ts` | OPEN_HOUR/CLOSE_HOUR → TIME_BLOCKS + helpers isWithinBusinessHours/generateTimeSlots |
| `lib/db/appointments.ts` | getOccupiedSlots usa SLOT_MINUTES; nueva getWeeklyAvailableSlots |
| `app/api/appointments/route.ts` | Validación con isWithinBusinessHours |
| `app/mis-turnos/nuevo/page.tsx` | TIME_SLOTS generado con generateTimeSlots() |
| `app/admin/AdminSidebar.tsx` | Link a Exportar |
| `package.json` | +html-to-image |

## Flujo de uso

1. Admin entra a `/admin/exportar`
2. Selector de semana + horarios editables (lun-vie / sáb)
3. Input de URL de fondo (foto del local, opcional)
4. Preview 9:16 con días y slots
5. Click en slots para marcar OCUPADO (azul) / SEMANAL (rojo) / libre (verde)
6. Botón "Descargar PNG" → captura el preview con html-to-image → 1080×1920 px

## Pendiente

- [ ] Fotos del local (cuando estén, setear URL default en business.ts)
- [ ] Servicios reales de 40 min (revisar duración vs slots)
