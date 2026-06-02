# Documento Tutor — Excavaciones Paco
**Versión 7.3 · Junio 2026**

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
│   └── Todo el CSS de la app (~750 líneas)
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
    ├── Estado global (variables let: form, progTrabajoId, _session, etc.)
    ├── Wrapper Supabase (objeto supa con select/insert/update/delete)
    ├── Autenticación (login, sesión, refresh token)
    ├── Funciones de almacenamiento de trabajos (loadTrab, addTrab...)
    ├── Módulo 1 — Formulario de captura
    ├── Módulo 2 — Listado
    ├── Módulo 3 — Vista Mes + Programación desde el mes
    ├── Módulo 4 — Vista operario (Hoy)
    ├── Módulo 5 — Configuración (incluye Clientes)
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
3. Estado global (variables let: form, progTrabajoId, _session, _clientesCache, etc.)
4. Wrapper Supabase (objeto supa con select/insert/update/delete)
      ↓ usa _authHeaders() que depende de _session
5. Autenticación — login(), checkAuth(), _refreshSessionIfNeeded()
6. Funciones de almacenamiento de trabajos (loadTrab, addTrab...)
7. Módulos 1-6 (formulario, listado, mes, hoy, config, informe)
8. Arranque — IIFE async: checkAuth() → si autenticado, iniciarApp()
```

> **Regla de oro**: si una función A llama a una función B, B debe estar declarada antes que A, O B debe ser una `function` (no `const`/`let`) porque las `function` se elevan (hoisting) al inicio del script.

---

## 4. Los datos: Supabase

### Qué es Supabase

Supabase es una base de datos PostgreSQL en la nube con una API REST automática. No hace falta escribir un servidor — se hacen peticiones HTTP directamente desde el navegador.

### Tablas en la base de datos

#### `trabajos` — tabla principal (21 columnas)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | serial | Clave primaria autoincremental |
| `cliente` | text | Nombre del cliente |
| `obra` | text | Nombre de la obra (ej: "Desmonte en Santeles") |
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
| `horas_reales` | text | JSON object: `{"Minipala JCB": 5}` |
| `notas_cierre` | text | Notas al marcar como realizado |
| `materiales` | text | Materiales utilizados (texto libre) |
| `jornadas` | text | JSON array de jornadas parciales |

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

La app **no usa el SDK de Supabase**. Usa `fetch` nativo directamente a la REST API. Esto es así porque el SDK es incompatible con las claves `sb_publishable_` que Supabase usa actualmente.

```javascript
// Así se hace una consulta SELECT
const response = await fetch(
  `${SUPA_URL}/rest/v1/trabajos?select=*&order=fecha.desc`,
  { headers: SUPA_HEADERS }
);
const datos = await response.json();
```

### Row Level Security (RLS)

Supabase tiene RLS activado en todas las tablas. La política exige usuario **autenticado** (rol `authenticated`):

```sql
-- Solo usuarios autenticados pueden leer/escribir
CREATE POLICY "solo_auth" ON trabajos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- IMPORTANTE: RLS no es suficiente — también hay que dar GRANT explícito
GRANT ALL ON public.clientes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.clientes_id_seq TO authenticated;
```

> **Truco aprendido en producción**: crear la tabla con RLS no es suficiente. Supabase requiere también `GRANT ALL ... TO authenticated` para que las operaciones funcionen. Sin el GRANT, las peticiones devuelven 400 aunque la política RLS esté bien definida.

---

## 5. Módulo a módulo

### Módulo 1 — Formulario de captura (7 pasos)

**Paso 1 — Cliente + Nombre de obra**

El paso 1 combina dos campos:

- **Selector de cliente**: dropdown con los clientes de la tabla `clientes`. Al tocar → selecciona y rellena `form.cliente`. Opción "Nuevo cliente…" muestra un formulario inline que crea el cliente en Supabase y lo selecciona sin salir del formulario.
- **Nombre de obra**: campo de texto con botón de voz. Libre — ej: "Desmonte en Santeles". Se guarda en `form.obra` y en la columna `obra` de la tabla `trabajos`.

```javascript
// Activar la programación de un trabajo desde la bolsa
function activarProgramacion(id) { ... }

// Seleccionar cliente desde el dropdown
function seleccionarCliente(id) { ... }

// Crear cliente nuevo inline
async function guardarClienteNuevo() { ... }
```

**Pasos 2-7**: ubicación GPS, tipo de trabajo, maquinaria, horas, urgencia+notas, resumen.

### Módulo 3 — Vista Mes y Programación

La programación ya no usa un modal flotante. Se hace directamente sobre el grid mensual:

**Estado de programación** (variables globales):
```javascript
let progTrabajoId = null;   // ID del trabajo que se está programando
let progDias = [];           // Días seleccionados (ISO strings)
let progOperarios = [];      // Operarios seleccionados
```

**Flujo completo**:
1. `activarProgramacion(id)` — toca un trabajo en la bolsa. Activa modo programación. Segundo toque en el mismo trabajo → cancela.
2. `toggleDiaProg(iso)` — toca un día en el grid. Marca/desmarca el día en `progDias`. Llama a `renderMes()` para redibujar y a `actualizarBarraProgramar()`.
3. `actualizarBarraProgramar()` — actualiza la barra fija inferior con nombre, días y chips de operarios.
4. `confirmarProgramar()` — guarda en Supabase, cancela modo programación, redibuja.

**Filtro de maquinaria** (variable global):
```javascript
let mesFiltroMaq = ''; // '' = todas, o nombre de máquina
```
`setMesFiltroMaq(maq)` activa/desactiva el filtro. `renderMes()` lo lee para atenuar píldoras que no coinciden.

### Módulo 6 — Realizados por mes

```javascript
let realizadosMesOffset = 0; // 0 = mes actual, -1 = anterior, +1 = siguiente

function cambiarMesRealizados(dir) {
  realizadosMesOffset += dir;
  renderListado();
}

function _getRangoMesRealizados() {
  // Devuelve { desde, hasta, titulo } para el mes navegado
}
```

En `renderListado()`, si estamos en tab Realizados y no hay rango manual activo (`informe-desde`/`informe-hasta` vacíos), se filtra automáticamente por el mes de `realizadosMesOffset`.

### Módulo 5 — Clientes en Configuración

```javascript
let _clientesCache = null; // [{id, nombre, telefono, observaciones}]

async function cfgAddCliente()       // Añadir desde Configuración
async function cfgEliminarCliente(id) // Eliminar con confirmación
function renderCfgClientes()          // Dibujar lista en Configuración
```

Los clientes se cargan en `loadConfig()` junto al resto de configuración, en la misma llamada paralela con `Promise.all`.

---

## 6. El sistema de voz

La voz funciona con `webkitSpeechRecognition` (Web Speech API). Requiere HTTPS y permiso de micrófono.

### Campos con voz disponibles

| Campo | ID botón | Tipo |
|---|---|---|
| Nombre de obra | `vbtn-obra` | Texto libre |
| Dirección | `vbtn-2` | Texto libre |
| Tipo de trabajo | `vbtn-3` | Matching por sinónimos |
| Maquinaria | `vbtn-4` | Matching por sinónimos |
| Horas | `vbtn-5` | Extracción de número |
| Notas | `vbtn-6` | Texto libre |

### Cómo funciona `processVoice(field, texto)`

```javascript
function processVoice(field, texto) {
  if (field === 'obra') {
    form.obra = texto;
    document.getElementById('f-obra').value = texto;
    return { ok: true, msg: 'Nombre de obra registrado' };
  } else if (field === 'cliente') { ... }
  else if (field === 'tipo') { return matchSinonimo('tipos', t, 'chips-tipo'); }
  // etc.
}
```

El feedback visual usa tres clases CSS:
- `.vr-interim` — gris, texto provisional mientras escucha
- `.vr-ok` — verde, reconocimiento exitoso
- `.vr-err` — rojo, no se reconoció

---

## 7. El mapa y el GPS

Leaflet.js renderiza el mapa en el paso 2 del formulario. El marcador es arrastrable — al soltarlo, Nominatim hace geocodificación inversa y rellena automáticamente la dirección.

```javascript
// Al arrastrar el marcador:
marker.on('dragend', async () => {
  const { lat, lng } = marker.getLatLng();
  form.lat = lat; form.lng = lng;
  const dir = await geocodificarInverso(lat, lng);
  form.direccion = dir.display_name;
  form.zona = dir.suburb || dir.village || dir.town || '';
});
```

---

## 8. Flujo de una acción

### Crear un trabajo nuevo

```
Usuario rellena formulario (7 pasos)
    ↓
Paso 1: selecciona cliente del dropdown (o crea inline)
    ↓ form.cliente = nombre, form.obra = nombre obra
Paso 2: GPS → marcador en mapa → Nominatim → dirección
    ↓ form.lat, form.lng, form.direccion, form.zona
Pasos 3-6: tipos, maquinaria, horas, urgencia, notas
    ↓ form.tipos[], form.maquinarias[], form.horas, form.urgencia
Paso 7: Resumen → botón "Guardar trabajo"
    ↓
addTrab(form) → fetch POST a Supabase /rest/v1/trabajos
    ↓
loadTrab() → recarga todos los trabajos en _trabCache
    ↓
showView('listado') → renderListado()
```

### Programar un trabajo

```
Vista Mes → bolsa de pendientes
    ↓
Toca trabajo → activarProgramacion(id)
    ↓ progTrabajoId = id, progDias = [], progOperarios = []
    ↓ renderBolsa() (resalta trabajo activo)
    ↓ renderMes() (días clicables, clase prog-disponible)
    ↓ actualizarBarraProgramar() (muestra barra fija abajo)

Toca día en el grid → toggleDiaProg(iso)
    ↓ progDias.push(iso) o filter out
    ↓ renderMes() (día marcado con clase prog-sel)
    ↓ actualizarBarraProgramar() (actualiza texto días)

Selecciona operarios en la barra → progOperarios.push/filter
    ↓ actualizarBarraProgramar() (chip resaltado)

Botón "Programar" → confirmarProgramar()
    ↓ t.diasProgramados = progDias, t.operarios = progOperarios
    ↓ t.estado = 'Programado'
    ↓ cancelarProgramacion() (limpia estado)
    ↓ updateTrab(t) → fetch PATCH a Supabase
    ↓ loadTrab() → renderMes() + renderBolsa()
```

### Marcar un trabajo como realizado

```
Tarjeta de trabajo → botón "✓ Realizado"
    ↓
abrirModalRealizadoPorId(id)
    ↓ _mrealMaquinas = copia de t.maquinarias (editable)
    ↓ renderMrealMaquinas() → inputs de horas + selector añadir/quitar
    ↓ modal-realizado.show

Usuario edita maquinaria (quita ✕ o añade desde selector)
    ↓ mrealQuitarMaq(idx) / mrealAddMaq()
    ↓ renderMrealMaquinas() en tiempo real

Botón "Confirmar Realizado" → confirmarRealizado()
    ↓ horasReales = { maq: horas } por cada _mrealMaquinas[i]
    ↓ t.maquinarias = _mrealMaquinas (actualiza si cambió)
    ↓ t.materiales = textarea materiales
    ↓ t.notasCierre = textarea notas
    ↓ t.estado = 'Realizado', t.fechaRealizado = hoy
    ↓ updateTrab(t) → fetch PATCH a Supabase
```

---

## 9. Decisiones técnicas

### ¿Por qué sin SDK de Supabase?

El SDK oficial de Supabase no es compatible con las claves `sb_publishable_` que emite actualmente. Se usa `fetch` nativo que funciona con cualquier clave.

### ¿Por qué un solo archivo?

Para esta fase del proyecto (MVP en producción con un único cliente), la ventaja de cero instalación y actualización en 2 minutos supera el coste de mantenimiento. En Fase 3, con Next.js, se separa en componentes.

### ¿Por qué Leaflet en lugar de Google Maps?

Leaflet + OpenStreetMap + Nominatim son completamente gratuitos y sin límites de uso. Google Maps requiere tarjeta de crédito y tiene coste por número de peticiones.

### ¿Por qué la programación está en la vista Mes y no en un modal?

Hasta v7.0 había un modal flotante con navegación de semana. Se eliminó en v7.1 porque:
- Duplicaba la lógica de `renderMes`
- El usuario no veía el contexto del mes mientras programaba
- La vista Mes ya tiene toda la información necesaria

El código resultó más corto (el modal era ~80 líneas eliminadas).

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

### Añadir un campo de texto libre con voz

1. Añadir botón `<button class="voice-btn" onclick="startVoice('campo', 'vbtn-campo', 'vres-campo')">` e input en el HTML
2. Añadir caso en `processVoice(field, texto)`:
   ```javascript
   } else if (field === 'campo') {
     form.campo = texto;
     document.getElementById('f-campo').value = texto;
     return { ok: true, msg: 'Registrado' };
   }
   ```
3. Resetear el campo en `resetForm()`

### Añadir un cliente desde Configuración

`cfgAddCliente()` lee los inputs `inp-cliente-nombre`, `inp-cliente-tel`, `inp-cliente-obs`, llama a `_saveClienteSupabase()` y actualiza `_clientesCache`.

### Trampas comunes

**Comillas simples en template literals con CSS inline**:
```javascript
// ❌ MAL — rompe el template literal
pill.innerHTML = `<span style="font-family:'Courier New'">texto</span>`;

// ✅ BIEN — usar monospace sin comillas o escapar
pill.innerHTML = `<span style="font-family:monospace">texto</span>`;
// O en cadena con comillas simples:
pill.innerHTML = '<span style="font-family:\'Courier New\'">texto</span>';
```

**IDs como string vs number**:
```javascript
// Supabase devuelve IDs como string, JS los genera como number
// Siempre comparar con String():
const t = trabajos.find(x => String(x.id) === String(id));
```

**Funciones async en handlers**:
```javascript
// Si la función usa await showConfirm(), debe ser async
async function confirmarAlgo() {
  const ok = await showConfirm('¿Seguro?', 'No se puede deshacer');
  if (!ok) return;
  // ...
}
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

Usuario introduce email + contraseña → login()
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

### Cambiar contraseña en Supabase

Si las credenciales no funcionan (emails ficticios, sin acceso al buzón):
```sql
UPDATE auth.users
SET encrypted_password = crypt('nueva_contraseña', gen_salt('bf'))
WHERE email = 'usuario@ejemplo.com';
```

### Credenciales actuales

| Usuario | Email | Contraseña |
|---|---|---|
| Admin (Paco) | paco@excavaciones.com | pacoexcavaciones_2026 |
| Operario | operario@excavaciones.com | operarioexcavaciones_2026 |

---

## 12. Sistema de roles — diseño para Fase 3

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
| **cache en memoria** | Variables como `_trabCache`, `_clientesCache` que guardan datos mientras la app está abierta. |
| **progTrabajoId** | Variable global que indica qué trabajo está en modo programación activa (null = ninguno). |
| **mesFiltroMaq** | Variable global con el nombre de la máquina filtrada en la vista Mes ('' = todas). |

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

*Documento generado en Junio 2026 · App v7.3*
