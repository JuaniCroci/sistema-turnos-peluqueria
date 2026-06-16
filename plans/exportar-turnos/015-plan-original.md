# Plan 015: Exportar turnos disponibles para Stories

> Vista de administración para generar imágenes 9:16 con los cupos libres semanales,
> descargables como PNG para Instagram Stories.

## Estado

Pendiente de implementación. Esperando fotos del local y definición de servicios reales.

## Contexto

El barbero de "The Bunker" necesita una forma rápida de mostrar en redes sociales
qué horarios libres tiene en la semana. Desde el panel admin puede:

1. Ver una preview mobile 9:16 con los cupos libres de lun-sáb
2. Elegir semana, horarios de atención (lun-vie / sáb) y URL de fondo
3. Descargar PNG listo para Instagram Stories

## Stack

| Herramienta                   | Uso                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| `@vercel/og` (Satori + Resvg) | Generar PNG 1080x1920 server-side, JSX → SVG → PNG                  |
| CSS nativo (`@keyframes`)     | Animaciones en la preview del browser (Satori no soporta animación) |
| Sin librerías externas nuevas | Consistente con el stack actual (CSS plano, sin Tailwind)           |

## Datos de identidad (The Bunker)

| Campo     | Valor                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| Nombre    | The Bunker                                                                   |
| Teléfono  | 3424 77-2489                                                                 |
| Instagram | @the.bunker1 / @tincholakd\_                                                 |
| Timezone  | `America/Argentina/Buenos_Aires` (ya en `business.ts`)                       |
| Horarios  | Seleccionables por el admin en la UI (lun-vie / sáb), con defaults en config |
| Slots     | 30 min (default, se revisa cuando se definan servicios reales de 40 min)     |

## Endpoints nuevos

### `GET /api/export/disponibilidad?desde=2026-06-16`

Devuelve JSON con los horarios libres de lun-sáb.

```json
{
  "semana": "2026-06-16",
  "horarios": {
    "lun_vie": { "apertura": "08:00", "cierre": "20:00" },
    "sabado": { "apertura": "08:00", "cierre": "12:00" }
  },
  "dias": [
    { "nombre": "lunes", "fecha": "2026-06-16", "libres": ["09:00", "09:30", "10:30"] },
    { "nombre": "martes", … },
    …,
    { "nombre": "sabado", "fecha": "2026-06-21", "libres": ["08:00", "08:30"] }
  ]
}
```

Lógica:

- Generar todos los slots de 30 min entre apertura y cierre para cada día
- Llamar `getOccupiedSlots(fecha)` que ya existe para restar ocupados
- Devolver solo los libres

### `GET /api/export/stories?bg=<url>&desde=2026-06-16`

Usa `ImageResponse` de `@vercel/og`. Renderizado:

- **Fondo**: URL provista por query param o gradiente default (rojo oscuro/negro estilo barbería vintage)
- **Overlay**: degradé semitransparente (`#00000066` → `#000000cc`)
- **Header**: logo/ícono + "THE BUNKER — Turnos disponibles"
- **Cards por día**: lun-sáb, con horarios libres en badges verdes
- **Footer**: WhatsApp 3424 77-2489 + @the.bunker1 / @tincholakd\_

Estructura del directorio:

```
app/api/export/
├── disponibilidad/
│   └── route.ts        ← GET (JSON con slots libres)

app/export/
└── stories/
    └── route.tsx       ← GET ImageResponse (PNG 1080×1920)
```

## Frontend (`app/admin/exportar/`)

### Archivos

| Archivo                   | Rol                                                                              |
| ------------------------- | -------------------------------------------------------------------------------- |
| `page.tsx`                | Server Component, layout, metadata                                               |
| `ExportClient.tsx`        | `"use client"` — selector de semana, horarios editable, fondo, preview, descarga |
| `ExportClient.module.css` | Animaciones (fade-in cards, parallax leve, skeleton loading)                     |

### Flujo

1. Admin entra a `/admin/exportar`
2. El componente cliente fetchea `GET /api/export/disponibilidad` para la semana actual
3. Muestra preview vertical 9:16 simulando el Stories final
4. Admin puede modificar:
   - Semana (date picker)
   - Horarios lun-vie (dos inputs time)
   - Horarios sábado (dos inputs time)
   - URL de fondo de imagen (input text, default vacío = gradiente neutro)
5. Al cambiar → refetch con nuevos params + animación de transición
6. Botón "Descargar" → abre `/api/export/stories?bg=…&desde=…` → descarga PNG

### Preview animada

- Card vertical 9:16 simulando el Stories
- Fondo con gradiente o imagen via CSS `background-image`
- Overlay oscuro
- Cards de días aparecen escalonadas con `@keyframes fadeInUp`
- Chips de horarios en verde

## Pendiente para definir

- [ ] **Fotos del local** — cuando estén, se suben al repo y se setea URL default en `business.ts`
- [ ] **Servicios reales de 40 min** — cuando se definan, revisar granularidad de slots (30 min vs 10 min vs dinámico según servicio)
- [ ] **Slots en formulario de reserva** — al cambiar servicios y horarios, actualizar la generación de slots en `/mis-turnos/nuevo` (regla de negocio futura)

## No incluido (futuro)

- Subida de imágenes desde el admin (File → preview). Por ahora solo URL.
- Persistencia de horarios en DB. Se pierden al recargar — después se puede agregar `business_settings` si se estabilizan.
- Feed `.ics` para Google Calendar (plan aparte).
