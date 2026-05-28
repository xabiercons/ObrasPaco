# Sistema de gestión de trabajos de excavación
**Versión:** 4.0 — Sesión 3 completada  
**Fecha última sesión:** 28/05/2026  
**Estado:** App v4 entregada — GPS corregido, voz pendiente de GitHub Pages

---

## Contexto

Herramienta para gestionar trabajos de excavación (encargado + 1-3 operarios).  
Más de 30 trabajos activos simultáneos. Actualmente todo en la cabeza y llamadas.  
Prioridad: listado vivo filtrable + captura rápida en obra + vista operario para el día.

---

## Archivos entregados

| Archivo | Descripción | Versión |
|---|---|---|
| `excavaciones_paco_v4.html` | App principal — usar este | v4 — ACTUAL |
| `guion_excavaciones_v4.md` | Este archivo | v4 — ACTUAL |

> ⚠ Usar siempre la versión más alta. Las versiones anteriores quedan obsoletas.

---

## Flujo de estados de un trabajo

```
Visita obra → Captura voz + mapa GPS
      ↓
  PENDIENTE PRESUPUESTAR  ← estado inicial al guardar
      ↓
  PRESUPUESTADO (con importe)
      ↓
  ACEPTADO (entra en la bolsa de trabajos)
      ↓
  PROGRAMADO (se asigna día + operario + urgencia)
      ↓
  EN CURSO → REALIZADO (sale de la programación)
```

---

## Módulos — estado de desarrollo

### ☑ Módulo 1 — Captura de trabajo (encargado, en obra) — v3 ACTUALIZADO

Asistente 7 pasos con barra de progreso.

**Paso 1: Cliente** — voz o escritura  
**Paso 2: Ubicación** — mapa Leaflet interactivo (ver detalle abajo)  
**Paso 3: Tipo de trabajo** — selección **múltiple** (chips táctiles o voz). Antes era selección única.  
**Paso 4: Maquinaria** — selección **múltiple** (chips táctiles o voz). Antes era selección única.  
**Paso 5: Horas previstas** — voz o botones +/-  
**Paso 6: Urgencia** (Normal / Alta / Urgente) + notas libres por voz  
**Paso 7: Resumen** — revisa y confirma → guarda

**Pendiente validar:** comportamiento del micrófono en obra real — voz sigue sin funcionar desde `file://`, pendiente subida a GitHub Pages.

---

### Detalle paso 2 — Mapa de ubicación (corregido en v4)

Comportamiento corregido: el mapa **no se abre hasta tener respuesta del GPS** (o confirmación de fallo). Ya no aparece centrado en Santiago por defecto.

**Caso A — GPS disponible (HTTPS / GitHub Pages):**
1. Pulsar "Localizar en el mapa" → botón muestra "Obteniendo posición…"
2. El navegador pide permiso de ubicación
3. Cuando llegan las coordenadas, el mapa se abre **ya centrado en tu posición** con zoom 17
4. Marcador colocado automáticamente, arrastrable para ajustar
5. Pulsar "Aceptar esta ubicación" → Nominatim rellena dirección y zona

**Caso B — GPS bloqueado (file://) o sin cobertura:**
1. Pulsar "Localizar en el mapa" → espera 8 segundos (timeout)
2. Mapa se abre centrado en Santiago de Compostela (zoom 13)
3. Botón avisa: "GPS no disponible — toca el mapa para marcar"
4. Un toque en el mapa pone el marcador, arrastrable para ajustar
5. Pulsar "Aceptar" → Nominatim rellena dirección y zona

**Solución definitiva para GPS y voz:** subir a GitHub Pages (HTTPS gratuito). Ver sección "Pasos para subir a GitHub Pages" más abajo.

---

### ☑ Módulo 2 — Listado vivo (encargado) — CONSTRUIDO (sin cambios en v3)
- Filtros: zona · maquinaria · dirección/cliente (búsqueda en tiempo real)
- Agrupado por maquinaria
- Tabs: Pendientes · Programados · Realizados
- Avance de estado con un toque
- Botón directo "Realizado" en cualquier momento
- Stats: total · activos · horas previstas · realizados
- **Pendiente validar:** filtros con datos reales, agrupación útil en campo

---

### ☑ Copia de seguridad — CONSTRUIDA (sin cambios en v3)
- Botón Exportar → descarga JSON con fecha en el nombre en la carpeta Descargas
- Botón Importar → fusiona sin duplicar (detecta por ID)
- Flujo operario Fase 1: exporta JSON al final del día → manda por WhatsApp → encargado importa

**Cómo mover el backup a Google Drive:**
1. Pulsar "Exportar datos" → el archivo va a la carpeta **Descargas** del teléfono
2. Abrir la app **Google Drive**
3. Pulsar el **+** → "Subir" → buscar en Descargas el archivo `excavaciones_paco_FECHA.json`
4. Queda guardado en Drive, accesible desde cualquier dispositivo

---

### ☐ Módulo 3 — Programación semanal (encargado) — PENDIENTE
- Vista semana actual
- Arrastrar trabajos aceptados a un día concreto
- Asignar operario en el momento de programar
- Al marcar realizado → sale de la programación automáticamente
- **Requiere:** validar primero módulos 1 y 2 con datos reales

### ☐ Módulo 4 — Vista operario — PENDIENTE
- Trabajos programados hoy para todo el equipo
- Agrupados por maquinaria
- Un solo botón: marcar realizado
- Sin acceso a formularios ni configuración

### ☐ Módulo 5 — Configuración (encargado) — PENDIENTE
- Editar listas: maquinaria · tipos de trabajo · zonas
- Sinónimos por valor para reconocimiento de voz
- Exportar datos a CSV

---

## Listas iniciales (editables en Módulo 5 cuando esté construido)

### Maquinaria
- Minipala JCB
- Volvo giratorio
- Camión contenedor
- Niveladora
- Manual

### Tipos de trabajo
- Excavación · Picado · Carga escombro · Zanjas · Nivelación · Limpieza solar

### Palabras clave / sinónimos (detección por voz)

| Valor | Sinónimos reconocidos |
|---|---|
| Minipala JCB | mini, JCB, pala pequeña, minipala |
| Volvo giratorio | volvo, retro, giratorio, excavadora |
| Camión contenedor | camión, contenedor, volquete |
| Niveladora | niveladora, motoniveladora |
| Excavación | excavar, abrir, cimientos, zanja |
| Picado | picar, romper, demoler |
| Carga escombro | escombro, retirar, carga, llevar |
| Urgente | urgente, para ya, antes de todo |

---

## Decisiones técnicas tomadas

| Decisión | Opción elegida | Motivo |
|---|---|---|
| Tecnología | HTML + JS en un archivo | Sin instalación, funciona en Chrome móvil |
| Persistencia Fase 1 | localStorage del navegador | Gratis, sobrevive a cerrar Chrome |
| Transcripción voz | Web Speech API (Chrome) | Gratuita — solo funciona con HTTPS, pendiente |
| Extracción campos | Sinónimos hardcodeados | Simple, sin coste de API |
| Mapa de ubicación | Leaflet + OpenStreetMap | Gratuito, funciona desde file:// |
| Geocodificación inversa | Nominatim (OpenStreetMap) | Gratuita, sin clave de API |
| Selección tipo/maquinaria | Chips de selección múltiple | Un trabajo puede necesitar varios tipos o máquinas |
| Backup | Exportar/importar JSON | Sin servidor, manual pero funcional |
| Quién introduce trabajos | Solo el encargado | Simplifica la interfaz |
| Vista operario Fase 1 | Mismo archivo, el encargado controla | Suficiente para validar |
| Sincronización Fase 1 | Manual vía JSON por WhatsApp | Workaround hasta Fase 2 |

---

## Limitación conocida: voz en Android

La Web Speech API (transcripción de voz) requiere HTTPS en Chrome Android. Desde `file://` no funciona. Opciones:

1. **Corto plazo:** usar los chips táctiles y la escritura manual (funciona perfectamente)
2. **Medio plazo:** alojar el HTML en GitHub Pages (gratuito, HTTPS automático) → voz y GPS funcionan
3. **Largo plazo:** Fase 2 con Supabase, ya en web con HTTPS

---

## Fases del proyecto

| Fase | Descripción | Coste | Estado |
|---|---|---|---|
| 1 | HTML local — prueba real en móvil | 0€ | 🔧 En pruebas |
| 1b | HTML en GitHub Pages — HTTPS gratuito, voz y GPS activados | 0€ | ☐ Opcional, fácil |
| 2 | Web con Supabase — datos compartidos en tiempo real | ~10€/mes | ☐ Pendiente validación Fase 1 |
| 3 | ERP completo — clientes, presupuestos PDF, facturación | A definir | ☐ Pendiente |

---

## Pruebas a realizar antes de la próxima sesión

### Obligatorias
- [ ] Abrir `excavaciones_paco_v4.html` en Chrome del móvil
- [ ] Pulsar "Localizar en el mapa" en el paso 2 — comprobar que el mapa aparece centrado en tu posición real (no en Santiago)
- [ ] Si el GPS no llega (file://), comprobar que después de 8 segundos abre el mapa en Santiago y puedes tocar para marcar
- [ ] Comprobar que el marcador es arrastrable en ambos casos
- [ ] Verificar que Nominatim rellena bien dirección y zona al aceptar

### Para la próxima sesión
- [ ] Crear cuenta en github.com y subir el archivo (ver sección "Pasos para subir a GitHub Pages")
- [ ] Una vez en GitHub Pages, comprobar que el GPS funciona directamente al abrir el mapa
- [ ] Una vez en GitHub Pages, probar el micrófono en un paso cualquiera

---

## Preguntas para la próxima sesión

- ¿El mapa abre ya centrado en tu posición o sigue en Santiago?
- ¿Conseguiste subir el archivo a GitHub Pages?
- ¿La voz funciona desde GitHub Pages?
- ¿Qué maquinaria o tipos de trabajo hay que añadir a las listas?
- ¿Seguimos con el Módulo 3 (programación semanal) o hay algo urgente a corregir antes?

---

## Pasos para subir a GitHub Pages (hacer una vez)

1. Entrar en **github.com** → crear cuenta gratuita (si no tienes)
2. Pulsar **"New repository"** → ponerle nombre (ej: `excavaciones`) → crear
3. Pulsar **"Add file" → "Upload files"** → arrastrar el archivo HTML
4. Ir a **Settings → Pages → Source: main / root** → Guardar
5. GitHub te da la URL: `https://tuusuario.github.io/excavaciones/`
6. Abrir esa URL en el móvil → guardar como acceso directo en el escritorio

**Cada vez que haya una versión nueva:**
- Entrar al repositorio → "Add file" → "Upload files" → subir el nuevo HTML → confirmar

---

## ☐ Pendiente — Manual de usuario

Manual completo a redactar cuando los módulos principales estén validados. Contenido previsto:
- Cómo añadir un trabajo nuevo (7 pasos)
- Cómo usar el mapa GPS
- Cómo avanzar estados (presupuestar → aceptar → programar → realizado)
- Cómo hacer la copia de seguridad y subirla a Drive
- Cómo filtrar el listado
- Vista de la semana (cuando esté construido el Módulo 3)
- Vista del operario (cuando esté construido el Módulo 4)

---

| Sesión | Fecha | Trabajado | Resultado |
|---|---|---|---|
| 1 | 25/05/2026 | Diseño completo, Módulo 1 captura, Módulo 2 listado, backup, tema Caterpillar, documentación | App v2 entregada lista para prueba real |
| 3 | 28/05/2026 | Corrección GPS (mapa se abre tras respuesta GPS, no antes), refactorización función en 4 partes limpias, decisión GitHub Pages para voz, nota manual de usuario | App v4 entregada — GPS corregido |
