/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           EXCAVACIONES PACO — Gestión de Obras              ║
 * ║                archivo: JavaScript                          ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Versión: 7.6                                               ║
 * ║                                                             ║
 * ║  ÍNDICE DE MÓDULOS                                          ║
 * ║                                                             ║
 * ║  ── CONFIGURACIÓN ─────────────────────────────────────     ║
 * ║  · Constantes Supabase (SUPA_URL, SUPA_KEY)                 ║
 * ║  · Constantes EmailJS (SERVICE_ID, TEMPLATE_ID, KEY)        ║
 * ║  · Estados de trabajo (arrays ESTADOS_*)                    ║
 * ║  · Variables globales de estado de la app                   ║
 * ║                                                             ║
 * ║  ── AUTENTICACIÓN ──────────────────────────────────────    ║
 * ║  · hacerLogin / cerrarSesion                                ║
 * ║  · Gestión de sesión JWT (Supabase Auth REST)               ║
 * ║  · Refresh automático de token                              ║
 * ║                                                             ║
 * ║  ── CAPA DE DATOS ──────────────────────────────────────    ║
 * ║  · getTrab / addTrab / updateTrab / deleteTrab              ║
 * ║  · loadTrab / loadConfig                                    ║
 * ║  · Clientes, Operarios, Maquinaria, Tipos                   ║
 * ║  · Backup: exportar/importar JSON                           ║
 * ║                                                             ║
 * ║  ── MÓDULO 1: FORMULARIO NUEVO TRABAJO ─────────────────    ║
 * ║  · 7 pasos: cliente, ubicación, tipo, maquinaria,           ║
 * ║    horas, urgencia+notas, resumen                           ║
 * ║  · GPS + mapa Leaflet + Nominatim geocoding                 ║
 * ║  · Voz (Web Speech API) en todos los campos                 ║
 * ║                                                             ║
 * ║  ── MÓDULO 2: LISTADO ──────────────────────────────────    ║
 * ║  · renderListado — tarjetas con filtros y agrupación        ║
 * ║  · Tabs: Pendientes / Programados / Realizados              ║
 * ║  · Exportar CSV individual y por rango de fechas            ║
 * ║  · Enviar informe por email (EmailJS SMTP)                  ║
 * ║                                                             ║
 * ║  ── MÓDULO 3: VISTA MES ────────────────────────────────    ║
 * ║  · renderMes — grid mensual con píldoras de trabajos        ║
 * ║  · Programación desde el mes: seleccionar días y operarios  ║
 * ║  · Filtro por maquinaria                                    ║
 * ║  · Días pasados en gris, urgencia en color                  ║
 * ║                                                             ║
 * ║  ── MÓDULO 4: VISTA HOY ────────────────────────────────    ║
 * ║  · renderOperario — trabajos de los próximos 7 días         ║
 * ║  · Selector de operario                                     ║
 * ║  · Marcar como realizado con horas reales                   ║
 * ║                                                             ║
 * ║  ── MÓDULO 5: CONFIGURACIÓN ────────────────────────────    ║
 * ║  · Clientes, Operarios, Tipos, Maquinaria en Supabase       ║
 * ║  · Editar y eliminar registros                              ║
 * ║  · Sinónimos de voz por elemento                            ║
 * ║                                                             ║
 * ║  ── MÓDULO 6: INFORMES Y EXPORTACIÓN ──────────────────     ║
 * ║  · CSV por rango de fechas                                  ║
 * ║  · Email de informe mensual estructurado                    ║
 * ║  · Email individual por trabajo                             ║
 * ║                                                             ║
 * ║  ── EDITAR TRABAJO / CLIENTE ───────────────────────────    ║
 * ║  · abrirEditarTrabajo / guardarEdicionTrabajo               ║
 * ║  · abrirEditarCliente / guardarEdicionCliente               ║
 * ║  · quitarDelCalendario — vuelve trabajo a bolsa             ║
 * ║                                                             ║
 * ║  ── VOZ ────────────────────────────────────────────────    ║
 * ║  · startVoice / processVoice / matchSinonimo                ║
 * ║  · Campos: cliente, obra, dirección, tipo, maquinaria,      ║
 * ║    horas (dígitos + palabras), notas                        ║
 * ║                                                             ║
 * ║  NOTAS TÉCNICAS                                             ║
 * ║  · Supabase: fetch nativo REST sin SDK                      ║
 * ║  · IDs: siempre comparar con String() — Supabase devuelve   ║
 * ║    strings, JS genera numbers                               ║
 * ║  · Auth: JWT en localStorage clave "supaAppState.session"           ║
 * ║  · RLS activo: política solo_auth para rol authenticated    ║
 * ║  · GPS requiere HTTPS (GitHub Pages lo garantiza)           ║
 * ║  · Voz requiere HTTPS y Chrome/Edge en Android              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ════════════════════════════════════════════════════════
// CACHEBUSTER — Forzar recarga de nueva versión en todos los móviles
// Llamar a forzarActualizacion() desde consola o botón tras cada deploy.
// Guarda un nuevo timestamp en localStorage → el HTML lo usa al recargar.
// ════════════════════════════════════════════════════════
function forzarActualizacion() {
  const v = Date.now();
  localStorage.setItem('app_version', v);
  showToast('♻ Actualizando app… recargando');
  setTimeout(() => location.reload(true), 1000);
}

// ════════════════════════════════════════════════════════
// AUTH — Supabase Authentication
// Usa el SDK de Supabase para gestionar sesión con email+contraseña.
// La sesión persiste en localStorage automáticamente.
// ════════════════════════════════════════════════════════

const SUPA_AUTH_URL = 'https://wqcwicukenycsopnyvck.supabase.co/auth/v1';

// Recupera sesión guardada en localStorage (para no pedir login al reabrir)
// Recupera la sesión JWT guardada en localStorage
function _getSessionStored() {
  try { return JSON.parse(localStorage.getItem('supaAppState.session')); } catch { return null; }
}
// Guarda la sesión JWT en localStorage
function _setSessionStored(s) {
  if (s) localStorage.setItem('supaAppState.session', JSON.stringify(s));
  else localStorage.removeItem('supaAppState.session');
}

// Cabeceras REST con token de usuario autenticado (en lugar de anon key)
// Devuelve los headers de autenticación para las peticiones a Supabase
function _authHeaders() {
  const token = AppState.session?.access_token || SUPA_KEY;
  return {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
}

// Login con email + contraseña
// Autentica al usuario contra Supabase Auth y guarda la sesión
async function hacerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const spin  = document.getElementById('login-spinner');
  const btn   = document.getElementById('login-btn');

  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'Introduce email y contraseña'; return; }

  btn.disabled = true;
  spin.textContent = 'Verificando…';

  try {
    const res = await fetch(`${SUPA_AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error_description || data.message || '';
      if (res.status === 400 || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        throw new Error('Email o contraseña incorrectos');
      }
      throw new Error(msg || 'Error de acceso');
    }
    AppState.session = data;
    _setSessionStored(data);
    // Actualizar cabeceras globales con el nuevo token
    Object.assign(SUPA_HEADERS, _authHeaders());
    spin.textContent = '';
    document.getElementById('login-overlay').classList.add('hidden');
    iniciarApp();
  } catch (e) {
    errEl.textContent = e.message;
    spin.textContent = '';
    btn.disabled = false;
  }
}

// Refresca el token si está cerca de expirar (Supabase lo hace automáticamente,
// pero por seguridad lo forzamos si la sesión tiene más de 55 min)
// Refresca el JWT si está próximo a expirar (margen 5 min)
async function _refreshSessionIfNeeded() {
  if (!AppState.session?.refresh_token) return;
  const createdAt = AppState.session.expires_at || 0;
  const now = Math.floor(Date.now() / 1000);
  // expires_at viene en segundos epoch desde Supabase
  if (createdAt - now < 300) { // Menos de 5 min para expirar → refrescar
    try {
      const res = await fetch(`${SUPA_AUTH_URL}/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: AppState.session.refresh_token })
      });
      const data = await res.json();
      if (res.ok) {
        AppState.session = data;
        _setSessionStored(data);
        Object.assign(SUPA_HEADERS, _authHeaders());
      }
    } catch (e) { console.warn('No se pudo refrescar token:', e); showToast('⚠ Sesión caducada — vuelve a entrar', true); }
  }
}

// Cierra sesión
// Cierra sesión en Supabase y limpia el estado local
async function cerrarSesion() {
  if (!await showConfirm('¿Cerrar sesión?', 'Tendrás que volver a introducir tus credenciales.')) return;
  try {
    await fetch(`${SUPA_AUTH_URL}/logout`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (AppState.session?.access_token || '') }
    });
  } catch {}
  AppState.session = null;
  _setSessionStored(null);
  // Recarga la página (muestra login)
  location.reload();
}

// Comprueba si hay sesión guardada y decide si mostrar login o entrar directo
// Comprueba si hay sesión activa al cargar la app; redirige al login si no
async function checkAuth() {
  const stored = _getSessionStored();
  if (stored?.access_token) {
    AppState.session = stored;
    await _refreshSessionIfNeeded();
    Object.assign(SUPA_HEADERS, _authHeaders());
    document.getElementById('login-overlay').classList.add('hidden');
    iniciarApp();
  }
  // Si no hay sesión, el login-overlay ya está visible (visible por defecto)
}

// Arranca la app (se llama tras login exitoso o sesión recuperada)
// Punto de entrada principal: carga config, trabajos y renderiza la UI
async function iniciarApp() {
  setConexionStatus(false, 'Conectando...');
  await loadConfig();
  CONFIG = getCfg();
  OPERARIOS = getOperariosActivos();
  buildChips();
  await loadTrab();
  renderListado();
  renderMes();
  renderBolsa();
}


const SUPA_URL = 'https://wqcwicukenycsopnyvck.supabase.co';
const SUPA_KEY = 'sb_publishable_bZqoK0K9f_f3Mv4A-Q2V9A_LPRqeIpa';
const SUPA_HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

// CONFIG — Listas editables desde el Módulo 5 (⚙ Configuración)
// Se guardan en Supabase (tablas: operarios, maquinaria, tipos_trabajo).
// En memoria: CONFIG y OPERARIOS_CFG. Fallback a localStorage si Supabase no responde.
// ════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════
// APPSTATE — Estado global centralizado
// Todas las variables de estado en un único objeto.
// Facilita la migración a React/Context API en Fase 3.
// ════════════════════════════════════════════════════════
const AppState = {
  // ── Auth ──────────────────────────────────────────────
  session: null,              // { access_token, refresh_token, expires_at, user }

  // ── Cache de datos ────────────────────────────────────
  trabCache: null,            // Array de trabajos cargados desde Supabase
  cfgCache: null,             // { tipos:[], maquinaria:[], sinonimos:{} }
  operariosCfgCache: null,    // [{nombre, activo, sinonimos:[]}]
  clientesCache: null,        // [{id, nombre, telefono, observaciones}]
  supaOnline: true,           // false si hay error de red

  // ── Formulario nuevo trabajo ──────────────────────────
  form: { cliente:'', obra:'', direccion:'', zona:'', lat:null, lng:null,
          tipos:[], maquinarias:[], horas:4, urgencia:'Normal', notas:'' },
  stepActual: 1,

  // ── Listado ───────────────────────────────────────────
  ltabActual: 'pendientes',
  realizadosMesOffset: 0,     // 0 = mes actual, -1 = anterior...

  // ── Calendario mes ────────────────────────────────────
  mesOffset: 0,               // 0 = mes actual, -1 = anterior, +1 = siguiente
  mesFiltroMaq: '',           // '' = todas las máquinas
  mesFiltroZona: '',          // '' = todas las zonas

  // ── Programación ─────────────────────────────────────
  progTrabajoId: null,        // ID del trabajo en modo programación activa
  progDias: [],               // Días seleccionados (ISO strings)
  progOperarios: [],          // Operarios seleccionados

  // ── Modales ───────────────────────────────────────────
  modalTrabajoId: null,       // ID del trabajo abierto en modal detalle/realizado
  editandoId: null,           // ID del trabajo que se está editando
  editandoClienteId: null,    // ID del cliente que se está editando
  edFecha: '',                // Fecha programada en edición (ISO string)
  mrealMaquinas: [],          // Máquinas editables en modal realizado
  confirmResolve: null,       // Promise resolver del modal de confirmación

  // ── Mapa ──────────────────────────────────────────────
  mapaLeaflet: null,          // Instancia del mapa Leaflet
  marcador: null,             // Marcador arrastrable
  coordsTemp: { lat: null, lng: null }, // Coordenadas antes de aceptar

  // ── Voz ───────────────────────────────────────────────
  recognition: null,          // Instancia Web Speech API
  listening: false,           // true mientras el micrófono está activo

  // ── Vista operario ────────────────────────────────────
  opSeleccionado: null,       // Nombre del operario activo en vista Hoy

  // ── UI ────────────────────────────────────────────────
  clienteDropdownOpen: false, // true si el dropdown de clientes está abierto

  // ── Chips de edición ──────────────────────────────────
  edTipos: [],       // tipos seleccionados en modal editar
  edMaquinarias: [], // maquinarias seleccionadas en modal editar
  edOperarios: [],   // operarios seleccionados en modal editar
  mrealOperarios: [], // operarios seleccionados en modal realizado
};

const CONFIG_DEFAULT = {
  tipos: [
    {nombre:'Excavación', activo:true, sinonimos:['excavar','excavación','abrir','cimientos']},
    {nombre:'Picado', activo:true, sinonimos:['picar','picado','romper','demoler']},
    {nombre:'Carga escombro', activo:true, sinonimos:['escombro','retirar','carga','llevar']},
    {nombre:'Zanjas', activo:true, sinonimos:[]},
    {nombre:'Nivelación', activo:true, sinonimos:[]},
    {nombre:'Limpieza solar', activo:true, sinonimos:[]}
  ],
  maquinaria: [
    {nombre:'Minipala JCB', activo:true, sinonimos:['mini','jcb','pala pequeña','minipala']},
    {nombre:'Volvo giratorio', activo:true, sinonimos:['volvo','retro','giratorio','excavadora']},
    {nombre:'Camión contenedor', activo:true, sinonimos:['camión','contenedor','volquete']},
    {nombre:'Niveladora', activo:true, sinonimos:['niveladora','motoniveladora']},
    {nombre:'Manual', activo:true, sinonimos:[]}
  ],
  // sinonimos como objeto plano para compatibilidad con el resto del código
  sinonimos: {
    'Minipala JCB': ['mini','jcb','pala pequeña','minipala'],
    'Volvo giratorio': ['volvo','retro','giratorio','excavadora'],
    'Camión contenedor': ['camión','contenedor','volquete'],
    'Niveladora': ['niveladora','motoniveladora'],
    'Excavación': ['excavar','excavación','abrir','cimientos'],
    'Picado': ['picar','picado','romper','demoler'],
    'Carga escombro': ['escombro','retirar','carga','llevar'],
  }
};

const OPERARIOS_DEFAULT = [
  {nombre:'Paco', activo:true, sinonimos:[]},
  {nombre:'Operario 2', activo:true, sinonimos:[]},
  {nombre:'Operario 3', activo:true, sinonimos:[]},
  {nombre:'Operario 4', activo:true, sinonimos:[]}
];

// Cache en memoria — se carga al inicio desde Supabase

// ── SUPABASE CONFIG HELPERS ──────────────────────────────

// Convierte filas de Supabase (tabla tipos_trabajo o maquinaria) a formato interno
// Convierte filas de Supabase al formato interno de la app
function _rowsToItems(rows) {
  return rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    activo: r.activo,
    sinonimos: Array.isArray(r.sinonimos) ? r.sinonimos : []
  }));
}

// Construye el objeto sinonimos plano { nombre: [sins] } para compatibilidad
// Construye el mapa de sinónimos de voz a partir de tipos y maquinaria
function _buildSinonimosObj(tipos, maquinaria) {
  const obj = {};
  [...tipos, ...maquinaria].forEach(item => {
    obj[item.nombre] = item.sinonimos || [];
  });
  return obj;
}

// Carga configuración desde Supabase al iniciar la app
// Carga operarios, tipos, maquinaria y clientes desde Supabase
async function loadConfig() {
  try {
    const [rTipos, rMaq, rOps, rClients] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/tipos_trabajo?order=id.asc`, {headers: SUPA_HEADERS}),
      fetch(`${SUPA_URL}/rest/v1/maquinaria?order=id.asc`, {headers: SUPA_HEADERS}),
      fetch(`${SUPA_URL}/rest/v1/operarios?order=id.asc`, {headers: SUPA_HEADERS}),
      fetch(`${SUPA_URL}/rest/v1/clientes?order=nombre.asc`, {headers: SUPA_HEADERS})
    ]);
    const tipos = _rowsToItems(await rTipos.json());
    const maquinaria = _rowsToItems(await rMaq.json());
    const operarios = _rowsToItems(await rOps.json());
    const clientesRaw = await rClients.json();
    AppState.clientesCache = Array.isArray(clientesRaw) ? clientesRaw : [];

    // Si las tablas están vacías, insertar los valores por defecto
    if (tipos.length === 0) {
      await _insertDefaultConfig('tipos_trabajo', CONFIG_DEFAULT.tipos);
      const r2 = await fetch(`${SUPA_URL}/rest/v1/tipos_trabajo?order=id.asc`, {headers: SUPA_HEADERS});
      const t2 = _rowsToItems(await r2.json());
      AppState.cfgCache = { tipos: t2, maquinaria, sinonimos: _buildSinonimosObj(t2, maquinaria) };
    } else {
      AppState.cfgCache = { tipos, maquinaria, sinonimos: _buildSinonimosObj(tipos, maquinaria) };
    }
    if (maquinaria.length === 0) {
      await _insertDefaultConfig('maquinaria', CONFIG_DEFAULT.maquinaria);
      const r2 = await fetch(`${SUPA_URL}/rest/v1/maquinaria?order=id.asc`, {headers: SUPA_HEADERS});
      const m2 = _rowsToItems(await r2.json());
      AppState.cfgCache.maquinaria = m2;
      AppState.cfgCache.sinonimos = _buildSinonimosObj(AppState.cfgCache.tipos, m2);
    }
    if (operarios.length === 0) {
      await _insertDefaultConfig('operarios', OPERARIOS_DEFAULT);
      const r2 = await fetch(`${SUPA_URL}/rest/v1/operarios?order=id.asc`, {headers: SUPA_HEADERS});
      AppState.operariosCfgCache = _rowsToItems(await r2.json());
    } else {
      AppState.operariosCfgCache = operarios;
    }
    // Guardar en localStorage como fallback
    localStorage.setItem('cfg_listas', JSON.stringify(AppState.cfgCache));
    localStorage.setItem('cfg_operarios', JSON.stringify(AppState.operariosCfgCache));
  } catch(e) {
    console.warn('Supabase config no disponible, usando localStorage:', e.message);
    // Config carga silenciosa — no molestamos al usuario con esto al arranque
    // Fallback localStorage
    try {
      const r = JSON.parse(localStorage.getItem('cfg_listas'));
      AppState.cfgCache = r || structuredClone(CONFIG_DEFAULT);
    } catch(e2) { AppState.cfgCache = structuredClone(CONFIG_DEFAULT); }
    try {
      const r = JSON.parse(localStorage.getItem('cfg_operarios'));
      AppState.operariosCfgCache = Array.isArray(r) ? r : OPERARIOS_DEFAULT.map(o=>({...o}));
    } catch(e2) { AppState.operariosCfgCache = OPERARIOS_DEFAULT.map(o=>({...o})); }
    try {
      const r = JSON.parse(localStorage.getItem('cfg_clientes'));
      AppState.clientesCache = Array.isArray(r) ? r : [];
    } catch(e2) { AppState.clientesCache = []; }
  }
}

// Inserta configuración por defecto si la tabla está vacía
async function _insertDefaultConfig(tabla, items) {
  const rows = items.map(i => ({ nombre: i.nombre, activo: i.activo, sinonimos: i.sinonimos || [] }));
  await fetch(`${SUPA_URL}/rest/v1/${tabla}`, {
    method: 'POST',
    headers: { ...SUPA_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(rows)
  });
}

// ── GETTERS SÍNCRONOS (leen de cache en memoria) ─────────

// Devuelve la configuración actual (tipos, maquinaria, sinónimos)
function getCfg() {
  return AppState.cfgCache || structuredClone(CONFIG_DEFAULT);
}
// Devuelve la lista completa de operarios (activos e inactivos)
function getOperariosCfg() {
  return AppState.operariosCfgCache || OPERARIOS_DEFAULT.map(o=>({...o}));
}

// Nombres de operarios activos (para asignar en modal programar)
// Devuelve solo los operarios activos
function getOperariosActivos() { return getOperariosCfg().filter(o=>o.activo).map(o=>o.nombre); }
// Todos los nombres de operarios (activos + archivados, para la vista Hoy)
// Devuelve todos los operarios sin filtro
function getOperariosTodos() { return getOperariosCfg().map(o=>o.nombre); }
// Nombres activos de tipos y maquinaria (para chips del formulario)
// Devuelve los tipos de trabajo activos
function getTiposActivos() { return getCfg().tipos.filter(o=>o.activo).map(o=>o.nombre); }
// Devuelve las máquinas activas
function getMaqActiva() { return getCfg().maquinaria.filter(o=>o.activo).map(o=>o.nombre); }

// ── ESCRITURA EN SUPABASE ─────────────────────────────────

// Guarda un ítem (tipo o maquinaria) en Supabase y actualiza cache
// Guarda un ítem de configuración (tipo o maquinaria) en Supabase
async function _saveItemSupabase(tabla, item) {
  const body = { nombre: item.nombre, activo: item.activo, sinonimos: item.sinonimos || [] };
  if (item.id) {
    // UPDATE
    await fetch(`${SUPA_URL}/rest/v1/${tabla}?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { ...SUPA_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(body)
    });
  } else {
    // INSERT — devuelve el id nuevo
    const res = await fetch(`${SUPA_URL}/rest/v1/${tabla}`, {
      method: 'POST',
      headers: { ...SUPA_HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(body)
    });
    const rows = await res.json();
    if (rows && rows[0]) item.id = rows[0].id;
  }
  // Actualizar fallback localStorage
  localStorage.setItem('cfg_listas', JSON.stringify(AppState.cfgCache));
}

// Guarda o actualiza un operario en Supabase
async function _saveOperarioSupabase(op) {
  const body = { nombre: op.nombre, activo: op.activo, sinonimos: op.sinonimos || [] };
  if (op.id) {
    await fetch(`${SUPA_URL}/rest/v1/operarios?id=eq.${op.id}`, {
      method: 'PATCH',
      headers: { ...SUPA_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(body)
    });
  } else {
    const res = await fetch(`${SUPA_URL}/rest/v1/operarios`, {
      method: 'POST',
      headers: { ...SUPA_HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(body)
    });
    const rows = await res.json();
    if (rows && rows[0]) op.id = rows[0].id;
  }
  localStorage.setItem('cfg_operarios', JSON.stringify(AppState.operariosCfgCache));
}

// saveCfg — compatibilidad: ya no se usa directamente, la cache se escribe desde las funciones async
function saveCfg(c) {
  AppState.cfgCache = c;
  localStorage.setItem('cfg_listas', JSON.stringify(c));
}
// Guarda la lista de operarios en memoria
function saveOperariosCfg(arr) {
  AppState.operariosCfgCache = arr;
  localStorage.setItem('cfg_operarios', JSON.stringify(arr));
}

// CONFIG y OPERARIOS — variables vivas, se recargan al guardar cambios
let CONFIG = getCfg();
let OPERARIOS = getOperariosActivos(); // Solo activos — para asignación en modal

// ════════════════════════════════════════════════════════
// ESTADO GLOBAL — Variables que guardan los datos mientras la app está abierta
// ════════════════════════════════════════════════════════

// Datos del formulario en curso (se resetean al guardar)
// Paso actual del formulario de 7 pasos (1-7)
// Pestaña activa en el listado: 'pendientes', 'programados' o 'realizados'
// Instancia del reconocedor de voz (Web Speech API)
// Indica si el micrófono está activo en este momento

// Wrapper fetch para Supabase REST
// ════════════════════════════════════════════════════════
// Detecta JWT expirado en cualquier respuesta de Supabase
// Se llama desde el wrapper supa — un solo punto de control
// Si detecta sesión caducada: toast + limpia sesión + muestra login
// ════════════════════════════════════════════════════════
// Detecta error 401 de Supabase y redirige al login si la sesión expiró
async function _checkSesionExpirada(r) {
  if (r.status === 401) {
    let body = '';
    try { body = await r.clone().text(); } catch(e) {}
    if (body.includes('JWT expired') || body.includes('jwt expired') || body.includes('PGRST303')) {
      AppState.session = null;
      localStorage.removeItem('supaAppState.session');
      showToast('⚠ Sesión caducada — vuelve a entrar', true);
      setTimeout(() => mostrarLogin(), 1500); // Pequeña pausa para que el toast se vea
      return true; // sesión expirada
    }
  }
  return false;
}

const supa = {
  async select(table, order) {
    const url = `${SUPA_URL}/rest/v1/${table}?select=*${order ? '&order=' + order : ''}`;
    const r = await fetch(url, { headers: { ...SUPA_HEADERS, 'Prefer': '' } });
    if (!r.ok) { if (await _checkSesionExpirada(r)) return []; throw new Error(await r.text()); }
    return r.json();
  },
  async insert(table, row) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: 'POST', headers: SUPA_HEADERS, body: JSON.stringify(row)
    });
    if (!r.ok) { await _checkSesionExpirada(r); throw new Error(await r.text()); }
  },
  async update(table, row, idField, idVal) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${idField}=eq.${idVal}`, {
      method: 'PATCH', headers: SUPA_HEADERS, body: JSON.stringify(row)
    });
    if (!r.ok) { await _checkSesionExpirada(r); throw new Error(await r.text()); }
  },
  async delete(table, idField, idVal) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${idField}=eq.${idVal}`, {
      method: 'DELETE', headers: SUPA_HEADERS
    });
    if (!r.ok) { await _checkSesionExpirada(r); throw new Error(await r.text()); }
  }
};

// Caché local para evitar esperas en cada render

// Indicador de estado de conexión
// Actualiza el indicador de conexión en el header (verde/rojo)
function setConexionStatus(ok, msg) {
  AppState.supaOnline = ok;
  const el = document.getElementById('conexion-status');
  if (!el) return;
  el.textContent = ok ? '● Sincronizado' : '⚠ Sin conexión — datos locales';
  el.style.color = ok ? '#44CC77' : '#FFA500';
}

// ════════════════════════════════════════════════════════
// ALMACENAMIENTO — Lee y escribe en Supabase (con fallback a localStorage)
// ════════════════════════════════════════════════════════

// Carga trabajos desde Supabase y actualiza caché
// Carga todos los trabajos desde Supabase a memoria local
async function loadTrab() {
  try {
    const data = await supa.select('trabajos', 'fecha_creacion.desc');
    AppState.trabCache = (data || []).map(row => {
      try { row.tipos = JSON.parse(row.tipos || '[]'); } catch(e) { row.tipos = []; }
      try { row.maquinarias = JSON.parse(row.maquinarias || '[]'); } catch(e) { row.maquinarias = []; }
      try { row.diasProgramados = JSON.parse(row.dias_programados || '[]'); } catch(e) { row.diasProgramados = []; }
      try { row.operarios = JSON.parse(row.operarios || '[]'); } catch(e) { row.operarios = []; }
      try { row.jornadasParciales = JSON.parse(row.jornadas_parciales || '[]'); } catch(e) { row.jornadasParciales = []; }
      try { row.horasReales = JSON.parse(row.horas_reales || 'null'); } catch(e) { row.horasReales = null; }
      row.materiales = row.materiales || '';
      row.obra = row.obra || '';
      row.fechaCreacion = row.fecha_creacion;
      row.fechaRealizado = row.fecha_realizado || '';
      row.maquinaria = row.maquinarias.join(', ');
      row.tipo = row.tipos.join(', ');
      return row;
    });
    localStorage.setItem('excavaciones_trabajos', JSON.stringify(AppState.trabCache));
    setConexionStatus(true);
    return AppState.trabCache;
  } catch(e) {
    console.warn('Supabase no disponible, usando localStorage:', e.message || e);
    setConexionStatus(false);
    showToast('⚠ Sin conexión — mostrando datos guardados', true);
    try { AppState.trabCache = JSON.parse(localStorage.getItem('excavaciones_trabajos') || '[]'); } catch(e2) { AppState.trabCache = []; }
    return AppState.trabCache;
  }
}

// Devuelve el array de trabajos desde caché (síncrono)
// Devuelve el array de trabajos en memoria
function getTrab() {
  if (AppState.trabCache !== null) return AppState.trabCache;
  try { return JSON.parse(localStorage.getItem('excavaciones_trabajos') || '[]'); } catch(e) { return []; }
}

// Guarda un trabajo nuevo en Supabase
// Añade un trabajo nuevo a Supabase y lo inserta en memoria
async function addTrab(t) {
  const row = trabajoToRow(t);
  try {
    await supa.insert('trabajos', row);
    AppState.trabCache = null;
    setConexionStatus(true);
  } catch(e) {
    console.warn('Error guardando en Supabase:', e.message || e);
    setConexionStatus(false);
    showToast('✗ Error al guardar — revisa la conexión', true);
    const arr = getTrab();
    arr.unshift(t);
    localStorage.setItem('excavaciones_trabajos', JSON.stringify(arr));
    AppState.trabCache = arr;
  }
}

// Actualiza un trabajo existente en Supabase
// Actualiza un trabajo existente en Supabase y en memoria
async function updateTrab(t) {
  const row = trabajoToRow(t);
  try {
    await supa.update('trabajos', row, 'id', t.id);
    if (AppState.trabCache) {
      const idx = AppState.trabCache.findIndex(x => String(x.id) === String(t.id));
      if (idx >= 0) AppState.trabCache[idx] = t;
    }
    localStorage.setItem('excavaciones_trabajos', JSON.stringify(AppState.trabCache || []));
    setConexionStatus(true);
  } catch(e) {
    console.warn('Error actualizando en Supabase:', e.message || e);
    setConexionStatus(false);
    showToast('✗ Error al actualizar — revisa la conexión', true);
    const arr = getTrab();
    const idx = arr.findIndex(x => String(x.id) === String(t.id));
    if (idx >= 0) arr[idx] = t;
    localStorage.setItem('excavaciones_trabajos', JSON.stringify(arr));
    AppState.trabCache = arr;
  }
}

// Elimina un trabajo en Supabase
// Elimina un trabajo de Supabase y de memoria
async function deleteTrab(id) {
  try {
    await supa.delete('trabajos', 'id', id);
    if (AppState.trabCache) AppState.trabCache = AppState.trabCache.filter(x => x.id !== id);
    localStorage.setItem('excavaciones_trabajos', JSON.stringify(AppState.trabCache || []));
    setConexionStatus(true);
  } catch(e) {
    console.warn('Error eliminando en Supabase:', e.message || e);
    setConexionStatus(false);
    showToast('✗ Error al eliminar — revisa la conexión', true);
    const arr = getTrab().filter(x => x.id !== id);
    localStorage.setItem('excavaciones_trabajos', JSON.stringify(arr));
    AppState.trabCache = arr;
  }
}

// Convierte objeto trabajo JS a fila Supabase (snake_case)
// Convierte un objeto trabajo al formato de columnas de Supabase
function trabajoToRow(t) {
  return {
    id: t.id,
    cliente: t.cliente || '',
    obra: t.obra || '',
    direccion: t.direccion || '',
    zona: t.zona || '',
    lat: t.lat || null,
    lng: t.lng || null,
    tipos: JSON.stringify(t.tipos || []),
    maquinarias: JSON.stringify(t.maquinarias || []),
    horas: t.horas || 0,
    urgencia: t.urgencia || 'Normal',
    notas: t.notas || '',
    estado: t.estado || 'Pendiente presupuestar',
    fecha: t.fecha || new Date().toISOString().slice(0,10),
    fecha_creacion: t.fechaCreacion || new Date().toISOString(),
    dias_programados: JSON.stringify(t.diasProgramados || []),
    operarios: JSON.stringify(t.operarios || []),
    jornadas_parciales: JSON.stringify(t.jornadasParciales || []),
    horas_reales: JSON.stringify(t.horasReales || null),
    notas_cierre: t.notasCierre || '',
    materiales: t.materiales || '',
    fecha_realizado: t.fechaRealizado || ''
  };
}

// saveTrab — compatibilidad: actualiza caché y localStorage (sin Supabase, para cambios en batch)
// Persiste el array de trabajos en localStorage (fallback offline)
function saveTrab(arr) {
  AppState.trabCache = arr;
  localStorage.setItem('excavaciones_trabajos', JSON.stringify(arr));
}

// ════════════════════════════════════════════════════════
// BARRA DE PROGRESO — Los 7 segmentos de la parte superior del formulario
// ════════════════════════════════════════════════════════
// Actualiza la barra de progreso del formulario de nuevo trabajo
function updateProgress() {
  const total = 7;
  let html = '';
  for(let i=1;i<=total;i++) {
    // 'done' = completado, 'active' = actual, '' = pendiente
    let cls = i < AppState.stepActual ? 'done' : i === AppState.stepActual ? 'active' : '';
    html += `<div class="progress-step ${cls}"></div>`;
  }
  document.getElementById('prog-steps').innerHTML = html;
  document.getElementById('prog-label').textContent = `Paso ${AppState.stepActual} de ${total}`;
}

// ════════════════════════════════════════════════════════
// NAVEGACIÓN DEL FORMULARIO — Avanzar y retroceder entre los 7 pasos
// ════════════════════════════════════════════════════════

// Muestra el paso n y oculta el resto. Si es el paso 7, construye el resumen.
// Muestra el paso N del formulario y oculta los demás; limpia errores al navegar
function showStep(n) {
  for(let i=1;i<=7;i++) {
    const el = document.getElementById('step-'+i);
    if(el) el.style.display = i===n ? 'block' : 'none';
  }
  AppState.stepActual = n;
  updateProgress();
  if(n===7) buildResumen();
  // Limpiar cualquier feedback de voz y toasts al cambiar de paso
  document.querySelectorAll('.voice-result').forEach(el => el.innerHTML = '');
  const toast = document.getElementById('toast');
  if(toast) { toast.textContent = ''; toast.classList.remove('show'); }
}

// Valida el paso actual antes de avanzar. Si falta algo, muestra aviso.
// Valida el paso actual y avanza al siguiente si pasa la validación
function nextStep(current) {
  if(current===1 && !AppState.form.cliente.trim()) { showToast('Selecciona o crea un cliente'); return; }
  if(current===2 && !AppState.form.direccion.trim()) { showToast('Indica la dirección o usa el GPS'); return; }
  if(current===2 && !AppState.form.zona.trim()) { showToast('Indica la zona (Milladoiro, Conxo…)'); return; }
  if(current===3 && (!AppState.form.tipos || AppState.form.tipos.length===0)) { showToast('Selecciona al menos un tipo de trabajo'); return; }
  if(current===4 && (!AppState.form.maquinarias || AppState.form.maquinarias.length===0)) { showToast('Selecciona al menos una máquina'); return; }
  showStep(current+1);
}
// Vuelve al paso anterior sin validar
// Vuelve al paso anterior sin validar
function prevStep(current) { showStep(current-1); }

// Comprueba si ya existe un cliente con ese nombre y muestra aviso
// Avisa si ya existe un cliente con el mismo nombre al crear uno nuevo
function checkClienteDuplicado(valor) {
  const aviso = document.getElementById('aviso-cliente');
  if(!aviso) return;
  const v = valor.trim().toLowerCase();
  if(!v) { aviso.style.display = 'none'; return; }
  const existe = getTrab().some(t => (t.cliente||'').trim().toLowerCase() === v);
  aviso.style.display = existe ? 'block' : 'none';
}

// ════════════════════════════════════════════════════════
// CHIPS DE SELECCIÓN MÚLTIPLE — Botones táctiles para tipo y maquinaria
// ════════════════════════════════════════════════════════

// Construye los chips de tipo de trabajo y maquinaria a partir de CONFIG
// Renderiza los chips de tipo y maquinaria en los pasos 3 y 4 del formulario
function buildChips() {
  const tiposActivos = getTiposActivos();
  const ct = document.getElementById('chips-tipo');
  ct.innerHTML = tiposActivos.map(t =>
    `<div class="chip-opt ${(AppState.form.tipos||[]).includes(t)?'selected':''}" onclick="selectChipMulti('tipos','${t}',this)">${t}</div>`
  ).join('');
  const maqActiva = getMaqActiva();
  const cm = document.getElementById('chips-maq');
  cm.innerHTML = maqActiva.map(m =>
    `<div class="chip-opt ${(AppState.form.maquinarias||[]).includes(m)?'selected':''}" onclick="selectChipMulti('maquinarias','${m}',this)">${m}</div>`
  ).join('');
}

// Añade o quita un valor del array correspondiente en el formulario
// Selecciona o deselecciona un chip (tipo o maquinaria) y actualiza form
function selectChipMulti(field, val, el) {
  if(!AppState.form[field]) AppState.form[field] = [];
  const idx = AppState.form[field].indexOf(val);
  if(idx === -1) { AppState.form[field].push(val); el.classList.add('selected'); }   // Añadir
  else { AppState.form[field].splice(idx, 1); el.classList.remove('selected'); }     // Quitar
}

// ════════════════════════════════════════════════════════
// URGENCIA — Selector visual Normal / Alta / Urgente
// ════════════════════════════════════════════════════════
// Establece la urgencia del trabajo (Normal / Alta / Urgente)
function setUrgencia(val) {
  AppState.form.urgencia = val;
  // Quita la clase activa de los tres botones y la pone solo en el seleccionado
  ['normal','alta','urgente'].forEach(u => {
    const el = document.getElementById('urg-'+u);
    el.className = 'urg-opt';
    if(val.toLowerCase()===u) el.classList.add('sel-'+u);
  });
}

// ════════════════════════════════════════════════════════
// HORAS — Stepper +/- para las horas previstas del trabajo
// ════════════════════════════════════════════════════════
// Incrementa o decrementa el contador de horas previstas (paso 5)
function changeHoras(delta) {
  // Mínimo 1h, máximo 99h
  AppState.form.horas = Math.max(1, Math.min(99, AppState.form.horas+delta));
  document.getElementById('horas-display').textContent = AppState.form.horas;
}

// Sincroniza un campo de texto con el objeto form al escribir
// Sincroniza visualmente el campo nombre del cliente inline (sin actualizar form)
function syncClienteNuevoNombre(value) {
  // Solo sincroniza el campo visual
}

// Actualiza un campo del objeto form desde un input manual
function syncField(field, val) { AppState.form[field] = val; }

// ════════════════════════════════════════════════════════
// MAPA LEAFLET + GPS — Paso 2 del formulario
// Usa la librería Leaflet con tiles de OpenStreetMap (gratuito).
// El GPS requiere HTTPS — funciona desde GitHub Pages, no desde file://
// ════════════════════════════════════════════════════════


// Inicializa el mapa (o lo recentra si ya existe) en las coordenadas dadas
// Crea el mapa Leaflet centrado en las coordenadas indicadas
function inicializarMapa(lat, lng, zoom) {
  const wrap = document.getElementById('map-wrap');
  wrap.classList.add('show'); // Muestra el contenedor del mapa

  if (!AppState.mapaLeaflet) {
    // Primera vez: crea el mapa con tiles de OpenStreetMap
    AppState.mapaLeaflet = L.map('map-picker').setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(AppState.mapaLeaflet);
  } else {
    // Ya existía: solo recentra
    AppState.mapaLeaflet.setView([lat, lng], zoom);
  }

  // Fuerza redibujado (necesario cuando el contenedor estaba oculto)
  setTimeout(() => AppState.mapaLeaflet.invalidateSize(), 200);
}

// Coloca o mueve el AppState.marcador en el mapa. El AppState.marcador es arrastrable.
// Coloca o mueve el AppState.marcador en el mapa y hace geocodificación inversa
function ponerMarcador(lat, lng) {
  if (AppState.marcador) {
    AppState.marcador.setLatLng([lat, lng]); // Ya existe: moverlo
  } else {
    // Crear AppState.marcador arrastrable por primera vez
    AppState.marcador = L.marker([lat, lng], { draggable: true }).addTo(AppState.mapaLeaflet);
    // Al terminar de arrastrar, actualiza las coordenadas temporales
    AppState.marcador.on('dragend', () => {
      const p = AppState.marcador.getLatLng();
      AppState.coordsTemp = { lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) };
    });
  }
  // Guarda las coordenadas actuales (con 6 decimales de precisión)
  AppState.coordsTemp = { lat: typeof lat === 'number' ? lat.toFixed(6) : lat, lng: typeof lng === 'number' ? lng.toFixed(6) : lng };
}

// Activa el modo "toca para marcar" cuando el GPS no está disponible
// Activa el listener de click en el mapa para mover el AppState.marcador
function activarClickMapa() {
  AppState.mapaLeaflet.off('click'); // Elimina listeners anteriores para evitar duplicados
  AppState.mapaLeaflet.on('click', e => {
    ponerMarcador(e.latlng.lat, e.latlng.lng);
  });
}

// Botón principal del paso 2: pide GPS y abre el mapa cuando hay respuesta
// Solicita la posición GPS y abre el modal del mapa
function abrirMapaGPS() {
  const btn = document.getElementById('btn-abrirmapa');
  btn.textContent = '⏳ Obteniendo posición GPS…';
  btn.disabled = true;

  if (!navigator.geolocation) {
    // El navegador no soporta GPS en absoluto
    inicializarMapa(42.8782, -8.5448, 13); // Centro: Santiago de Compostela
    activarClickMapa();
    btn.textContent = '📍 GPS no disponible — toca el mapa para marcar';
    btn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      // GPS OK: abre el mapa ya centrado en la posición real del móvil
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      inicializarMapa(lat, lng, 17); // Zoom 17 = nivel de calle
      ponerMarcador(lat, lng);
      btn.textContent = '✓ GPS capturado — arrastra el AppState.marcador si hay desvío';
      btn.disabled = false;
    },
    err => {
      // GPS bloqueado (file://, sin permiso, sin cobertura, timeout)
      // Abre el mapa en Santiago para que el usuario marque manualmente
      inicializarMapa(42.8782, -8.5448, 13);
      activarClickMapa();
      btn.textContent = '📍 GPS no disponible — toca el mapa para marcar';
      btn.disabled = false;
    },
    { timeout: 8000, enableHighAccuracy: true } // Espera máximo 8 segundos
  );
}

// Botón "Aceptar ubicación": guarda las coordenadas y busca la dirección
// Confirma la ubicación seleccionada en el mapa y cierra el modal
function aceptarMapa() {
  if (!AppState.coordsTemp.lat) {
    showToast('Marca un punto en el mapa primero');
    return;
  }
  AppState.form.lat = AppState.coordsTemp.lat;
  AppState.form.lng = AppState.coordsTemp.lng;

  const res = document.getElementById('gps-result');
  res.className = 'gps-result show';
  res.textContent = `⏳ Buscando dirección…`;

  // Geocodificación inversa: convierte coordenadas en dirección legible
  // Usa Nominatim de OpenStreetMap (gratuito, sin clave de API)
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${AppState.form.lat}&lon=${AppState.form.lng}&format=json&accept-language=es`)
    .then(r => r.json())
    .then(d => {
      const addr = d.address || {};
      // Construye la dirección con calle y número si están disponibles
      const partes = [addr.road, addr.house_number].filter(Boolean);
      const dir = partes.join(' ') || d.display_name?.split(',')[0] || '';
      // Determina la zona (barrio, pueblo, ciudad...)
      const zona = addr.suburb || addr.neighbourhood || addr.town || addr.village || addr.city_district || addr.city || '';
      if (dir) { AppState.form.direccion = dir; document.getElementById('f-direccion').value = dir; }
      if (zona) { AppState.form.zona = zona; document.getElementById('f-zona').value = zona; }
      res.textContent = `📍 ${dir || AppState.form.lat+', '+AppState.form.lng}${zona ? ' · '+zona : ''}`;
      document.getElementById('map-wrap').classList.remove('show'); // Oculta el mapa
      document.getElementById('btn-abrirmapa').textContent = '✓ Ubicación en mapa — toca para cambiar';
      showToast('✓ Ubicación guardada');
    })
    .catch(() => {
      // Sin internet o fallo de Nominatim: guarda solo las coordenadas
      res.textContent = `📍 ${AppState.form.lat}, ${AppState.form.lng}`;
      document.getElementById('map-wrap').classList.remove('show');
      document.getElementById('btn-abrirmapa').textContent = '✓ Ubicación guardada';
      showToast('✓ Coordenadas guardadas');
    });
}

// ════════════════════════════════════════════════════════
// VOZ — Reconocimiento de voz con Web Speech API
// Requiere HTTPS (GitHub Pages). No funciona desde file://
// El micrófono permanece activo hasta que el usuario lo para.
// ════════════════════════════════════════════════════════

// Arranca el micrófono para el campo indicado.
// field: qué campo rellena ('cliente', 'tipo', 'maquinaria', 'notas'...)
// btnId: ID del botón que cambia de texto al activarse
// resId: ID del div donde se muestra la transcripción
// Array temporal de fechas mientras se edita un trabajo
// Fecha programada actual mientras se edita (ISO string o '')

// Muestra la fecha actual en el bloque de edición
function edRenderFecha() {
  const label = document.getElementById('ed-fecha-actual-label');
  const picker = document.getElementById('ed-fecha-picker');
  if(!label) return;
  if(AppState.edFecha) {
    const d = new Date(AppState.edFecha + 'T12:00');
    label.textContent = d.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
    // Mostrar bloque solo si tiene fecha (trabajo programado)
    const bloque = document.getElementById('ed-fechas-bloque');
    if(bloque) bloque.style.display = '';
  } else {
    label.textContent = 'Sin fecha asignada';
  }
  if(picker) {
    picker.value = '';
    picker.min = fechaISO(new Date());
  }
}

// Cambia la fecha del trabajo por la seleccionada en el picker
// Valida: no pasada, avisa si el día ya tiene 2+ trabajos
// Si hay carga → ofrece elegir otra fecha o volver a la bolsa (vista Mes)
async function edFechaCambiar() {
  const picker = document.getElementById('ed-fecha-picker');
  const val = picker.value;
  if(!val) { showToast('Selecciona una fecha'); return; }
  const hoy = fechaISO(new Date());
  if(val < hoy) { showToast('Solo fechas desde hoy en adelante'); return; }

  // Validar carga del día elegido
  const trabajosDia = getTrab().filter(t =>
    String(t.id) !== String(AppState.editandoId) &&
    (t.diasProgramados||[]).includes(val) &&
    t.estado === 'Programado'
  );

  if(trabajosDia.length >= 2) {
    const d = new Date(val + 'T12:00');
    const label = d.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
    const nombres = trabajosDia.slice(0,2).map(t=>t.cliente||'Sin cliente').join(', ');
    // Mostrar aviso: elegir otra fecha o volver a la bolsa
    const irBolsa = !confirm(
      `⚠ El ${label} ya tiene ${trabajosDia.length} trabajos programados:\n${nombres}\n\nPulsa Aceptar para elegir otra fecha\nPulsa Cancelar para volver a la bolsa del calendario`
    );
    if(irBolsa) {
      // Volver a la bolsa: pasar a Aceptado, borrar fecha, ir a vista Mes
      const t = getTrab().find(x=>String(x.id)===String(AppState.editandoId));
      if(t) {
        t.estado = 'Aceptado';
        t.diasProgramados = [];
        t.operarios = [];
        showToast('Guardando...');
        await updateTrab(t);
        cerrarModal('modal-editar');
        renderListado();
        renderMes();
        showView('mes');
        showToast('✓ Trabajo en la bolsa — reprógramalo desde el calendario');
      }
      return;
    }
    // Elegir otra fecha: limpiar picker y esperar
    picker.value = '';
    showToast('Elige otra fecha en el calendario');
    return;
  }

  // Sin conflicto — asignar la nueva fecha
  AppState.edFecha = val;
  edRenderFecha();
  showToast('Fecha actualizada — guarda los cambios para confirmar');
}

// Genera un enlace a Google Maps para una dirección o coordenadas
// Genera la URL de Google Maps para un trabajo (por GPS o por dirección)
function mapsLink(t) {
  if(t.lat && t.lng) return `https://maps.google.com/?q=${t.lat},${t.lng}`;
  if(t.direccion) return `https://maps.google.com/?q=${encodeURIComponent(t.direccion)}`;
  return null;
}

// Genera el HTML del enlace "Cómo llegar" para usar en cualquier vista
// Genera el HTML del enlace "Cómo llegar" para insertar en tarjetas
function mapsHtml(t, estilo) {
  const url = mapsLink(t);
  if(!url) return '';
  const base = 'display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#4A9EFF;text-decoration:none;';
  return `<a href="${url}" target="_blank" style="${base}${estilo||''}">🗺 Cómo llegar</a>`;
}

// Inicia o detiene el reconocimiento de voz para un campo dado
function startVoice(field, btnId, resId) {
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Reconocimiento de voz no disponible. Usa Chrome en Android.');
    return;
  }
  // Si ya está escuchando, parar al tocar de nuevo
  if(AppState.listening) { AppState.listening = false; if(AppState.recognition) AppState.recognition.stop(); return; }

  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  AppState.recognition = new Rec();
  AppState.recognition.lang = 'es-ES';
  AppState.recognition.continuous = false;     // true causa bucle en Android Chrome
  AppState.recognition.interimResults = true;  // Resultados provisionales mientras habla

  const btn = document.getElementById(btnId);
  const res = document.getElementById(resId);
  btn.textContent = '⏹ Escuchando… (toca para parar)';
  btn.classList.add('voice-active');
  AppState.listening = true;

  let textoAcumulado = ''; // Acumula fragmentos finales confirmados

  // Se ejecuta en cada fragmento — final o provisional
  AppState.recognition.onresult = e => {
    let finalNuevo = '';
    let interimActual = '';
    for(let i = e.resultIndex; i < e.results.length; i++) {
      if(e.results[i].isFinal) finalNuevo += e.results[i][0].transcript + ' ';
      else interimActual += e.results[i][0].transcript; // Texto provisional
    }

    // Mostrar siempre el estado actual: final acumulado + provisional en curso
    res.className = 'voice-result show';
    const finalTexto = textoAcumulado + (finalNuevo ? ' ' + finalNuevo.trim() : '');
    res.innerHTML =
      (finalTexto.trim() ? '<span class="vr-final">“' + finalTexto.trim() + '”</span>' : '') +
      (interimActual ? '<span class="vr-interim"> ' + interimActual + '…</span>' : '');

    // Solo procesar cuando hay texto final nuevo
    if(finalNuevo.trim()) {
      textoAcumulado = (textoAcumulado ? textoAcumulado + ' ' : '') + finalNuevo.trim();
      const resultado = processVoice(field, textoAcumulado);
      // Mostrar feedback de resultado bajo el texto reconocido
      if(resultado && resultado.ok) {
        res.innerHTML += '<div class="vr-ok">✓ ' + resultado.msg + '</div>';
      } else if(resultado && !resultado.ok) {
        res.innerHTML += '<div class="vr-err">✗ ' + resultado.msg + '</div>';
      }
    }
  };

  // Error: si es 'no-speech' (silencio) se ignora; cualquier otro error para el micro
  AppState.recognition.onerror = e => {
    if(e.error !== 'no-speech') { AppState.listening = false; resetVoiceBtn(btn, field); }
  };

  // Al terminar: reinicio controlado con delay para evitar bucle en Android
  // (continuous=false + setTimeout evita el race condition de Android Chrome)
  AppState.recognition._restarting = false;
  AppState.recognition.onend = () => {
    if(AppState.listening && !AppState.recognition._restarting) {
      AppState.recognition._restarting = true;
      setTimeout(() => {
        if(AppState.listening) {
          try {
            AppState.recognition._restarting = false;
            AppState.recognition.start();
          } catch(err) {
            AppState.listening = false;
            resetVoiceBtn(btn, field);
          }
        }
      }, 150);
    } else if(!AppState.listening) {
      resetVoiceBtn(btn, field);
    }
  };

  AppState.recognition.start();
}

// Restaura el botón del micrófono a su texto y estilo original
// Restaura el botón de voz a su estado original tras finalizar
function resetVoiceBtn(btn, field) {
  AppState.listening = false;
  const labels = { cliente:'🎤 Dictar cliente', direccion:'🎤 Hablar dirección', zona:'🎤 Dictar zona', tipo:'🎤 Dictar tipo de trabajo', maquinaria:'🎤 Dictar maquinaria', horas:'🎤 Dictar horas', notas:'🎤 Dictar notas', obra:'🎤 Dictar nombre de obra' };
  btn.textContent = labels[field] || '🎤 Hablar';
  btn.classList.remove('voice-active');
}

// Interpreta el texto dictado y lo aplica al campo correcto del formulario
// Devuelve {ok: boolean, msg: string} para que el llamador muestre el feedback
// Procesa el texto dictado y lo asigna al campo correspondiente del form
function processVoice(field, texto) {
  const t = texto.toLowerCase();
  if(field==='clienteNuevo') {
    document.getElementById('cs-nuevo-nombre').value = texto;
    return { ok: true, msg: 'Nombre: ' + texto };
  } else if(field==='cliente') {
    // Buscar si coincide con un cliente existente (por nombre o sinónimo)
    const clientesActuales = getClientes();
    const tLow = texto.toLowerCase().trim();
    const match = clientesActuales.find(c =>
      c.nombre.toLowerCase().includes(tLow) || tLow.includes(c.nombre.toLowerCase())
    );
    if(match) {
      AppState.form.cliente = match.nombre;
      document.getElementById('cs-selected').textContent = match.nombre;
      const dd = document.getElementById('cs-dropdown');
      if(dd) dd.classList.remove('show');
      AppState.clienteDropdownOpen = false;
      return { ok: true, msg: 'Cliente: ' + match.nombre };
    } else {
      // No encontrado — mostrar lo dictado como aviso
      return { ok: false, msg: 'No se encontró "' + texto + '" en clientes. Selecciónalo manualmente.' };
    }
  } else if(field==='direccion') {
    AppState.form.direccion = texto;
    document.getElementById('f-direccion').value = texto;
    return { ok: true, msg: 'Dirección registrada' };
  } else if(field==='tipo') {
    return matchSinonimo('tipos', t, 'chips-tipo');
  } else if(field==='maquinaria') {
    return matchSinonimo('maquinarias', t, 'chips-maq');
  } else if(field==='horas') {
    // Convertir palabras numéricas a dígitos
    const NUMWORDS = {'una':1,'un':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
      'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,
      'trece':13,'catorce':14,'quince':15,'dieciséis':16,'diecisiete':17,
      'dieciocho':18,'diecinueve':19,'veinte':20};
    let numStr = t.replace(/horas?|h\b/g,'').trim();
    // Primero buscar dígito
    let num = null;
    const digitMatch = numStr.match(/\d+/);
    if(digitMatch) {
      num = parseInt(digitMatch[0]);
    } else {
      // Buscar palabra numérica
      for(const [word, val] of Object.entries(NUMWORDS)) {
        if(numStr.includes(word)) { num = val; break; }
      }
    }
    if(num && num >= 1 && num <= 24) {
      AppState.form.horas = num;
      document.getElementById('horas-display').textContent = AppState.form.horas;
      return { ok: true, msg: AppState.form.horas + 'h registradas' };
    }
    return { ok: false, msg: 'No se detectó número de horas. Di por ejemplo "tres horas" o "5 horas"' };
  } else if(field==='obra') {
    AppState.form.obra = texto;
    document.getElementById('f-obra').value = texto;
    return { ok: true, msg: 'Nombre de obra registrado' };
  } else if(field==='zona') {
    AppState.form.zona = texto;
    const fz = document.getElementById('f-zona');
    if(fz) fz.value = texto;
    return { ok: true, msg: 'Zona: ' + texto };
  } else if(field==='notas') {
    AppState.form.notas = texto;
    document.getElementById('f-notas').value = texto;
    if(t.includes('urgent')) setUrgencia('Urgente');
    else if(t.includes('alta')) setUrgencia('Alta');
    return { ok: true, msg: 'Nota registrada' };
  }
  return null;
}

// Busca en CONFIG.sinonimos si el texto dictado corresponde a algún valor de la lista
// Busca coincidencias entre el texto dictado y los sinónimos configurados
function matchSinonimo(field, texto, chipsId) {
  // Solo busca en activos (los archivados no deben activarse por voz)
  const lista = field==='tipos' ? getTiposActivos() : getMaqActiva();
  let matched = null;
  for(const val of lista) {
    const sins = CONFIG.sinonimos[val] || [];
    // Comprueba si el texto contiene algún sinónimo o el propio nombre del valor
    if(sins.some(s=>texto.includes(s)) || texto.includes(val.toLowerCase())) {
      matched = val; break;
    }
  }
  if(matched) {
    if(!AppState.form[field]) AppState.form[field] = [];
    if(!AppState.form[field].includes(matched)) AppState.form[field].push(matched);
    document.querySelectorAll(`#${chipsId} .chip-opt`).forEach(ch=>{
      ch.classList.toggle('selected', AppState.form[field].includes(ch.textContent));
    });
    return { ok: true, msg: matched };
  } else {
    return { ok: false, msg: 'No reconocido — selecciona manualmente' };
  }
}

// ════════════════════════════════════════════════════════
// RESUMEN — Paso 7: muestra todos los datos del formulario para revisión
// ════════════════════════════════════════════════════════
// Construye el paso 7 (resumen editable) con todos los campos del trabajo
function buildResumen() {
  document.getElementById('resumen-content').innerHTML = `
    <div class="resumen-field"><span class="resumen-key">Cliente</span><input class="resumen-input" id="re-cliente" value="${(AppState.form.cliente||'').replace(/"/g,'&quot;')}" oninput="AppState.form.cliente=this.value"></div>
    <div class="resumen-field"><span class="resumen-key">Nombre obra</span><input class="resumen-input" id="re-obra" value="${(AppState.form.obra||'').replace(/"/g,'&quot;')}" oninput="AppState.form.obra=this.value"></div>
    <div class="resumen-field"><span class="resumen-key">Dirección</span><input class="resumen-input" id="re-dir" value="${(AppState.form.direccion||'').replace(/"/g,'&quot;')}" oninput="AppState.form.direccion=this.value"></div>
    <div class="resumen-field"><span class="resumen-key">Zona</span><input class="resumen-input" id="re-zona" value="${(AppState.form.zona||'').replace(/"/g,'&quot;')}" oninput="AppState.form.zona=this.value"></div>
    <div class="resumen-field"><span class="resumen-key">GPS</span><span class="resumen-val" style="font-size:11px">${AppState.form.lat ? AppState.form.lat+', '+AppState.form.lng : 'No capturado'}</span></div>
    <div class="resumen-field"><span class="resumen-key">Tipo</span><input class="resumen-input" id="re-tipo" value="${((AppState.form.tipos&&AppState.form.tipos.length)?AppState.form.tipos.join(', '):'').replace(/"/g,'&quot;')}" oninput="AppState.form.tipos=this.value.split(',').map(x=>x.trim()).filter(Boolean)"></div>
    <div class="resumen-field"><span class="resumen-key">Maquinaria</span><input class="resumen-input" id="re-maq" value="${((AppState.form.maquinarias&&AppState.form.maquinarias.length)?AppState.form.maquinarias.join(', '):'').replace(/"/g,'&quot;')}" oninput="AppState.form.maquinarias=this.value.split(',').map(x=>x.trim()).filter(Boolean)"></div>
    <div class="resumen-field"><span class="resumen-key">Horas</span><input class="resumen-input" id="re-horas" type="number" min="1" max="24" value="${AppState.form.horas||4}" oninput="AppState.form.horas=parseInt(this.value)||4"></div>
    <div class="resumen-field"><span class="resumen-key">Urgencia</span>
      <select class="resumen-input" id="re-urgencia" onchange="AppState.form.urgencia=this.value">
        <option ${AppState.form.urgencia==='Normal'?'selected':''}>Normal</option>
        <option ${AppState.form.urgencia==='Alta'?'selected':''}>Alta</option>
        <option ${AppState.form.urgencia==='Urgente'?'selected':''}>Urgente</option>
      </select>
    </div>
    <div class="resumen-field" style="flex-direction:column;align-items:flex-start"><span class="resumen-key" style="margin-bottom:4px">Notas</span><textarea class="resumen-input" style="width:100%;min-height:60px;resize:vertical" oninput="AppState.form.notas=this.value">${AppState.form.notas||''}</textarea></div>
    <div class="resumen-field" style="flex-direction:column;align-items:flex-start">
      <span class="resumen-key" style="margin-bottom:6px">Operario (opcional)</span>
      <div style="display:flex;flex-wrap:wrap;gap:6px" id="re-operarios-chips">
        ${getOperariosCfg().filter(o=>o.activo!==false).map(o=>{
          const sel = (AppState.form.operarios||[]).includes(o.nombre);
          return '<button onclick="toggleOperarioResumen(\''+o.nombre+'\',this)" style="padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:'+(sel?'var(--accent)':'transparent')+';color:'+(sel?'#1C1C1C':'var(--text2)')+';transition:all .15s">'+o.nombre+'</button>';
        }).join('')}
      </div>
    </div>
  `;
}

// Selecciona o deselecciona un operario en el resumen (paso 7)
function toggleOperarioResumen(nombre, btn) {
  if(!AppState.form.operarios) AppState.form.operarios = [];
  if(AppState.form.operarios.includes(nombre)) {
    AppState.form.operarios = AppState.form.operarios.filter(o=>o!==nombre);
    btn.style.background = 'transparent';
    btn.style.color = 'var(--text2)';
  } else {
    AppState.form.operarios.push(nombre);
    btn.style.background = 'var(--accent)';
    btn.style.color = '#1C1C1C';
  }
}

// ════════════════════════════════════════════════════════
// GUARDAR TRABAJO — Crea el objeto trabajo y lo añade en Supabase
// ════════════════════════════════════════════════════════
// Valida y guarda el trabajo nuevo en Supabase; resetea el formulario
async function guardarTrabajo() {
  const nuevo = {
    id: Date.now(),
    ...AppState.form,
    tipo: (AppState.form.tipos||[]).join(', '),
    maquinaria: (AppState.form.maquinarias||[]).join(', '),
    estado: 'Pendiente presupuestar',
    fecha: new Date().toISOString().slice(0,10),
    fechaCreacion: new Date().toISOString(),
    diasProgramados: [],
    operarios: AppState.form.operarios || [],   // operarios seleccionados en paso 7
    jornadasParciales: [],
    horasReales: null,
    notasCierre: ''
  };
  showToast('Guardando...');
  await addTrab(nuevo);
  await loadTrab();
  showToast('✓ Trabajo guardado');
  resetForm();
  setTimeout(()=>{ showView('listado'); renderListado(); }, 800);
}

// Limpia el formulario y lo vuelve al estado inicial (paso 1, valores vacíos)
// Resetea el formulario de nuevo trabajo a su estado inicial
function resetForm() {
  AppState.form = { cliente:'', obra:'', direccion:'', zona:'', lat:null, lng:null, tipos:[], maquinarias:[], horas:4, urgencia:'Normal', notas:'', operarios:[] };
  // Reset selector cliente
  const csSelected = document.getElementById('cs-selected');
  if (csSelected) csSelected.textContent = 'Seleccionar cliente…';
  const csDropdown = document.getElementById('cs-dropdown');
  if (csDropdown) csDropdown.classList.remove('show');
  const csNuevo = document.getElementById('cs-nuevo-wrap');
  if (csNuevo) csNuevo.classList.remove('show');
  AppState.clienteDropdownOpen = false;
  ['f-obra','f-direccion','f-zona','f-notas'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  ['vres-1','vres-2','vres-3','vres-4','vres-5','vres-6'].forEach(id=>{ const el=document.getElementById(id); if(el){el.className='voice-result';el.textContent='';} });
  document.getElementById('horas-display').textContent = '4';
  setUrgencia('Normal');
  document.getElementById('gps-result').className = 'gps-result';
  document.getElementById('map-wrap').classList.remove('show');
  const btnMapa = document.getElementById('btn-abrirmapa');
  btnMapa.textContent = '📍 Localizar en el mapa';
  btnMapa.disabled = false;
  AppState.coordsTemp = { lat: null, lng: null };
  if(AppState.marcador && AppState.mapaLeaflet) { AppState.mapaLeaflet.removeLayer(AppState.marcador); AppState.marcador = null; } // Limpia el AppState.marcador del mapa
  showStep(1);
  buildChips(); // Reconstruye los chips sin ninguno seleccionado
}

// ════════════════════════════════════════════════════════
// LISTADO — Vista de trabajos con filtros y pestañas
// ════════════════════════════════════════════════════════

// Cambia entre las pestañas Pendientes / Programados / Realizados
// Cambia la pestaña activa del listado (Pendientes / Programados / Realizados)
function setLTab(tab) {
  AppState.ltabActual = tab;
  ['pendientes','programados','realizados'].forEach(t=>{
    document.getElementById('ltab-'+t).classList.toggle('active', t===tab);
  });
  const informe = document.getElementById('informe-rango');
  if(informe) informe.style.display = tab==='realizados' ? 'block' : 'none';
  renderListado();
}

// Rellena los desplegables de zona y maquinaria con los valores reales de los trabajos
// Actualiza los selectores de filtro (zona, maquinaria) con los valores disponibles
function buildFiltros() {
  const trabajos = getTrab();
  // Zonas únicas extraídas de los trabajos existentes, ordenadas alfabéticamente
  const zonas = [...new Set(trabajos.map(t=>t.zona).filter(Boolean))].sort();
  const lz = document.getElementById('l-zona');
  const cur = lz.value; // Guarda el filtro actual para no perderlo al redibujar
  lz.innerHTML = '<option value="">Todas las zonas</option>' + zonas.map(z=>`<option value="${z}">${z}</option>`).join('');
  lz.value = cur;
  // Maquinaria única extraída de los trabajos existentes
  const maqs = [...new Set(trabajos.map(t=>t.maquinaria).filter(Boolean))].sort();
  const lm = document.getElementById('l-maq');
  const curm = lm.value;
  lm.innerHTML = '<option value="">Toda la maquinaria</option>' + maqs.map(m=>`<option value="${m}">${m}</option>`).join('');
  lm.value = curm;
}

// Qué estados corresponden a cada pestaña del listado
const ESTADOS_PENDIENTES = ['Pendiente presupuestar','Presupuestado','Aceptado'];
const ESTADOS_PROGRAMADOS = ['Programado','En curso'];
const ESTADOS_REALIZADOS = ['Realizado'];

// Navegación mes en tab Realizados

// Navega al mes anterior o siguiente en la pestaña Realizados
function cambiarMesRealizados(dir) {
  AppState.realizadosMesOffset += dir;
  renderListado();
}

// Calcula el rango de fechas (desde/hasta) del mes visible en Realizados
function _getRangoMesRealizados() {
  const hoy = new Date();
  const anyo = hoy.getFullYear();
  const mes = hoy.getMonth() + AppState.realizadosMesOffset;
  const primerDia = new Date(anyo, mes, 1);
  const ultimoDia = new Date(anyo, mes + 1, 0);
  return {
    desde: fechaISO(primerDia),
    hasta: fechaISO(ultimoDia),
    titulo: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][((mes % 12) + 12) % 12] + ' ' + primerDia.getFullYear()
  };
}

// Dibuja el listado completo: stats, filtros y tarjetas de trabajos
// Renderiza las tarjetas de trabajos con filtros aplicados y agrupación por maquinaria
function renderListado() {
  buildFiltros();
  const trabajos = getTrab();
  const zona = document.getElementById('l-zona').value;
  const maq = document.getElementById('l-maq').value;
  const dir = document.getElementById('l-dir').value.trim().toLowerCase();

  // Actualizar título mes realizados
  if(AppState.ltabActual==='realizados') {
    const rango = _getRangoMesRealizados();
    const tituloEl = document.getElementById('realizados-mes-titulo');
    if(tituloEl) tituloEl.textContent = rango.titulo;
  }

  // Estadísticas resumen en la parte superior
  const activos = trabajos.filter(t=>!ESTADOS_REALIZADOS.includes(t.estado));
  const horasTotal = activos.reduce((a,b)=>a+(b.horas||0),0);
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-box"><div class="stat-n">${trabajos.length}</div><div class="stat-l">Total</div></div>
    <div class="stat-box"><div class="stat-n">${activos.length}</div><div class="stat-l">Activos</div></div>
    <div class="stat-box"><div class="stat-n">${horasTotal}h</div><div class="stat-l">H. previstas</div></div>
    <div class="stat-box"><div class="stat-n">${trabajos.filter(t=>ESTADOS_REALIZADOS.includes(t.estado)).length}</div><div class="stat-l">Hechos</div></div>
  `;

  // Filtra por pestaña activa + filtros de zona, maquinaria y búsqueda de texto
  let lista = trabajos.filter(t=>{
    const enTab = AppState.ltabActual==='pendientes' ? ESTADOS_PENDIENTES.includes(t.estado)
                : AppState.ltabActual==='programados' ? ESTADOS_PROGRAMADOS.includes(t.estado)
                : ESTADOS_REALIZADOS.includes(t.estado);
    if(!enTab) return false;
    if(zona && t.zona!==zona) return false;
    if(maq && t.maquinaria!==maq) return false;
    if(dir && !(
      (t.direccion||'').toLowerCase().includes(dir)||
      (t.zona||'').toLowerCase().includes(dir)||
      (t.cliente||'').toLowerCase().includes(dir)||
      (t.tipo||'').toLowerCase().includes(dir)
    )) return false;
    // Filtro de mes en Realizados (navegación ← →)
    if(AppState.ltabActual==='realizados') {
      const desde = document.getElementById('informe-desde')?.value;
      const hasta = document.getElementById('informe-hasta')?.value;
      const fechaT = t.fechaRealizado || t.fecha || '';
      // Si hay rango manual activo, úsalo; si no, filtra por mes navegado
      if(desde || hasta) {
        if(desde && fechaT < desde) return false;
        if(hasta && fechaT > hasta) return false;
      } else {
        const rango = _getRangoMesRealizados();
        if(fechaT < rango.desde || fechaT > rango.hasta) return false;
      }
    }
    return true;
  });

  if(lista.length===0) {
    document.getElementById('listado-content').innerHTML='<div class="empty-state">Sin trabajos en esta vista</div>';
    // Limpiar resumen informe
    const res = document.getElementById('informe-resumen');
    if(res) res.textContent = '';
    return;
  }

  // Resumen del informe si estamos en Realizados con fechas
  if(AppState.ltabActual==='realizados') {
    const res = document.getElementById('informe-resumen');
    if(res) {
      const totalHorasReales = lista.reduce((acc,t)=>{
        if(t.horasReales) Object.values(t.horasReales).forEach(h=>acc+=h);
        return acc;
      }, 0);
      res.textContent = `${lista.length} trabajo${lista.length!==1?'s':''} · ${totalHorasReales}h reales registradas`;
    }
  }

  // Agrupa los trabajos por maquinaria para mostrarlos con cabecera de grupo
  const grupos = {};
  lista.forEach(t=>{ if(!grupos[t.maquinaria]) grupos[t.maquinaria]=[]; grupos[t.maquinaria].push(t); });

  // Color de la píldora de maquinaria según el tipo
  // Colores de maquinaria: los predefinidos tienen color propio, el resto usa mc-man
  const MAQ_CLS = {'Minipala JCB':'mc-jcb','Volvo giratorio':'mc-volvo','Camión contenedor':'mc-camion','Niveladora':'mc-niv','Manual':'mc-man'};
  // Color de la píldora de estado
  const STATUS_CLS = {'Pendiente presupuestar':'sp-presupuestar','Presupuestado':'sp-presupuestado','Aceptado':'sp-aceptado','Programado':'sp-programado','En curso':'sp-programado','Realizado':'sp-realizado','Borrador':'sp-borrador'};
  // Siguiente estado en el flujo (para el botón de avance)
  const NEXT_ESTADO = {'Pendiente presupuestar':'Presupuestado','Presupuestado':'Aceptado','Aceptado':'Programado','Programado':'En curso','En curso':'Realizado'};

  let html='';
  Object.keys(grupos).sort().forEach(maq=>{
    const cls = MAQ_CLS[maq]||'mc-man';
    const totalH = grupos[maq].reduce((a,b)=>a+(b.horas||0),0);
    // Cabecera del grupo con nombre de máquina, número de trabajos y horas totales
    html+=`<div class="maq-group-header"><span class="maq-pill ${cls}">${maq}</span> ${grupos[maq].length} trabajo${grupos[maq].length>1?'s':''} · ${totalH}h</div>`;
    grupos[maq].forEach(t=>{
      const scls = STATUS_CLS[t.estado]||'sp-borrador';
      const next = NEXT_ESTADO[t.estado];
      // Extrae el cliente real: primera frase hasta guión o coma, máx 40 chars
      const clienteCorto = (t.cliente||'Sin cliente').split(/[—\-,]/)[0].trim().slice(0,40);
      const obraCorta = t.obra ? ' · '+t.obra.slice(0,30) : '';
      // Tipos como texto corto
      const tiposCorto = (t.tipos&&t.tipos.length) ? t.tipos.join(', ') : (t.tipo||'Sin tipo');
      // Notas o texto completo del cliente si hay diferencia
      const hayNotas = t.notas && t.notas.trim().length > 0;
      const clienteEsLargo = (t.cliente||'').length > 40;
      const notasHtml = (hayNotas || clienteEsLargo) ? `
        <div class="tc-notas-label">📝 Notas</div>
        <div class="tc-notas" onclick="this.classList.toggle('expandido')">${t.notas || t.cliente || ''}</div>` : '';
      // Horas reales para trabajos Realizados
      let horasRealesHtml = '';
      if(t.estado==='Realizado' && t.horasReales) {
        const lineas = Object.entries(t.horasReales).map(([m,h])=>`${m}: <strong>${h}h</strong>`).join(' · ');
        horasRealesHtml = `<div style="margin-top:6px;font-size:12px;color:#44CC77;font-family:'Courier New',monospace">✓ Horas reales: ${lineas}</div>`;
        if(t.notasCierre) horasRealesHtml += `<div style="font-size:11px;color:#7A6600;margin-top:2px">Cierre: ${t.notasCierre}</div>`;
        if(t.materiales) horasRealesHtml += `<div style="font-size:11px;color:var(--text3);margin-top:2px">🔧 Materiales: ${t.materiales}</div>`;
      }
      // Detectar si es programado con todas las fechas en el pasado
      const hoyISO2 = fechaISO(new Date());
      const esFechasPasadas = t.estado === 'Programado' &&
        t.diasProgramados && t.diasProgramados.length > 0 &&
        t.diasProgramados.every(d => d < hoyISO2);
      html+=`<div class="trabajo-card" id="tc-${t.id}" style="${esFechasPasadas?'border-left:3px solid var(--warning);border-color:rgba(245,158,11,0.4)':''}">
        <div class="tc-top">
          <div style="min-width:0;flex:1">
            ${esFechasPasadas?'<div style="display:inline-block;background:rgba(245,158,11,0.15);color:var(--warning);font-size:10px;font-weight:600;letter-spacing:.06em;padding:2px 7px;border-radius:4px;margin-bottom:5px">⚠ Fechas pasadas — reprograma o quita del calendario</div>':''}
            <div class="tc-titulo">${clienteCorto}${obraCorta} — ${tiposCorto}</div>
            <div class="tc-dir">${mapsLink(t)
            ? `<a href="${mapsLink(t)}" target="_blank" style="color:#4A9EFF;text-decoration:none">📍 ${t.direccion||'Sin dirección'}${t.zona?' · '+t.zona:''} — Cómo llegar →</a>`
            : `📍 ${t.direccion||'Sin dirección'}${t.zona?' · '+t.zona:''}`
          }</div>
          </div>
          <span class="status-pill ${scls}">${t.estado}</span>
        </div>
        ${notasHtml}
        ${horasRealesHtml}
        <div class="tc-meta" style="margin-top:8px">
          <span class="tc-chip">⏱ ${t.horas||0}h prev.</span>
          <span class="tc-chip">${t.urgencia||'Normal'}</span>
          <span class="tc-chip">${(()=>{const f=t.fechaRealizado||t.fecha||'';if(!f)return '';const d=new Date(f+'T12:00');return d.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});})()}</span>
          ${t.operarios&&t.operarios.length?`<span class="tc-chip">👷 ${t.operarios.join(', ')}</span>`:''}
        </div>
        <div class="tc-actions">
          ${esFechasPasadas?`<button class="tc-btn" onclick="quitarDelCalendario(${t.id})" style="color:var(--warning);border-color:rgba(245,158,11,0.4)">↩ Quitar del calendario</button>`:''}
          ${!esFechasPasadas&&next?`<button class="tc-btn" onclick="cambiarEstado(${t.id},'${next}')">→ ${next}</button>`:''}
          ${t.estado!=='Realizado'?`<button class="tc-btn realizado" onclick="cambiarEstado(${t.id},'Realizado')">✓ Realizado</button>`:''}
          ${t.estado==='Realizado'?`<button class="tc-btn" onclick="exportarTrabajoCSV(${t.id})" style="color:#44CC77;border-color:#44CC77">↓ CSV</button>`:''}
          ${t.estado==='Realizado'?`<button class="tc-btn" onclick="enviarTrabajoEmail(${t.id})" style="color:#FFD100;border-color:rgba(255,209,0,0.4)">✉ Email</button>`:''}
          <button class="tc-btn" onclick="abrirEditarTrabajo(${t.id})" style="background:transparent;color:var(--text2);border-color:var(--text)">✏ Editar</button>
          <button class="tc-btn" onclick="eliminar(${t.id})" style="margin-left:auto;color:var(--danger)">Borrar</button>
        </div>
      </div>`;
    });
  });
  document.getElementById('listado-content').innerHTML=html;
}

// Cambia el estado de un trabajo con confirmación previa
// Para 'Realizado' avisa que no se puede deshacer
// Cambia el estado de un trabajo (ej: Pendiente → Presupuestado)
async function cambiarEstado(id, nuevoEstado) {
  const trabajos = getTrab();
  const t = trabajos.find(x=>String(x.id)===String(id));
  if(!t) return;
  if(nuevoEstado === 'Realizado') {
    // Abrir modal de horas reales en lugar de confirm nativo
    AppState.modalTrabajoId = id;
    abrirModalRealizadoPorId(id);
    return;
  }
  const nombre = (t.cliente||'Sin cliente') + ' — ' + (t.direccion||'Sin dirección');
  if(!await showConfirm('¿Cambiar estado a "' + nuevoEstado + '"?', nombre)) return;
  t.estado = nuevoEstado;
  updateTrab(t).then(()=>{ renderListado(); });
  showToast('→ ' + nuevoEstado);
}

// Elimina un trabajo permanentemente (con confirmación)
// Elimina un trabajo con confirmación
async function eliminar(id) {
  if(!await showConfirm('¿Eliminar este trabajo?', 'Esta acción no se puede deshacer.', true)) return;
  await deleteTrab(id);
  renderListado();
}

// ════════════════════════════════════════════════════════
// QUITAR TRABAJO DEL CALENDARIO (fechas pasadas → vuelve a Aceptado)
// ════════════════════════════════════════════════════════

// Mueve un trabajo de Programado a Aceptado y borra sus fechas asignadas
async function quitarDelCalendario(id) {
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  if(!confirm(`¿Quitar "${t.cliente||'este trabajo'}" del calendario? Volverá a la bolsa de trabajos para reprogramar.`)) return;
  t.estado = 'Aceptado';
  t.diasProgramados = [];
  t.operarios = [];
  showToast('Guardando…');
  await updateTrab(t);
  renderListado();
  renderMes();
  showToast('✓ Trabajo quitado del calendario — reprógramalo desde la vista Mes');
}

// ════════════════════════════════════════════════════════
// EDITAR CLIENTE
// ════════════════════════════════════════════════════════


// Abre el modal de edición de un cliente existente con sus datos cargados
function abrirEditarCliente(id) {
  const c = getClientes().find(x=>String(x.id)===String(id));
  if(!c) return;
  AppState.editandoClienteId = id;
  document.getElementById('ec-nombre').value = c.nombre||'';
  document.getElementById('ec-telefono').value = c.telefono||'';
  document.getElementById('ec-observaciones').value = c.observaciones||'';
  document.getElementById('modal-editar-cliente').classList.add('show');
}

// Guarda los cambios del cliente editado en Supabase
async function guardarEdicionCliente() {
  if(!AppState.editandoClienteId) return;
  const nombre = document.getElementById('ec-nombre').value.trim();
  if(!nombre) { showToast('El nombre es obligatorio'); return; }
  const body = {
    nombre,
    telefono: document.getElementById('ec-telefono').value.trim(),
    observaciones: document.getElementById('ec-observaciones').value.trim()
  };
  showToast('Guardando…');
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/clientes?id=eq.${AppState.editandoClienteId}`, {
      method:'PATCH', headers:{...SUPA_HEADERS,'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if(!r.ok) throw new Error(await r.text());
    // Actualizar cache local
    const idx = CONFIG.clientes.findIndex(c=>String(c.id)===String(AppState.editandoClienteId));
    if(idx>-1) CONFIG.clientes[idx] = {...CONFIG.clientes[idx], ...body};
    cerrarModal('modal-editar-cliente');
    renderCfgClientes();
    showToast('✓ Cliente actualizado');
  } catch(e) {
    console.error(e);
    showToast('✗ Error al guardar cliente');
  }
}

// ════════════════════════════════════════════════════════
// EDITAR TRABAJO EXISTENTE
// ════════════════════════════════════════════════════════


// Abre el modal de edición de un trabajo existente con sus datos cargados
// ════════════════════════════════════════════════════════
// CHIPS DE EDICIÓN — Tipo, Maquinaria y Operarios
// ════════════════════════════════════════════════════════

function edRenderChips(containerId, items, selected, toggleFn) {
  const wrap = document.getElementById(containerId);
  if(!wrap) return;
  wrap.innerHTML = items.map(item => {
    const activo = selected.includes(item);
    return `<span onclick="${toggleFn}('${item.replace(/'/g,"\'")}')"
      style="display:inline-flex;align-items:center;padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;border:1.5px solid;transition:all .15s;
      ${activo
        ? 'background:var(--accent);color:var(--accent-dark);border-color:var(--accent);font-weight:600'
        : 'background:transparent;color:var(--text2);border-color:var(--border)'}">${item}</span>`;
  }).join('');
}

function edToggleTipo(val) {
  if(AppState.edTipos.includes(val)) AppState.edTipos = AppState.edTipos.filter(x=>x!==val);
  else AppState.edTipos.push(val);
  edRenderChips('ed-tipos-chips', getTiposActivos(), AppState.edTipos, 'edToggleTipo');
}

function edToggleMaq(val) {
  if(AppState.edMaquinarias.includes(val)) AppState.edMaquinarias = AppState.edMaquinarias.filter(x=>x!==val);
  else AppState.edMaquinarias.push(val);
  edRenderChips('ed-maq-chips', getMaqActiva(), AppState.edMaquinarias, 'edToggleMaq');
}

function edToggleOp(val) {
  if(AppState.edOperarios.includes(val)) AppState.edOperarios = AppState.edOperarios.filter(x=>x!==val);
  else AppState.edOperarios.push(val);
  edRenderChips('ed-ops-chips', getOperariosActivos(), AppState.edOperarios, 'edToggleOp');
}

function abrirEditarTrabajo(id) {
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  AppState.editandoId = id;
  document.getElementById('ed-cliente').value = t.cliente||'';
  document.getElementById('ed-obra').value = t.obra||'';
  document.getElementById('ed-direccion').value = t.direccion||'';
  document.getElementById('ed-zona').value = t.zona||'';
  // Chips de tipo, maquinaria y operarios
  AppState.edTipos = t.tipos && t.tipos.length ? [...t.tipos] : (t.tipo ? t.tipo.split(',').map(x=>x.trim()).filter(Boolean) : []);
  AppState.edMaquinarias = t.maquinarias && t.maquinarias.length ? [...t.maquinarias] : (t.maquinaria ? t.maquinaria.split(',').map(x=>x.trim()).filter(Boolean) : []);
  AppState.edOperarios = t.operarios && t.operarios.length ? [...t.operarios] : [];
  edRenderChips('ed-tipos-chips', getTiposActivos(), AppState.edTipos, 'edToggleTipo');
  edRenderChips('ed-maq-chips', getMaqActiva(), AppState.edMaquinarias, 'edToggleMaq');
  edRenderChips('ed-ops-chips', getOperariosActivos(), AppState.edOperarios, 'edToggleOp');
  document.getElementById('ed-horas').value = t.horas||4;
  document.getElementById('ed-urgencia').value = t.urgencia||'Normal';
  document.getElementById('ed-estado').value = t.estado||'Pendiente presupuestar';
  document.getElementById('ed-notas').value = t.notas||'';
  // Cargar fecha programada (primera si hay varias, o vacío)
  AppState.edFecha = (t.diasProgramados && t.diasProgramados.length > 0)
    ? [...t.diasProgramados].sort()[0]
    : '';
  edRenderFecha();
  document.getElementById('modal-editar').classList.add('show');
}

// Guarda los cambios del trabajo editado en Supabase
async function guardarEdicionTrabajo() {
  const trabajos = getTrab();
  const t = trabajos.find(x=>String(x.id)===String(AppState.editandoId));
  if(!t) return;
  const tiposArr = [...AppState.edTipos];
  const maqArr = [...AppState.edMaquinarias];
  t.cliente = document.getElementById('ed-cliente').value.trim();
  t.obra = document.getElementById('ed-obra').value.trim();
  t.direccion = document.getElementById('ed-direccion').value.trim();
  t.zona = document.getElementById('ed-zona').value.trim();
  t.tipos = tiposArr;
  t.tipo = tiposArr.join(', ');
  t.maquinarias = maqArr;
  t.maquinaria = maqArr.join(', ');
  t.operarios = [...AppState.edOperarios];
  t.horas = parseInt(document.getElementById('ed-horas').value)||4;
  t.urgencia = document.getElementById('ed-urgencia').value;
  t.estado = document.getElementById('ed-estado').value;
  t.notas = document.getElementById('ed-notas').value.trim();
  // Fechas: usar AppState.edFecha (fecha única)
  t.diasProgramados = AppState.edFecha ? [AppState.edFecha] : [];
  // Si hay fecha y estado es Aceptado → pasa a Programado
  if(AppState.edFecha && t.estado === 'Aceptado') t.estado = 'Programado';
  // Si no hay fecha y estado era Programado → vuelve a Aceptado (bolsa)
  if(!AppState.edFecha && t.estado === 'Programado') t.estado = 'Aceptado';
  showToast('Guardando...');
  await updateTrab(t);
  cerrarModal('modal-editar');
  renderListado();
  renderMes();
  showToast('✓ Trabajo actualizado');
}

// ════════════════════════════════════════════════════════
// ENVIAR CSV POR EMAIL (EmailJS — gratuito, sin backend)
// Para activar: crear cuenta en emailjs.com, crear servicio + plantilla
// y sustituir los 3 valores de abajo.
// ════════════════════════════════════════════════════════

const EMAILJS_SERVICE_ID  = 'service_5ubpuil';
const EMAILJS_TEMPLATE_ID = 'template_7xsr0tg';
const EMAILJS_PUBLIC_KEY  = 'up9JeR0IBI7TJyS33';

// Genera y envía por email el informe del mes visible vía EmailJS
function enviarInformePorEmail() {
  const trabajos = getTrab().filter(t=>ESTADOS_REALIZADOS.includes(t.estado));
  const rango = _getRangoMesRealizados();
  const filtrados = trabajos.filter(t=>{
    const f = t.fechaRealizado||t.fecha||'';
    return f >= rango.desde && f <= rango.hasta;
  });
  if(filtrados.length===0) { showToast('No hay trabajos en este mes'); return; }

  const totalHorasReales = filtrados.reduce((acc,t)=>{
    if(t.horasReales) Object.values(t.horasReales).forEach(h=>acc+=Number(h)||0);
    return acc;
  }, 0);
  const totalHorasPrev = filtrados.reduce((a,b)=>a+(b.horas||0),0);

  const sep = '════════════════════════════════════════';
  const lin = '────────────────────────────────────────';

  let cuerpo = '';
  cuerpo += `INFORME EXCAVACIONES PACO — ${rango.titulo.toUpperCase()}\n`;
  cuerpo += `${sep}\n`;
  cuerpo += `Trabajos realizados: ${filtrados.length}   Horas previstas: ${totalHorasPrev}h   Horas reales: ${totalHorasReales}h\n`;
  cuerpo += `${sep}\n`;

  filtrados.forEach((t, i) => {
    const horasR = t.horasReales
      ? Object.entries(t.horasReales).map(([m,h])=>`${m}: ${h}h`).join(' | ')
      : '—';
    const tipos = (t.tipos&&t.tipos.length) ? t.tipos.join(', ') : (t.tipo||'—');
    const maqs  = (t.maquinarias&&t.maquinarias.length) ? t.maquinarias.join(', ') : (t.maquinaria||'—');
    cuerpo += `\n─── ${i+1} / ${filtrados.length} ───────────────────────────────────\n`;
    cuerpo += `Cliente:      ${t.cliente||'—'}\n`;
    cuerpo += `Obra:         ${t.obra||'—'}\n`;
    cuerpo += `Dirección:    ${t.direccion||'—'}\n`;
    cuerpo += `Zona:         ${t.zona||'—'}\n`;
    cuerpo += `Tipo:         ${tipos}\n`;
    cuerpo += `Maquinaria:   ${maqs}\n`;
    cuerpo += `Horas prev.:  ${t.horas||0}h\n`;
    cuerpo += `Horas reales: ${horasR}\n`;
    cuerpo += `Fecha:        ${t.fechaRealizado||t.fecha||'—'}\n`;
    cuerpo += `Notas:        ${t.notasCierre||t.notas||'—'}\n`;
    cuerpo += `Materiales:   ${t.materiales||'—'}\n`;
  });

  cuerpo += `\n${sep}\n`;
  cuerpo += `Generado por Excavaciones Paco App`;

  showToast('Enviando informe…');

  emailjs.init(EMAILJS_PUBLIC_KEY);
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: 'xabitrash@gmail.com', // PRUEBA — cambiar a pmartinezpa75@hotmail.com cuando funcione
    mes: rango.titulo,
    cuerpo: cuerpo
  })
  .then(() => showToast('✓ Informe enviado a Paco'))
  .catch(e => { console.error(e); showToast('✗ Error al enviar. Revisa la consola.'); });
}

// ════════════════════════════════════════════════════════
// NAVEGACIÓN ENTRE VISTAS — Cambia entre Nuevo / Listado / Semana
// ════════════════════════════════════════════════════════
// Cambia la vista activa (Nuevo / Listado / Mes / Hoy / Config)
function showView(name) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  const idx = name==='captura'?0:name==='listado'?1:name==='mes'?2:name==='hoy'?3:4;
  document.querySelectorAll('.nav-tab')[idx].classList.add('active');
  if(name==='listado') renderListado();
  if(name==='mes') { renderMes(); renderBolsa(); }
  if(name==='hoy') renderOperario();
  if(name==='config') renderConfig();
}

// ════════════════════════════════════════════════════════
// MÓDULO MES — Vista mensual con bolsa de pendientes y programación
// ════════════════════════════════════════════════════════


// Navega al mes anterior o siguiente en la vista Mes
function cambiarMes(dir) {
  AppState.mesOffset += dir;
  renderMes();
}

// Activa o desactiva el filtro de maquinaria en la vista Mes
function setMesFiltroMaq(maq) {
  AppState.mesFiltroMaq = AppState.mesFiltroMaq === maq ? '' : maq; // toggle
  renderMes();
}

function setMesFiltroZona(zona) {
  AppState.mesFiltroZona = AppState.mesFiltroZona === zona ? '' : zona;
  renderMes();
}

// Calcula la fecha del primer día del mes visible
function getPrimerDiaMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + AppState.mesOffset, 1);
}

// Renderiza el grid mensual con píldoras de trabajos, días pasados en gris y barra de bolsa
function renderMes() {
  const primer = getPrimerDiaMes();
  const anyo = primer.getFullYear();
  const mes = primer.getMonth();
  const mesesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('mes-titulo').textContent = mesesNombre[mes] + ' ' + anyo;

  // Filtro maquinaria
  const maqDisponibles = [...new Set(getTrab()
    .filter(t => t.diasProgramados && t.diasProgramados.length > 0 && t.estado !== 'Realizado')
    .flatMap(t => t.maquinarias || []))].sort();
  const filtroEl = document.getElementById('mes-filtro-maq');
  if (filtroEl) {
    const fstyle = (bg, color, border) => `font-size:10px;padding:4px 10px;border-radius:20px;cursor:pointer;font-family:monospace;border:1px solid ${border};background:${bg};color:${color}`;
    let fhtml = '<span style="font-size:10px;color:var(--text2);font-family:monospace;align-self:center;margin-right:2px">Filtro:</span>';
    const bgTodas = AppState.mesFiltroMaq === '' ? '#FFD100' : 'var(--chip-bg)';
    const colTodas = AppState.mesFiltroMaq === '' ? '#1C1C1C' : '#444';
    fhtml += `<div style="${fstyle(bgTodas, colTodas, AppState.mesFiltroMaq===''?'#FFD100':'var(--border)')}" onclick="setMesFiltroMaq('')">Todas</div>`;
    maqDisponibles.forEach(m => {
      const activo = AppState.mesFiltroMaq === m;
      const bg = activo ? 'var(--accent)' : 'var(--chip-bg)';
      const col = activo ? '#1C1C1C' : '#444';
      const brd = activo ? 'var(--accent)' : 'var(--border)';
      fhtml += `<div style="${fstyle(bg, col, brd)}" onclick="setMesFiltroMaq('${m.replace(/'/g, "&apos;")}')">` + m + '</div>';
    });
    filtroEl.innerHTML = fhtml;
    filtroEl.style.display = maqDisponibles.length > 0 ? 'flex' : 'none';
  }

  // Filtro zona
  const zonasDisponibles = [...new Set(getTrab()
    .filter(t => t.diasProgramados && t.diasProgramados.length > 0 && t.estado !== 'Realizado' && t.zona)
    .map(t => t.zona))].sort();
  const filtroZonaEl = document.getElementById('mes-filtro-zona');
  if (filtroZonaEl) {
    if (zonasDisponibles.length > 0) {
      const fstyleZ = (bg, color, border) => `font-size:10px;padding:4px 10px;border-radius:20px;cursor:pointer;font-family:monospace;border:1px solid ${border};background:${bg};color:${color}`;
      let fhtmlZ = '<span style="font-size:10px;color:var(--text2);font-family:monospace;align-self:center;margin-right:2px">Zona:</span>';
      const bgTodas = AppState.mesFiltroZona === '' ? '#FFD100' : 'var(--chip-bg)';
      const colTodas = AppState.mesFiltroZona === '' ? '#1C1C1C' : '#444';
      fhtmlZ += `<div style="${fstyleZ(bgTodas, colTodas, AppState.mesFiltroZona===''?'#FFD100':'var(--border)')}" onclick="setMesFiltroZona('')">Todas</div>`;
      zonasDisponibles.forEach(z => {
        const activo = AppState.mesFiltroZona === z;
        const bg = activo ? 'var(--accent)' : 'var(--chip-bg)';
        const col = activo ? '#1C1C1C' : '#444';
        const brd = activo ? 'var(--accent)' : 'var(--border)';
        fhtmlZ += `<div style="${fstyleZ(bg, col, brd)}" onclick="setMesFiltroZona('${z.replace(/'/g, "&apos;")}')">${z}</div>`;
      });
      filtroZonaEl.innerHTML = fhtmlZ;
      filtroZonaEl.style.display = 'flex';
    } else {
      filtroZonaEl.style.display = 'none';
    }
  }

  // Cabecera días
  const header = document.getElementById('mes-grid-header');
  header.innerHTML = '';
  ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'mes-grid-header-dia';
    el.textContent = d;
    header.appendChild(el);
  });

  const trabajos = getTrab();
  const hoyISO = fechaISO(new Date());

  const primerDow = primer.getDay() === 0 ? 6 : primer.getDay() - 1;
  const inicio = new Date(primer);
  inicio.setDate(1 - primerDow);
  inicio.setHours(0,0,0,0);

  const ultimo = new Date(anyo, mes + 1, 0);

  const grid = document.getElementById('mes-grid');
  grid.innerHTML = '';

  let cursor = new Date(inicio);
  while (true) {
    const iso = fechaISO(cursor);
    const esMes = cursor.getMonth() === mes;
    const esHoy = iso === hoyISO;

    // Todos los trabajos del día
    const trabajosDia = trabajos.filter(t =>
      t.diasProgramados && t.diasProgramados.includes(iso) && t.estado !== 'Realizado'
    );
    // Trabajos visibles según filtro (para píldoras y carga)
    // Aplicar filtros combinados (maquinaria + zona)
    const trabajosVis = trabajosDia.filter(t => {
      const okMaq = !AppState.mesFiltroMaq || (t.maquinarias||[]).includes(AppState.mesFiltroMaq);
      const okZona = !AppState.mesFiltroZona || (t.zona||'') === AppState.mesFiltroZona;
      return okMaq && okZona;
    });
    const trabajosDim = trabajosDia.filter(t => {
      const okMaq = !AppState.mesFiltroMaq || (t.maquinarias||[]).includes(AppState.mesFiltroMaq);
      const okZona = !AppState.mesFiltroZona || (t.zona||'') === AppState.mesFiltroZona;
      return !(okMaq && okZona);
    });

    const cel = document.createElement('div');
    const hoyISOMes = fechaISO(new Date());
    const esPasado = esMes && iso < hoyISOMes && !esHoy;
    cel.className = 'mes-dia' + (esMes ? '' : ' otro-mes') + (esHoy ? ' hoy-mes' : '') + (esPasado ? ' dia-pasado' : '');

    // Punto de carga (basado en trabajos visibles)
    if (trabajosVis.length > 0 && esMes) {
      const carga = document.createElement('div');
      carga.className = 'mes-carga ' + (trabajosVis.length >= 4 ? 'lleno' : trabajosVis.length >= 2 ? 'media' : 'libre');
      cel.appendChild(carga);
    }

    // Número día
    const num = document.createElement('div');
    num.className = 'mes-dia-num';
    num.textContent = cursor.getDate();
    cel.appendChild(num);

    // Píldoras (máx 2 visibles + atenuadas)
    const pillsWrap = document.createElement('div');
    pillsWrap.className = 'mes-dia-pills';
    const mostrar = trabajosVis.slice(0, 2);
    mostrar.forEach(t => {
      const pill = document.createElement('div');
      const urg = (t.urgencia || '').toLowerCase();
      pill.className = 'mes-pill-mini' + (urg === 'urgente' ? ' urgente' : urg === 'alta' ? ' alta' : '');
      const nombre = (t.obra || t.cliente || 'Trabajo').split(/[-,]/)[0].trim().slice(0, 10);
      const hrsText = t.horas ? ' '+t.horas+'h' : '';
      pill.innerHTML = '<span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+nombre+'</span><span style="display:block;font-size:7px;opacity:0.65;font-family:monospace">'+hrsText+'</span>';
      if(urg==='urgente') pill.classList.add('mes-pill-urgente');
      else if(urg==='alta') pill.classList.add('mes-pill-alta');
      pill.onclick = (e) => { e.stopPropagation(); if(AppState.progTrabajoId) toggleDiaProg(isoCapturado); else abrirDetalle(t.id); };
      pillsWrap.appendChild(pill);
    });
    // Atenuadas (filtro activo, no coinciden)
    if (AppState.mesFiltroMaq && trabajosDim.length > 0 && trabajosVis.length < 2) {
      trabajosDim.slice(0, 2 - trabajosVis.length).forEach(t => {
        const pill = document.createElement('div');
        pill.className = 'mes-pill-mini';
        pill.style.opacity = '0.25';
        pill.textContent = (t.obra || t.cliente || 'Trabajo').split(/[-,]/)[0].trim().slice(0, 10);
        pill.onclick = (e) => { e.stopPropagation(); if(AppState.progTrabajoId) toggleDiaProg(isoCapturado); else abrirDetalle(t.id); };
        pillsWrap.appendChild(pill);
      });
    }
    const totalMas = trabajosDia.length > 2 ? trabajosDia.length - 2 : 0;
    if (totalMas > 0) {
      const mas = document.createElement('div');
      mas.className = 'mes-mas-mini';
      mas.textContent = '+' + totalMas + ' más';
      pillsWrap.appendChild(mas);
    }
    cel.appendChild(pillsWrap);

    if (esMes) {
      const isoCapturado = iso;
      if (AppState.progTrabajoId) {
        // Modo programación activa: días clicables para seleccionar/deseleccionar
        const selProg = AppState.progDias.includes(isoCapturado);
        if (selProg) cel.classList.add('prog-sel');
        else cel.classList.add('prog-disponible');
        cel.onclick = (e) => { e.stopPropagation(); toggleDiaProg(isoCapturado); };
        // Overlay transparente para capturar tap en móvil por encima de las píldoras
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;z-index:10;cursor:pointer';
        overlay.addEventListener('click', (e) => { e.stopPropagation(); toggleDiaProg(isoCapturado); });
        overlay.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); toggleDiaProg(isoCapturado); });
        cel.style.position = 'relative';
        cel.appendChild(overlay);
      }
      // Sin modo programación: click en celda vacía no hace nada (las píldoras abren detalle)
    }

    grid.appendChild(cel);
    cursor.setDate(cursor.getDate() + 1);
    if (cursor > ultimo && cursor.getDay() === 1) break;
  }

}

// ════════════════════════════════════════════════════════
// MODAL CONFIRMACIÓN — Sustituye confirm() nativo
// Uso: await showConfirm('¿Cerrar sesión?') → true/false
// peligro=true → botón rojo (acciones destructivas)
// ════════════════════════════════════════════════════════

// Muestra el modal de confirmación y devuelve una Promise que resuelve con true/false
function showConfirm(msg, sub, peligro) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-sub').textContent = sub || '';
  const btn = document.getElementById('confirm-ok-btn');
  btn.textContent = peligro ? 'Eliminar' : 'Aceptar';
  btn.className = 'modal-confirm-ok' + (peligro ? ' peligro' : '');
  document.getElementById('modal-confirm').classList.add('show');
  return new Promise(resolve => { AppState.confirmResolve = resolve; });
}

// Resuelve la Promise del modal de confirmación
function confirmRespuesta(ok) {
  document.getElementById('modal-confirm').classList.remove('show');
  if (AppState.confirmResolve) { AppState.confirmResolve(ok); AppState.confirmResolve = null; }
}

// ════════════════════════════════════════════════════════
// TOAST — Mensaje emergente breve en la parte inferior
// ════════════════════════════════════════════════════════
// Muestra una notificación temporal en la parte inferior de la pantalla
function showToast(msg, esError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = esError ? '#3A0000' : '';
  t.style.borderColor = esError ? '#FF4444' : '';
  t.style.color = esError ? '#FF8888' : '';
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    t.style.background = '';
    t.style.borderColor = '';
    t.style.color = '';
  }, esError ? 3500 : 2200);
}

// ════════════════════════════════════════════════════════
// BACKUP — Exportar e importar datos en formato JSON
// Exportar: descarga un archivo con fecha en el nombre (va a la carpeta Descargas)
// Importar: fusiona con los datos existentes sin duplicar (detecta por ID)
// ════════════════════════════════════════════════════════

// Exporta todos los datos (trabajos + config) como archivo JSON descargable
function exportarJSON() {
  const trabajos = getTrab();
  if(trabajos.length === 0) { showToast('No hay trabajos para exportar'); return; }
  const fecha = new Date().toISOString().slice(0,10);
  const nombre = 'excavaciones_paco_' + fecha + '.json';
  // Envuelve los trabajos en un objeto con metadatos para identificar el archivo
  const datos = JSON.stringify({
    exportado: new Date().toISOString(),
    version: '1.0',
    empresa: 'Excavaciones Paco',
    total: trabajos.length,
    trabajos: trabajos
  }, null, 2);
  // Crea un enlace de descarga temporal y lo pulsa automáticamente
  const blob = new Blob([datos], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url); // Libera la memoria del enlace temporal
  document.getElementById('backup-info').textContent = '✓ Exportado: ' + nombre + ' (' + trabajos.length + ' trabajos)';
  showToast('✓ Datos exportados');
}

// Importa datos desde un archivo JSON fusionando sin duplicar
function importarJSON(input) {
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const datos = JSON.parse(e.target.result);
      // Acepta tanto el formato envuelto {trabajos:[]} como un array directo []
      const trabajos = Array.isArray(datos) ? datos : (datos.trabajos || []);
      if(!trabajos.length) { showToast('El archivo está vacío o no es válido'); return; }
      const actuales = getTrab();
      // Detecta duplicados por ID: solo añade los que no existen ya
      const idsActuales = new Set(actuales.map(t => t.id));
      const nuevos = trabajos.filter(t => !idsActuales.has(t.id));
      const fusionados = [...actuales, ...nuevos];
      // Ordena por fecha de creación descendente (más reciente primero)
      fusionados.sort((a,b) => (b.fechaCreacion||'').localeCompare(a.fechaCreacion||''));
      saveTrab(fusionados);
      renderListado();
      const msg = nuevos.length > 0
        ? '✓ ' + nuevos.length + ' trabajos importados (' + actuales.length + ' ya existían)'
        : 'Todos los trabajos ya estaban en el sistema';
      document.getElementById('backup-info').textContent = msg;
      showToast(msg);
    } catch(err) {
      showToast('Error: archivo JSON no válido');
    }
    input.value = ''; // Limpia el input para que se pueda volver a usar
  };
  reader.readAsText(file);
}


// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// renderBolsa — Actualiza la bolsa de pendientes de programar
// Usada por renderMes() y tras cualquier acción que cambie estados
// ════════════════════════════════════════════════════════
// Renderiza la bolsa de trabajos pendientes de programar bajo el calendario
function renderBolsa() {
  const trabajos = getTrab();
  const pendientes = trabajos.filter(t => t.estado !== 'Realizado' && (!t.diasProgramados || t.diasProgramados.length === 0));
  document.getElementById('bolsa-count').textContent = pendientes.length;
  const bolsa = document.getElementById('bolsa-trabajos');
  if (pendientes.length === 0) {
    bolsa.innerHTML = '<div class="empty-state">No hay trabajos pendientes de programar</div>';
    return;
  }
  bolsa.innerHTML = '';
  pendientes.forEach(t => {
    const urg = (t.urgencia || '').toLowerCase();
    const esActivo = String(t.id) === String(AppState.progTrabajoId);
    const div = document.createElement('div');
    div.className = 'bolsa-trabajo' + (urg === 'urgente' ? ' urgente' : urg === 'alta' ? ' alta' : '') + (esActivo ? ' bolsa-activo' : '');
    const nombreMostrar = t.obra ? t.obra + ' · ' + (t.cliente || '') : (t.cliente || 'Sin cliente');
    div.innerHTML = '<div class="bolsa-info">'
      + '<div class="bolsa-cliente">' + nombreMostrar + '</div>'
      + '<div class="bolsa-dir">' + (t.direccion || 'Sin dirección') + '</div>'
      + '<div class="bolsa-meta">'
      + (t.tipos || []).map(x => '<span class="bolsa-chip">' + x + '</span>').join('')
      + (t.maquinarias || []).map(x => '<span class="bolsa-chip">⚙ ' + x + '</span>').join('')
      + (t.horas ? '<span class="bolsa-chip">⏱ ' + t.horas + 'h</span>' : '')
      + '</div></div>'
      + '<div class="bolsa-btn" style="color:' + (esActivo ? '#FFD100' : '#555') + '">' + (esActivo ? '●' : '+') + '</div>';
    div.onclick = () => activarProgramacion(t.id);
    bolsa.appendChild(div);
  });
}

// ════════════════════════════════════════════════════════
// MÓDULO 3 — PROGRAMACIÓN
// Estado compartido por el modal de programar y la vista Mes
// ════════════════════════════════════════════════════════


// Nombres cortos y largos de los días (índice 0 = lunes, 6 = domingo)
const DIAS_CORTO = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DIAS_LARGO = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// Convierte un objeto Date a string 'YYYY-MM-DD' usando hora LOCAL (evita desfase UTC)
// Convierte un objeto Date a string ISO YYYY-MM-DD en hora local
function fechaISO(d) {
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return d.getFullYear()+'-'+mm+'-'+dd;
}

// ════════════════════════════════════════════════════════
// PROGRAMACIÓN EN VISTA MES
// Estado de la sesión de programación activa
// ════════════════════════════════════════════════════════

// Activa un trabajo para programar desde la bolsa
// Activa el modo programación para un trabajo de la bolsa
function activarProgramacion(id) {
  if (AppState.progTrabajoId === id) {
    // Segundo toque en el mismo trabajo → cancelar
    cancelarProgramacion();
    return;
  }
  AppState.progTrabajoId = id;
  AppState.progDias = [];
  AppState.progOperarios = [];
  renderBolsa();
  renderMes();
  actualizarBarraProgramar();
}

// Cancela la programación en curso
// Cancela el modo programación sin guardar cambios
function cancelarProgramacion() {
  AppState.progTrabajoId = null;
  AppState.progDias = [];
  AppState.progOperarios = [];
  renderBolsa();
  renderMes();
  document.getElementById('barra-programar').style.display = 'none';
  document.getElementById('mes-prog-hint').style.display = 'none';
}

// Marca o desmarca un día en la vista mes (solo en modo programación activa)
// Selecciona o deselecciona un día del calendario en modo programación; bloquea días pasados
function toggleDiaProg(iso) {
  if (!AppState.progTrabajoId) return;
  // Bloquear días pasados
  const hoy = fechaISO(new Date());
  if (iso < hoy) { showToast('No se puede programar en días pasados'); return; }
  if (AppState.progDias.includes(iso)) {
    AppState.progDias = AppState.progDias.filter(d => d !== iso);
  } else {
    AppState.progDias.push(iso);
  }
  renderMes();
  actualizarBarraProgramar();
}

// Actualiza la barra de confirmación con el estado actual
// Actualiza la barra fija inferior con los días seleccionados y operarios
function actualizarBarraProgramar() {
  const barra = document.getElementById('barra-programar');
  const hint = document.getElementById('mes-prog-hint');
  if (!AppState.progTrabajoId) { barra.style.display = 'none'; hint.style.display = 'none'; return; }

  const t = getTrab().find(x => String(x.id) === String(AppState.progTrabajoId));
  if (!t) return;

  hint.style.display = AppState.progDias.length === 0 ? 'block' : 'none';
  barra.style.display = 'block';

  // Nombre del trabajo
  const nombre = (t.obra || t.cliente || 'Sin cliente') + (t.obra ? ' · ' + t.cliente : '');
  const bprogNombre = document.getElementById('bprog-nombre');
  if(bprogNombre) bprogNombre.textContent = nombre;

  // Días seleccionados
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const diasTexto = AppState.progDias.length === 0
    ? 'Sin días seleccionados — toca el calendario'
    : AppState.progDias.sort().map(iso => {
        const d = new Date(iso + 'T12:00');
        return DIAS_CORTO[d.getDay() === 0 ? 6 : d.getDay() - 1] + ' ' + d.getDate() + ' ' + meses[d.getMonth()];
      }).join(' · ');
  const bProgDias = document.getElementById('bprog-dias');
  if(bProgDias) bProgDias.textContent = '📅 ' + diasTexto;

  // Chips de operarios
  const opWrap = document.getElementById('bprog-operarios');
  if(!opWrap) return;
  opWrap.innerHTML = '';
  OPERARIOS.forEach(op => {
    const chip = document.createElement('div');
    const sel = AppState.progOperarios.includes(op);
    chip.style.cssText = 'padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-family:Georgia,serif;border:1px solid '+(sel?'#FFD100':'rgba(255,209,0,0.4)')+';background:'+(sel?'#FFD100':'var(--card-bg)')+';color:'+(sel?'#1C1C1C':'var(--text)');
    chip.textContent = op;
    chip.onclick = () => {
      if (AppState.progOperarios.includes(op)) AppState.progOperarios = AppState.progOperarios.filter(x => x !== op);
      else AppState.progOperarios.push(op);
      actualizarBarraProgramar();
    };
    opWrap.appendChild(chip);
  });
}

// Confirma la programación desde la vista mes
// Guarda la programación del trabajo (días + operarios) en Supabase
async function confirmarProgramar() {
  if (AppState.progDias.length === 0) { showToast('Toca uno o más días en el calendario'); return; }
  if (AppState.progOperarios.length === 0) {
    const ok = await showConfirm('¿Programar sin asignar operario?', 'El trabajo quedará programado pero sin operario asignado.');
    if (!ok) return;
  }
  const t = getTrab().find(x => String(x.id) === String(AppState.progTrabajoId));
  if (!t) return;
  t.diasProgramados = AppState.progDias;
  t.operarios = AppState.progOperarios;
  t.estado = 'Programado';
  showToast('Guardando...');
  cancelarProgramacion();
  await updateTrab(t);
  await loadTrab();
  renderMes();
  renderBolsa();
  showToast('✓ Trabajo programado');
}

// ════════════════════════════════════════════════════════
// MODAL DETALLE — Muestra los datos completos de un trabajo programado
// Desde aquí se puede marcar como Realizado o quitar de la semana
// ════════════════════════════════════════════════════════
// Abre el modal de detalle de un trabajo con todos sus campos
function abrirDetalle(id) {
  AppState.modalTrabajoId = id;
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  document.getElementById('mdet-titulo').textContent = t.cliente || 'Sin cliente';
  const campos = [
    ['Obra', t.obra||'—'],
    ['Dirección', t.direccion ? (mapsLink(t) ? `<a href="${mapsLink(t)}" target="_blank" style="color:#4A9EFF;text-decoration:none">📍 ${t.direccion} — Cómo llegar →</a>` : t.direccion) : '—'],
    ['Trabajo', (t.tipos||[]).join(', ')||'—'],
    ['Maquinaria', (t.maquinarias||[]).join(', ')||'—'],
    ['Horas previstas', t.horas ? t.horas+'h' : '—'],
    ['Operarios', (t.operarios||[]).join(', ')||'—'],
    ['Días asignados', (t.diasProgramados||[]).map(d=>{ const f=new Date(d+'T12:00'); return DIAS_LARGO[f.getDay()===0?6:f.getDay()-1]+' '+f.getDate(); }).join(', ')||'—'],
    ['Urgencia', t.urgencia||'Normal'],
    ['Notas', t.notas||'—'],
    ['Estado', t.estado||'—'],
  ];
  // Horas reales si existe
  let horasRealesHtml = '';
  if(t.horasReales) {
    const lineas = Object.entries(t.horasReales).map(([m,h])=>`${m}: ${h}h`).join(' · ');
    horasRealesHtml = `<div class="detail-field"><span class="detail-key">Horas reales</span><span class="detail-val" style="color:var(--success)">${lineas}</span></div>`;
  }
  // Jornadas parciales si existen
  let jornadasHtml = '';
  if(t.jornadasParciales && t.jornadasParciales.length) {
    const items = t.jornadasParciales.map(j=>{
      const hs = Object.entries(j.horas||{}).map(([m,h])=>`${m}: ${h}h`).join(', ');
      return `<div style="font-size:12px;color:#C9A800;margin-bottom:3px">${j.fecha} — ${hs}${j.notas?' · '+j.notas:''}</div>`;
    }).join('');
    jornadasHtml = `<div class="detail-field" style="flex-direction:column;align-items:flex-start"><span class="detail-key" style="margin-bottom:4px">Jornadas parciales</span>${items}</div>`;
  }
  document.getElementById('mdet-campos').innerHTML = campos.map(([k,v])=>
    '<div class="detail-field"><span class="detail-key">'+k+'</span><span class="detail-val">'+v+'</span></div>'
  ).join('') + horasRealesHtml + jornadasHtml;
  // Botón jornada parcial solo si no está Realizado
  const btnReal = document.querySelector('#modal-detalle .btn-realizado-modal');
  const btnDesp = document.querySelector('#modal-detalle .btn-desprogramar');
  if(t.estado === 'Realizado') {
    btnReal.style.display = 'none';
    btnDesp.style.display = 'none';
  } else {
    btnReal.style.display = '';
    btnDesp.style.display = '';
  }
  // Botón Editar — visible siempre excepto si está Realizado
  const btnEditar = document.getElementById('btn-editar-desde-detalle');
  if(btnEditar) btnEditar.style.display = t.estado === 'Realizado' ? 'none' : '';

  document.getElementById('modal-detalle').classList.add('show');
}

function editarDesdeDetalle() {
  if(!AppState.modalTrabajoId) return;
  cerrarModal('modal-detalle');
  abrirEditarTrabajo(AppState.modalTrabajoId);
}

// Abre el modal de horas reales desde el botón del modal detalle
// Abre el modal para marcar como realizado el trabajo del modal de detalle
function abrirModalRealizado() {
  if(!AppState.modalTrabajoId) return;
  abrirModalRealizadoPorId(AppState.modalTrabajoId);
}

// Maquinaria editable en el modal Realizado

// Renderiza la lista editable de máquinas con sus horas reales en el modal de realizado
function renderMrealMaquinas() {
  const t = getTrab().find(x=>String(x.id)===String(AppState.modalTrabajoId));
  let html = '';
  AppState.mrealMaquinas.forEach((m, i) => {
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="flex:1;font-size:13px;color:var(--text);font-weight:500">${m}</span>
      <input type="number" id="mreal-horas-${i}" min="0" max="24" step="0.5" value="${t&&t.horas?t.horas:4}"
        style="width:72px;text-align:center;padding:8px;background:var(--card);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:15px">
      <span style="font-size:12px;color:var(--text2)">h</span>
      <button onclick="mrealQuitarMaq(${i})" style="background:none;border:none;color:var(--danger);font-size:18px;cursor:pointer;padding:4px" title="Quitar">✕</button>
    </div>`;
  });
  const todasMaq = getMaqActiva().filter(m => !AppState.mrealMaquinas.includes(m));
  if (todasMaq.length > 0) {
    html += `<div style="display:flex;gap:8px;margin-top:6px">
      <select id="mreal-add-maq" style="flex:1;padding:8px;background:var(--card);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">
        <option value="">+ Añadir máquina…</option>
        ${todasMaq.map(m=>`<option value="${m}">${m}</option>`).join('')}
      </select>
      <button onclick="mrealAddMaq()" style="padding:8px 14px;background:var(--chip-bg);color:var(--text2);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer">Añadir</button>
    </div>`;
  }
  document.getElementById('mreal-maquinas').innerHTML = html;
}

// Quita una máquina de la lista editable del modal de realizado
function mrealQuitarMaq(idx) {
  AppState.mrealMaquinas.splice(idx, 1);
  renderMrealMaquinas();
}

// Añade una máquina al modal de realizado desde el selector
function mrealAddMaq() {
  const sel = document.getElementById('mreal-add-maq');
  if (!sel || !sel.value) return;
  AppState.mrealMaquinas.push(sel.value);
  renderMrealMaquinas();
}

// Renderiza chips de operarios en el modal de realizado
function renderMrealOperarios() {
  const wrap = document.getElementById('mreal-operarios');
  if(!wrap) return;
  const ops = getOperariosActivos();
  wrap.innerHTML = ops.map(op => {
    const activo = AppState.mrealOperarios.includes(op);
    return `<span onclick="mrealToggleOp('${op.replace(/'/g,"\'")}')"
      style="display:inline-flex;align-items:center;padding:6px 14px;border-radius:20px;font-size:13px;cursor:pointer;border:1.5px solid;transition:all .15s;
      ${activo
        ? 'background:var(--accent);color:var(--accent-dark);border-color:var(--accent);font-weight:600'
        : 'background:var(--card);color:var(--text2);border-color:var(--border)'}">${op}</span>`;
  }).join('');
}

function mrealToggleOp(val) {
  if(AppState.mrealOperarios.includes(val))
    AppState.mrealOperarios = AppState.mrealOperarios.filter(x=>x!==val);
  else
    AppState.mrealOperarios.push(val);
  renderMrealOperarios();
}

// Abre el modal de horas reales para un trabajo concreto
// Abre el modal de realizado directamente por ID de trabajo
function abrirModalRealizadoPorId(id) {
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  AppState.modalTrabajoId = id;
  document.getElementById('mreal-nombre').textContent = (t.cliente||'Sin cliente') + ' — ' + (t.obra||t.direccion||'Sin dirección');
  AppState.mrealMaquinas = t.maquinarias && t.maquinarias.length ? [...t.maquinarias] : (t.maquinaria ? t.maquinaria.split(', ') : ['General']);
  AppState.mrealOperarios = t.operarios && t.operarios.length ? [...t.operarios] : [];
  renderMrealMaquinas();
  renderMrealOperarios();
  // Fecha real: por defecto hoy, pero editable
  const fechaInput = document.getElementById('mreal-fecha');
  if(fechaInput) fechaInput.value = new Date().toISOString().slice(0,10);
  document.getElementById('mreal-notas').value = '';
  document.getElementById('mreal-materiales').value = '';
  cerrarModal('modal-detalle');
  document.getElementById('modal-realizado').classList.add('show');
}

// Confirma el trabajo como realizado guardando horas reales
// Confirma el trabajo como realizado guardando horas reales, notas y materiales
async function confirmarRealizado() {
  const trabajos = getTrab();
  const t = trabajos.find(x=>String(x.id)===String(AppState.modalTrabajoId));
  if(!t) return;
  // Recoger horas reales por máquina (usando la lista editable AppState.mrealMaquinas)
  const horasReales = {};
  AppState.mrealMaquinas.forEach((m, i) => {
    const v = parseFloat(document.getElementById(`mreal-horas-${i}`)?.value) || 0;
    horasReales[m] = v;
  });
  // Actualizar maquinarias del trabajo si han cambiado
  if (AppState.mrealMaquinas.length > 0) t.maquinarias = [...AppState.mrealMaquinas];
  t.estado = 'Realizado';
  t.diasProgramados = [];
  t.horasReales = horasReales;
  t.notasCierre = document.getElementById('mreal-notas').value.trim();
  t.materiales = document.getElementById('mreal-materiales').value.trim();
  // Fecha real de realización (puede diferir de la fecha programada)
  const fechaRealInput = document.getElementById('mreal-fecha');
  t.fechaRealizado = (fechaRealInput && fechaRealInput.value)
    ? fechaRealInput.value
    : new Date().toISOString().slice(0,10);
  // Operarios que realizaron el trabajo
  if(AppState.mrealOperarios.length > 0) t.operarios = [...AppState.mrealOperarios];
  cerrarModal('modal-realizado');
  showToast('Guardando...');
  await updateTrab(t);
  await loadTrab();
  renderListado();
  renderMes();
  renderBolsa();
  showToast('✓ Trabajo realizado');
}

// Abre modal para añadir jornada parcial
// Abre el modal para registrar una jornada parcial de trabajo
function abrirModalJornada(id) {
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  AppState.modalTrabajoId = id;
  document.getElementById('mjor-nombre').textContent = (t.cliente||'Sin cliente') + ' — ' + (t.direccion||'Sin dirección');
  document.getElementById('mjor-fecha').value = new Date().toISOString().slice(0,10);
  const maquinas = t.maquinarias && t.maquinarias.length ? t.maquinarias : (t.maquinaria ? t.maquinaria.split(', ') : ['General']);
  let html = '';
  maquinas.forEach((m,i) => {
    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="flex:1;font-size:13px;color:#C9A800">${m}</span>
      <input type="number" id="mjor-horas-${i}" min="0" max="24" step="0.5" value="4"
        style="width:80px;text-align:center;padding:8px;background:var(--card);border:1px solid rgba(255,209,0,0.3);border-radius:8px;color:#FFD100;font-size:15px">
      <span style="font-size:12px;color:#7A6600">h</span>
    </div>`;
  });
  document.getElementById('mjor-maquinas').innerHTML = html;
  document.getElementById('mjor-notas').value = '';
  document.getElementById('modal-jornada').classList.add('show');
}

// Guarda jornada parcial en el trabajo
// Guarda la jornada parcial con horas por máquina y notas
async function confirmarJornada() {
  const trabajos = getTrab();
  const t = trabajos.find(x=>String(x.id)===String(AppState.modalTrabajoId));
  if(!t) return;
  const maquinas = t.maquinarias && t.maquinarias.length ? t.maquinarias : (t.maquinaria ? t.maquinaria.split(', ') : ['General']);
  const horas = {};
  maquinas.forEach((m,i) => { horas[m] = parseFloat(document.getElementById(`mjor-horas-${i}`).value)||0; });
  if(!t.jornadasParciales) t.jornadasParciales = [];
  t.jornadasParciales.push({
    fecha: document.getElementById('mjor-fecha').value,
    horas,
    notas: document.getElementById('mjor-notas').value.trim()
  });
  cerrarModal('modal-jornada');
  showToast('Guardando jornada...');
  await updateTrab(t);
  await loadTrab();
  renderListado();
  showToast('✓ Jornada registrada');
}

// Acceso directo al modal de realizado desde el modal de detalle
function realizarDesdeDetalle() {
  abrirModalRealizado();
}

// Quita el trabajo de la semana sin marcarlo como realizado (vuelve a la bolsa)
// Quita el trabajo del calendario desde el modal de detalle
async function desprogramarDesdeDetalle() {
  const trabajos = getTrab();
  const t = trabajos.find(x=>String(x.id)===String(AppState.modalTrabajoId));
  if(!t) return;
  if(!await showConfirm('¿Quitar de la programación?', t.cliente||'Sin cliente')) return;
  t.diasProgramados = [];
  t.operarios = [];
  t.estado = 'Aceptado';
  cerrarModal('modal-detalle');
  await updateTrab(t);
  await loadTrab();
  renderMes();
  renderBolsa();
  showToast('↩ Trabajo desprogramado');
}

// Cierra cualquier modal ocultando su overlay
// Cierra un modal por su ID quitando la clase show
function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
  // Solo resetear si no hay otro modal abierto (comprobar DESPUÉS de quitar show)
  setTimeout(() => {
    const hayModalAbierto = document.querySelector('.modal-overlay.show');
    if (!hayModalAbierto) AppState.modalTrabajoId = null;
  }, 50);
}

// ════════════════════════════════════════════════════════
// MÓDULO 6 — INFORME DE HORAS Y EXPORTACIÓN CSV
// ════════════════════════════════════════════════════════

// Limpia el rango de fechas del informe
// Limpia el rango de fechas del panel de exportación en Realizados
function limpiarRango() {
  document.getElementById('informe-desde').value = '';
  document.getElementById('informe-hasta').value = '';
  renderListado();
}

// Convierte un array de trabajos a CSV y lo descarga
// Genera y descarga un archivo CSV con los trabajos indicados
function descargarCSV(trabajos, nombreArchivo) {
  const filas = [];
  // Cabecera
  filas.push(['Cliente','Obra','Dirección','Zona','Tipo de trabajo','Maquinaria','Horas previstas','Horas reales','Fecha realización','Notas cierre','Materiales'].join(';'));
  trabajos.forEach(t => {
    const horasReales = t.horasReales
      ? Object.entries(t.horasReales).map(([m,h])=>`${m}: ${h}h`).join(' | ')
      : '—';
    filas.push([
      t.cliente||'',
      t.obra||'',
      t.direccion||'',
      t.zona||'',
      (t.tipos||[]).join(', ')||t.tipo||'',
      (t.maquinarias||[]).join(', ')||t.maquinaria||'',
      t.horas||0,
      horasReales,
      t.fechaRealizado||t.fecha||'',
      t.notasCierre||'',
      t.materiales||''
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';'));
  });
  const csv = '\uFEFF' + filas.join('\n'); // BOM para que Excel lo abra bien
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

// Exporta un trabajo individual como CSV
// Descarga el CSV de un único trabajo realizado
function exportarTrabajoCSV(id) {
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  const nombre = (t.cliente||'trabajo').replace(/[^a-zA-Z0-9áéíóúñ\s]/g,'').trim().slice(0,30);
  descargarCSV([t], `${nombre}_${t.fechaRealizado||t.fecha||'sin-fecha'}.csv`);
}

// Envía un trabajo individual por email
// Envía por email los datos de un único trabajo realizado vía EmailJS
function enviarTrabajoEmail(id) {
  const t = getTrab().find(x=>String(x.id)===String(id));
  if(!t) return;
  const horasR = t.horasReales
    ? Object.entries(t.horasReales).map(([m,h])=>`${m}: ${h}h`).join(' | ')
    : '—';
  const tipos = (t.tipos&&t.tipos.length) ? t.tipos.join(', ') : (t.tipo||'—');
  const maqs  = (t.maquinarias&&t.maquinarias.length) ? t.maquinarias.join(', ') : (t.maquinaria||'—');
  const sep = '════════════════════════════════════════';

  let cuerpo = '';
  cuerpo += `TRABAJO REALIZADO — EXCAVACIONES PACO\n`;
  cuerpo += `${sep}\n`;
  cuerpo += `Cliente:      ${t.cliente||'—'}\n`;
  cuerpo += `Obra:         ${t.obra||'—'}\n`;
  cuerpo += `Dirección:    ${t.direccion||'—'}\n`;
  cuerpo += `Zona:         ${t.zona||'—'}\n`;
  cuerpo += `Tipo:         ${tipos}\n`;
  cuerpo += `Maquinaria:   ${maqs}\n`;
  cuerpo += `Horas prev.:  ${t.horas||0}h\n`;
  cuerpo += `Horas reales: ${horasR}\n`;
  cuerpo += `Fecha:        ${t.fechaRealizado||t.fecha||'—'}\n`;
  cuerpo += `Notas:        ${t.notasCierre||t.notas||'—'}\n`;
  cuerpo += `Materiales:   ${t.materiales||'—'}\n`;
  cuerpo += `${sep}\n`;
  cuerpo += `Generado por Excavaciones Paco App`;

  const asunto = `Trabajo realizado: ${t.cliente||''}${t.obra?' — '+t.obra:''}`;
  showToast('Enviando…');
  emailjs.init(EMAILJS_PUBLIC_KEY);
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: 'xabitrash@gmail.com',
    mes: t.fechaRealizado||t.fecha||'',
    cuerpo: cuerpo
  })
  .then(()=>showToast('✓ Trabajo enviado por email'))
  .catch(e=>{ console.error(e); showToast('✗ Error al enviar'); });
}

// Exporta el informe del rango de fechas actual como CSV
// Descarga el CSV de todos los trabajos del rango de fechas seleccionado
function exportarInformeCSV() {
  const trabajos = getTrab().filter(t=>ESTADOS_REALIZADOS.includes(t.estado));
  const desde = document.getElementById('informe-desde')?.value;
  const hasta = document.getElementById('informe-hasta')?.value;
  const filtrados = trabajos.filter(t=>{
    const fecha = t.fechaRealizado||t.fecha||'';
    if(desde && fecha < desde) return false;
    if(hasta && fecha > hasta) return false;
    return true;
  });
  if(filtrados.length===0) { showToast('Sin trabajos en ese rango'); return; }
  const sufijo = desde||hasta ? `${desde||'inicio'}_${hasta||'hoy'}` : 'todos';
  descargarCSV(filtrados, `informe_realizados_${sufijo}.csv`);
  showToast(`✓ Exportados ${filtrados.length} trabajos`);
}
// Muestra los trabajos programados para hoy, agrupados por maquinaria.
// Permite seleccionar operario y marcar trabajos como realizados.
// Sin acceso a formularios ni configuración.
// ════════════════════════════════════════════════════════


// Construye la vista completa del operario: fecha, selector, trabajos de los próximos 7 días
// Renderiza la vista Hoy con los trabajos de los próximos 7 días para el operario seleccionado
function renderOperario() {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const hoyISO = fechaISO(hoy);

  // Fecha de hoy en formato legible
  const diasNombre = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mesesNombre = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('op-fecha-txt').textContent =
    diasNombre[hoy.getDay()] + ', ' + hoy.getDate() + ' de ' + mesesNombre[hoy.getMonth()] + ' de ' + hoy.getFullYear();

  // Selector de operario
  const sel = document.getElementById('op-selector');
  sel.innerHTML = '';
  // Mostrar todos los operarios que tienen al menos 1 trabajo programado,
  // más los activos aunque no tengan trabajos. Los archivados sin trabajos no aparecen.
  const trabajosAll = getTrab();
  const conTrabajo = new Set(trabajosAll.flatMap(t => t.operarios || []));
  const opCfg = getOperariosCfg();
  const opVisibles = opCfg.filter(o => o.activo || conTrabajo.has(o.nombre)).map(o => o.nombre);
  // Si el AppState.opSeleccionado ya no aparece, resetear al primero visible
  if (!opVisibles.includes(AppState.opSeleccionado)) AppState.opSeleccionado = opVisibles[0] || '';
  opVisibles.forEach(op => {
    const esActivo = opCfg.find(o=>o.nombre===op)?.activo !== false;
    const btn = document.createElement('button');
    btn.className = 'op-sel-btn' + (op === AppState.opSeleccionado ? ' activo' : '');
    btn.textContent = esActivo ? op : op + ' (desactivado)';
    btn.title = esActivo ? '' : 'Operario desactivado — trabajos históricos visibles';
    btn.onclick = () => { AppState.opSeleccionado = op; renderOperario(); };
    sel.appendChild(btn);
  });

  const trabajos = getTrab();
  const contenido = document.getElementById('op-contenido');

  // Genera los próximos 7 días (hoy + 6)
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() + i);
    dias.push(fechaISO(d));
  }

  // Para cada día, recoge los trabajos del operario seleccionado (sin duplicar)
  // Orden dentro de cada día: Urgente → Alta → Normal
  const URGENCIA_ORDEN = { 'Urgente': 0, 'Alta': 1, 'Normal': 2 };

  let hayAlgo = false;
  let html = '';

  dias.forEach(iso => {
    const d = new Date(iso + 'T12:00');
    const esDiaCorto = iso === hoyISO ? 'Hoy' :
      iso === fechaISO(new Date(hoy.getTime() + 86400000)) ? 'Mañana' :
      DIAS_LARGO[d.getDay() === 0 ? 6 : d.getDay() - 1] + ' ' + d.getDate();

    // Trabajos de este día para el operario — sin duplicados por ID
    const vistos = new Set();
    const del_dia = trabajos.filter(t => {
      if (t.estado !== 'Programado') return false;
      if (!(t.diasProgramados || []).includes(iso)) return false;
      if (t.operarios && t.operarios.length > 0 && !t.operarios.includes(AppState.opSeleccionado)) return false;
      if (vistos.has(t.id)) return false;
      vistos.add(t.id);
      return true;
    }).sort((a, b) => {
      const ua = URGENCIA_ORDEN[a.urgencia] ?? 2;
      const ub = URGENCIA_ORDEN[b.urgencia] ?? 2;
      return ua - ub;
    });

    if (del_dia.length === 0) return;
    hayAlgo = true;

    // Cabecera del día
    html += `<div class="op-dia-header ${iso === hoyISO ? 'op-dia-hoy' : ''}">${esDiaCorto}</div>`;

    del_dia.forEach(t => {
      const urg = (t.urgencia || 'Normal').toLowerCase();
      const clienteCorto = (t.cliente || 'Sin cliente').split(/[—\-,]/)[0].trim().slice(0, 40);
      const tiposCorto = (t.tipos && t.tipos.length) ? t.tipos.join(', ') : (t.tipo || '');
      const maqCorto = (t.maquinarias && t.maquinarias.length) ? t.maquinarias.join(', ') : '';
      const hayNotas = t.notas && t.notas.trim().length > 0;
      html += `<div class="op-trabajo-card ${urg === 'urgente' ? 'urgente' : urg === 'alta' ? 'alta' : ''}">
        <div class="op-cliente">${clienteCorto}</div>
        <div class="op-dir">${mapsLink(t)
          ? `<a href="${mapsLink(t)}" target="_blank" style="color:#4A9EFF;text-decoration:none">📍 ${t.direccion||'Sin dirección'}${t.zona?' · '+t.zona:''} — Cómo llegar →</a>`
          : `📍 ${t.direccion||'Sin dirección'}${t.zona?' · '+t.zona:''}`
        }</div>
        <div class="op-chips">
          ${tiposCorto ? `<span class="op-chip-item">${tiposCorto}</span>` : ''}
          ${maqCorto ? `<span class="op-chip-item">⚙ ${maqCorto}</span>` : ''}
          <span class="op-chip-item">⏱ ${t.horas || 0}h</span>
          ${urg !== 'normal' ? `<span class="op-chip-item" style="color:${urg==='urgente'?'#FF6666':'#FFA500'}">${t.urgencia}</span>` : ''}
        </div>
        ${hayNotas ? `<div class="op-notas">${t.notas}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn-op-realizado" style="flex:1" onclick="opMarcarRealizado(${t.id})">✓ Marcar como realizado</button>
          <button style="flex:0 0 auto;padding:10px 14px;background:transparent;border:1.5px solid var(--text);border-radius:8px;color:var(--text);font-size:13px;cursor:pointer" onclick="abrirEditarTrabajo(${t.id})">✏</button>
        </div>
      </div>`;
    });
  });

  if (!hayAlgo) {
    contenido.innerHTML = `
      <div class="op-vacio">
        <span class="op-vacio-icon">✓</span>
        Sin trabajos programados esta semana<br>para <strong>${AppState.opSeleccionado}</strong>
      </div>`;
    return;
  }

  contenido.innerHTML = html;
}

// Marca un trabajo como Realizado desde la vista del operario
// Abre el modal de realizado desde la vista Hoy
function opMarcarRealizado(id) {
  AppState.modalTrabajoId = id;
  abrirModalRealizadoPorId(id);
}


// ════════════════════════════════════════════════════════
// CLIENTES — Gestión de clientes habituales
// ════════════════════════════════════════════════════════

// Devuelve la lista de clientes en memoria
function getClientes() { return AppState.clientesCache || []; }
function getClientesActivos() { return getClientes().filter(c => c.activo !== false); }

// Guarda un cliente nuevo en Supabase
async function _saveClienteSupabase(cliente) {
  const body = { nombre: cliente.nombre, telefono: cliente.telefono||'', observaciones: cliente.observaciones||'' };
  if (cliente.id) {
    await fetch(`${SUPA_URL}/rest/v1/clientes?id=eq.${cliente.id}`, {
      method: 'PATCH', headers: { ...SUPA_HEADERS, 'Prefer': 'return=minimal' }, body: JSON.stringify(body)
    });
  } else {
    const res = await fetch(`${SUPA_URL}/rest/v1/clientes`, {
      method: 'POST', headers: { ...SUPA_HEADERS, 'Prefer': 'return=representation' }, body: JSON.stringify(body)
    });
    const rows = await res.json();
    if (rows && rows[0]) cliente.id = rows[0].id;
  }
  localStorage.setItem('cfg_clientes', JSON.stringify(AppState.clientesCache));
}

// Añade un cliente desde la sección de configuración
// Añade un cliente nuevo desde el formulario de Configuración
async function cfgAddCliente() {
  const nombre = document.getElementById('inp-cliente-nombre').value.trim();
  if (!nombre) { showToast('Escribe el nombre del cliente'); return; }
  if (getClientes().some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) { showToast('Ya existe ese cliente'); return; }
  const nuevo = { nombre, telefono: document.getElementById('inp-cliente-tel').value.trim(), observaciones: document.getElementById('inp-cliente-obs').value.trim() };
  if (!AppState.clientesCache) AppState.clientesCache = [];
  AppState.clientesCache.push(nuevo);
  AppState.clientesCache.sort((a,b) => a.nombre.localeCompare(b.nombre));
  await _saveClienteSupabase(nuevo);
  ['inp-cliente-nombre','inp-cliente-tel','inp-cliente-obs'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  renderConfig();
  showToast('✓ Cliente añadido');
}

// Elimina un cliente de Supabase
// Elimina un cliente con confirmación
async function cfgEliminarCliente(id) {
  const c = getClientes().find(x => String(x.id) === String(id));
  if (!c) return;
  if (!await showConfirm(`¿Eliminar "${c.nombre}"?`, 'No se borran sus trabajos.', true)) return;
  try {
    await fetch(`${SUPA_URL}/rest/v1/clientes?id=eq.${id}`, { method: 'DELETE', headers: SUPA_HEADERS });
  } catch(e) { showToast('Error al eliminar'); return; }
  AppState.clientesCache = AppState.clientesCache.filter(x => String(x.id) !== String(id));
  localStorage.setItem('cfg_clientes', JSON.stringify(AppState.clientesCache));
  renderConfig();
  showToast('✓ Eliminado');
}

// Renderiza la lista de clientes en Configuración
// Renderiza la lista de clientes en Configuración
async function cfgToggleCliente(id) {
  const clientes = getClientes();
  const c = clientes.find(x => String(x.id) === String(id));
  if (!c) return;
  const activo = c.activo !== false;
  // No permitir dar de baja si es el último activo
  if (activo && clientes.filter(x => x.activo !== false).length <= 1) {
    showToast('Debe haber al menos 1 cliente activo'); return;
  }
  c.activo = !activo;
  AppState.clientesCache = clientes;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/clientes?id=eq.${id}`, {
      method: 'PATCH', headers: {...SUPA_HEADERS, 'Content-Type': 'application/json'},
      body: JSON.stringify({ activo: c.activo })
    });
    if (!r.ok) throw new Error(await r.text());
    CONFIG.clientes = clientes;
    renderCfgClientes();
    showToast(c.activo ? '✓ Cliente activado' : '✓ Cliente dado de baja');
  } catch(e) {
    console.error(e);
    showToast('✗ Error al actualizar cliente');
  }
}

function renderCfgClientes() {
  const wrap = document.getElementById('cfg-clientes');
  if (!wrap) return;
  const clientes = getClientes();
  if (clientes.length === 0) {
    wrap.innerHTML = '<span style="color:var(--text2);font-size:12px">Sin clientes. Añade el primero abajo.</span>';
    return;
  }
  wrap.innerHTML = clientes.map(c => {
    const activo = c.activo !== false;
    const badge = activo ? '' : '<span class="cfg-badge-baja">(desactivado)</span>';
    const btnBajaAlta = activo
      ? `<button class="cfg-btn-baja" onclick="cfgToggleCliente(${c.id})">Dar de baja</button>`
      : `<button class="cfg-btn-alta" onclick="cfgToggleCliente(${c.id})">Dar de alta</button>`;
    return `
    <div class="cfg-cliente-chip ${activo ? '' : 'cfg-chip-baja'}">
      <div class="cfg-cliente-nombre">${c.nombre} ${badge}</div>
      ${c.telefono ? `<div class="cfg-cliente-tel">📞 ${c.telefono}</div>` : ''}
      ${c.observaciones ? `<div class="cfg-cliente-obs">${c.observaciones}</div>` : ''}
      <div class="cfg-cliente-actions">
        <button class="cfg-cliente-btn" onclick="abrirEditarCliente(${c.id})" style="color:var(--info);border-color:rgba(37,99,235,0.4)">✏ Editar</button>
        ${btnBajaAlta}
        <button class="cfg-cliente-btn del" onclick="cfgEliminarCliente(${c.id})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

// ── SELECTOR DE CLIENTE EN FORMULARIO ──────────────────────


// Abre o cierra el dropdown de selección de cliente en el paso 1
function toggleClienteDropdown() {
  AppState.clienteDropdownOpen = !AppState.clienteDropdownOpen;
  const dd = document.getElementById('cs-dropdown');
  if (AppState.clienteDropdownOpen) {
    buildClienteDropdown();
    dd.classList.add('show');
  } else {
    dd.classList.remove('show');
  }
}

// Construye el contenido del dropdown con los clientes disponibles
function buildClienteDropdown() {
  const dd = document.getElementById('cs-dropdown');
  const clientes = getClientesActivos();
  let html = clientes.map(c => `
    <div class="cliente-drop-item" onclick="seleccionarCliente(${c.id})">
      <strong>${c.nombre}</strong>${c.telefono ? `<span style="font-size:11px;color:var(--text3);margin-left:8px">${c.telefono}</span>` : ''}
    </div>`).join('');
  html += `<div class="cliente-drop-item nuevo" onclick="mostrarNuevoClienteInline()">+ Nuevo cliente…</div>`;
  dd.innerHTML = html;
}

// Selecciona un cliente del dropdown y actualiza AppState.form.cliente
function seleccionarCliente(id) {
  const c = getClientes().find(x => String(x.id) === String(id));
  if (!c) return;
  AppState.form.cliente = c.nombre;
  document.getElementById('cs-selected').textContent = c.nombre;
  document.getElementById('cs-dropdown').classList.remove('show');
  document.getElementById('cs-nuevo-wrap').classList.remove('show');
  AppState.clienteDropdownOpen = false;
}

// Muestra el formulario inline de creación de cliente nuevo
function mostrarNuevoClienteInline() {
  document.getElementById('cs-dropdown').classList.remove('show');
  document.getElementById('cs-nuevo-wrap').classList.add('show');
  AppState.clienteDropdownOpen = false;
  document.getElementById('cs-nuevo-nombre').focus();
}

// Guarda el cliente nuevo en Supabase y lo selecciona en el formulario
async function guardarClienteNuevo() {
  const nombre = document.getElementById('cs-nuevo-nombre').value.trim();
  if (!nombre) { showToast('Escribe el nombre del cliente'); return; }
  const nuevo = {
    nombre,
    telefono: document.getElementById('cs-nuevo-tel').value.trim(),
    observaciones: document.getElementById('cs-nuevo-obs').value.trim()
  };
  if (!AppState.clientesCache) AppState.clientesCache = [];
  // Comprobar duplicado
  if (AppState.clientesCache.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
    // Seleccionar el existente
    const existe = AppState.clientesCache.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    seleccionarCliente(existe.id);
    document.getElementById('cs-nuevo-wrap').classList.remove('show');
    showToast('Cliente ya existe — seleccionado');
    return;
  }
  showToast('Guardando cliente…');
  AppState.clientesCache.push(nuevo);
  AppState.clientesCache.sort((a,b) => a.nombre.localeCompare(b.nombre));
  await _saveClienteSupabase(nuevo);
  // Seleccionar el recién creado
  AppState.form.cliente = nombre;
  document.getElementById('cs-selected').textContent = nombre;
  document.getElementById('cs-nuevo-wrap').classList.remove('show');
  ['cs-nuevo-nombre','cs-nuevo-tel','cs-nuevo-obs'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  showToast('✓ Cliente guardado y seleccionado');
}

updateProgress();   // Dibuja la barra de progreso del formulario

// Arranque: comprueba autenticación primero
checkAuth();

// ════════════════════════════════════════════════════════
// MÓDULO 5 — CONFIGURACIÓN
// Permite editar operarios, tipos, maquinaria y sinónimos de voz desde la app.
// Guarda en localStorage y recarga CONFIG y OPERARIOS al instante.
// ════════════════════════════════════════════════════════

// Renderiza la pantalla de Configuración completa
function renderConfig() {
  renderCfgClientes();
  renderCfgOperarios(getOperariosCfg(), 'cfg-operarios');
  const c = getCfg();
  renderCfgToggleList('tipos', c.tipos, 'cfg-tipos');
  renderCfgToggleList('maquinaria', c.maquinaria, 'cfg-maquinaria');
  renderCfgSinonimos(c);
  // Mostrar email del usuario logueado
  const infoEl = document.getElementById('cfg-usuario-info');
  if (infoEl && AppState.session?.user?.email) {
    infoEl.textContent = 'Sesión activa: ' + AppState.session.user.email;
  }
}

// Renderiza operarios con toggle Dar de baja/Dar de alta
// Renderiza la lista de operarios en Configuración con toggle activo/inactivo
function renderCfgOperarios(ops, containerId) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  if (ops.length === 0) { wrap.innerHTML = '<span style="color:var(--text2);font-size:12px">Sin operarios</span>'; return; }
  ops.forEach((op, i) => {
    const chip = document.createElement('div');
    chip.className = 'cfg-chip ' + (op.activo ? 'cfg-chip-activo' : 'cfg-chip-baja');
    const badge = op.activo ? '' : '<span class="cfg-badge-baja">(desactivado)</span>';
    const btn = op.activo
      ? `<button class="cfg-btn-baja" onclick="cfgToggleOperario(${i})">Dar de baja</button>`
      : `<button class="cfg-btn-alta" onclick="cfgToggleOperario(${i})">Dar de alta</button>`;
    const btnDel = `<button class="cfg-btn-del" onclick="cfgEliminarOperario(${i})">Eliminar</button>`;
    chip.innerHTML = `<span>${op.nombre}${badge}</span>${btn}${btnDel}`;
    wrap.appendChild(chip);
  });
}

// Renderiza tipos o maquinaria con toggle Dar de baja/Dar de alta
// Renderiza una lista de ítems (tipos o maquinaria) con sinónimos expandibles
function renderCfgToggleList(key, items, containerId) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  if (items.length === 0) { wrap.innerHTML = '<span style="color:var(--text2);font-size:12px">Sin elementos</span>'; return; }
  items.forEach((item, i) => {
    const chip = document.createElement('div');
    chip.className = 'cfg-chip ' + (item.activo ? 'cfg-chip-activo' : 'cfg-chip-baja');
    const badge = item.activo ? '' : '<span class="cfg-badge-baja">(desactivado)</span>';
    const btn = item.activo
      ? `<button class="cfg-btn-baja" onclick="cfgToggleItem('${key}',${i})">Dar de baja</button>`
      : `<button class="cfg-btn-alta" onclick="cfgToggleItem('${key}',${i})">Dar de alta</button>`;
    const btnDel = `<button class="cfg-btn-del" onclick="cfgEliminarItem('${key}',${i})">Eliminar</button>`;
    chip.innerHTML = `<span>${item.nombre}${badge}</span>${btn}${btnDel}`;
    wrap.appendChild(chip);
  });
}

// Renderiza el acordeón de sinónimos
// Renderiza los sinónimos de voz de un ítem expandido
function renderCfgSinonimos(c) {
  const wrap = document.getElementById('cfg-sinonimos');
  wrap.innerHTML = '';
  const allItems = [...c.tipos.map(o=>o.nombre), ...c.maquinaria.map(o=>o.nombre)];
  allItems.forEach(item => {
    const sins = c.sinonimos[item] || [];
    const div = document.createElement('div');
    div.className = 'cfg-sin-item';
    div.innerHTML = `
      <div class="cfg-sin-header" onclick="toggleSinItem(this)">
        <span class="cfg-sin-name">${item}</span>
        <span class="cfg-sin-count">${sins.length} sinónimo${sins.length!==1?'s':''}</span>
        <span class="cfg-sin-arrow">▼</span>
      </div>
      <div class="cfg-sin-body">
        <div class="cfg-sin-chips" id="sin-chips-${esc(item)}">
          ${sins.map((s,i)=>`<span class="cfg-sin-chip">${s}<button class="cfg-chip-del" onclick="cfgDelSin('${esc(item)}','${esc(s)}')" style="font-size:13px">✕</button></span>`).join('')}
          ${sins.length===0?'<span style="color:var(--text2);font-size:12px">Sin sinónimos</span>':''}
        </div>
        <div class="cfg-sin-add-row">
          <input class="cfg-sin-input" id="sin-inp-${esc(item)}" type="text" placeholder="Añadir sinónimo…" maxlength="30"
            onkeydown="if(event.key==='Enter')cfgAddSin('${esc(item)}')">
          <button class="cfg-sin-btn" onclick="cfgAddSin('${esc(item)}')">+ Añadir</button>
        </div>
      </div>`;
    wrap.appendChild(div);
  });
}

// Escapa comillas simples para uso en atributos HTML onclick
// Escapa caracteres especiales HTML para insertar en templates de forma segura
function esc(s) { return s.replace(/'/g,"\\'"); }

// Abre o cierra el panel de sinónimos de un ítem en Configuración
function toggleSinItem(header) {
  const body = header.nextElementSibling;
  const arrow = header.querySelector('.cfg-sin-arrow');
  body.classList.toggle('open');
  arrow.classList.toggle('open');
}

// Añade un ítem a operarios, tipos o maquinaria
// Añade un ítem a operarios, tipos o maquinaria
// Añade un ítem nuevo (tipo, maquinaria u operario) a la configuración
async function cfgAdd(key) {
  const inputId = key==='operarios'?'inp-operario':key==='tipos'?'inp-tipo':'inp-maquinaria';
  const inp = document.getElementById(inputId);
  const val = inp.value.trim();
  if (!val) { showToast('Escribe un nombre'); return; }

  if (key === 'operarios') {
    const arr = getOperariosCfg();
    if (arr.some(o => o.nombre === val)) { showToast('Ya existe'); return; }
    const newOp = {nombre: val, activo: true, sinonimos: []};
    arr.push(newOp);
    AppState.operariosCfgCache = arr;
    await _saveOperarioSupabase(newOp);
    OPERARIOS = getOperariosActivos();
  } else {
    const tablaMap = {tipos: 'tipos_trabajo', maquinaria: 'maquinaria'};
    const c = getCfg();
    if (c[key].some(o => o.nombre === val)) { showToast('Ya existe'); return; }
    const newItem = {nombre: val, activo: true, sinonimos: []};
    c[key].push(newItem);
    if (!c.sinonimos[val]) c.sinonimos[val] = [];
    AppState.cfgCache = c;
    await _saveItemSupabase(tablaMap[key], newItem);
    CONFIG = c;
  }
  inp.value = '';
  buildChips();
  renderConfig();
  showToast('✓ Añadido');
}

// Archiva o reactiva un tipo de trabajo o maquinaria
// Activa o desactiva un ítem de configuración (tipo o maquinaria)
async function cfgToggleItem(key, idx) {
  const tablaMap = {tipos: 'tipos_trabajo', maquinaria: 'maquinaria'};
  const c = getCfg();
  const item = c[key][idx];
  if (!item) return;
  if (item.activo && c[key].filter(o=>o.activo).length <= 1) {
    showToast('Debe haber al menos 1 elemento activo'); return;
  }
  item.activo = !item.activo;
  AppState.cfgCache = c;
  await _saveItemSupabase(tablaMap[key], item);
  CONFIG = c;
  buildChips();
  renderConfig();
  showToast(item.activo ? 'Dado de alta' : 'Dado de baja');
}

// Archiva o reactiva un operario (nunca se borra — sus trabajos quedan intactos)
// Activa o desactiva un operario
async function cfgToggleOperario(idx) {
  const arr = getOperariosCfg();
  const op = arr[idx];
  if (!op) return;
  if (op.activo && arr.filter(o=>o.activo).length <= 1) {
    showToast('Debe haber al menos 1 operario activo'); return;
  }
  op.activo = !op.activo;
  AppState.operariosCfgCache = arr;
  await _saveOperarioSupabase(op);
  OPERARIOS = getOperariosActivos();
  if (!OPERARIOS.includes(AppState.opSeleccionado)) AppState.opSeleccionado = OPERARIOS[0] || '';
  renderConfig();
  showToast(op.activo ? 'Dado de alta' : 'Dado de baja');
}

// cfgDel ya no se usa — se mantiene por compatibilidad
// Solicita confirmación para eliminar un ítem de configuración
function cfgDel(key, idx) { }

// Añade un sinónimo a un ítem
// Añade un sinónimo de voz a un ítem
async function cfgAddSin(item) {
  const inp = document.getElementById('sin-inp-'+item);
  const val = inp.value.trim().toLowerCase();
  if (!val) return;
  const c = getCfg();
  if (!c.sinonimos[item]) c.sinonimos[item] = [];
  if (c.sinonimos[item].includes(val)) { showToast('Ya existe'); return; }
  c.sinonimos[item].push(val);
  AppState.cfgCache = c;
  // Actualizar sinonimos en el objeto del item correspondiente y guardar en Supabase
  const tipoItem = c.tipos.find(o=>o.nombre===item);
  const maqItem = c.maquinaria.find(o=>o.nombre===item);
  if (tipoItem) { tipoItem.sinonimos = c.sinonimos[item]; await _saveItemSupabase('tipos_trabajo', tipoItem); }
  else if (maqItem) { maqItem.sinonimos = c.sinonimos[item]; await _saveItemSupabase('maquinaria', maqItem); }
  CONFIG = c;
  inp.value = '';
  renderConfig();
  setTimeout(() => {
    const items = document.querySelectorAll('.cfg-sin-item');
    const allItems = [...c.tipos.map(o=>o.nombre), ...c.maquinaria.map(o=>o.nombre)];
    const i = allItems.indexOf(item);
    if (i >= 0 && items[i]) {
      const body = items[i].querySelector('.cfg-sin-body');
      const arrow = items[i].querySelector('.cfg-sin-arrow');
      if (body) { body.classList.add('open'); arrow.classList.add('open'); }
    }
  }, 10);
  showToast('✓ Sinónimo añadido');
}

// Elimina un sinónimo
// Elimina un sinónimo de voz de un ítem
async function cfgDelSin(item, sin) {
  const c = getCfg();
  if (!c.sinonimos[item]) return;
  c.sinonimos[item] = c.sinonimos[item].filter(s => s !== sin);
  AppState.cfgCache = c;
  const tipoItem = c.tipos.find(o=>o.nombre===item);
  const maqItem = c.maquinaria.find(o=>o.nombre===item);
  if (tipoItem) { tipoItem.sinonimos = c.sinonimos[item]; await _saveItemSupabase('tipos_trabajo', tipoItem); }
  else if (maqItem) { maqItem.sinonimos = c.sinonimos[item]; await _saveItemSupabase('maquinaria', maqItem); }
  CONFIG = c;
  renderConfig();
  setTimeout(() => {
    const items = document.querySelectorAll('.cfg-sin-item');
    const allItems = [...c.tipos.map(o=>o.nombre), ...c.maquinaria.map(o=>o.nombre)];
    const i = allItems.indexOf(item);
    if (i >= 0 && items[i]) {
      const body = items[i].querySelector('.cfg-sin-body');
      const arrow = items[i].querySelector('.cfg-sin-arrow');
      if (body) { body.classList.add('open'); arrow.classList.add('open'); }
    }
  }, 10);
}

// Restaura las listas por defecto borrando Supabase e insertando defaults (no borra trabajos)
// Restaura las listas de tipos y maquinaria a los valores por defecto
async function cfgReset() {
  if (!await showConfirm('¿Restaurar configuración por defecto?', 'Se restablecen tipos, maquinaria y operarios. Los trabajos no se borran.', true)) return;
  try {
    showToast('Restaurando...');
    await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/tipos_trabajo?id=gte.0`, { method:'DELETE', headers:{...SUPA_HEADERS,'Prefer':'return=minimal'} }),
      fetch(`${SUPA_URL}/rest/v1/maquinaria?id=gte.0`, { method:'DELETE', headers:{...SUPA_HEADERS,'Prefer':'return=minimal'} }),
      fetch(`${SUPA_URL}/rest/v1/operarios?id=gte.0`, { method:'DELETE', headers:{...SUPA_HEADERS,'Prefer':'return=minimal'} })
    ]);
    AppState.cfgCache = null;
    AppState.operariosCfgCache = null;
    await loadConfig();
  } catch(e) {
    localStorage.removeItem('cfg_listas');
    localStorage.removeItem('cfg_operarios');
  }
  CONFIG = getCfg();
  OPERARIOS = getOperariosActivos();
  AppState.opSeleccionado = OPERARIOS[0] || '';
  buildChips();
  renderConfig();
  showToast('✓ Configuración restaurada');
}
// Elimina definitivamente un operario de Supabase
// Elimina un operario definitivamente con confirmación
async function cfgEliminarOperario(idx) {
  const arr = getOperariosCfg();
  const op = arr[idx];
  if (!op) return;
  if (!await showConfirm(`¿Eliminar "${op.nombre}"?`, 'Esta acción no se puede deshacer.', true)) return;
  if (op.id) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/operarios?id=eq.${op.id}`, {
        method: 'DELETE', headers: {...SUPA_HEADERS, 'Prefer': 'return=minimal'}
      });
    } catch(e) { showToast('Error al eliminar'); return; }
  }
  arr.splice(idx, 1);
  AppState.operariosCfgCache = arr;
  localStorage.setItem('cfg_operarios', JSON.stringify(arr));
  OPERARIOS = getOperariosActivos();
  if (!OPERARIOS.includes(AppState.opSeleccionado)) AppState.opSeleccionado = OPERARIOS[0] || '';
  renderConfig();
  showToast('✓ Eliminado');
}

// Elimina definitivamente un tipo o maquinaria de Supabase
// Elimina un ítem de configuración definitivamente con confirmación
async function cfgEliminarItem(key, idx) {
  const tablaMap = {tipos: 'tipos_trabajo', maquinaria: 'maquinaria'};
  const c = getCfg();
  const item = c[key][idx];
  if (!item) return;
  if (!await showConfirm(`¿Eliminar "${item.nombre}"?`, 'Esta acción no se puede deshacer.', true)) return;
  if (item.id) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/${tablaMap[key]}?id=eq.${item.id}`, {
        method: 'DELETE', headers: {...SUPA_HEADERS, 'Prefer': 'return=minimal'}
      });
    } catch(e) { showToast('Error al eliminar'); return; }
  }
  delete c.sinonimos[item.nombre];
  c[key].splice(idx, 1);
  AppState.cfgCache = c;
  localStorage.setItem('cfg_listas', JSON.stringify(c));
  CONFIG = c;
  buildChips();
  renderConfig();
  showToast('✓ Eliminado');
}