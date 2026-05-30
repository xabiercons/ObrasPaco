# Sistema de gestión de trabajos de excavación
**Versión:** 5.1 (con correcciones Módulo 4 pendientes de subir a GitHub)
**Fecha última sesión:** 30/05/2026  
**Estado:** 4 módulos construidos — correcciones Módulo 4 listas pero NO subidas aún a GitHub

---

## ⚠ ACCIÓN PENDIENTE ANTES DE LA PRÓXIMA SESIÓN

El archivo corregido está descargado pero **no subido a GitHub todavía**.

**Para subir:**
1. Descargar `excavaciones_paco_00.html` de esta sesión
2. Ir a `github.com/xabiercons/ObrasPaco`
3. Buscar `excavaciones_paco_00.html` → "..." → "Upload files" → subir → Commit
4. Esperar 1-2 min → recargar en el móvil con Ctrl+Shift+R

**Para verificar que el archivo nuevo está activo:**  
Debe mostrar `GESTIÓN DE OBRAS · v5.1` en el header y la pestaña "Hoy" debe mostrar 7 días agrupados por fecha.

---

## URL de la app

```
https://xabiercons.github.io/ObrasPaco/excavaciones_paco_00.html
```

**Para actualizar:** github.com/xabiercons/ObrasPaco → "Add file" → "Upload files" → subir HTML → "Commit changes". En 1-2 minutos activo.

---

## Archivo activo

| Archivo | Descripción | Estado |
|---|---|---|
| `excavaciones_paco_00.html` | App principal | v5.1 — corregido, pendiente subir |
| `guion_excavaciones_v6.md` | Este archivo | v6 — ACTUAL |

---

## Flujo de estados de un trabajo

```
Visita obra → Captura voz + mapa GPS
      ↓
  PENDIENTE PRESUPUESTAR  ← estado inicial
      ↓
  PRESUPUESTADO
      ↓
  ACEPTADO (entra en bolsa de trabajos)
      ↓
  PROGRAMADO (se asigna día + operario en vista Semana)
      ↓
  REALIZADO (sale de la programación automáticamente)
```

---

## Módulos — estado actual

### ☑ Módulo 1 — Captura de trabajo — VALIDADO EN OBRA
7 pasos: Cliente · Ubicación GPS · Tipo · Maquinaria · Horas · Urgencia+Notas · Resumen  
Voz activa (Web Speech API), mapa Leaflet con GPS, marcador arrastrable, Nominatim para dirección.

### ☑ Módulo 2 — Listado vivo — VALIDADO
Filtros por zona, maquinaria, cliente. Agrupado por maquinaria. Tabs Pendientes/Programados/Realizados.  
Tarjetas: cliente truncado en título, notas en caja colapsable. Stats en cabecera.

### ☑ Módulo 3 — Programación semanal — VALIDADO
- Navegación: píldoras de mes (12 meses) + semanas del mes + flechas ← →
- Modal de programar con navegación de semana propia (independiente del calendario)
- Píldoras en calendario: cliente corto + tipo, color por urgencia
- Bolsa de pendientes en la parte inferior

### ☑ Módulo 4 — Vista operario — CONSTRUIDO, pendiente prueba real tras subir a GitHub

**Lo que hace la versión corregida (v5.1):**
- Pestaña "Hoy" en la barra de navegación
- Selector de operario (botones)
- **Vista de 7 días** desde hoy, con cabecera por día ("HOY" en amarillo, "MAÑANA", luego nombre del día)
- Los días sin trabajos no aparecen
- **Sin duplicados**: una tarjeta por trabajo (maquinaria listada como chip dentro de la tarjeta)
- **Orden por prioridad**: Urgente → Alta → Normal dentro de cada día
- Trabajos sin operario asignado se muestran para todos
- Un botón: ✓ Marcar como realizado → confirmación → desaparece

**Bugs corregidos en esta sesión:**
- Duplicado por agrupación de maquinaria → eliminado
- Solo mostraba "hoy" → ahora muestra 7 días
- `fechaISO` usaba UTC → ahora usa hora local (fix para zona horaria España UTC+2)
- Filtro de operario excluía trabajos sin operario asignado → ahora los muestra para todos

### ☑ Backup — VALIDADO
Exportar JSON (descarga con fecha) · Importar JSON (fusiona sin duplicar)

### ☐ Módulo 5 — Configuración — PENDIENTE
Editar desde la app: maquinaria, tipos de trabajo, zonas, operarios, sinónimos de voz.  
Hasta entonces los operarios se cambian en la línea `const OPERARIOS` del JS (~línea 1229).

### ☐ Módulo 6 — Transcripción IA — PENDIENTE
Claude API para extraer campos de la nota de voz automáticamente.  
Sustituye los sinónimos hardcodeados. Hace la captura mucho más fluida.

---

## Listas configuradas en el código

### Maquinaria
Minipala JCB · Volvo giratorio · Camión contenedor · Niveladora · Manual

### Tipos de trabajo
Excavación · Picado · Carga escombro · Zanjas · Nivelación · Limpieza solar

### Operarios — `const OPERARIOS` en el JS (~línea 1229)
Paco · Operario 2 · Operario 3 · Operario 4

### Sinónimos de voz
| Valor | Sinónimos |
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

## Decisiones técnicas

| Decisión | Opción | Motivo |
|---|---|---|
| Tecnología | HTML + JS en un archivo | Sin instalación, Chrome móvil |
| Hosting | GitHub Pages (HTTPS) | GPS y voz activos, gratuito |
| Persistencia | localStorage | Gratis, sobrevive a cerrar Chrome |
| Voz | Web Speech API (Chrome) | Gratuita, requiere HTTPS |
| Mapa | Leaflet + OpenStreetMap | Gratuito |
| Geocodificación | Nominatim | Gratuita, sin clave API |
| Backup | JSON exportar/importar | Sin servidor |
| Sincronización | Manual JSON por WhatsApp | Workaround hasta Fase 2 |

---

## Capacidad y mantenimiento

- localStorage: ~5MB (~2.000-3.000 trabajos)
- Límite práctico: >300-400 activos empieza a ir lento en móvil
- Arquitectura aguanta 2-3 años para el volumen actual
- Cuando se acumulen realizados: exportar JSON → archivar en Drive → borrar los antiguos

---

## Fases del proyecto

| Fase | Descripción | Coste | Estado |
|---|---|---|---|
| 1 | HTML local | 0€ | ✓ |
| 1b | GitHub Pages — HTTPS, voz, GPS | 0€ | ✓ Activo |
| 2 | Supabase — multiusuario tiempo real | ~10€/mes | ☐ Tras validar Fase 1 |
| 3 | ERP — presupuestos PDF, facturación | A definir | ☐ Futuro |

---

## Próxima sesión — por dónde continuar

**Primero:** confirmar que el Módulo 4 funciona bien en obra tras subir el archivo.

**Opción A — Módulo 5 (Configuración)** ← recomendado si los operarios o listas necesitan cambios frecuentes  
Editar maquinaria, tipos, operarios y zonas desde la propia app sin tocar el código.

**Opción B — Correcciones Módulo 4**  
Si tras probar en obra hay algo que no encaja.

**Opción C — Transcripción IA (Módulo 6)**  
Claude API para convertir la nota de voz en campos estructurados automáticamente.

---

## Git — comandos útiles aprendidos hoy

```bash
git status                              # Ver qué archivos han cambiado
git diff excavaciones_paco_00.html      # Ver cambios línea a línea
git log --oneline                       # Historial de commits
git show                                # Cambios del último commit

# Ver diff visual en VS Code
code --diff archivo_viejo.html archivo_nuevo.html

# Configurar VS Code como difftool de Git
git config --global diff.tool vscode
git config --global difftool.vscode.cmd 'code --wait --diff $LOCAL $REMOTE'
git difftool excavaciones_paco_00.html

# Subir cambios
git add excavaciones_paco_00.html
git commit -m "descripción del cambio"
git push
```

---

## Registro de sesiones

| Sesión | Fecha | Trabajado | Resultado |
|---|---|---|---|
| 1 | 25/05/2026 | Diseño, Módulo 1, Módulo 2, backup | App v2 |
| 2 | 26/05/2026 | GPS, mapa Leaflet, selección múltiple | App v3 |
| 3 | 28/05/2026 | GitHub Pages, voz y GPS activos | App v4 |
| 4 | 28/05/2026 | Módulo 3 programación semanal | App v4 actualizada |
| 5 | 30/05/2026 | Corrección tarjetas, píldoras, modal programar, Módulo 4 | App v5.1 — 4 módulos |
| 6 | 30/05/2026 | Bugs Módulo 4: duplicados, 7 días, zona horaria, filtro operario | v5.1 corregida — pendiente subir a GitHub |
