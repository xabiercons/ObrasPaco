# Documento Tutor — Excavaciones Paco
**Versión 7.6 · Junio 2026**

Guía técnica del código para quien quiera entenderlo, modificarlo o aprender de él.

---

## Índice

1. [Qué es la app y qué tecnologías usa](#1-qué-es-la-app)
2. [Estructura de archivos — 3 ficheros separados](#2-estructura-de-archivos)
3. [Cómo está organizado el código](#3-organización-del-código)
4. [Los datos: Supabase](#4-los-datos-supabase)
5. [Módulo a módulo](#5-módulo-a-módulo)
6. [El sistema de voz](#6-el-sistema-de-voz)
7. [El mapa y el GPS](#7-el-mapa-y-el-gps)
8. [Cómo fluye una acción de principio a fin](#8-flujo-de-una-acción)
9. [Decisiones técnicas — por qué así y no de otra manera](#9-decisiones-técnicas)
10. [Cómo modificar cosas sin romper nada](#10-cómo-modificar-cosas)
11. [Autenticación — Login y seguridad](#11-autenticación)
12. [Sistema de variables CSS — tema claro](#12-sistema-de-variables-css)
13. [Sistema de roles — diseño para Fase 3](#13-sistema-de-roles)

---

## 1. Qué es la app

**Excavaciones Paco** es una aplicación web progresiva (PWA) para gestionar trabajos de excavación: capturar trabajos en campo, presupuestarlos, programarlos en un calendario mensual, asignarlos a operarios y registrar su ejecución.

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
| **Tabler Icons** | Iconos SVG para la interfaz | Gratis (CDN) |

**Coste total: 0 €/mes.**

### Por qué HTTPS es obligatorio

El GPS (`navigator.geolocation`) y el micrófono (`webkitSpeechRecognition`) solo funcionan en páginas servidas con HTTPS. GitHub Pages lo proporciona automáticamente. Si la app se abre desde un archivo local (`file://`), el GPS y la voz no funcionan.

---

## 2. Estructura de archivos

Desde v7.4 el código está separado en **3 archivos** (antes todo en uno):

```
ObrasPaco/
├── excavaciones_paco_00.html   — estructura HTML (vistas, modales, formularios)
├── excavaciones_paco.css       — estilos con sistema de variables CSS (~492 líneas)
└── excavaciones_paco.js        — lógica completa (~3.100 líneas)
```

El HTML referencia los otros dos:
```html
<link rel="stylesheet" href="excavaciones_paco.css">
<!-- al final del body, justo antes de </body> -->
<script src="excavaciones_paco.js"></script>
```

> **Crítico**: el `<script>` debe estar al final del `<body>`, no en el `<head>`. Si se pone antes, el JS intenta acceder a elementos del DOM que todavía no existen → `Cannot read properties of null`.

### Vistas HTML (en orden en el DOM)

```
#view-captura    → + Nuevo (formulario 7 pasos)   [active por defecto]
#view-listado    → Listado (Pendientes/Programados/Realizados)
#view-mes        → Calendario mensual + programación
#view-hoy        → Vista operario
#view-config     → Configuración ⚙
```

### Modales (fuera del flujo de vistas)

```
#modal-editar-cliente   → Editar datos de un cliente
#modal-editar           → Editar trabajo completo (incluye cambio de fecha)
#modal-detalle          → Detalle de trabajo desde el calendario
#modal-realizado        → Confirmar trabajo realizado + horas reales
#modal-jornada          → Añadir jornada parcial
#modal-confirm          → Modal de confirmación genérico (sí/no)
```

---

## 3. Organización del código

El script (`excavaciones_paco.js`) está dividido en bloques con comentarios `// ════...`. El orden importa porque JavaScript lee el archivo de arriba a abajo.

### Orden de declaración (crítico)

```
1. Constantes Supabase (SUPA_URL, SUPA_KEY, SUPA_AUTH_URL)
2. Autenticación — _getSessionStored, _setSessionStored, _authHeaders, hacerLogin,
                   _refreshSessionIfNeeded, cerrarSesion, checkAuth, iniciarApp
3. CONFIG — defaults, funciones getCfg/getOperariosCfg/etc., loadConfig
4. Estado global (variables let: form, stepActual, _trabCache, _session, etc.)
5. Wrapper Supabase (objeto supa con select/insert/update/delete)
6. Funciones de almacenamiento de trabajos (loadTrab, addTrab, updateTrab, deleteTrab)
7. Módulo 1 — Formulario de captura (7 pasos, voz, mapa, resumen)
8. Módulo 2 — Listado (renderListado, filtros, cambiarEstado, editar, eliminar)
9. Módulo 3 — Vista Mes + Programación (renderMes, renderBolsa, progTrabajoId...)
10. Módulo 4 — Vista operario / Hoy (renderOperario, opMarcarRealizado)
11. Módulo 5 — Configuración (clientes, operarios, tipos, maquinaria, sinónimos)
12. Módulo 6 — Informes y CSV (exportarInformeCSV, enviarInformePorEmail)
13. Arranque — IIFE async: checkAuth() → iniciarApp()
```

> **Regla de oro**: si una función A llama a una función B, B debe estar declarada antes que A, O debe ser una `function` declaration (no `const`/`let`) porque las `function` se elevan (hoisting) al inicio del script.

---

## 4. Los datos: Supabase

### Tablas en la base de datos

#### `trabajos` — tabla principal

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | serial | Clave primaria autoincremental |
| `cliente` | text | Nombre del cliente |
| `obra` | text | Nombre de la obra |
| `direccion` | text | Dirección obtenida por geocodificación |
| `zona` | text | Zona o barrio |
| `lat` / `lng` | float | Coordenadas GPS |
| `tipos` | text | JSON array: `["Excavación","Picado"]` |
| `maquinarias` | text | JSON array: `["Minipala JCB"]` |
| `tipo` | text | Texto plano (join de tipos) |
| `maquinaria` | text | Texto plano (join de maquinarias) |
| `horas` | integer | Horas estimadas |
| `urgencia` | text | `Normal`, `Alta` o `Urgente` |
| `notas` | text | Notas libres |
| `estado` | text | Estado actual del trabajo |
| `fecha` | text | Fecha de creación (ISO) |
| `operarios` | text | JSON array de nombres asignados |
| `dias_programados` | text | JSON array de fechas programadas (ISO) |
| `horas_reales` | text | JSON object: `{"Minipala JCB": 5}` |
| `notas_cierre` | text | Notas al marcar como realizado |
| `materiales` | text | Materiales utilizados |
| `jornadas_parciales` | text | JSON array de jornadas parciales |

> **Nota**: en el objeto JS se usa `diasProgramados` (camelCase). En la BD se guarda como `dias_programados` (snake_case). La conversión ocurre en `trabajoToRow()` y `loadTrab()`.

#### `clientes` — tabla de clientes habituales

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigserial | Clave primaria |
| `nombre` | text | Nombre del cliente |
| `telefono` | text | Teléfono (opcional) |
| `observaciones` | text | Observaciones (opcional) |

#### `tipos_trabajo`, `maquinaria`, `operarios` — tablas de configuración

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | serial | Clave primaria |
| `nombre` | text | Nombre del elemento |
| `activo` | boolean | Si aparece en los formularios |
| `sinonimos` | text[] | Array de palabras para reconocimiento de voz |

### Cómo se conecta la app

La app **no usa el SDK de Supabase**. Usa `fetch` nativo directamente a la REST API. Motivo: el SDK es incompatible con las claves `sb_publishable_` que Supabase usa actualmente.

```javascript
// SELECT
const response = await fetch(
  `${SUPA_URL}/rest/v1/trabajos?select=*&order=fecha.desc`,
  { headers: SUPA_HEADERS }
);

// UPDATE
await fetch(
  `${SUPA_URL}/rest/v1/trabajos?id=eq.${id}`,
  { method: 'PATCH', headers: SUPA_HEADERS, body: JSON.stringify(row) }
);
```

### Row Level Security (RLS)

Activo en todas las tablas. Solo usuarios autenticados pueden operar:

```sql
CREATE POLICY "solo_auth" ON trabajos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- IMPORTANTE: RLS no es suficiente — también hay que dar GRANT explícito
GRANT ALL ON public.clientes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.clientes_id_seq TO authenticated;
```

### Rate limits de seguridad configurados (v7.6)

| Límite | Valor configurado | Razón |
|---|---|---|
| Sign-ups and sign-ins | 5 cada 5 min | Solo 2 usuarios legítimos |
| Token refreshes | 10 cada 5 min | Consumo de cuota controlado |
| Anonymous users | Desactivado | No se usa login anónimo |
| Captcha | Pendiente Fase 3 | Requiere cuenta hCaptcha |

---

## 5. Módulo a módulo

### Módulo 1 — Formulario de captura (7 pasos)

Estado del formulario en el objeto global `form`:
```javascript
let form = {
  cliente: '', obra: '', direccion: '', zona: '',
  lat: null, lng: null,
  tipos: [], maquinarias: [],
  horas: 4, urgencia: 'Normal', notas: ''
};
```

Funciones clave:
- `showStep(n)` — muestra el paso n, oculta el resto
- `nextStep(current)` / `prevStep(current)` — navegación entre pasos
- `buildChips()` — construye los botones de selección de tipos y maquinaria
- `selectChipMulti(field, val, el)` — toggle de un chip (añade/quita del array)
- `guardarTrabajo()` — construye el objeto trabajo, llama a `addTrab()` y resetea
- `resetForm()` — limpia todo el formulario

### Módulo 2 — Listado

`renderListado()` es la función central. Genera el HTML completo del listado según:
- `ltabActual` — pestaña activa ('pendientes' | 'programados' | 'realizados')
- Filtros activos (zona, maquinaria, texto libre)
- `realizadosMesOffset` — mes visible en la pestaña Realizados (0 = mes actual)

**Detección de fechas pasadas:**
```javascript
const hoyISO = fechaISO(new Date());
const esFechasPasadas = t.estado === 'Programado' &&
  t.diasProgramados && t.diasProgramados.length > 0 &&
  t.diasProgramados.every(d => d < hoyISO);
```
Si `esFechasPasadas` es true, la tarjeta muestra el badge naranja y el botón "↩ Quitar del calendario".

### Módulo 3 — Vista Mes + Programación

Variables de estado del módulo:
```javascript
let mesOffset = 0;           // 0 = mes actual, -1 = anterior, +1 = siguiente
let mesFiltroMaq = '';       // '' = todas las máquinas
let progTrabajoId = null;    // ID del trabajo en modo programación activa (null = ninguno)
let progDias = [];           // Días seleccionados en modo programación
let progOperarios = [];      // Operarios seleccionados
```

Funciones clave:
- `renderMes()` — genera el grid mensual completo con píldoras
- `renderBolsa()` — genera la bolsa de trabajos Aceptados sin fecha
- `activarProgramacion(id)` — activa el modo programación para un trabajo
- `cancelarProgramacion()` — cancela sin guardar
- `toggleDiaProg(iso)` — marca/desmarca un día en modo programación
- `confirmarProgramar()` — guarda los días y operarios, llama a `updateTrab()`
- `abrirDetalle(id)` — abre el modal de detalle al tocar una píldora

> **Importante**: cualquier función que modifique `diasProgramados` debe llamar a `renderMes()` después para que el calendario se actualice. Funciones que lo hacen: `guardarEdicionTrabajo()`, `quitarDelCalendario()`, `confirmarProgramar()`, `desprogramarDesdeDetalle()`.

### Módulo 4 — Vista Hoy (operario)

`renderOperario()` muestra los trabajos del operario seleccionado para los próximos 7 días. Agrupa por fecha. Solo muestra días con trabajos.

`opMarcarRealizado(id)` → abre `abrirModalRealizadoPorId(id)` → al confirmar llama a `confirmarRealizado()`.

### Módulo 5 — Configuración

Clientes: `cfgAddCliente()`, `cfgEliminarCliente()`, `renderCfgClientes()`, `abrirEditarCliente()`, `guardarEdicionCliente()`.

Dropdown de clientes en el formulario: `toggleClienteDropdown()`, `buildClienteDropdown()`, `seleccionarCliente()`, `mostrarNuevoClienteInline()`, `guardarClienteNuevo()`.

Config general: `cfgAdd(key)`, `cfgToggleItem(key, idx)`, `cfgDel(key, idx)`, `cfgAddSin(item)`, `cfgDelSin(item, sin)`.

### Módulo 6 — Informes

`exportarInformeCSV()` — exporta el rango de fechas seleccionado como CSV.
`enviarInformePorEmail()` — envía el informe del mes visible vía EmailJS.
`exportarTrabajoCSV(id)` — exporta un único trabajo como CSV.
`exportarJSON()` / `importarJSON(input)` — backup completo.

---

## 6. El sistema de voz

Basado en `Web Speech API` (`webkitSpeechRecognition`). Solo funciona en Chrome/Safari con HTTPS.

```javascript
function startVoice(field, btnId, resId) {
  // Crea o reutiliza la instancia recognition
  // Al recibir resultado llama a processVoice(field, texto)
}

function processVoice(field, texto) {
  // Según 'field', procesa el texto y actualiza form o chips
  // Devuelve { ok: boolean, msg: string }
}

function matchSinonimo(field, texto, chipsId) {
  // Busca coincidencias con sinónimos configurados
  // Activa los chips correspondientes
}
```

Cada tipo de trabajo y máquina tiene sinónimos configurables en Supabase. Por ejemplo, "retro" o "giratorio" activan el Volvo giratorio.

---

## 7. El mapa y el GPS

Leaflet + OpenStreetMap. Se inicializa una sola vez con `inicializarMapa()` y se reutiliza.

```javascript
function abrirMapaGPS() {
  // Pide permiso GPS → centra el mapa → pone marcador arrastrable
}

function aceptarMapa() {
  // Toma las coordenadas del marcador
  // Llama a Nominatim para obtener la dirección textual
  // Guarda en form.lat, form.lng, form.direccion, form.zona
}
```

`mapsLink(t)` genera la URL de Google Maps para un trabajo (por GPS si hay coordenadas, o por dirección texto si no).

---

## 8. Flujo de una acción

### Ejemplo: cambiar la fecha de un trabajo programado

```
Usuario pulsa ✏ Editar en una tarjeta del listado
    ↓
abrirEditarTrabajo(id)
    ↓
Carga datos en el modal: _edFecha = primer día de diasProgramados
    ↓
edRenderFecha() — muestra la fecha actual en el bloque "Fecha actual"
    ↓
Usuario selecciona nueva fecha en el picker y pulsa "Cambiar"
    ↓
edFechaCambiar()
    ├── Valida: fecha >= hoy
    ├── Comprueba carga del día: trabajosDia.length >= 2 → aviso confirm nativo
    │     ├── Aceptar (elegir otra fecha) → limpia picker, espera
    │     └── Cancelar (volver a la bolsa) → updateTrab() [estado=Aceptado, diasProgramados=[]]
    │                                       → renderListado() + renderMes() + showView('mes')
    └── Sin conflicto → _edFecha = val, edRenderFecha() [muestra nueva fecha]
    ↓
Usuario pulsa "✓ Guardar cambios"
    ↓
guardarEdicionTrabajo()
    ├── t.diasProgramados = _edFecha ? [_edFecha] : []
    ├── Ajusta estado si es necesario (Aceptado↔Programado)
    ├── await updateTrab(t) → Supabase PATCH + _trabCache update
    ├── renderListado()
    └── renderMes()   ← crítico: actualiza el calendario al instante
```

### Ejemplo: programar un trabajo desde el calendario

```
Usuario toca un trabajo en la bolsa
    ↓
activarProgramacion(id) → progTrabajoId = id, actualizarBarraProgramar()
    ↓
Usuario toca días en el grid
    ↓
toggleDiaProg(iso) → valida que no sea pasado → progDias.push/filter
    ↓
Usuario selecciona operario(s) en la barra fija
    ↓
confirmarProgramar()
    ├── t.diasProgramados = progDias
    ├── t.operarios = progOperarios
    ├── t.estado = 'Programado'
    ├── await updateTrab(t)
    ├── cancelarProgramacion()
    └── renderMes() + renderBolsa()
```

---

## 9. Decisiones técnicas

### ¿Por qué sin SDK de Supabase?

El SDK oficial no es compatible con las claves `sb_publishable_`. Se usa `fetch` nativo que funciona con cualquier clave.

### ¿Por qué 3 archivos separados desde v7.4?

Un solo archivo con HTML + CSS + JS de 3.500+ líneas era imposible de editar en GitHub directamente. La separación permite:
- Editar solo el CSS sin tocar la lógica
- Ver el HTML de las vistas limpio
- El JS puede abrirse y buscarse más fácilmente

La separación no afecta al rendimiento — el navegador hace 3 peticiones en lugar de 1.

### ¿Por qué `renderMes()` debe llamarse tras cada cambio de fechas?

El calendario genera HTML estático en cada llamada a `renderMes()`. No hay reactividad. Si un trabajo cambia su `diasProgramados` sin llamar a `renderMes()`, el grid sigue mostrando los datos viejos. Funciones que modifican fechas y deben llamar a `renderMes()`:
- `guardarEdicionTrabajo()`
- `quitarDelCalendario()`
- `confirmarProgramar()`
- `desprogramarDesdeDetalle()`
- `edFechaCambiar()` (rama "volver a la bolsa")

### ¿Por qué la programación está en la vista Mes y no en un modal?

Hasta v7.0 había un modal flotante con navegación de semana. Se eliminó en v7.1 porque:
- Duplicaba la lógica de `renderMes`
- El usuario no veía el contexto del mes mientras programaba
- La vista Mes ya tiene toda la información necesaria

### ¿Por qué `_edFecha` (singular) en lugar de `_edFechas` (array)?

Hasta v7.5 el modal de editar trabajo tenía chips de múltiples fechas. Desde v7.6 se cambió a fecha única porque:
- La necesidad real es "cambiar el día de este trabajo" — no añadir varios días
- El selector de fecha única con min=hoy es más claro en móvil
- Elimina la confusión de añadir/quitar chips

Si en el futuro un trabajo debe ejecutarse en varios días no consecutivos, se puede volver a array.

### ¿Por qué `GRANT ALL` además de RLS?

RLS controla *qué filas* puede ver/modificar cada usuario. `GRANT` controla *qué operaciones* puede hacer el rol en la tabla. Supabase requiere ambos. Aprendido en producción al crear la tabla `clientes`.

---

## 10. Cómo modificar cosas sin romper nada

### Añadir un campo nuevo a los trabajos

1. Añadir columna en Supabase:
   ```sql
   ALTER TABLE public.trabajos ADD COLUMN IF NOT EXISTS nuevo_campo text DEFAULT '';
   ```
2. Añadirlo en `trabajoToRow(t)` (convierte objeto JS → fila Supabase)
3. Añadirlo en `loadTrab()` en el mapeo de fila → objeto JS
4. Añadirlo en el formulario (HTML + `syncField()` o similar)
5. Añadirlo en el resumen del paso 7
6. Añadirlo en el CSV si es relevante

### Añadir un tipo de trabajo o máquina nueva

Desde Configuración en la app — no hace falta tocar el código. Los sinónimos de voz también se gestionan desde ahí.

### Añadir un campo de texto libre con voz

1. Añadir botón `<button onclick="startVoice('campo', 'vbtn-campo', 'vres-campo')">` e input en el HTML
2. Añadir caso en `processVoice(field, texto)`:
   ```javascript
   } else if (field === 'campo') {
     form.campo = texto;
     document.getElementById('f-campo').value = texto;
     return { ok: true, msg: 'Registrado' };
   }
   ```
3. Resetear el campo en `resetForm()`

### Trampas comunes

**Comillas simples en template literals con CSS inline**:
```javascript
// ❌ MAL — rompe el template literal
pill.innerHTML = `<span style="font-family:'Courier New'">texto</span>`;

// ✅ BIEN
pill.innerHTML = `<span style="font-family:monospace">texto</span>`;
```

**IDs como string vs number**:
```javascript
// Supabase devuelve IDs como string, JS los genera como number
// Siempre comparar con String():
const t = trabajos.find(x => String(x.id) === String(id));
```

**`renderMes()` después de cualquier cambio de fechas**:
```javascript
// ❌ MAL — el calendario no se actualiza
await updateTrab(t);
renderListado();

// ✅ BIEN
await updateTrab(t);
renderListado();
renderMes();  // ← siempre
```

**El `<script>` al final del `<body>`**:
```html
<!-- ❌ MAL — el DOM no existe todavía -->
<head>
  <script src="excavaciones_paco.js"></script>
</head>

<!-- ✅ BIEN -->
<body>
  <!-- ... todo el HTML ... -->
  <script src="excavaciones_paco.js"></script>
</body>
```

---

## 11. Autenticación

### Flujo de login

```
App arranca → checkAuth()
    ↓
¿Hay sesión guardada en localStorage ('supa_session')?
    ├── Sí → _refreshSessionIfNeeded() → si token válido → iniciarApp()
    └── No → mostrar pantalla de login

Usuario introduce email + contraseña → hacerLogin()
    ↓
POST a Supabase Auth /auth/v1/token?grant_type=password
    ↓
  Éxito → guardar sesión en localStorage + _session → iniciarApp()
  Error 400 → mostrar "Email o contraseña incorrectos" en pantalla
```

### Variables de sesión

```javascript
let _session = null; // { access_token, refresh_token, expires_at, user: { email } }
```

### Detección automática de sesión expirada

Desde v6.8, cuando cualquier petición a Supabase devuelve `401 JWT expired`, la app lo detecta en el wrapper `supa` y redirige al login automáticamente.

### Credenciales actuales

| Usuario | Email | Contraseña |
|---|---|---|
| Admin (Paco) | paco@excavaciones.com | pacoexcavaciones_2026 |
| Operario | operario@excavaciones.com | operarioexcavaciones_2026 |

---

## 12. Sistema de variables CSS — tema claro

Desde v7.6, todos los colores se definen con variables CSS en `excavaciones_paco.css`. Antes había ~154 colores hardcodeados dispersos.

### Variables principales

```css
:root {
  /* Fondos */
  --bg:           #F5F4F0;   /* fondo principal */
  --card-bg:      #FFFFFF;   /* fondo de tarjetas */
  --chip-bg:      #EDECEA;   /* fondo de chips */

  /* Textos */
  --text:         #1A1A1A;   /* texto principal */
  --text2:        #555555;   /* texto secundario */
  --text3:        #999999;   /* texto terciario / placeholders */

  /* Acento principal */
  --accent:       #FFD100;   /* amarillo EP */
  --accent-dark:  #1A1A1A;   /* texto sobre amarillo */

  /* Bordes */
  --border:       #E0DDD6;

  /* Estados semánticos */
  --success:      #22C55E;
  --success-bg:   #F0FDF4;
  --warning:      #F59E0B;
  --warning-bg:   #FFFBEB;
  --danger:       #EF4444;
  --danger-light: #FEF2F2;
  --info:         #3B82F6;
  --info-bg:      #EFF6FF;
  --info-border:  #BFDBFE;

  /* Calendario */
  --cal-past:      #D1D5DB;  /* días pasados en gris */
  --cal-past-text: #9CA3AF;
}
```

### Cómo cambiar el tema

Para cambiar a cualquier otro color de acento, basta con cambiar `--accent` y `--accent-dark`. Para un tema oscuro, cambiar los valores de `--bg`, `--card-bg`, `--text` y `--text2`.

---

## 13. Sistema de roles — diseño para Fase 3

> No implementado en la versión actual. Diseñado para cuando la app escale a múltiples empresas.

### Roles previstos

| Rol | Quién | Permisos |
|---|---|---|
| **Admin** | Propietario | Todo — crear, presupuestar, programar, informes, gestionar usuarios |
| **Encargado** | Jefe de obra | Crear, programar, ver listado completo, marcar realizados |
| **Operario** | Trabajador | Solo ver sus trabajos del día y marcar realizados |
| **Cliente** | Cliente final | Solo ver estado de sus trabajos (portal cliente futuro) |

### Implementación técnica en Fase 3

```sql
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT CHECK (role IN ('admin','encargado','operario','cliente')),
  empresa_id UUID
);

CREATE POLICY "operario_sus_trabajos" ON trabajos
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM perfiles WHERE role = 'admin')
    OR nombre_operario = (SELECT nombre FROM perfiles WHERE id = auth.uid())
  );
```

### Modelo de negocio SaaS

- **Plan Básico**: 1 Admin + hasta 3 Operarios
- **Plan Pro**: Admin + Encargados + Operarios ilimitados + portal Cliente
- **Plan Enterprise**: multisede, informes avanzados, integración contabilidad

---

## Glosario rápido

| Término | Significado |
|---|---|
| **async/await** | Forma moderna de manejar operaciones que tardan. `async` declara que una función puede tener esperas. `await` espera a que termine antes de continuar. |
| **IIFE** | Función que se ejecuta sola al declararse: `(async () => { ... })()`. Se usa para el arranque de la app. |
| **CDN** | Red de distribución de contenido. Leaflet y Tabler Icons se cargan desde CDN. |
| **REST API** | Interfaz para comunicarse con un servidor mediante peticiones HTTP (GET, POST, PATCH, DELETE). |
| **RLS** | Row Level Security. Sistema de Supabase que controla qué filas puede leer/escribir cada usuario. |
| **JWT** | JSON Web Token. Token firmado que Supabase devuelve al hacer login. Se incluye en cada petición. |
| **refresh_token** | Token de larga duración que permite obtener un nuevo `access_token` sin volver a hacer login. |
| **localStorage** | Almacenamiento del navegador. Persiste entre sesiones. Se usa para guardar `supa_session`. |
| **fetch** | Función nativa de JavaScript para hacer peticiones HTTP. |
| **hoisting** | Las declaraciones `function` se "elevan" al inicio del script. Las `const`/`let` no. |
| **_trabCache** | Variable global que guarda los trabajos en memoria mientras la app está abierta. Evita peticiones repetidas a Supabase. |
| **_edFecha** | Fecha única (ISO string) que se está editando en el modal de editar trabajo. |
| **progTrabajoId** | Variable global que indica qué trabajo está en modo programación activa (null = ninguno). |
| **mesFiltroMaq** | Variable global con el nombre de la máquina filtrada en la vista Mes ('' = todas). |
| **realizadosMesOffset** | Offset del mes visible en la pestaña Realizados (0 = mes actual, -1 = mes anterior...). |

---

## Actualizar la app en producción

```bash
git add .
git commit -m "descripción del cambio"
git push
# Esperar 1-2 minutos
# Probar en https://xabiercons.github.io/ObrasPaco/excavaciones_paco_00.html
# Si el navegador no actualiza, añadir ?v2 al final de la URL
```

---

*Documento actualizado en Junio 2026 · App v7.6*
