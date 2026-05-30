# Sistema de gestión de trabajos de excavación
**Versión:** 5.4  
**Fecha última sesión:** 30/05/2026  
**Estado:** 5 módulos construidos y validados

---

## URL de la app

```
https://xabiercons.github.io/ObrasPaco/excavaciones_paco_00.html
```

**Para actualizar:** github.com/xabiercons/ObrasPaco → "Add file" → "Upload files" → subir HTML → "Commit changes". En 1-2 minutos activo.  
**Si el móvil no se actualiza:** añadir `?v2` (o `?v3`, etc.) al final de la URL para forzar recarga.

---

## Archivo activo

| Archivo | Descripción | Estado |
|---|---|---|
| `excavaciones_paco_00.html` | App principal | v5.4 — validado |
| `guion_excavaciones_v7.md` | Este archivo | v7 — ACTUAL |

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

### ☑ Módulo 4 — Vista operario — VALIDADO
- Pestaña "Hoy" en la barra de navegación
- Selector de operario (botones)
- Vista de 7 días desde hoy, con cabecera por día
- Los días sin trabajos no aparecen
- Sin duplicados, orden por prioridad: Urgente → Alta → Normal
- Operarios desactivados aparecen como "Nombre (desactivado)" si tienen trabajos asignados
- Un botón: Marcar como realizado → confirmación → desaparece

### ☑ Módulo 5 — Configuración — VALIDADO
- Pestaña ⚙ en la barra de navegación
- **Operarios, Tipos de trabajo y Maquinaria:** nunca se borran, se dan de baja/alta
  - Activo: botón "Dar de baja" (gris discreto)
  - Desactivado: nombre + *(desactivado)* en gris + botón "Dar de alta" (verde suave)
  - Chips desactivados: fondo oscuro, borde discontinuo
- **Sinónimos de voz:** acordeón por cada tipo/máquina activa, editar palabras clave
- **Restaurar:** vuelve a los valores por defecto sin borrar trabajos
- Migración automática de datos del formato anterior

### ☑ Backup — VALIDADO
Exportar JSON (descarga con fecha) · Importar JSON (fusiona sin duplicar)

### ☐ Módulo 6 — Transcripción IA — PENDIENTE
Claude API para extraer campos de la nota de voz automáticamente.  
Sustituye los sinónimos hardcodeados. Hace la captura mucho más fluida.

---

## Listas configuradas (editables desde ⚙ Config)

### Maquinaria
Minipala JCB · Volvo giratorio · Camión contenedor · Niveladora · Manual

### Tipos de trabajo
Excavación · Picado · Carga escombro · Zanjas · Nivelación · Limpieza solar

### Operarios
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

---

## Decisiones técnicas

| Decisión | Opción | Motivo |
|---|---|---|
| Tecnología | HTML + JS en un archivo | Sin instalación, Chrome/Safari móvil |
| Hosting | GitHub Pages (HTTPS) | GPS y voz activos, gratuito |
| Persistencia | localStorage | Gratis, sobrevive a cerrar el navegador |
| Voz | Web Speech API (Chrome) | Gratuita, requiere HTTPS |
| Mapa | Leaflet + OpenStreetMap | Gratuito |
| Geocodificación | Nominatim | Gratuita, sin clave API |
| Backup | JSON exportar/importar | Sin servidor |
| Sincronización | Manual JSON por WhatsApp | Workaround hasta Fase 2 |
| Listas | Objetos {nombre, activo} | Nunca se pierden datos históricos |

---

## Estructura de datos

### Trabajo
```json
{
  "id": 1748600000000,
  "cliente": "Nombre cliente",
  "direccion": "Rúa, número",
  "zona": "Milladoiro",
  "lat": "42.123456",
  "lng": "-8.123456",
  "tipos": ["Excavación", "Picado"],
  "maquinarias": ["Minipala JCB"],
  "horas": 4,
  "urgencia": "Normal",
  "notas": "Texto libre",
  "estado": "Pendiente presupuestar",
  "diasProgramados": ["2026-06-02"],
  "operarios": ["Paco"],
  "fecha": "2026-05-30",
  "fechaCreacion": "2026-05-30T10:00:00.000Z"
}
```

### Operario (localStorage cfg_operarios)
```json
[{"nombre": "Paco", "activo": true}, {"nombre": "Operario 2", "activo": false}]
```

### Tipo / Maquinaria (localStorage cfg_listas)
```json
{"tipos": [{"nombre": "Excavación", "activo": true}], "maquinaria": [...], "sinonimos": {...}}
```

---

## Capacidad y mantenimiento

- localStorage: ~5MB (~2.000-3.000 trabajos)
- Límite práctico: >300-400 activos empieza a ir lento en móvil
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

## Próxima sesión

**Opción A — Módulo 6 (Transcripción IA)** ← recomendado  
Claude API para convertir la nota de voz en campos estructurados automáticamente.  
El usuario habla libremente ("es para García en Milladoiro, hay que excavar con la minipala, calculo unas 6 horas") y la IA rellena todos los campos.

**Opción B — Correcciones o ajustes de lo existente**  
Si tras usar en obra hay algo que no encaja.

---

## Registro de sesiones

| Sesión | Fecha | Trabajado | Resultado |
|---|---|---|---|
| 1 | 25/05/2026 | Diseño, Módulo 1, Módulo 2, backup | App v2 |
| 2 | 26/05/2026 | GPS, mapa Leaflet, selección múltiple | App v3 |
| 3 | 28/05/2026 | GitHub Pages, voz y GPS activos | App v4 |
| 4 | 28/05/2026 | Módulo 3 programación semanal | App v4 actualizada |
| 5 | 30/05/2026 | Corrección tarjetas, píldoras, modal programar, Módulo 4 | App v5.1 |
| 6 | 30/05/2026 | Bugs Módulo 4: duplicados, 7 días, zona horaria, filtro operario | App v5.1 corregida |
| 7 | 30/05/2026 | Módulo 5: configuración, archivar/activar listas, UI sin iconos | App v5.4 |
