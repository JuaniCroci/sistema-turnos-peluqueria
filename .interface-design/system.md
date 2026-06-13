# Sistema de diseño — Peluquería Clásica

Guardado: 2026-06-13 tras implementar Dirección A.

## Dirección y sensación

**Intención:** Cálido como entrar a una barbería de barrio con piso de madera y luz de tarde. Profesional, no ostentoso. Sin sidebar: solo navbar superior. Esto es una peluquería con un barbero, no un SaaS corporativo.

**Default rechazado:** Sombras grises neutras → sombras cálidas con tinte marrón. Sin sidebars. Cards sin shadow (bordes-only).

## Profundidad

**Estrategia:** Bordes-only. Sin sombras en superficies de layout. Sombras solo para focus rings y paneles modales (MobileMenu). Todas las sombras usan `rgba(60, 45, 30, ...)` en vez de `rgba(0, 0, 0, ...)`.

## Espaciado

**Base unit:** 4px (heredado de open-props `--size-*`).

Escala definida: `--space-1` (4px) a `--space-16` (96px). Usar siempre tokens, nunca valores fijos.

## Paleta

| Token | Light | Dark (preparado) |
|-------|-------|-------------------|
| `--color-bg` | `#fbfbf7` | `#1a1612` |
| `--color-surface` | `#f5f3ee` | `#25201c` |
| `--color-surface-2` | `#eeebe3` | `#2d2823` |
| `--color-fg` | `#1a1612` | `#eeebe3` |
| `--color-fg-muted` | `#6b6152` | `#a09886` |
| `--color-accent` (bronce) | `#c17f3b` | `#d4955a` |
| `--color-accent-secondary` (carbón) | `#2c2220` | `#3d302c` |
| `--color-border` | `rgba(60,45,30,0.08)` | `rgba(255,235,210,0.06)` |
| `--color-border-strong` | `rgba(60,45,30,0.16)` | `rgba(255,235,210,0.12)` |

**Flag:** El dark mode está preparado en tokens.css pero **comentado**. Activarlo requiere descomentar el bloque `@media (prefers-color-scheme: dark)`.

## Tipografía

- **Display:** Fraunces (serif). Usar en títulos de página, hero, precios destacados.
- **Sans:** Inter. Usar en body, labels, botones, tablas, formularios.

## Esquina cortada (signature)

**Dónde aparece:** Cards con `variant="highlight"` — actualmente en detalle de servicio y formulario de turno nuevo.

**Cómo:** Pseudo-elemento `::before` con `linear-gradient(135deg, transparent 50%, var(--color-accent) 50%)` en la esquina superior derecha. Opacidad 0.12. No interfiere con contenido.

**Cuándo agregar:** En cards que representan una acción confirmada o un detalle importante (resultado exitoso, detalle de servicio, confirmación de turno).

## Componentes

### Button
- `primary`: bronce (`--color-accent`). Usar para CTAs principales.
- `secondary`: carbón (`--color-accent-secondary`). Usar para acciones secundarias importantes.
- `danger`: rojo barbería (`--color-danger`). Usar para acciones destructivas.
- `ghost`: transparente, hover con surface-2. Usar para acciones sutiles (paginación, cancelar formularios).
- Sin `variant="secondary"` en uso actual (definido pero disponible para futuro).

### Card
- `padding`: sm (12px), md (20px), lg (24px), none.
- `variant`: default (sin esquina), highlight (con esquina de acento).
- `hoverable`: opcional, cambia fondo a surface-2 en hover.

### Input
- Fondo: `var(--color-surface)`. Focus: borde `--color-accent` + `--shadow-focus` cálido.

## Lo que no está en el sistema

- Sin sidebar. Todo el layout es top-nav + contenido de ancho completo.
- Sin sombras en superficies. Solo focus rings y paneles modales.
- Sin toggle de dark mode (preparado pero inactivo).
- Sin animaciones decorativas (hero gradient es el único elemento decorativo).
