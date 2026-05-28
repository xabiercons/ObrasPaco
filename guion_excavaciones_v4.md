# Sistema de gestión de trabajos de excavación
**Versión:** 4.0 — Sesión 4 completada  
**Fecha última sesión:** 28/05/2026  
**Estado:** App v4 en GitHub Pages — GPS y voz funcionando — Módulo 3 construido, pendiente prueba real

---

## Contexto

Herramienta para gestionar trabajos de excavación (encargado + 1-3 operarios).  
Más de 30 trabajos activos simultáneos. Actualmente todo en la cabeza y llamadas.  
Prioridad: listado vivo filtrable + captura rápida en obra + vista operario para el día.

---

## URL de la app (GitHub Pages)

```
https://xabiercons.github.io/ObrasPaco/excavaciones_paco_v4.html
```

Acceso directo guardado en el escritorio del móvil. GPS y voz activos desde esta URL.

**Para actualizar la app:** github.com/xabiercons/ObrasPaco → "Add file" → "Upload files" → subir nuevo HTML → "Commit changes". En 1-2 minutos activo.

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
  PROGRAMADO (se asigna día + operario en vista Semana)
      ↓
  EN CURSO → REALIZADO (sale de la programación automáticamente)
```

---

## Módulos — estado de desarrollo

### ☑ Módulo 1 — Captura de trabajo (encargado, en obra) — VALIDADO EN OBRA

Asistente 7 pasos con barra de progreso.

**Paso 1: Cliente** — voz o escritura  
**Paso 2: Ubicación** — mapa Leaflet. GPS centra el mapa en la posición real al abrirlo. Marcador arrastrable para ajustar. Nominatim rellena dirección y zona automáticamente.  
**Paso 3: Tipo de trabajo** — selección múltiple (chips táctiles o voz)  
**Paso 4: Maquinaria** — selección múltiple (chips táctiles o voz)  
**Paso 5: Horas previstas** — voz o botones +/-  
**Paso 6: Urgencia** (Normal / Alta / Urgente) + notas libres por voz  
**Paso 7: Resumen** — revisa y confirma → guarda

**Voz:** funciona desde GitHub Pages. Permanece escuchando hasta que el usuario la para. Se reinicia automáticamente si hay pausa larga.

---

### ☑ Módulo 2 — Listado vivo (encargado) — CONSTRUIDO Y VALIDADO

- Filtros: zona · maquinaria · dirección/cliente (búsqueda en tiempo real)
- Agrupado por maquinaria
- Tabs: Pendientes · Programados · Realizados
- Avance de estado con confirmación previa en todos los cambios
- Botón "Realizado" con aviso explícito de que no se puede deshacer
- Stats: total · activos · horas previstas · realizados

---

### ☑ Módulo 3 — Programación semanal — CONSTRUIDO, pendiente prueba real

Vista de 7 columnas (lunes a domingo) con navegación entre semanas.

**Flujo:**
1. Los trabajos sin días asignados aparecen en la **bolsa de pendientes** (parte inferior)
2. Tocar un trabajo de la bolsa → modal para seleccionar día(s) y operario(s)
3. El trabajo aparece en el calendario como píldora de color según urgencia
4. Tocar una píldora → modal de detalle con opción de marcar Realizado o quitar de la semana
5. Al marcar Realizado → desaparece del calendario automáticamente

**Operarios configurados en el código** (hasta Módulo 5): Paco, Operario 2, Operario 3, Operario 4  
**Pendiente validar:** flujo completo con datos reales en obra

---

### ☑ Copia de seguridad — CONSTRUIDA Y VALIDADA

- Botón Exportar → descarga JSON con fecha en el nombre (carpeta Descargas)
- Botón Importar → fusiona sin duplicar (detecta por ID)

**Cómo mover el backup a Google Drive:**
1. Pulsar "Exportar datos" → archivo va a **Descargas** del teléfono
2. Abrir **Google Drive** → "+" → "Subir" → buscar el archivo en Descargas
3. Queda guardado en Drive, accesible desde cualquier dispositivo

---

### ☐ Módulo 4 — Vista operario — PENDIENTE
- Trabajos programados hoy para todo el equipo
- Agrupados por maquinaria
- Un solo botón: marcar realizado
- Sin acceso a formularios ni configuración

### ☐ Módulo 5 — Configuración (encargado) — PENDIENTE
- Editar listas: maquinaria · tipos de trabajo · zonas · operarios
- Sinónimos por valor para reconocimiento de voz
- Exportar datos a CSV

---

## Listas iniciales (editables en el código hasta que exista Módulo 5)

### Maquinaria
- Minipala JCB · Volvo giratorio · Camión contenedor · Niveladora · Manual

### Tipos de trabajo
- Excavación · Picado · Carga escombro · Zanjas · Nivelación · Limpieza solar

### Operarios (en variable OPERARIOS del JS)
- Paco · Operario 2 · Operario 3 · Operario 4

### Sinónimos de voz

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
| Hosting | GitHub Pages (HTTPS gratuito) | Activa GPS y voz, sin coste |
| Persistencia Fase 1 | localStorage del navegador | Gratis, sobrevive a cerrar Chrome |
| Transcripción voz | Web Speech API (Chrome) | Gratuita, requiere HTTPS — activa desde GitHub Pages |
| Extracción campos | Sinónimos hardcodeados | Simple, sin coste de API |
| Mapa de ubicación | Leaflet + OpenStreetMap | Gratuito, funciona desde file:// |
| Geocodificación inversa | Nominatim (OpenStreetMap) | Gratuita, sin clave de API |
| Selección tipo/maquinaria | Chips de selección múltiple | Un trabajo puede necesitar varios tipos o máquinas |
| Backup | Exportar/importar JSON | Sin servidor, manual pero funcional |
| Actualización app | Subir HTML a GitHub manualmente | Simple, 2 minutos por actualización |
| Sincronización Fase 1 | Manual vía JSON por WhatsApp | Workaround hasta Fase 2 |

---

## Capacidad del sistema y mantenimiento

**Límite técnico:** localStorage admite ~5MB (~2.000-3.000 trabajos).  
**Límite práctico:** con más de 300-400 trabajos activos el listado empieza a ir lento en móvil.  
**Para el volumen actual:** la arquitectura aguanta 2-3 años sin problema.

**Mantenimiento cuando los realizados se acumulen:**
1. Exportar el JSON completo → archivar en Drive con la fecha
2. Filtrar el listado por "Realizados" → borrar los más antiguos
3. La app queda limpia; el archivo de Drive conserva el historial

**Cuándo plantearse la Fase 2:** cuando haya más de 300-400 trabajos activos simultáneos o se necesite acceso multiusuario en tiempo real.

---

## Fases del proyecto

| Fase | Descripción | Coste | Estado |
|---|---|---|---|
| 1 | HTML local — prueba real en móvil | 0€ | ✓ Superada |
| 1b | HTML en GitHub Pages — HTTPS, voz y GPS | 0€ | ✓ Activo |
| 2 | Web con Supabase — datos compartidos en tiempo real | ~10€/mes | ☐ Pendiente validación Fase 1 |
| 3 | ERP completo — clientes, presupuestos PDF, facturación | A definir | ☐ Pendiente |

---

## Pruebas a realizar antes de la próxima sesión

- [ ] Subir `excavaciones_paco_v4.html` a GitHub (Add file → Upload → Commit)
- [ ] Probar el Módulo 3 (vista Semana) con trabajos reales: programar, ver en calendario, marcar realizado
- [ ] Comprobar que al marcar Realizado desde el calendario desaparece correctamente
- [ ] Comprobar que "Quitar de la semana" devuelve el trabajo a la bolsa de pendientes
- [ ] Anotar si los nombres de operarios son correctos o hay que cambiarlos
- [ ] Anotar si falta maquinaria o tipos de trabajo en las listas

---

## Preguntas para la próxima sesión

- ¿El Módulo 3 funciona bien en obra o hay algo que no encaja con el flujo real?
- ¿Los operarios están bien nombrados o hay que cambiarlos?
- ¿Qué es lo que más falta ahora para el día a día?
- ¿Seguimos con el Módulo 4 (vista operario) o hay correcciones urgentes antes?

---

## ☐ Pendiente — Manual de usuario

Manual completo a redactar cuando los módulos principales estén validados. Contenido previsto:
- Cómo añadir un trabajo nuevo (7 pasos)
- Cómo usar el mapa GPS
- Cómo avanzar estados (presupuestar → aceptar → programar → realizado)
- Cómo hacer la copia de seguridad y subirla a Drive
- Cómo filtrar el listado
- Cómo usar la vista semanal (Módulo 3)
- Vista del operario (Módulo 4, cuando esté construido)
- Cómo actualizar la app (subir nuevo HTML a GitHub)
- Cómo crear el acceso directo en el móvil
- **Capacidad y mantenimiento del sistema** (límites, cuándo limpiar realizados, cuándo pasar a Fase 2)

---

## Registro de sesiones

| Sesión | Fecha | Trabajado | Resultado |
|---|---|---|---|
| 1 | 25/05/2026 | Diseño completo, Módulo 1 captura, Módulo 2 listado, backup, tema Caterpillar, documentación | App v2 entregada lista para prueba real |
| 2 | 26/05/2026 | Diagnóstico Android, mapa Leaflet con GPS + draggable + fallback táctil, selección múltiple tipo/maquinaria, instrucciones backup Drive | App v3 entregada — GPS y voz pendientes de HTTPS |
| 3 | 28/05/2026 | Corrección GPS (mapa se abre tras respuesta GPS), GitHub Pages configurado, voz y GPS activos, voz mejorada (sin timeout, se reinicia sola), confirmación en cambios de estado | App v4 en GitHub Pages — GPS y voz funcionando |
| 4 | 28/05/2026 | Módulo 3 programación semanal completo (calendario 7 días, bolsa pendientes, modal programar con días+operarios, modal detalle, realizar/desprogramar), código comentado en español (235 comentarios), nota capacidad sistema en manual | App v4 actualizada — Módulo 3 construido |
