# Documento Tutor — Excavaciones Paco
**Versión 6.8 · Junio 2026**

Guía técnica del código para quien quiera entenderlo, modificarlo o aprender de él.

---

## Índice

1. [Qué es la app y qué tecnologías usa](#1-qué-es-la-app)
2. [Por qué todo en un solo archivo HTML](#2-un-solo-archivo-html)
3. [Cómo está organizado el código](#3-organización-del-código)
4. [Los datos: Supabase](#4-los-datos-supabase)
5. [Módulo a módulo](#5-módulo-a-módulo)
6. [El sistema de voz](#6-el-sistema-de-voz)
7. [El mapa y el GPS](#7-el-mapa-y-el-gps)
8. [Cómo fluye una acción de principio a fin](#8-flujo-de-una-acción)
9. [Decisiones técnicas — por qué así y no de otra manera](#9-decisiones-técnicas)
10. [Cómo modificar cosas sin romper nada](#10-cómo-modificar-cosas)
11. [Autenticación — Login y seguridad](#11-autenticación)
12. [Sistema de roles — diseño para Fase 3](#12-sistema-de-roles)

---

## 1. Qué es la app

**Excavaciones Paco** es una aplicación web progresiva (PWA) para gestionar trabajos de excavación: capturar trabajos en campo, presupuestarlos, programarlos en un calendario semanal, asignarlos a operarios y registrar su ejecución.

### Tecnologías utilizadas

| Tecnología | Para qué sirve | Coste |
|---|---|---|
| **HTML + CSS + JavaScript** | La app completa — interfaz y lógica | Gratis |
| **GitHub Pages** | Hosting con HTTPS (necesario para GPS y voz) | Gratis |
| **Supabase** | Base de datos en la nube (PostgreSQL) + autenticación | Gratis (plan free) |
| **Leaflet.js** | Mapas interactivos | Gratis |
| **OpenStreetMap** | Tiles del mapa (las imágenes del mapa) | Gratis |
| **Nominatim** | Geocodificación inversa (coordenadas → dirección) | Gratis |
| **Web Speech API** | Reconocimiento de voz del navegador | Gratis, nativo |
| **Tabler Icons** | Iconos SVG para la interfaz (candado, correo…) | Gratis (CDN) |

**Coste total: 0 €/mes.**

### Por qué HTTPS es obligatorio

El GPS (`navigator.geolocation`) y el micrófono (`webkitSpeechRecognition`) solo funcionan en páginas servidas con HTTPS. GitHub Pages lo proporciona automáticamente. Si la app se abre desde un archivo local (`file://`), el GPS y la voz no funcionan.

---

## 2. Un solo archivo HTML

### ¿Qué significa?

Todo el código — HTML, CSS y JavaScript — está en un único archivo: `excavaciones_paco_00.html`. No hay servidor de aplicación, no hay build, no hay dependencias npm que instalar.

### Estructura del archivo

```
excavaciones_paco_00.html
│
├── <head>
│   ├── Leaflet CSS (CDN)
│   ├── Leaflet JS (CDN)
│   └── Tabler Icons (CDN)
│
├── <style>
│   └── Todo el CSS de la app (~700 líneas)
│
├── <body>
│   ├── Pantalla de Login (bloquea la app hasta autenticar)
│   ├── Cabecera y navegación (5 pestañas)
│   ├── Vista: + Nuevo (formulario 7 pasos)
│   ├── Vista: Listado
│   ├── Vista: Mes
│   ├── Vista: Hoy
│   └── Vista: Configuración ⚙
│
└── <script>
    ├── Constantes Supabase
    ├── CONFIG (listas de tipos, maquinaria, operarios)
    ├── Estado global (variables en memoria)
    ├── Supabase REST API helpers
    ├── Autenticación (login, sesión, refresh token)
    ├── Funciones de almacenamiento de trabajos (loadTrab, addTrab...)
    ├── Módulo 1 — Formulario de captura
    ├── Módulo 2 — Listado
    ├── Módulo 3 — Vista Mes + Programación
    ├── Módulo 4 — Vista operario (Hoy)
    ├── Módulo 5 — Configuración
    ├── Módulo 6 — Informes y CSV
    └── Arranque — IIFE async: checkAuth() → iniciarApp()
```

### Ventajas de este enfoque

- **Cero instalación**: se abre en cualquier navegador moderno.
- **Fácil de actualizar**: se sube un archivo a GitHub y en 2 minutos está en producción.
- **Fácil de hacer backup**: es un archivo — se copia y ya está.
- **Sin dependencias**: no hay `node_modules`, no hay versiones que chocan.

### Limitaciones

- Para proyectos grandes (>5.000 líneas) se vuelve difícil de mantener.
- No hay separación de responsabilidades formal (MVC, componentes...).
- No hay tests automatizados.

---

## 3. Organización del código

El script está dividido en bloques bien delimitados con comentarios `// ════...`. El orden importa porque JavaScript lee el archivo de arriba a abajo.

### Orden de declaración (crítico)

```
1. Constantes Supabase (SUPA_URL, SUPA_KEY)
      ↓ deben existir antes que cualquier función que las use
2. CONFIG — defaults y funciones de configuración
      ↓ loadConfig() usa SUPA_URL
3. Estado global (variables let: form, modalTrabajoId, _session, etc.)
4. Wrapper Supabase (objeto supa con select/insert/update/delete)
      ↓ usa _authHeaders() que depende de _session
5. Autenticación — login(), checkAuth(), _refreshSessionIfNeeded()
6. Funciones de almacenamiento de trabajos (loadTrab, addTrab...)
7. Módulos 1-6 (formulario, listado, semana, hoy, config, informe)
8. Arranque — IIFE async: checkAuth() → si autenticado, iniciarApp()
```

> **Regla de oro**: si una función A llama a una función B, B debe estar declarada antes que A, O B debe ser una `function` (no `const`/`let`) porque las `function` se elevan (hoisting) al inicio del script.

---

## 4. Los datos: Supabase

### Qué es Supabase

Supabase es una base de datos PostgreSQL en la nube con una API REST automática. No hace falta escribir un servidor — se hacen peticiones HTTP directamente desde el navegador.

### Tablas en la base de datos

#### `trabajos` — tabla principal (19 columnas)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | serial | Clave primaria autoincremental |
| `cliente` | text | Nombre del cliente |
| `direccion` | text | Dirección obtenida por geocodificación |
| `zona` | text | Zona o barrio (parte de la dirección) |
| `lat` / `lng` | float | Coordenadas GPS |
| `tipos` | text | JSON array: `["Excavación","Picado"]` |
| `maquinarias` | text | JSON array: `["Minipala JCB"]` |
| `tipo` | text | Texto plano (join de tipos, para mostrar) |
| `maquinaria` | text | Texto plano (join de maquinarias) |
| `horas` | integer | Horas estimadas |
| `urgencia` | text | `Normal`, `Alta` o `Urgente` |
| `notas` | text | Notas libres |
| `estado` | text | Estado actual del trabajo |
| `fecha` | text | Fecha de creación (ISO) |
| `operarios` | text | JSON array de nombres asignados |
| `dias` | text | JSON array de fechas programadas (ISO) |
| `horas_reales` | integer | Horas reales al cerrar |
| `notas_cierre` | text | Notas al marcar como realizado |
| `jornadas` | text | JSON array de jornadas parciales |

#### `tipos_trabajo`, `maquinaria`, `operarios` — tablas de configuración

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | serial | Clave primaria |
| `nombre` | text | Nombre del elemento |
| `activo` | boolean | Si aparece en los formularios |
| `sinonimos` | text[] | Array de palabras para reconocimiento de voz |

### Cómo se conecta la app

La app **no usa el SDK de Supabase**. Usa `fetch` nativo directamente a la REST API. Esto es así porque el SDK es incompatible con las claves `sb_publishable_` que Supabase usa actualmente.

```javascript
// Así se hace una consulta SELECT
const response = await fetch(
  `${SUPA_URL}/rest/v1/trabajos?select=*&order=fecha.desc`,
  { headers: SUPA_HEADERS }
);
const datos = await response.json();

// Las cabeceras necesarias son:
const SUPA_HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'  // no devuelve el objeto insertado (más rápido)
};
```

### Row Level Security (RLS)

Supabase tiene RLS activado en todas las tablas. Desde v6.3 la política exige usuario **autenticado** (rol `authenticated`). El rol `anon` ya no tiene acceso:

```sql
-- v6.3: solo usuarios autenticados pueden leer/escribir
CREATE POLICY "solo_auth" ON trabajos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

Esto significa que todas las peticiones a Supabase deben incluir el JWT del usuario en la cabecera `Authorization`. Si no hay sesión activa, Supabase devuelve `401 Unauthorized`.

### Headers dinámicos: `_authHeaders()`

Antes de v6.3 había una constante fija `SUPA_HEADERS`. Ahora se usa una función que construye las cabeceras con el token de sesión activo:

```javascript
function _authHeaders() {
  const token = _session?.access_token || SUPA_KEY;
  return {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
}
```

Todas las peticiones a Supabase usan `_authHeaders()` en vez de la constante antigua.

### Fallback a localStorage

Si Supabase no responde (sin internet, servidor dormido), la app cae a localStorage:

```javascript
try {
  // Intenta Supabase
  const rows = await fetch(...);
  _trabCache = rows;
  localStorage.setItem('excavaciones_trabajos', JSON.stringify(rows));
} catch(e) {
  // Fallback: usa los datos del último acceso
  _trabCache = JSON.parse(localStorage.getItem('excavaciones_trabajos') || '[]');
}
```

---

## 5. Módulo a módulo

### Módulo 1 — Formulario de captura (+ Nuevo)

**Qué hace**: guía al usuario por 7 pasos para registrar un trabajo.

**Variables clave**:
```javascript
let form = {
  cliente:'', direccion:'', zona:'', lat:null, lng:null,
  tipos:[], maquinarias:[], horas:4, urgencia:'Normal', notas:''
};
let currentStep = 1; // Paso actual (1-7)
```

**Flujo**:
1. `showStep(n)` — muestra el paso N, oculta los demás
2. `nextStep(current)` — valida el paso actual y avanza
3. `buildResumen()` — construye el resumen del paso 7
4. `guardarTrabajo()` — llama a `addTrab()` que hace POST a Supabase
5. `resetForm()` — limpia el formulario para el siguiente trabajo

**Validaciones por paso**:
- Paso 1: cliente no vacío
- Paso 3: al menos un tipo seleccionado
- Paso 4: al menos una máquina seleccionada

### Módulo 2 — Listado

**Qué hace**: muestra todos los trabajos con filtros y pestañas. Permite avanzar estados y eliminar.

**Funciones principales**:
- `renderListado()` — construye el HTML de todas las tarjetas
- `buildFiltros()` — rellena los selectores de zona y maquinaria
- `setLTab(tab)` — cambia entre Pendientes / Programados / Realizados
- `cambiarEstado(id, nuevoEstado)` — avanza el estado de un trabajo (async — usa await showConfirm)
- `eliminar(id)` — borra un trabajo (async — usa await showConfirm con botón rojo)

**Agrupación por maquinaria**:
```javascript
const grupos = {};
lista.forEach(t => {
  if (!grupos[t.maquinaria]) grupos[t.maquinaria] = [];
  grupos[t.maquinaria].push(t);
});
```

### Módulo 3 — Vista Mes + Programación

**Qué hace**: grid mensual con todos los días del mes, bolsa de pendientes y modal de programación. Sustituye completamente la vista Semana desde v6.4.

**Conceptos clave**:
- Grid de 5-6 filas × 7 columnas con todos los días del mes activo
- Punto de color por día: verde (1 trabajo) · naranja (2-3) · rojo (4+)
- Los trabajos sin días asignados aparecen en la bolsa de pendientes debajo del grid
- Tocar un día abre el modal de programar situado en esa semana con el día preseleccionado
- Responsabilidades separadas limpiamente: `renderMes()` solo renderiza el grid, `renderBolsa()` solo la bolsa

**Funciones principales**:
- `renderMes()` — dibuja el grid mensual completo (sin acoplamiento a bolsa)
- `renderBolsa()` — función independiente con una sola responsabilidad: actualizar la bolsa
- `getLunes(offset, fechaBase?)` — calcula el lunes de la semana; `fechaBase` opcional (por defecto hoy)
- `abrirModalProgramar(id, fechaInicio?)` — abre el modal; calcula offset internamente desde `fechaInicio`
- `cambiarMes(dir)` — navega entre meses
- `confirmarProgramar()` — guarda días y operarios, cambia estado a Programado
- `desprogramarDesdeDetalle()` — quita el trabajo del calendario (vuelve a Aceptado)

**Decisiones de arquitectura**:
```javascript
// getLunes acepta fechaBase opcional — no depende implícitamente de new Date()
function getLunes(offset, fechaBase) {
  const base = fechaBase ? new Date(fechaBase) : new Date();
  ...
}

// abrirModalProgramar calcula el offset internamente — quien llama no toca modalSemanaOffset
function abrirModalProgramar(id, fechaInicio) {
  const hoyLunes = getLunes(0);
  const lunesDestino = getLunes(0, fechaInicio || new Date());
  modalSemanaOffset = Math.round((lunesDestino - hoyLunes) / (7 * 24 * 60 * 60 * 1000));
  ...
}
```

### Módulo 4 — Vista Hoy (operario)

**Qué hace**: vista simplificada para el operario. Muestra sus trabajos de los próximos 7 días. Solo puede marcarlos como realizados.

**Funciones principales**:
- `renderOperario()` — dibuja los trabajos del operario seleccionado
- `opMarcarRealizado(id)` — abre el modal de cierre
- `confirmarRealizado()` — guarda horas reales y notas, cambia estado a Realizado
- `confirmarJornada()` — registra una jornada parcial sin cerrar el trabajo

### Módulo 5 — Configuración

**Qué hace**: gestiona las listas de operarios, tipos de trabajo y maquinaria. Guarda en Supabase. Desde v6.3 incluye también el botón de cerrar sesión y muestra el email del usuario activo.

**Funciones principales**:
- `renderConfig()` — dibuja toda la sección de configuración (incluye email activo y botón cerrar sesión)
- `cfgAdd(key)` — añade un nuevo elemento (async, guarda en Supabase)
- `cfgToggleItem(key, idx)` — da de baja o reactiva un tipo/máquina
- `cfgToggleOperario(idx)` — da de baja o reactiva un operario
- `cfgEliminarItem(key, idx)` — elimina definitivamente de Supabase
- `cfgEliminarOperario(idx)` — elimina definitivamente un operario
- `cfgAddSin(item)` / `cfgDelSin(item, sin)` — gestiona sinónimos de voz
- `cfgReset()` — borra las tablas y recarga los defaults
- `cerrarSesion()` — llama a Supabase Auth `/auth/v1/logout`, borra `_session` y muestra la pantalla de login

**Patrón de las listas**:
```javascript
// Dar de baja NO borra — solo cambia activo:false
// Esto preserva el historial de trabajos que usaban ese elemento
item.activo = false; // sigue en Supabase, no aparece en formularios
```

### Módulo 6 — Informes y CSV

**Qué hace**: exporta trabajos realizados a CSV compatible con Excel.

**Funciones**:
- `exportarInformeCSV()` — exporta todos los realizados en un rango de fechas
- `exportarTrabajoCSV(id)` — exporta un trabajo individual
- `descargarCSV(trabajos, nombreArchivo)` — función base que genera el archivo

**Detalle técnico del CSV**:
```javascript
// BOM (Byte Order Mark) para que Excel detecte UTF-8 correctamente
const BOM = '\uFEFF';
// Separador punto y coma (no coma) para compatibilidad con Excel español
const lineas = datos.map(fila => fila.join(';'));
```

---

## 6. El sistema de voz

### Tecnología: Web Speech API

El reconocimiento de voz usa `webkitSpeechRecognition`, disponible en Chrome y Safari. No es estándar W3C pero funciona bien en móviles modernos. **Requiere HTTPS**.

### Flujo del reconocimiento

```
Usuario pulsa "🎤 Hablar"
    ↓
startVoice(field, btnId, resId)
    ↓
SpeechRecognition escucha (continuo, interimResults=true)
    ↓
onresult — se ejecuta en cada fragmento:
  ├── Fragmento provisional → muestra en gris con "…" (feedback inmediato)
  └── Fragmento final → acumula en textoAcumulado → processVoice(field, texto)
    ↓
processVoice devuelve {ok: boolean, msg: string}
    ↓
  ├── ok=true  → muestra vr-ok en verde bajo el texto reconocido
  └── ok=false → muestra vr-err en rojo bajo el texto reconocido
    ↓
  Si field es 'tipos' o 'maquinaria':
      matchSinonimo() → devuelve {ok, msg} → selecciona chip si coincide
  Si field es 'cliente', 'notas', 'horas':
      Rellena el campo y devuelve {ok: true, msg}
```

**Clases CSS del feedback de voz**:
- `.vr-interim` — texto provisional en gris mientras habla
- `.vr-final` — texto confirmado en blanco negrita entre comillas
- `.vr-ok` — resultado en verde (✓ Minipala JCB)
- `.vr-err` — resultado en rojo (✗ No reconocido — selecciona manualmente)

**Desacoplamiento**: `processVoice()` y `matchSinonimo()` devuelven `{ok, msg}` — no llaman `showToast()` directamente. Quien llama (el handler de voz) decide cómo mostrar el feedback.

### Los sinónimos

```javascript
// CONFIG.sinonimos es un objeto plano:
{
  'Volvo giratorio': ['volvo', 'retro', 'giratorio', 'excavadora'],
  'Minipala JCB':    ['mini', 'jcb', 'pala pequeña', 'minipala'],
  ...
}

// matchSinonimo busca si el texto dictado contiene algún sinónimo
function matchSinonimo(field, texto, chipsId) {
  const lista = field === 'tipos' ? getTiposActivos() : getMaqActiva();
  for (const val of lista) {
    const sins = CONFIG.sinonimos[val] || [];
    if (sins.some(s => texto.includes(s)) || texto.includes(val.toLowerCase())) {
      // Selecciona el chip correspondiente
    }
  }
}
```

---

## 7. El mapa y el GPS

### Leaflet.js

Leaflet es una librería JavaScript de mapas ligera y open source. Se carga desde CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

### Flujo de captura de ubicación

```
Usuario pulsa "Localizar en el mapa"
    ↓
abrirMapaGPS()
    ↓
navigator.geolocation.getCurrentPosition()
    ↓
  Éxito → inicializarMapa(lat, lng, zoom=17)
           ponerMarcador(lat, lng)
  Error  → inicializarMapa(42.8782, -8.5448, 13)  ← Centro Santiago
    ↓
Usuario arrastra el marcador si necesita ajustar
    ↓
aceptarMapa()
    ↓
Nominatim (geocodificación inversa):
  fetch('https://nominatim.openstreetmap.org/reverse?lat=...&lon=...')
    ↓
form.lat, form.lng, form.direccion, form.zona quedan guardados
```

### Nominatim — geocodificación inversa

Convierte coordenadas GPS en una dirección legible. Es gratuito pero tiene límite de 1 petición/segundo:

```javascript
const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
const res = await fetch(url, { headers: { 'User-Agent': 'ExcavacionesPaco/1.0' } });
const data = await res.json();
// data.display_name → "Rúa de..., Santiago de Compostela, ..."
// data.address.suburb / data.address.quarter → zona
```

---

## 8. Flujo de una acción

### Ejemplo completo: guardar un trabajo nuevo

```
1. Usuario completa los 7 pasos del formulario
   form = { cliente:'García', lat:42.88, tipos:['Excavación'], ... }

2. Pulsa "Guardar trabajo"
   guardarTrabajo() es llamada

3. Se construye el objeto trabajo:
   const t = {
     id: Date.now(),        ← ID temporal (se sobreescribe con el de Supabase)
     cliente: form.cliente,
     tipos: form.tipos,
     estado: 'Pendiente presupuestar',
     fecha: new Date().toISOString(),
     ...
   }

4. addTrab(t) convierte el objeto a formato Supabase:
   trabajoToRow(t) → serializa arrays a JSON strings

5. POST a Supabase:
   fetch(`${SUPA_URL}/rest/v1/trabajos`, { method:'POST', body: JSON.stringify(row) })

6. Si hay éxito:
   - _trabCache recibe el nuevo trabajo
   - localStorage se actualiza como fallback
   - showToast('✓ Trabajo guardado')
   - resetForm() limpia el formulario
   - renderListado() actualiza la vista

7. Si Supabase falla:
   - El trabajo se guarda solo en localStorage
   - El indicador cambia a "⚠ Sin conexión"
```

---

## 9. Decisiones técnicas

### ¿Por qué un solo HTML y no React/Vue?

- El usuario final necesita cero instalación y actualización inmediata.
- El volumen de datos es pequeño (decenas de trabajos, no millones).
- No hay equipo de desarrollo — una persona mantiene todo.
- Un HTML se puede abrir, editar y subir a GitHub en minutos.

Para un proyecto con múltiples desarrolladores, crecimiento a largo plazo o lógica muy compleja, React o Vue serían la elección correcta.

### ¿Por qué Supabase y no Firebase o localStorage puro?

- **Firebase** (Google): más complejo de configurar, su SDK es pesado.
- **localStorage puro**: los datos están atados a un solo dispositivo/navegador. Si se borra la caché, se pierden.
- **Supabase**: PostgreSQL real (más potente que Firestore), API REST sin SDK, plan gratuito suficiente para el volumen actual, datos accesibles desde cualquier dispositivo.

### ¿Por qué fetch nativo y no el SDK de Supabase?

El SDK de Supabase JS no es compatible con las claves `sb_publishable_` que el plan gratuito actual genera. Se probó y devolvía errores de autenticación. La alternativa fue usar `fetch` directamente a la REST API, que funciona perfectamente con esas claves.

### ¿Por qué IDs numéricos de `Date.now()` en local y no UUIDs?

Al guardar un trabajo, se asigna `Date.now()` como ID temporal antes de que Supabase devuelva el ID real. Supabase usa `SERIAL` (entero autoincremental). Todas las comparaciones de IDs en el código usan `String()` para evitar fallos entre el número local y el string que devuelve Supabase.

```javascript
// Siempre comparar con String() — nunca con ===
if (String(t.id) === String(modalTrabajoId)) { ... }
```

### ¿Por qué "dar de baja" en vez de borrar?

Los trabajos históricos referencian operarios, tipos y maquinaria por nombre. Si se borra un operario, los trabajos que tienen ese operario asignado quedan inconsistentes. "Dar de baja" mantiene el registro pero lo oculta de los formularios nuevos.

---

## 10. Cómo modificar cosas

### Añadir un campo nuevo al formulario

1. Añadir el campo al objeto `form` en el estado global.
2. Añadir el paso HTML correspondiente en la vista `+ Nuevo`.
3. Actualizar `nextStep()` para incluir la validación si es necesario.
4. Actualizar `buildResumen()` para mostrarlo en el paso 7.
5. Actualizar `trabajoToRow()` para incluirlo en el objeto que va a Supabase.
6. Añadir la columna en Supabase con `ALTER TABLE trabajos ADD COLUMN ...`.
7. Actualizar `loadTrab()` para leer el nuevo campo de las filas.

### Añadir un tipo de trabajo o máquina nueva

Desde la propia app: pestaña ⚙ Configuración → sección correspondiente → escribir nombre → `+ Añadir`. Se guarda en Supabase al instante.

### Cambiar los colores

Las variables CSS están en la sección `:root` al inicio del `<style>`:

```css
:root {
  --accent: #FFD100;   /* Amarillo principal */
  --text: #FFFFFF;     /* Texto principal */
  --text2: #CCCCCC;    /* Texto secundario */
  --text3: #666666;    /* Texto terciario */
  --bg: #1C1C1C;       /* Fondo */
  --card: #272727;     /* Tarjetas */
}
```

Cambiar `--accent` cambia todos los botones, bordes activos y elementos destacados a la vez.

### Cambiar los estados del flujo

Los estados son strings definidos en varios sitios. Para añadir o renombrar un estado hay que actualizar:

1. El array de estados en `cambiarEstado()` (módulo 2).
2. Los filtros de pestaña en `renderListado()`.
3. Los colores de las píldoras en el CSS (`.estado-*`).
4. La lógica de la "bolsa de pendientes" en `renderSemana()`.

### Depurar problemas con Supabase

Abre la consola del navegador (F12) y busca los `console.warn` y `console.error`. El patrón más común:

```
401 Unauthorized → sesión caducada o no iniciada / política RLS solo_auth activa
403 Forbidden    → RLS activo sin política que lo permita
404 Not Found    → nombre de tabla incorrecto
```

Para verificar que Supabase responde correctamente, pega esto en la consola (requiere estar autenticado):

```javascript
fetch(`${SUPA_URL}/rest/v1/trabajos?select=id&limit=1`, { headers: _authHeaders() })
  .then(r => r.json())
  .then(d => console.log('OK:', d))
  .catch(e => console.error('Error:', e));
```

### Modal de confirmación propio

Desde v6.6 todos los `confirm()` nativos del navegador están sustituidos por `showConfirm()`, una función que devuelve una `Promise` y muestra un modal con el diseño de la app:

```javascript
// Uso — siempre en funciones async
if (!await showConfirm('¿Eliminar este trabajo?', 'Esta acción no se puede deshacer.', true)) return;
// peligro=true → botón rojo "Eliminar"
// peligro=false (por defecto) → botón amarillo "Aceptar"
```

**Por qué**: `confirm()` nativo rompe la experiencia visual, no se puede estilizar, y en móvil queda fuera de contexto. `showConfirm()` es un modal propio, centrado, con el mismo fondo y tipografía que el resto de la app.

**Requisito**: cualquier función que use `await showConfirm()` debe declararse `async`.

---

> **Nota v6.3**: si obtienes `401` donde antes funcionaba, el motivo es que la política RLS cambió de `anon` a `authenticated`. La sesión debe estar activa y `_authHeaders()` debe devolver el JWT correcto.

### Actualizar la app en producción

```bash
# 1. Editar el archivo en local
# 2. Verificar en el navegador (archivo local) que funciona
# 3. Subir a GitHub:
git add .
git commit -m "descripción del cambio"
git push
# 4. Esperar 1-2 minutos
# 5. Probar en https://xabiercons.github.io/ObrasPaco/excavaciones_paco_00.html
# Si el navegador no actualiza, añadir ?v2 al final de la URL
```

---

## Glosario rápido

| Término | Significado |
|---|---|
| **async/await** | Forma moderna de manejar operaciones que tardan (como llamadas a red). `async` declara que una función puede tener esperas. `await` espera a que termine antes de continuar. |
| **IIFE** | Función que se ejecuta sola al declararse: `(async () => { ... })()`. Se usa para el arranque de la app. |
| **CDN** | Red de distribución de contenido. Leaflet y Tabler Icons se cargan desde CDN en vez de incluir los archivos. |
| **REST API** | Interfaz para comunicarse con un servidor mediante peticiones HTTP (GET, POST, PATCH, DELETE). |
| **RLS** | Row Level Security. Sistema de Supabase que controla qué filas puede leer/escribir cada usuario. En v6.3 exige rol `authenticated`. |
| **JWT** | JSON Web Token. Token firmado que Supabase devuelve al hacer login. Se incluye en cada petición en la cabecera `Authorization: Bearer <token>`. |
| **refresh_token** | Token de larga duración que permite obtener un nuevo `access_token` sin volver a hacer login. Se guarda en localStorage. |
| **localStorage** | Almacenamiento del navegador. Persiste entre sesiones pero está ligado al dispositivo. Se usa para guardar `supa_session`. |
| **fetch** | Función nativa de JavaScript para hacer peticiones HTTP. |
| **hoisting** | Las declaraciones `function` se "elevan" al inicio del script. Las `const`/`let` no. |
| **cache en memoria** | Variables como `_trabCache` que guardan los datos mientras la app está abierta para no tener que consultar Supabase en cada render. |

---

## 11. Autenticación

### Flujo de login

La pantalla de login bloquea toda la app hasta que el usuario se autentica. El flujo completo:

```
App arranca → checkAuth()
    ↓
¿Hay sesión guardada en localStorage ('supa_session')?
    ├── Sí → _refreshSessionIfNeeded() → si token válido → iniciarApp()
    └── No → mostrar pantalla de login

Usuario introduce email + contraseña → login()
    ↓
POST a Supabase Auth /auth/v1/token?grant_type=password
    ↓
  Éxito → guardar sesión en localStorage + _session → iniciarApp()
  Error → mostrar mensaje de error en la pantalla de login
```

### Variables de sesión

```javascript
let _session = null; // { access_token, refresh_token, expires_at, user: { email } }
```

La sesión se guarda en `localStorage` con la clave `supa_session` para persistir entre recargas.

### Refresh automático del token

Los tokens de Supabase caducan. La función `_refreshSessionIfNeeded()` comprueba si el token caduca en menos de 5 minutos y, si es así, llama a `/auth/v1/token?grant_type=refresh_token` antes de arrancar la app:

```javascript
async function _refreshSessionIfNeeded(session) {
  const expira = session.expires_at * 1000; // UNIX timestamp → ms
  const margen = 5 * 60 * 1000;            // 5 minutos de margen
  if (Date.now() > expira - margen) {
    // Llamar a Supabase con el refresh_token para obtener uno nuevo
    const nuevo = await _refreshToken(session.refresh_token);
    localStorage.setItem('supa_session', JSON.stringify(nuevo));
    return nuevo;
  }
  return session;
}
```

### Detección automática de sesión expirada

Desde v6.8, cuando cualquier petición a Supabase devuelve `401 JWT expired`, la app lo detecta automáticamente sin que el usuario tenga que hacer nada:

```javascript
// Un solo punto de control — en el wrapper supa
async function _checkSesionExpirada(r) {
  if (r.status === 401) {
    let body = await r.clone().text();
    if (body.includes('JWT expired') || body.includes('PGRST303')) {
      _session = null;
      localStorage.removeItem('supa_session');
      showToast('⚠ Sesión caducada — vuelve a entrar', true);
      setTimeout(() => mostrarLogin(), 1500);
      return true;
    }
  }
  return false;
}
```

Se llama desde todos los métodos del wrapper `supa` (select, insert, update, delete). Si devuelve `true`, el método aborta la operación y la app redirige al login automáticamente tras 1,5 segundos para que el toast sea visible.

**Por qué en el wrapper y no en cada llamada**: un solo punto de control evita duplicar la lógica en los 4 métodos y en todos los `catch` del código. Si en el futuro cambia el código de error de Supabase, solo hay que actualizar `_checkSesionExpirada`.

### Cerrar sesión

El botón "Cerrar sesión" en la pestaña ⚙ Configuración llama a `cerrarSesion()`:

```javascript
async function cerrarSesion() {
  // 1. Notificar a Supabase (invalida el token en servidor)
  await fetch(`${SUPA_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: _authHeaders()
  });
  // 2. Limpiar estado local
  _session = null;
  localStorage.removeItem('supa_session');
  // 3. Mostrar pantalla de login
  mostrarLogin();
}
```

### Diseño de la pantalla de login

- Inputs con `padding: 18px`, `font-size: 17px` — optimizados para móvil
- Botón "Entrar" con `font-size: 20px`, `padding: 18px`
- Icono de candado (Tabler Icons) en el campo contraseña
- Icono de correo (Tabler Icons) en el campo email
- Borde `#3A3A3A` con foco en amarillo `--accent`

### Cambio en RLS respecto a v6.2

| Versión | Política | Rol | Efecto |
|---|---|---|---|
| v6.2 | `acceso_total` | `anon` | Cualquiera con la clave API podía leer y escribir |
| v6.3 | `solo_auth` | `authenticated` | Solo usuarios con sesión activa pueden operar |

Este cambio mejora la seguridad: si alguien obtiene la `SUPA_KEY` del código fuente, no puede acceder a los datos sin también tener credenciales de usuario válidas.

---


---

## 12. Sistema de roles

> Diseñado en sesión 14 para Fase 3. No implementado en la versión actual.

### Por qué los roles son estratégicos

La app actual tiene dos credenciales sin distinción real de permisos. Con roles bien definidos se convierte en un producto vendible a múltiples empresas.

### Roles previstos

| Rol | Quién | Permisos |
|---|---|---|
| **Admin** | Propietario | Todo — crear, presupuestar, programar, informes, gestionar usuarios |
| **Encargado** | Jefe de obra | Crear, programar, ver listado completo, marcar realizados |
| **Operario** | Trabajador | Solo ver sus trabajos del día y marcar realizados |
| **Cliente** | Cliente final | Solo ver estado de sus trabajos (portal cliente futuro) |

### Implementación técnica en Fase 3

```sql
-- Tabla perfiles vinculada a auth.users
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT CHECK (role IN ('admin','encargado','operario','cliente')),
  empresa_id UUID
);

-- RLS por rol: operarios solo ven sus trabajos
CREATE POLICY "operario_sus_trabajos" ON trabajos
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM perfiles WHERE role = 'admin'
    )
    OR nombre_operario = (SELECT nombre FROM perfiles WHERE id = auth.uid())
  );
```

**UI condicional**: botones de presupuestar, programar y configurar solo visibles para Admin/Encargado. En React esto se gestiona con un `AuthContext` que expone el rol del usuario activo.

### Modelo de negocio SaaS

- **Plan Básico**: 1 Admin + hasta 3 Operarios — precio mensual fijo
- **Plan Pro**: Admin + Encargados + Operarios ilimitados + portal Cliente
- **Plan Enterprise**: multisede, informes avanzados, integración contabilidad

La arquitectura de Supabase Auth soporta esto sin cambios de infraestructura — solo ampliar tablas y políticas RLS.

---

*Documento generado en Junio 2026 · App v6.8*
