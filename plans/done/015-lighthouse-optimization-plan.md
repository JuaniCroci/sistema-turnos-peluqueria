# PLAN DE IMPLEMENTACIÓN — OPTIMIZACIÓN LIGHTHOUSE

**Origen:** Reporte `web-check-results.json` (Lighthouse v13.4.0, mobile)  
**App:** `thebunker-sistema-turnos.vercel.app` — Next.js 15 / React 19 / TypeScript  
**Fecha del reporte:** 21 Jun 2026

---

## Scores Actuales

| Categoría      | Score   | Estado                                 |
| -------------- | ------- | -------------------------------------- |
| Performance    | **98**  | Excelente                              |
| Accesibilidad  | **96**  | 1 falla                                |
| Best Practices | **100** | Perfecto (faltan headers de seguridad) |
| SEO            | **100** | Perfecto                               |

---

## Índice de Tareas

| #   | Tarea                                                       | Prioridad  | Archivo(s)                         | Automatizable |
| --- | ----------------------------------------------------------- | ---------- | ---------------------------------- | ------------- |
| 1   | Redirect 307 → 301 en Vercel (ahorro ~780ms)                | 🔴 Crítica | Dashboard Vercel (no código)       | Parcial       |
| 2   | Agregar headers de seguridad (CSP, XFO, COOP, HSTS, CORP)   | 🔴 Crítica | `next.config.ts`                   | ✅ Sí         |
| 3   | Corregir contraste de color botón "Iniciar sesión"          | 🔴 Crítica | `styles/tokens.css`                | ✅ Sí         |
| 4   | Corregir ARIA `role="dialog"` en `<aside>` del menú móvil   | 🔴 Crítica | `components/Navbar/MobileMenu.tsx` | ✅ Sí         |
| 5   | Optimizar CSS render-blocking con `experimental.optimizeCss` | 🟡 Media   | `next.config.ts` + `critters`      | ✅ Sí         |
| 6   | Agregar `browserslist` para prefijos CSS                    | 🟡 Media   | `package.json`                     | ✅ Sí         |
| 7   | Analizar JavaScript no utilizado — code splitting ya óptimo | 🟡 Media   | Sin cambios necesarios             | ❌ Manual     |
| 8   | Verificación final (typecheck, lint, test, build)           | ✅ Cierre  | Terminal                           | ✅ Sí         |

---

## Tarea 1 — Eliminar el Redirect 307

### ¿Qué detectó Lighthouse?

La URL `sistema-turnos-peluqueria.vercel.app` redirige con HTTP 307 a `thebunker-sistema-turnos.vercel.app`. Esto agrega **780ms** de latencia extra antes de que el navegador empiece a cargar la página real.

### ¿Por qué se hace?

Cada redirect es una ida y vuelta completa al servidor. En mobile (3G/4G), 780ms es una fracción muy significativa del tiempo total de carga. Eliminarlo mejora directamente LCP (Largest Contentful Paint) y FCP (First Contentful Paint), que son métricas de Core Web Vitals que Google usa para ranking.

### ¿Qué aprender para futuros proyectos?

Siempre usar una sola URL canónica desde el inicio. Si necesitás renombrar el proyecto, configura el redirect como **301 (permanente)** en vez de 307 (temporal) para que los navegadores y buscadores lo cacheen.

### Implementación

**Nota:** Este redirect es a nivel de **plataforma Vercel** (se genera automáticamente al renombrar el proyecto). No se puede arreglar desde código (`vercel.json` no aplica).

**Manual:** Ir al dashboard de Vercel → Project Settings → Domains. Cambiar el redirect de `sistema-turnos-peluqueria.vercel.app` de 307 (temporal) a **301 (permanente)** para que navegadores lo cacheen.

**Resultado:** ✅ Cambiado a 301.

---

## Tarea 2 — Headers de Seguridad (CSP, XFO, COOP, Trusted Types)

### ¿Qué detectó Lighthouse?

Faltan 4 headers de seguridad críticos. Lighthouse los marca como "High severity".

### ¿Por qué se hace?

Cada header protege contra un tipo de ataque específico:

| Header                                | Protege contra                  | Explicación simple                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CSP** (Content-Security-Policy)     | **XSS (Cross-Site Scripting)**  | Le dice al navegador qué recursos (scripts, estilos, imágenes) puede cargar. Si un atacante inyecta un script malicioso, el navegador lo bloquea porque no está en la lista blanca.                                                                    |
| **X-Frame-Options**                   | **Clickjacking**                | Evita que tu sitio se cargue dentro de un `<iframe>` en otro sitio. Un atacante pondría tu página de login dentro de un iframe transparente y cuando el usuario cree que está clickeando en un juego, en realidad está clickeando en "Iniciar sesión". |
| **COOP** (Cross-Origin-Opener-Policy) | **Ataques de ventana cruzada**  | Aísla tu página de otras ventanas que la abrieron (ej. con `window.open`). Previene que un sitio malicioso lea datos de tu página a través de `window.opener`.                                                                                         |
| **Permissions-Policy**                | **Abuso de APIs del navegador** | Controla qué APIs (cámara, micrófono, geolocalización) pueden usar tu página y sus iframes. Por defecto las bloquea todas si no las necesitás.                                                                                                         |

### ¿Qué aprender para futuros proyectos?

Estos headers deberían estar en **todo proyecto web desde el día 1**. Son como ponerle cerradura a la puerta de tu casa. Muchos frameworks permiten configurarlos en el archivo de configuración del hosting (vercel.json, netlify.toml, nginx.conf, etc.).

### Implementación

**Automático:** Modificar `next.config.ts` para inyectar todos los headers via `async headers()`.

**CSP implementado:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data:
connect-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/
frame-src 'self' https://www.google.com/recaptcha/
base-uri 'self'
form-action 'self'
```

- **Dev**: CSP agrega `'unsafe-eval'` (necesario para HMR de Next.js).
- **Prod**: CSP sin `'unsafe-eval'` (Next.js no lo necesita en producción).
- **Supabase**: No necesita CSP client-side — solo se usa desde server (route handlers).
- **Trusted Types**: No se implementó (requiere cambios profundos en Next.js para nonce-based CSP).

**Manual:** Verificar que las directivas CSP no bloqueen Google reCAPTCHA (si se usa) u otros servicios externos como Google Fonts. Si algo se rompe, agregar el dominio faltante a la directiva correspondiente.

---

## Tarea 3 — Contraste de Color (Accesibilidad)

### ¿Qué detectó Lighthouse?

El botón "Iniciar sesión" tiene texto blanco `#ffffff` sobre fondo `#c17f3b` (bronce). Ratio de contraste: **3.29:1**. El mínimo requerido por WCAG 2.0 AA es **4.5:1** para texto normal.

### ¿Por qué se hace?

El **contraste de color** no es solo diseño: es **accesibilidad**. Personas con baja visión, daltonismo, o que usan el celular bajo el sol necesitan suficiente contraste para leer tu interfaz. Además, en muchos países (Argentina incluido), la accesibilidad web es requisito legal para servicios públicos (Ley de Accesibilidad de la Información).

### ¿Qué aprender para futuros proyectos?

Siempre verificar el contraste durante el diseño, no al final. Regla práctica: texto oscuro sobre fondo claro (o viceversa). Podés usar herramientas como **WebAIM Contrast Checker** o la extensión **Axe DevTools** antes de escribir CSS.

### Implementación

**Automático:** Cambiar `--color-accent: #c17f3b` → `#a8651e` en `styles/tokens.css`.

**Ratio real:** 4.62:1 ✅ (pasa AA, ≥4.5). Nota: el plan original estimaba 5.12:1, el cálculo exacto con fórmula WCAG da 4.62:1.

**Corrección adicional detectada durante implementación:**
El hover (`--color-accent-hover`) quedaba más claro que el nuevo accent (luminancia 0.1946 vs 0.1773). Se corrigió de `#a66e2e` a `#90571a` (factor de oscurecimiento 0.7251, ratio 5.89:1 ✅).

---

## Tarea 4 — ARIA `role="dialog"` en `<aside>` (Accesibilidad)

### ¿Qué detectó Lighthouse?

El menú móvil usa `<aside role="dialog">`. La especificación ARIA dice que `<aside>` no admite `role="dialog"`.

### ¿Por qué se hace?

Los **lectores de pantalla** (como NVDA, VoiceOver, TalkBack) usan los roles ARIA para interpretar y navegar la página. Si un elemento tiene un rol no permitido, el lector de pantalla lo ignora o lo interpreta mal, dejando al usuario sin acceso a funcionalidades críticas del menú de navegación.

### ¿Qué aprender para futuros proyectos?

Los roles ARIA tienen reglas estrictas de qué elementos HTML pueden usar. Usar `<div>` o `<section>` como contenedores genéricos y asignarles el rol adecuado es más seguro que forzar un rol sobre un elemento semántico existente. Pensalo así: ARIA es como un "parche" para cuando el HTML nativo no alcanza, no para reemplazar la semántica HTML correcta.

### Implementación

**Automático:** Cambiar `<aside>` → `<div>` en `MobileMenu.tsx` (dos etiquetas: apertura y cierre).

---

## Tarea 5 — CSS Render-Blocking

### ¿Qué detectó Lighthouse?

3 archivos CSS (chunks de Next.js) bloquean el renderizado inicial de la página, retrasando la primera pintura. Ahorro potencial: **140ms**.

### ¿Por qué se hace?

Cuando el navegador encuentra un `<link rel="stylesheet">`, **detiene el renderizado** hasta que descarga y procesa el CSS completo. Si esos CSS no son necesarios para la primera vista (above the fold), se están desperdiciando ciclos valiosos. En mobile, 140ms puede ser la diferencia entre que un usuario se quede o se vaya.

### ¿Qué aprender para futuros proyectos?

Estrategias para evitar CSS blocking:

1. **Inline critical CSS**: Poner el CSS necesario para la primera vista directamente en el `<head>`.
2. **Preload**: Usar `<link rel="preload" href="styles.css" as="style">` para que el navegador lo descargue antes.
3. **Diferir CSS no crítico**: Cargar CSS secundario con `media="print"` y luego cambiar a `media="all"`.
4. Next.js ya hace algo de esto automáticamente; la configuración extra optimiza aún más.

### Implementación

**Automático:** Agregar `experimental: { optimizeCss: true }` en `next.config.ts`.

**Importante:** Requiere instalar `critters` como dependencia (`pnpm add critters`). Next.js lo usa internamente para el inlining de CSS crítico.

**No requiere preconnects en `layout.tsx`:** `next/font/google` ya maneja preconnect automáticamente.

---

## Tarea 6 — browserslist para prefijos CSS

### ¿Qué detectó Lighthouse?

El chunk `7078-7c7829eaf2bf7ab2.js` contenía ~11KB de polyfills JS, pero estos pertenecen al runtime interno de Next.js, no son configurables por el usuario.

### ¿Por qué se hace?

**Corrección respecto al plan original:** En Next.js 15, `browserslist` en `package.json` **NO afecta la transpilación JS**. Next.js usa SWC como compilador, que tiene sus propios targets internos. `browserslist` solo afecta a **Autoprefixer** para prefijos CSS. El chunk de polyfills JS (~110KB raw) es manejado internamente por Next.js y no se reduce con esta configuración.

Configurar `browserslist` sigue siendo una buena práctica para estandarizar compatibilidad, pero el impacto real es mínimo (solo CSS).

### ¿Qué aprender para futuros proyectos?

`browserslist` sirve para definir compatibilidad en herramientas PostCSS/Autoprefixer. Para controlar targets de JS en Next.js, hay que usar opciones internas de SWC. La regla general sigue aplicando: si no necesitás soportar navegadores antiguos, no pagues el costo en bytes — pero en Next.js 15 ese control es limitado.

### Implementación

**Automático:** Agregar `browserslist` en `package.json` con `["last 2 versions", "not dead", "not ie 11"]`.

---

## Tarea 7 — JavaScript No Utilizado

### ¿Qué detectó Lighthouse?

Dos chunks contienen alto porcentaje de código que nunca se ejecuta:

- `0cb07a38.js`: 54KB no usados (31% del chunk)
- `7078-7c7829eaf2bf7ab2.js`: 71KB no usados (41% del chunk)

### ¿Por qué se hace?

Cada KB de JavaScript que se descarga pero no se usa es tiempo de red desperdiciado, tiempo de parseo desperdiciado, y batería del dispositivo desperdiciada. En React/Next.js, es común que componentes grandes se bundleen juntos aunque solo se usen en rutas específicas. **Code splitting** (dividir el código en partes más pequeñas) permite que cada ruta cargue solo lo que necesita.

### ¿Qué aprender para futuros proyectos?

1. **Dynamic imports**: `dynamic(() => import('./Componente'))` — el componente se carga solo cuando se necesita.
2. **Lazy loading**: Componentes fuera de la pantalla inicial pueden cargarse después.
3. **Analizar el bundle**: `pnpm next build --debug` o usar `@next/bundle-analyzer` para ver de dónde viene cada byte.
4. **Tree-shaking**: Asegurarse de importar solo lo que se necesita (especialmente en librerías como lucide-react).

### Análisis del bundle actual

| Chunk | Raw | Compressed |
|---|---|---|
| `3282-*.js` | 169 KB | **45.8 KB** |
| `51d074f0-*.js` | 169 KB | **54.2 KB** |
| Total shared | 338 KB | **102 KB** |

### Code splitting existente (ya óptimo)

- ✅ **MobileMenu**: `dynamic(() => import('./MobileMenu'))` con `ssr: false` — no está en shared chunk.
- ✅ **AdminSidebar**: solo se carga en rutas `/admin/*` via layout separado.
- ✅ **`html-to-image`**: solo en `/admin/exportar` (9.92 KB de página).
- ✅ **`lucide-react`**: todos los imports son named (`import { Icon } from 'lucide-react'`) → tree-shaking óptimo.
- ✅ **`open-props`**: solo CSS via `@import` en `globals.css` — sin impacto JS.

### Conclusión

No se requieren cambios. Los ~125KB de "código no utilizado" que Lighthouse reporta son **inherentes a los shared chunks de Next.js**: código compartido que no se ejecuta en todas las rutas pero evita descargar duplicados. El First Load JS de 102KB comprimidos es razonable para una app Next.js 15 + React 19.

Si en el futuro se busca optimizar más, evaluar:
- `@next/bundle-analyzer` para visualizar el contenido exacto de cada chunk.
- Dynamic imports en páginas admin muy pesadas (ninguna supera los 10KB).

---

## Tarea 8 — Verificación Final

### ¿Qué se hace?

Ejecutar `pnpm format:check` + `pnpm typecheck` + `pnpm lint` + **`pnpm test`** + `pnpm build` para asegurar que todos los cambios no rompan nada.

### ¿Por qué se hace?

Siempre verificar que las optimizaciones no introduzcan regresiones. Un cambio en `next.config.ts` podría causar errores de compilación. Un cambio en tokens.css podría afectar otros componentes. `pnpm test` asegura que la lógica de negocio siga funcionando.

### Implementación

**Automático:** Ejecutar los comandos después de aplicar todos los cambios.

---

## Glosario de Términos de Seguridad y Web

| Término                                      | Sigla | Significado                               | Explicación simple                                                                                                                                                    |
| -------------------------------------------- | ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Security Policy**                  | CSP   | Política de Seguridad de Contenido        | Una lista blanca que le decís al navegador: "solo cargá scripts de estos dominios". Si un atacante inyecta código malicioso, el navegador lo rechaza automáticamente. |
| **Cross-Origin Opener Policy**               | COOP  | Política de Apertura entre Orígenes       | Aísla tu ventana del sitio que la abrió. Impide que un sitio malicioso acceda a datos de tu página si la abriste desde él.                                            |
| **X-Frame-Options**                          | XFO   | Opciones de Frame                         | Le dice al navegador si permitís que tu sitio se muestre dentro de un `<iframe>` en otro sitio. `DENY` = nunca. Previene clickjacking.                                |
| **Cross-Site Scripting**                     | XSS   | Scripting entre Sitios                    | Un ataque donde un atacante inyecta código JavaScript en tu página. Ejemplo: un comentario que contiene `<script>alert('hackeado')</script>`.                         |
| **Clickjacking**                             | —     | Secuestro de Click                        | El atacante pone tu página (ej. login) transparente sobre un juego. El usuario cree que está jugando pero en realidad está clickeando en "Iniciar sesión".            |
| **HTTP Strict Transport Security**           | HSTS  | Seguridad de Transporte Estricta          | Le dice al navegador: "siempre conectate a este sitio por HTTPS, nunca por HTTP". Previene ataques de downgrade.                                                      |
| **Content-Security-Policy: frame-ancestors** | —     | Ancestros de Frame                        | Similar a X-Frame-Options pero más moderno y flexible. Controla qué sitios pueden embeker tu página.                                                                  |
| **Permissions-Policy**                       | —     | Política de Permisos                      | Controla qué APIs del navegador puede usar tu página: cámara, micrófono, geolocalización, notificaciones, etc.                                                        |
| **Trusted Types**                            | —     | Tipos Confiables                          | Una capa extra de CSP que evita que se inyecten strings en APIs peligrosas como `innerHTML`. Previene DOM-XSS.                                                        |
| **Referrer-Policy**                          | —     | Política de Referente                     | Controla cuánta información de la URL actual se envía en el header `Referer` cuando hacés click a un link externo.                                                    |
| **Largest Contentful Paint**                 | LCP   | Pintura del Contenido Más Grande          | El tiempo que tarda en aparecer el elemento más grande visible en la pantalla (texto, imagen, video). Una de las Core Web Vitals.                                     |
| **First Contentful Paint**                   | FCP   | Primera Pintura de Contenido              | El tiempo que tarda en aparecer el primer texto o imagen en la pantalla.                                                                                              |
| **Cumulative Layout Shift**                  | CLS   | Cambio de Layout Acumulado                | Mide cuánto se mueven los elementos de la página mientras carga. Un CLS alto significa que los botones se te escapan cuando vas a clickearlos.                        |
| **Total Blocking Time**                      | TBT   | Tiempo de Bloqueo Total                   | Suma de tiempo entre FCP y TTI donde el hilo principal está bloqueado por tareas largas (>50ms). Alta TBT = página que no responde.                                   |
| **Time to Interactive**                      | TTI   | Tiempo hasta Interactivo                  | El tiempo que tarda la página en ser completamente interactiva (responder a clicks, escritura, etc.).                                                                 |
| **Speed Index**                              | SI    | Índice de Velocidad                       | Mide qué tan rápido se llena visualmente la página. Un SI bajo significa que el usuario ve contenido rápidamente.                                                     |
| **WCAG**                                     | WCAG  | Pautas de Accesibilidad al Contenido Web  | Estándar internacional para hacer sitios accesibles a personas con discapacidades. Los niveles son A (básico), AA (estándar), AAA (máximo).                           |
| **ARIA**                                     | ARIA  | Aplicaciones Ricas de Internet Accesibles | Un conjunto de atributos HTML que mejoran la accesibilidad para lectores de pantalla. Ej: `role="dialog"`, `aria-label="Cerrar menú"`.                                |
| **Dynamic Import / Code Splitting**          | —     | Importación Dinámica / División de Código | Cargar código JavaScript solo cuando se necesita, no todo al inicio. Ej: `const Mapa = dynamic(() => import('./Mapa'))`.                                              |
| **Tree-shaking**                             | —     | Sacudida de Árbol                         | Eliminación automática de código JavaScript que nunca se usa. Pasa durante el build si usás imports específicos (no `import *`).                                      |
| **Browserslist**                             | —     | Lista de Navegadores                      | Un archivo de configuración que le dice a las herramientas de build qué navegadores soportás. Ej: `"last 2 versions"`.                                                |
| **Baseline**                                 | —     | Línea Base de Compatibilidad              | Un estándar de Chrome que define qué features web están disponibles en todos los navegadores modernos. Si un feature es "Baseline", no necesitás polyfill.            |
| **HTTP 301 / 307**                           | —     | Códigos de Redirección                    | 301 = "movido permanentemente" (el navegador lo cachea). 307 = "redirección temporal" (no se cachea, siempre va al servidor).                                         |

---

## Resumen: Archivos a Modificar

| Archivo                            | Acción                                                    | ¿Quién?       |
| ---------------------------------- | --------------------------------------------------------- | ------------- |
| `next.config.ts`                   | **Modificar** (8 headers de seguridad + CSP + optimizeCss) | 🤖 Automático |
| `styles/tokens.css`                | **Modificar** (color acento + hover)                       | 🤖 Automático |
| `components/Navbar/MobileMenu.tsx` | **Modificar** (ARIA fix)                                   | 🤖 Automático |
| `package.json`                     | **Modificar** (browserslist + critters)                    | 🤖 Automático |

## Tareas Manuales

1. **Dashboard Vercel**: Cambiar redirect 307 → 301 (ya resuelto).
2. **Verificar CSP**: Asegurar que Google reCAPTCHA y Google Fonts no sean bloqueados por las directivas.
3. **Desplegar** a producción y correr un nuevo test Lighthouse para confirmar mejoras.

## Correcciones aplicadas al plan durante la implementación

| # | Corrección |
|---|---|
| 1 | El redirect es de plataforma Vercel, no se arregla con `vercel.json`. |
| 3 | Ratio real de `#a8651e` es 4.62:1, no 5.12:1 como estimaba el plan. |
| 3 | `--color-accent-hover` se corrigió de `#a66e2e` a `#90571a` (estaba invertido). |
| 5 | Preconnects en `layout.tsx` son innecesarios con `next/font/google`. |
| 5 | `critters` debe instalarse como dependencia explícita. |
| 6 | `browserslist` NO reduce JS polyfills en Next.js 15 (solo afecta CSS prefixes). |
| 7 | Code splitting ya era óptimo; no requirió cambios. |
| 8 | Se agregó `pnpm test` a la batería de verificación.
