import seedData from '../data/seedData.json';
import {
  CATALOGO_DEFICIENCIAS,
  CATALOGO_DEFICIENCIAS_MADERA,
  CATALOGO_DEFICIENCIAS_CONCRETO,
  CATALOGO_DEFICIENCIAS_CELOSIA,
  CATALOGO_DEFICIENCIAS_POR_TIPO,
  CATALOGO_SITUACIONES_CORONA,
  INITIAL_USUARIOS,
  INITIAL_DEFICIENCIAS,
  INITIAL_TERMOGRAFIA,
  INITIAL_PODAS,
  INITIAL_MANTENIMIENTO,
  INITIAL_ORDENES_MANTENIMIENTO,
  INITIAL_DMS,
  INITIAL_LEVANTAMIENTOS,
  INITIAL_INSPECCIONES_CIERRE,
  INITIAL_PUESTA_TIERRA,
  INITIAL_CONTRATISTAS,
  INITIAL_HIDROLAVADO
} from '../data/catalogs';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Termografia,
  Poda,
  Mantenimiento,
  OrdenMantenimiento,
  ItemRegistroOM,
  TipoActividadOM,
  TipoPosteDeficiencia,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  Usuario,
  AuditoriaRegistro,
  ConfiguracionDrive,
  EvidenciaFotografica,
  ConflictoRegistro,
  PuestaTierra,
  Prioridad,
  Contratista,
  Hidrolavado,
  ConfiguracionAutenticacion,
  CodigoActividad,
  ControlRegistro,
  EstadoRegistro
} from '../types';
import { realtimeService } from './realtimeService';

const STORAGE_KEYS = {
  LINEAS: 'st_lineas_v1',
  ESTRUCTURAS: 'st_estructuras_v1',
  CORONA: 'st_corona_v1',
  DEFICIENCIAS: 'st_deficiencias_v1',
  PUESTA_TIERRA: 'st_puesta_tierra_v1',
  TERMOGRAFIA: 'st_termografia_v1',
  PODAS: 'st_podas_v1',
  MANTENIMIENTO: 'st_mantenimiento_v1',
  ORDENES_MANTENIMIENTO: 'st_ordenes_mantenimiento_v1',
  DMS: 'st_dms_v1',
  LEVANTAMIENTOS: 'st_levantamientos_v1',
  INSPECCIONES: 'st_inspecciones_v1',
  USUARIOS: 'st_usuarios_v1',
  AUDITORIA: 'st_auditoria_v1',
  EVIDENCIAS: 'st_evidencias_v1',
  CONFIG: 'st_config_drive_v1',
  CONFLICTOS: 'st_conflictos_v1',
  CURRENT_USER: 'st_current_user_v1',
  SITUACIONES_CORONA: 'st_situaciones_corona_v1',
  CONTRATISTAS: 'st_contratistas_v1',
  HIDROLAVADO: 'st_hidrolavado_v1',
  AUTH_CONFIG: 'st_auth_config_v1'
};


function getLimaDateTime(): { fecha: string; hora: string; fecha_hora: string } {
  try {
    const now = new Date();
    const formatterFecha = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const formatterHora = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatterFecha.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '12';
    const month = parts.find(p => p.type === 'month')?.value || '11';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const hora = formatterHora.format(now);
    return {
      fecha: `${year}-${month}-${day}`,
      hora,
      fecha_hora: `${day}/${month}/${year} ${hora}`
    };
  } catch {
    const d = new Date();
    const fecha = d.toISOString().split('T')[0];
    const hora = d.toTimeString().split(' ')[0];
    const [y, m, day] = fecha.split('-');
    return {
      fecha,
      hora,
      fecha_hora: `${day || '12'}/${m || '11'}/${y || '2026'} ${hora}`
    };
  }
}

function sanitizeUserObj<T extends Record<string, any>>(user: T): T {
  if (!user || typeof user !== 'object') return user;
  const { password: _omitted, ...safe } = user;
  return safe as T;
}

function formatFieldName(key: string): string {
  const dictionary: Record<string, string> = {
    estado: 'Estado',
    prioridad: 'Prioridad',
    valor_resistencia_pat: 'Resistencia PAT (Ω)',
    tipo_deficiencia: 'Tipo de Deficiencia',
    descripcion: 'Descripción',
    numero_om: 'N° de Orden de Mantenimiento',
    temp_ambiente: 'Temperatura Ambiente (°C)',
    temp_max_componente: 'Temperatura Máxima (°C)',
    delta_t: 'Delta T (°C)',
    criticidad: 'Nivel de Criticidad',
    componente_falla: 'Componente en Falla',
    fase_r_conteo: 'Conteo Fase R',
    fase_s_conteo: 'Conteo Fase S',
    fase_t_conteo: 'Conteo Fase T',
    total_arboles: 'Total de Árboles Podados',
    actividad_realizada: 'Actividad Realizada',
    orden_mantenimiento: 'Orden de Mantenimiento',
    fase_lavada: 'Fase Lavada',
    presion_bar: 'Presión de Lavado (bar)',
    conductividad_agua_us: 'Conductividad del Agua (µS/cm)',
    resultado: 'Resultado de Inspección',
    observaciones: 'Observaciones',
    comentario: 'Comentarios',
    responsable: 'Responsable',
    usuario_responsable: 'Usuario Responsable',
    inspector: 'Inspector',
    contratista: 'Empresa Contratista',
    contratista_responsable: 'Contratista Responsable',
    email: 'Correo Electrónico',
    telefono: 'Teléfono',
    rol: 'Rol de Usuario',
    lineas_asignadas: 'Líneas Asignadas',
    actividades_asignadas: 'Actividades Asignadas'
  };
  return dictionary[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

class StorageService {
  private lineas: LineaSubtransmision[] = [];
  private estructuras: Estructura[] = [];
  private corona: EfectoCorona[] = [];
  private deficiencias: Deficiencia[] = [];
  private puestaTierra: PuestaTierra[] = [];
  private termografia: Termografia[] = [];
  private podas: Poda[] = [];
  private mantenimiento: Mantenimiento[] = [];
  private ordenesMantenimiento: OrdenMantenimiento[] = [];
  private dms: DMSItem[] = [];
  private levantamientos: LevantamientoDMS[] = [];
  private inspecciones: InspeccionCierreDMS[] = [];
  private usuarios: Usuario[] = [];
  private auditoria: AuditoriaRegistro[] = [];
  private evidencias: EvidenciaFotografica[] = [];
  private conflictos: ConflictoRegistro[] = [];
  private situacionesCorona: string[] = [];
  private contratistas: Contratista[] = [];
  private hidrolavado: Hidrolavado[] = [];
  private authConfig: ConfiguracionAutenticacion = {
    allow_self_registration: true,
    require_admin_approval: false
  };
  private config: ConfiguracionDrive = {
    sheet_lineas_id: '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y',
    sheet_lineas_url: 'https://docs.google.com/spreadsheets/d/1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y/edit?gid=0#gid=0',
    sheet_usuarios_id: '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX',
    sheet_usuarios_url: 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true',
    drive_folder_id: '1A9x_DRIVE_FOLDER_SUBTRANSMISION',
    apps_script_url: '',
    auto_sync_interval: 15,
    last_sync_time: '2026-10-29 09:30:00',
    sync_status: 'Conectado'
  };
  private currentUser: Usuario = INITIAL_USUARIOS[0];
  private stateChangeListeners: Set<() => void> = new Set();

  constructor() {
    this.init();
    this.setupRealtimeSync();
  }

  public onStateChange(fn: () => void): () => void {
    this.stateChangeListeners.add(fn);
    return () => this.stateChangeListeners.delete(fn);
  }

  private notifyStateChange() {
    for (const fn of this.stateChangeListeners) {
      try { fn(); } catch {}
    }
  }

  private safeLocalStorageSet(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[StorageService] No se pudo guardar en localStorage (${key}):`, err);
    }
  }

  private nextSequentialId(prefix: string, items: any[], field: string, pad: number): string {
    let maxNum = items.length;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}(\\d+)`);
    for (const item of items) {
      const val = String(item?.[field] || '');
      const match = val.match(regex);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!Number.isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
    return prefix + String(maxNum + 1).padStart(pad, '0');
  }

  private getCurrentUserName(): string {
    const full = `${this.currentUser?.nombres || ''} ${this.currentUser?.apellidos || ''}`.trim();
    return full || this.currentUser?.username || 'Sistema Central';
  }

  private getCreateControl(): ControlRegistro {
    const { fecha_hora } = getLimaDateTime();
    return {
      fecha_creacion: fecha_hora,
      usuario_creacion: this.getCurrentUserName(),
      estado_registro: 'ACTIVO'
    };
  }

  private getUpdateControl(): ControlRegistro {
    const { fecha_hora } = getLimaDateTime();
    return {
      fecha_modificacion: fecha_hora,
      usuario_modificacion: this.getCurrentUserName()
    };
  }

  private getDeleteControl(): ControlRegistro {
    const { fecha_hora } = getLimaDateTime();
    return {
      fecha_eliminacion: fecha_hora,
      usuario_eliminacion: this.getCurrentUserName(),
      estado_registro: 'ELIMINADO'
    };
  }

  private normalizeControl<T extends ControlRegistro>(item: T): T {
    return {
      ...item,
      estado_registro: item.estado_registro === 'ELIMINADO' ? 'ELIMINADO' : 'ACTIVO',
      fecha_creacion: item.fecha_creacion || '10/11/2026 08:30:00',
      usuario_creacion: item.usuario_creacion || 'Sistema Central'
    };
  }

  private normalizeControlArray<T extends ControlRegistro>(arr: T[]): T[] {
    return (arr || []).map(item => this.normalizeControl(item));
  }

  private init() {
    // 1. Lineas
    const cachedLineas = localStorage.getItem(STORAGE_KEYS.LINEAS);
    if (cachedLineas) {
      try { this.lineas = JSON.parse(cachedLineas); } catch { this.lineas = seedData.lineas as LineaSubtransmision[]; }
    } else {
      this.lineas = seedData.lineas as LineaSubtransmision[];
      this.saveLineas();
    }

    // 2. Estructuras (Postes)
    const cachedEstructuras = localStorage.getItem(STORAGE_KEYS.ESTRUCTURAS);
    if (cachedEstructuras) {
      try { this.estructuras = JSON.parse(cachedEstructuras); } catch { this.estructuras = seedData.estructuras as Estructura[]; }
    } else {
      this.estructuras = seedData.estructuras as Estructura[];
      this.saveEstructuras();
    }

    // 3. Efecto Corona
    const cachedCorona = localStorage.getItem(STORAGE_KEYS.CORONA);
    if (cachedCorona) {
      try {
        const parsed = JSON.parse(cachedCorona);
        this.corona = parsed.map((c: any) => ({
          ...c,
          prioridad: c.prioridad || (Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO')
        }));
      } catch {
        this.corona = (seedData.corona as any[]).map(c => ({
          ...c,
          prioridad: (Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO')
        }));
      }
    } else {
      this.corona = (seedData.corona as any[]).map(c => ({
        ...c,
        prioridad: (Math.max(c.fase_r_conteo || 0, c.fase_s_conteo || 0, c.fase_t_conteo || 0) > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO')
      }));
      this.saveCorona();
    }

    // 4. Deficiencias
    const cachedDef = localStorage.getItem(STORAGE_KEYS.DEFICIENCIAS);
    if (cachedDef) {
      try { this.deficiencias = JSON.parse(cachedDef); } catch { this.deficiencias = INITIAL_DEFICIENCIAS; }
    } else {
      this.deficiencias = INITIAL_DEFICIENCIAS;
    }
    // Normalizar prioridades: Solo PRIORITARIO y NO PRIORITARIO
    this.deficiencias = this.deficiencias.map(d => ({
      ...d,
      prioridad: (d.prioridad === 'PRIORITARIO' || (d.prioridad as string) === 'ALTO' || (d.prioridad as string) === 'Alta' || (d.prioridad as string) === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'
    }));
    this.saveDeficiencias();

    // 4b. Toma de Medición de Puesta a Tierra (PAT)
    const cachedPat = localStorage.getItem(STORAGE_KEYS.PUESTA_TIERRA);
    if (cachedPat) {
      try { this.puestaTierra = JSON.parse(cachedPat); } catch { this.puestaTierra = INITIAL_PUESTA_TIERRA; }
    } else {
      this.puestaTierra = INITIAL_PUESTA_TIERRA;
    }
    this.puestaTierra = this.puestaTierra.map(p => ({
      ...p,
      prioridad: (p.valor_resistencia_pat >= 5.0 || p.prioridad === 'PRIORITARIO' || (p.prioridad as string) === 'ALTO') ? 'PRIORITARIO' : 'NO PRIORITARIO',
      alerta_deficiencia: p.valor_resistencia_pat >= 5.0
    }));
    this.savePuestaTierra();


    // 5. Termografia
    const cachedTerm = localStorage.getItem(STORAGE_KEYS.TERMOGRAFIA);
    if (cachedTerm) {
      try { this.termografia = JSON.parse(cachedTerm); } catch { this.termografia = INITIAL_TERMOGRAFIA; }
    } else {
      this.termografia = INITIAL_TERMOGRAFIA;
      this.saveTermografia();
    }

    // 6. Podas
    const cachedPodas = localStorage.getItem(STORAGE_KEYS.PODAS);
    if (cachedPodas) {
      try { this.podas = JSON.parse(cachedPodas); } catch { this.podas = INITIAL_PODAS; }
    } else {
      this.podas = INITIAL_PODAS;
      this.savePodas();
    }

    // 7. Mantenimiento
    const cachedMant = localStorage.getItem(STORAGE_KEYS.MANTENIMIENTO);
    if (cachedMant) {
      try {
        const parsed = JSON.parse(cachedMant);
        this.mantenimiento = parsed.length > 0 ? parsed : INITIAL_MANTENIMIENTO;
      } catch {
        this.mantenimiento = INITIAL_MANTENIMIENTO;
      }
    } else {
      this.mantenimiento = INITIAL_MANTENIMIENTO;
      this.saveMantenimiento();
    }

    // 7.1 Órdenes de Mantenimiento
    const cachedOM = localStorage.getItem(STORAGE_KEYS.ORDENES_MANTENIMIENTO);
    if (cachedOM) {
      try {
        const parsedOM = JSON.parse(cachedOM);
        this.ordenesMantenimiento = parsedOM.length > 0 ? parsedOM : INITIAL_ORDENES_MANTENIMIENTO;
      } catch {
        this.ordenesMantenimiento = INITIAL_ORDENES_MANTENIMIENTO;
      }
    } else {
      this.ordenesMantenimiento = INITIAL_ORDENES_MANTENIMIENTO;
      this.saveOrdenesMantenimiento();
    }

    // 8. DMS
    const cachedDms = localStorage.getItem(STORAGE_KEYS.DMS);
    if (cachedDms) {
      try { this.dms = JSON.parse(cachedDms); } catch { this.dms = INITIAL_DMS; }
    } else {
      this.dms = INITIAL_DMS;
      this.saveDMS();
    }

    // 9. Levantamientos
    const cachedLev = localStorage.getItem(STORAGE_KEYS.LEVANTAMIENTOS);
    if (cachedLev) {
      try { this.levantamientos = JSON.parse(cachedLev); } catch { this.levantamientos = INITIAL_LEVANTAMIENTOS; }
    } else {
      this.levantamientos = INITIAL_LEVANTAMIENTOS;
      this.saveLevantamientos();
    }

    // 10. Inspecciones Cierre
    const cachedInsp = localStorage.getItem(STORAGE_KEYS.INSPECCIONES);
    if (cachedInsp) {
      try { this.inspecciones = JSON.parse(cachedInsp); } catch { this.inspecciones = INITIAL_INSPECCIONES_CIERRE; }
    } else {
      this.inspecciones = INITIAL_INSPECCIONES_CIERRE;
      this.saveInspecciones();
    }

    // 11. Usuarios (never retain plaintext passwords in browser localStorage)
    const cachedUsers = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    if (cachedUsers) {
      try { this.usuarios = (JSON.parse(cachedUsers) || []).map(sanitizeUserObj); } catch { this.usuarios = INITIAL_USUARIOS.map(sanitizeUserObj); }
    } else {
      this.usuarios = INITIAL_USUARIOS.map(sanitizeUserObj);
      this.saveUsuarios();
    }

    // 12. Current User
    const cachedCurrUser = localStorage.getItem('st_auth_user');
    if (cachedCurrUser) {
      try {
        this.currentUser = sanitizeUserObj(JSON.parse(cachedCurrUser));
      } catch {
        this.currentUser = sanitizeUserObj(this.usuarios[0] || INITIAL_USUARIOS[0]);
      }
    }

    // 13. Auditoria (AUDITORIA_SISTEMA)
    const cachedAudit = localStorage.getItem(STORAGE_KEYS.AUDITORIA);
    if (cachedAudit) {
      try {
        const parsed: any[] = JSON.parse(cachedAudit);
        this.auditoria = parsed.map(a => ({
          ...a,
          id_auditoria: a.id_auditoria || `AUD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          modulo: (a.modulo || 'GENERAL').toUpperCase(),
          id_registro: String(a.id_registro || 'N/A'),
          accion: a.accion || 'EDICIÓN',
          usuario: a.usuario || 'Sistema',
          rol_usuario: a.rol_usuario || a.rol || 'Administrador',
          fecha_hora: a.fecha_hora || (a.fecha && a.hora ? `${a.fecha.split('-').reverse().join('/')} ${a.hora}` : '12/11/2026 10:15:32'),
          campo_modificado: a.campo_modificado || (a.accion === 'CREACIÓN' || a.accion === 'CREACION' ? 'Todos los campos (Registro nuevo)' : 'Estado / Atributos'),
          valor_anterior: a.valor_anterior || a.valores_anteriores || 'N/A',
          valor_nuevo: a.valor_nuevo || a.valores_nuevos || 'Actualizado',
          observacion: a.observacion || a.valores_nuevos || 'Movimiento registrado en auditoría'
        }));
      } catch {
        this.auditoria = [];
      }
    }
    
    if (!this.auditoria || this.auditoria.length === 0) {
      const { fecha, hora, fecha_hora } = getLimaDateTime();
      this.auditoria = [
        {
          id_auditoria: 'AUD-20261112-00125B',
          modulo: 'TERMOGRAFÍA',
          id_registro: '125',
          accion: 'EDICIÓN',
          usuario: 'Carlos López',
          rol_usuario: 'Supervisor',
          fecha_hora: '12/11/2026 11:20:15',
          campo_modificado: 'Estado',
          valor_anterior: 'Pendiente',
          valor_nuevo: 'Aprobado',
          observacion: 'Campo Estado modificado de Pendiente a Aprobado',
          rol: 'Supervisor',
          fecha: '2026-11-12',
          hora: '11:20:15',
          cod_linea: 'L-6601',
          estructura: '14',
          valores_anteriores: 'Pendiente',
          valores_nuevos: 'Aprobado',
          origen: 'Web',
          resultado: 'Exitoso',
          sync_id: 'SYNC-AUD-002'
        },
        {
          id_auditoria: 'AUD-20261112-00125A',
          modulo: 'TERMOGRAFÍA',
          id_registro: '125',
          accion: 'CREACIÓN',
          usuario: 'Juan Pérez',
          rol_usuario: 'Contratista',
          fecha_hora: '12/11/2026 10:15:32',
          campo_modificado: 'Todos los campos (Registro nuevo)',
          valor_anterior: 'N/A',
          valor_nuevo: 'Inspección termográfica poste P-14 (68°C en seccionador)',
          observacion: 'Nuevo registro creado',
          rol: 'Contratista',
          fecha: '2026-11-12',
          hora: '10:15:32',
          cod_linea: 'L-6601',
          estructura: '14',
          valores_anteriores: 'N/A',
          valores_nuevos: 'TRM-125 registrado',
          origen: 'Web',
          resultado: 'Exitoso',
          sync_id: 'SYNC-AUD-001'
        },
        {
          id_auditoria: 'AUD-20261112-00089C',
          modulo: 'DEFICIENCIAS',
          id_registro: 'DEF-008',
          accion: 'ELIMINACIÓN',
          usuario: 'Pedro Ruiz',
          rol_usuario: 'Administrador',
          fecha_hora: '12/11/2026 12:05:10',
          campo_modificado: 'Registro completo',
          valor_anterior: 'Deficiencia en cruceta poste P-20',
          valor_nuevo: 'Eliminado',
          observacion: 'Registro de deficiencia retirado por duplicidad técnica',
          rol: 'Administrador',
          fecha: '2026-11-12',
          hora: '12:05:10',
          cod_linea: 'L-6650',
          estructura: '20',
          valores_anteriores: 'Registro DEF-008 activo',
          valores_nuevos: 'Eliminado',
          origen: 'Web',
          resultado: 'Exitoso',
          sync_id: 'SYNC-AUD-003'
        },
        {
          id_auditoria: 'AUD-INIT-001',
          modulo: 'SISTEMA',
          id_registro: 'DATASETS',
          accion: 'CREACIÓN',
          usuario: 'Sistema Central',
          rol_usuario: 'Administrador',
          fecha_hora,
          campo_modificado: 'Inicialización de Módulos Operativos',
          valor_anterior: 'N/A',
          valor_nuevo: '27 líneas de subtransmisión y 1,087 estructuras cargadas',
          observacion: 'Inicialización y sincronización de base operativa del sistema',
          rol: 'Administrador',
          fecha,
          hora,
          cod_linea: 'TODAS',
          estructura: '-',
          valores_anteriores: 'Base vacía',
          valores_nuevos: 'Datasets cargados exitosamente',
          origen: 'Importación Excel',
          resultado: 'Exitoso',
          sync_id: 'SYNC-INIT-001'
        }
      ];
      this.saveAuditoria();
    }

    // 14. Situaciones Corona
    const cachedSit = localStorage.getItem(STORAGE_KEYS.SITUACIONES_CORONA);
    if (cachedSit) {
      try { this.situacionesCorona = JSON.parse(cachedSit); } catch { this.situacionesCorona = CATALOGO_SITUACIONES_CORONA; }
    } else {
      this.situacionesCorona = CATALOGO_SITUACIONES_CORONA;
    }

    // 15. Config Drive
    const cachedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (cachedConfig) {
      try { this.config = { ...this.config, ...JSON.parse(cachedConfig) }; } catch { /* ignore */ }
    }

    // 16. Contratistas
    const cachedContratistas = localStorage.getItem(STORAGE_KEYS.CONTRATISTAS);
    if (cachedContratistas) {
      try {
        const parsed = JSON.parse(cachedContratistas);
        this.contratistas = parsed.length > 0 ? parsed : INITIAL_CONTRATISTAS;
      } catch {
        this.contratistas = INITIAL_CONTRATISTAS;
      }
    } else {
      this.contratistas = INITIAL_CONTRATISTAS;
      this.saveContratistas();
    }

    // 17. Hidrolavado
    const cachedHidro = localStorage.getItem(STORAGE_KEYS.HIDROLAVADO);
    if (cachedHidro) {
      try {
        const parsedH = JSON.parse(cachedHidro);
        this.hidrolavado = parsedH.length > 0 ? parsedH : INITIAL_HIDROLAVADO;
      } catch {
        this.hidrolavado = INITIAL_HIDROLAVADO;
      }
    } else {
      this.hidrolavado = INITIAL_HIDROLAVADO;
      this.saveHidrolavado();
    }

    // 18. Configuración Autenticación
    const cachedAuthConfig = localStorage.getItem(STORAGE_KEYS.AUTH_CONFIG);
    if (cachedAuthConfig) {
      try {
        this.authConfig = { ...this.authConfig, ...JSON.parse(cachedAuthConfig) };
      } catch { /* ignore */ }
    }

    // Normalizar metadatos de control de registro en todos los módulos
    this.lineas = this.normalizeControlArray(this.lineas);
    this.estructuras = this.normalizeControlArray(this.estructuras);
    this.corona = this.normalizeControlArray(this.corona);
    this.deficiencias = this.normalizeControlArray(this.deficiencias);
    this.puestaTierra = this.normalizeControlArray(this.puestaTierra);
    this.termografia = this.normalizeControlArray(this.termografia);
    this.podas = this.normalizeControlArray(this.podas);
    this.mantenimiento = this.normalizeControlArray(this.mantenimiento);
    this.ordenesMantenimiento = this.normalizeControlArray(this.ordenesMantenimiento);
    this.dms = this.normalizeControlArray(this.dms);
    this.levantamientos = this.normalizeControlArray(this.levantamientos);
    this.inspecciones = this.normalizeControlArray(this.inspecciones);
    this.usuarios = this.normalizeControlArray(this.usuarios);
    this.contratistas = this.normalizeControlArray(this.contratistas);
    this.hidrolavado = this.normalizeControlArray(this.hidrolavado);

    // Fetch authoritative server state asynchronously on start without clobbering pending local writes
    void this.syncWithServer();
  }

  public async syncWithServer(): Promise<boolean> {
    try {
      const serverState = await realtimeService.fetchAuthoritativeState();
      if (serverState && !realtimeService.hasPendingMutations()) {
        this.applyFullServerState(serverState);
        this.notifyStateChange();
        return true;
      }
    } catch {
      console.log('[StorageService] Local state initialized, server fetch pending');
    }
    return false;
  }

  private setupRealtimeSync() {
    realtimeService.onStateUpdate((entity, action, data, fullState) => {
      if (action === 'init' && fullState) {
        if (!realtimeService.hasPendingMutations()) {
          this.applyFullServerState(fullState);
          this.notifyStateChange();
        }
      } else {
        this.applyRemotePatch(entity, action, data);
        this.notifyStateChange();
      }
    });
  }

  public applyFullServerState(s: any, force = false) {
    if (!force && realtimeService.hasPendingMutations()) {
      return;
    }
    if (s.lineas) { this.lineas = this.normalizeControlArray(s.lineas); this.saveLineas(); }
    if (s.estructuras) { this.estructuras = this.normalizeControlArray(s.estructuras); this.saveEstructuras(); }
    if (s.corona) { this.corona = this.normalizeControlArray(s.corona); this.saveCorona(); }
    if (s.deficiencias) {
      this.deficiencias = this.normalizeControlArray(s.deficiencias).map((d: any) => ({
        ...d,
        prioridad: (d.prioridad === 'PRIORITARIO' || d.prioridad === 'ALTO' || d.prioridad === 'Alta' || d.prioridad === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'
      }));
      this.saveDeficiencias();
    }
    if (s.puestaTierra) {
      this.puestaTierra = this.normalizeControlArray(s.puestaTierra).map((p: any) => ({
        ...p,
        prioridad: (p.valor_resistencia_pat >= 5.0 || p.prioridad === 'PRIORITARIO' || p.prioridad === 'ALTO') ? 'PRIORITARIO' : 'NO PRIORITARIO',
        alerta_deficiencia: p.valor_resistencia_pat >= 5.0
      }));
      this.savePuestaTierra();
    }
    if (s.termografia) { this.termografia = this.normalizeControlArray(s.termografia); this.saveTermografia(); }
    if (s.podas) { this.podas = this.normalizeControlArray(s.podas); this.savePodas(); }
    if (s.mantenimiento) { this.mantenimiento = this.normalizeControlArray(s.mantenimiento); this.saveMantenimiento(); }
    if (s.ordenes_om) { this.ordenesMantenimiento = this.normalizeControlArray(s.ordenes_om); this.saveOrdenesMantenimiento(); }
    if (s.dms) { this.dms = this.normalizeControlArray(s.dms); this.saveDMS(); }
    if (s.levantamientos) { this.levantamientos = this.normalizeControlArray(s.levantamientos); this.saveLevantamientos(); }
    if (s.inspecciones) { this.inspecciones = this.normalizeControlArray(s.inspecciones); this.saveInspecciones(); }
    if (s.usuarios) { this.usuarios = this.normalizeControlArray<Usuario>(s.usuarios).map(sanitizeUserObj); this.saveUsuarios(); }
    if (s.contratistas) { this.contratistas = this.normalizeControlArray(s.contratistas); this.saveContratistas(); }
    if (s.hidrolavado) { this.hidrolavado = this.normalizeControlArray(s.hidrolavado); this.saveHidrolavado(); }
    if (s.authConfig) { this.authConfig = { ...this.authConfig, ...s.authConfig }; this.saveAuthConfig(); }
    if (s.auditoria) { this.auditoria = s.auditoria; this.saveAuditoria(); }
    if (s.config) { this.config = { ...this.config, ...s.config }; }
  }


  public applyRemotePatch(entity: string, action: string, data: any) {
    switch (entity) {
      case 'lineas':
        if (action === 'create') {
          if (!this.lineas.some(l => l.cod_linea === data.cod_linea)) this.lineas.push(this.normalizeControl(data));
        } else if (action === 'update' || action === 'deactivate') {
          const idx = this.lineas.findIndex(l => l.cod_linea === data.cod_linea);
          if (idx >= 0) this.lineas[idx] = { ...this.lineas[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.lineas.findIndex(l => l.cod_linea === data.cod_linea || l.id_linea === data.id_linea);
          if (idx >= 0) this.lineas[idx] = { ...this.lineas[idx], ...data, estado: 'Inactivo', estado_registro: 'ELIMINADO' };
        }
        this.saveLineas();
        break;

      case 'estructuras':
        if (action === 'create') {
          const exists = this.estructuras.some(e => e.id_poste === data.id_poste);
          if (!exists) this.estructuras.push(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.estructuras.findIndex(e => e.id_poste === data.id_poste);
          if (idx >= 0) this.estructuras[idx] = { ...this.estructuras[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.estructuras.findIndex(e => (data.id_poste && e.id_poste === data.id_poste) || (e.cod_linea === data.cod_linea && e.poste_n === data.poste_n && e.estado_registro !== 'ELIMINADO'));
          if (idx >= 0) this.estructuras[idx] = { ...this.estructuras[idx], ...data, estado: 'Desactivado', estado_registro: 'ELIMINADO' };
        } else if (action === 'batch') {
          this.estructuras = this.normalizeControlArray(data);
        }
        this.saveEstructuras();
        break;

      case 'corona':
        if (action === 'create') {
          if (!this.corona.some(c => c.id_corona === data.id_corona)) this.corona.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.corona.findIndex(c => c.id_corona === data.id_corona);
          if (idx >= 0) this.corona[idx] = { ...this.corona[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.corona.findIndex(c => c.id_corona === data.id_corona);
          if (idx >= 0) this.corona[idx] = { ...this.corona[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.saveCorona();
        break;

      case 'deficiencias':
        if (action === 'create') {
          const normalized = this.normalizeControl({
            ...data,
            prioridad: (data.prioridad === 'PRIORITARIO' || data.prioridad === 'ALTO' || data.prioridad === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO'
          });
          if (!this.deficiencias.some(d => d.id_deficiencia === data.id_deficiencia)) this.deficiencias.unshift(normalized);
        } else if (action === 'update') {
          const idx = this.deficiencias.findIndex(d => d.id_deficiencia === data.id_deficiencia);
          if (idx >= 0) {
            this.deficiencias[idx] = {
              ...this.deficiencias[idx],
              ...data,
              prioridad: (data.prioridad === 'PRIORITARIO' || data.prioridad === 'ALTO' || data.prioridad === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO'
            };
          }
        } else if (action === 'delete') {
          const idx = this.deficiencias.findIndex(d => d.id_deficiencia === data.id_deficiencia);
          const targetDef = idx >= 0 ? this.deficiencias[idx] : undefined;
          const defOM = targetDef?.numero_om || data.numero_om;
          if (idx >= 0) {
            this.deficiencias[idx] = { ...this.deficiencias[idx], ...data, estado_registro: 'ELIMINADO' };
          }
          // Retirar también de las órdenes de mantenimiento activas sincronizadas
          this.ordenesMantenimiento = this.ordenesMantenimiento.map(om => {
            if (om.estado_registro === 'ELIMINADO') return om;
            const hasReg = om.registros_asociados?.some(r => r.id_registro === data.id_deficiencia);
            const isMatchOM = defOM && om.numero_om.toLowerCase() === defOM.toLowerCase();
            if (hasReg || isMatchOM) {
              const remaining = (om.registros_asociados || []).filter(r => r.id_registro !== data.id_deficiencia);
              if (remaining.length === 0) {
                return {
                  ...om,
                  registros_asociados: remaining,
                  estado_registro: 'ELIMINADO' as EstadoRegistro,
                  fecha_eliminacion: data.fecha_eliminacion || getLimaDateTime().fecha_hora,
                  usuario_eliminacion: data.usuario_eliminacion || 'Sistema Central'
                };
              }
              return { ...om, registros_asociados: remaining };
            }
            return om;
          });
          this.saveOrdenesMantenimiento();
        }
        this.saveDeficiencias();
        break;

      case 'puesta_tierra':
        if (action === 'create') {
          const isCritico = data.valor_resistencia_pat >= 5.0;
          const normalized = this.normalizeControl({
            ...data,
            prioridad: isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO',
            alerta_deficiencia: isCritico
          });
          if (!this.puestaTierra.some(p => p.id_pat === data.id_pat)) this.puestaTierra.unshift(normalized);
        } else if (action === 'update') {
          const idx = this.puestaTierra.findIndex(p => p.id_pat === data.id_pat);
          if (idx >= 0) {
            const val = data.valor_resistencia_pat !== undefined ? data.valor_resistencia_pat : this.puestaTierra[idx].valor_resistencia_pat;
            const isCritico = val >= 5.0;
            this.puestaTierra[idx] = {
              ...this.puestaTierra[idx],
              ...data,
              prioridad: isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO',
              alerta_deficiencia: isCritico
            };
          }
        } else if (action === 'delete') {
          const idx = this.puestaTierra.findIndex(p => p.id_pat === data.id_pat);
          if (idx >= 0) this.puestaTierra[idx] = { ...this.puestaTierra[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.savePuestaTierra();
        break;

      case 'termografia':
        if (action === 'create') {
          if (!this.termografia.some(t => t.id_termografia === data.id_termografia)) this.termografia.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.termografia.findIndex(t => t.id_termografia === data.id_termografia);
          if (idx >= 0) this.termografia[idx] = { ...this.termografia[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.termografia.findIndex(t => t.id_termografia === data.id_termografia);
          if (idx >= 0) this.termografia[idx] = { ...this.termografia[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.saveTermografia();
        break;

      case 'podas':
        if (action === 'create') {
          if (!this.podas.some(p => p.id_poda === data.id_poda)) this.podas.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.podas.findIndex(p => p.id_poda === data.id_poda);
          if (idx >= 0) this.podas[idx] = { ...this.podas[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.podas.findIndex(p => p.id_poda === data.id_poda);
          if (idx >= 0) this.podas[idx] = { ...this.podas[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.savePodas();
        break;

      case 'mantenimiento':
        if (action === 'create') {
          if (!this.mantenimiento.some(m => m.id_mantenimiento === data.id_mantenimiento)) this.mantenimiento.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === data.id_mantenimiento);
          if (idx >= 0) this.mantenimiento[idx] = { ...this.mantenimiento[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === data.id_mantenimiento);
          if (idx >= 0) this.mantenimiento[idx] = { ...this.mantenimiento[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.saveMantenimiento();
        break;

      case 'ordenes_om':
        if (action === 'create') {
          if (!this.ordenesMantenimiento.some(o => o.id_om === data.id_om)) this.ordenesMantenimiento.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.ordenesMantenimiento.findIndex(o => o.id_om === data.id_om);
          if (idx >= 0) this.ordenesMantenimiento[idx] = { ...this.ordenesMantenimiento[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.ordenesMantenimiento.findIndex(
            o => o.id_om === data.id_om || o.numero_om === data.id_om || (data.numero_om && o.numero_om === data.numero_om)
          );
          if (idx >= 0) this.ordenesMantenimiento[idx] = { ...this.ordenesMantenimiento[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.saveOrdenesMantenimiento();
        break;

      case 'dms':
        if (action === 'create') {
          if (!this.dms.some(d => d.id_dms === data.id_dms)) this.dms.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (idx >= 0) this.dms[idx] = { ...this.dms[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (idx >= 0) this.dms[idx] = { ...this.dms[idx], ...data, estado_registro: 'ELIMINADO' };
        } else if (action === 'batch') {
          this.importDMSBatch(data, false);
        }
        this.saveDMS();
        break;

      case 'levantamientos':
        if (action === 'create') {
          if (!this.levantamientos.some(l => l.id_levantamiento === data.id_levantamiento)) this.levantamientos.unshift(this.normalizeControl(data));
          const dmsIdx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (dmsIdx >= 0) this.dms[dmsIdx].estado = 'Levantada';
          this.saveDMS();
        }
        this.saveLevantamientos();
        break;

      case 'inspecciones':
        if (action === 'create') {
          if (!this.inspecciones.some(i => i.id_inspeccion_cierre === data.id_inspeccion_cierre)) this.inspecciones.unshift(this.normalizeControl(data));
          const dmsIdx = this.dms.findIndex(d => d.id_dms === data.id_dms);
          if (dmsIdx >= 0) {
            this.dms[dmsIdx].estado = data.resultado === 'Levantamiento conforme' ? 'Cerrada' : 'En Levantamiento';
            this.saveDMS();
          }
        }
        this.saveInspecciones();
        break;

      case 'usuarios':
        if (action === 'create') {
          if (!this.usuarios.some(u => u.id_usuario === data.id_usuario)) this.usuarios.push(sanitizeUserObj(this.normalizeControl(data)));
        } else if (action === 'update') {
          const idx = this.usuarios.findIndex(u => u.id_usuario === data.id_usuario);
          if (idx >= 0) this.usuarios[idx] = sanitizeUserObj({ ...this.usuarios[idx], ...data });
        } else if (action === 'delete') {
          const idx = this.usuarios.findIndex(u => u.id_usuario === data.id_usuario);
          if (idx >= 0) this.usuarios[idx] = sanitizeUserObj({ ...this.usuarios[idx], ...data, estado: 'Inactivo', estado_registro: 'ELIMINADO' });
        }
        this.saveUsuarios();
        break;

      case 'contratistas':
        if (action === 'create') {
          if (!this.contratistas.some(c => c.id_contratista === data.id_contratista)) this.contratistas.push(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.contratistas.findIndex(c => c.id_contratista === data.id_contratista);
          if (idx >= 0) this.contratistas[idx] = { ...this.contratistas[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.contratistas.findIndex(c => c.id_contratista === data.id_contratista);
          if (idx >= 0) this.contratistas[idx] = { ...this.contratistas[idx], ...data, estado: 'Inactivo', estado_registro: 'ELIMINADO' };
        }
        this.saveContratistas();
        break;

      case 'hidrolavado':
        if (action === 'create') {
          if (!this.hidrolavado.some(h => h.id_hidrolavado === data.id_hidrolavado)) this.hidrolavado.unshift(this.normalizeControl(data));
        } else if (action === 'update') {
          const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === data.id_hidrolavado);
          if (idx >= 0) this.hidrolavado[idx] = { ...this.hidrolavado[idx], ...data };
        } else if (action === 'delete') {
          const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === data.id_hidrolavado);
          if (idx >= 0) this.hidrolavado[idx] = { ...this.hidrolavado[idx], ...data, estado_registro: 'ELIMINADO' };
        }
        this.saveHidrolavado();
        break;

      case 'auth_config':
        this.authConfig = { ...this.authConfig, ...data };
        this.saveAuthConfig();
        break;

      case 'bulk_import':
        if (data) {
          this.applyFullServerState(data);
        }
        break;
    }
  }

  // --- CURRENT USER & AUTH ---
  getCurrentUser(): Usuario {
    return this.currentUser;
  }

  setCurrentUser(userOrUsername: string | Usuario): boolean {
    if (typeof userOrUsername === 'string') {
      const found = this.usuarios.find(u => u.username === userOrUsername);
      if (found) {
        const safe = sanitizeUserObj(found);
        this.currentUser = safe;
        this.safeLocalStorageSet('st_auth_user', JSON.stringify(safe));
        realtimeService.identify(safe);
        return true;
      }
      return false;
    } else {
      const safe = sanitizeUserObj(userOrUsername);
      this.currentUser = safe;
      this.safeLocalStorageSet('st_auth_user', JSON.stringify(safe));
      realtimeService.identify(safe);
      return true;
    }
  }

  logout() {
    localStorage.removeItem('st_auth_token');
    localStorage.removeItem('st_auth_user');
  }

  canAccessLine(codLinea: string): boolean {
    if (this.currentUser.rol === 'Administrador') return true;
    if (this.currentUser.lineas_asignadas.includes('*')) return true;
    return this.currentUser.lineas_asignadas.includes(codLinea);
  }

  getAccessibleLines(includeDeleted = false): LineaSubtransmision[] {
    const active = this.getLineas(includeDeleted);
    if (this.currentUser.rol === 'Administrador' || this.currentUser.lineas_asignadas.includes('*')) {
      return active;
    }
    return active.filter(l => this.currentUser.lineas_asignadas.includes(l.cod_linea));
  }

  canManageStructures(): boolean {
    return this.currentUser.rol === 'Administrador';
  }

  canCloseDMS(): boolean {
    return this.currentUser.rol === 'Administrador' || this.currentUser.rol === 'Supervisor';
  }

  canManageUsers(): boolean {
    return this.currentUser.rol === 'Administrador';
  }

  getAuthorizedTabs(targetUser?: Usuario): string[] {
    const user = targetUser || this.currentUser;
    if (!user) return ['dashboard'];

    if (user.rol === 'Administrador') {
      return [
        'dashboard',
        'lineas',
        'estructuras',
        'corona',
        'deficiencias',
        'puesta_tierra',
        'termografia',
        'podas',
        'mantenimiento',
        'hidrolavado',
        'ordenes_om',
        'dms',
        'levantamientos',
        'inspecciones',
        'evidencias',
        'contratistas',
        'usuarios',
        'auditoria',
        'configuracion',
        'reportes'
      ];
    }

    if (user.rol === 'Supervisor') {
      return [
        'dashboard',
        'lineas',
        'estructuras',
        'corona',
        'deficiencias',
        'puesta_tierra',
        'termografia',
        'podas',
        'mantenimiento',
        'hidrolavado',
        'ordenes_om',
        'dms',
        'levantamientos',
        'inspecciones',
        'evidencias',
        'contratistas',
        'auditoria',
        'reportes'
      ];
    }

    // Rol: Contratista
    // Matriz de asignación de actividades:
    // Montajes: deficiencias, corona, termografia, dms, ordenes_om
    // Nassan: podas, ordenes_om
    // Pcoin: puesta_tierra, ordenes_om
    // Vento Ingenieros: hidrolavado, ordenes_om
    let contratista: Contratista | undefined;
    if (user.contratista_id) {
      contratista = this.contratistas.find(c => c.id_contratista === user.contratista_id);
    }
    if (!contratista && user.contratista_nombre) {
      const needle = user.contratista_nombre.toLowerCase().trim();
      contratista = this.contratistas.find(c =>
        c.razon_social.toLowerCase().includes(needle) || needle.includes(c.razon_social.toLowerCase())
      );
    }

    const permittedTabs = new Set<string>(['dashboard', 'evidencias', 'ordenes_om']);

    const activities: CodigoActividad[] = contratista?.actividades_asignadas || [
      'deficiencias',
      'corona',
      'termografia',
      'dms',
      'ordenes_om',
      'podas',
      'puesta_tierra',
      'hidrolavado'
    ];

    activities.forEach(act => {
      switch (act) {
        case 'deficiencias':
          permittedTabs.add('deficiencias');
          break;
        case 'corona':
          permittedTabs.add('corona');
          break;
        case 'termografia':
          permittedTabs.add('termografia');
          break;
        case 'dms':
          permittedTabs.add('dms');
          permittedTabs.add('levantamientos');
          break;
        case 'ordenes_om':
          permittedTabs.add('ordenes_om');
          break;
        case 'podas':
          permittedTabs.add('podas');
          break;
        case 'puesta_tierra':
          permittedTabs.add('puesta_tierra');
          break;
        case 'hidrolavado':
          permittedTabs.add('hidrolavado');
          break;
        case 'mantenimiento':
          permittedTabs.add('mantenimiento');
          break;
      }
    });

    return Array.from(permittedTabs);
  }

  canAccessTab(tabId: string, targetUser?: Usuario): boolean {
    const authorized = this.getAuthorizedTabs(targetUser);
    return authorized.includes(tabId);
  }

  // --- AUDITORÍA CENTRALIZADA (AUDITORIA_SISTEMA) ---
  getAuditoria(): AuditoriaRegistro[] {
    return this.auditoria;
  }

  recordAudit(params: Partial<AuditoriaRegistro> & {
    modulo: string;
    id_registro: string;
    accion: AuditoriaRegistro['accion'];
  }): AuditoriaRegistro {
    const { fecha, hora, fecha_hora } = getLimaDateTime();
    const actionRaw = String(params.accion || 'EDICIÓN').toUpperCase();
    let accionNorm: AuditoriaRegistro['accion'] = 'EDICIÓN';
    if (actionRaw.includes('CREA')) accionNorm = 'CREACIÓN';
    else if (actionRaw.includes('ELIM') || actionRaw.includes('DESACT')) accionNorm = 'ELIMINACIÓN';
    else if (actionRaw.includes('REORD')) accionNorm = 'REORDENAMIENTO';
    else if (actionRaw.includes('CIERRE')) accionNorm = 'CIERRE_DMS';
    else if (actionRaw.includes('SINC')) accionNorm = 'SINCRONIZACION';
    else if (actionRaw.includes('IMP')) accionNorm = 'IMPORTACION';
    else accionNorm = 'EDICIÓN';

    const usuario = params.usuario || `${this.currentUser.nombres} ${this.currentUser.apellidos}`;
    const rol_usuario = params.rol_usuario || params.rol || this.currentUser.rol;
    const modulo = (params.modulo || 'GENERAL').toUpperCase();

    let campo_modificado = params.campo_modificado || '';
    let valor_anterior = params.valor_anterior || params.valores_anteriores || '';
    let valor_nuevo = params.valor_nuevo || params.valores_nuevos || '';
    let observacion = params.observacion || '';

    if (!campo_modificado) {
      if (accionNorm === 'CREACIÓN') {
        campo_modificado = 'Todos los campos (Registro nuevo)';
        if (!valor_anterior) valor_anterior = 'N/A';
        if (!valor_nuevo) valor_nuevo = `Nuevo registro ${params.id_registro} creado en ${modulo}`;
        if (!observacion) observacion = `Nuevo registro creado en ${modulo}`;
      } else if (accionNorm === 'ELIMINACIÓN') {
        campo_modificado = 'Registro completo';
        if (!valor_anterior) valor_anterior = `Registro ${params.id_registro} activo`;
        if (!valor_nuevo) valor_nuevo = 'Eliminado';
        if (!observacion) observacion = `Registro ${params.id_registro} eliminado permanentemente`;
      } else {
        campo_modificado = 'Estado / Atributos';
        if (!valor_anterior) valor_anterior = 'Valor previo';
        if (!valor_nuevo) valor_nuevo = 'Valor actualizado';
        if (!observacion) observacion = `Registro ${params.id_registro} modificado`;
      }
    }

    const cleanDateId = fecha.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();

    const entry: AuditoriaRegistro = {
      id_auditoria: params.id_auditoria || `AUD-${cleanDateId}-${randomSuffix}`,
      modulo,
      id_registro: String(params.id_registro || 'N/A'),
      accion: accionNorm,
      usuario,
      rol_usuario,
      fecha_hora: params.fecha_hora || fecha_hora,
      campo_modificado,
      valor_anterior: String(valor_anterior),
      valor_nuevo: String(valor_nuevo),
      observacion,
      rol: String(rol_usuario),
      fecha: params.fecha || fecha,
      hora: params.hora || hora,
      cod_linea: params.cod_linea || '-',
      estructura: params.estructura || '-',
      valores_anteriores: String(valor_anterior),
      valores_nuevos: String(valor_nuevo),
      origen: params.origen || 'Web',
      resultado: params.resultado || 'Exitoso',
      sync_id: params.sync_id || `SYNC-LOCAL-${Date.now()}`
    };

    this.auditoria.unshift(entry);
    this.saveAuditoria();
    return entry;
  }

  recordFieldDiffsAudit(
    modulo: string,
    idRegistro: string,
    prevObj: any,
    updatedObj: any,
    context?: {
      cod_linea?: string;
      estructura?: string;
      observacion?: string;
    }
  ): void {
    if (!prevObj || !updatedObj) return;
    const diffs: { key: string; prev: any; next: any }[] = [];
    const ignoreKeys = [
      'id_auditoria',
      'ultima_actualizacion',
      'fecha_registro',
      'sync_id',
      'responsable',
      'fotografias',
      'evidencias',
      'fecha_creacion',
      'usuario_creacion',
      'fecha_modificacion',
      'usuario_modificacion',
      'fecha_eliminacion',
      'usuario_eliminacion',
      'estado_registro',
      'password'
    ];
    
    const combinedKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(updatedObj)]));
    for (const key of combinedKeys) {
      if (ignoreKeys.includes(key)) continue;
      const vPrev = prevObj[key];
      const vNext = updatedObj[key];
      const sPrev = vPrev === undefined || vPrev === null ? '' : typeof vPrev === 'object' ? JSON.stringify(vPrev) : String(vPrev);
      const sNext = vNext === undefined || vNext === null ? '' : typeof vNext === 'object' ? JSON.stringify(vNext) : String(vNext);
      if (sPrev !== sNext) {
        diffs.push({ key, prev: sPrev, next: sNext });
      }
    }

    if (diffs.length === 0) return;

    if (diffs.length <= 3) {
      // Registrar un movimiento por cada campo modificado con precisión forense
      for (const d of diffs) {
        const friendlyName = formatFieldName(d.key);
        this.recordAudit({
          modulo,
          id_registro: idRegistro,
          accion: 'EDICIÓN',
          campo_modificado: friendlyName,
          valor_anterior: d.prev || 'Vacío',
          valor_nuevo: d.next || 'Vacío',
          observacion: context?.observacion || `Campo ${friendlyName} modificado de "${d.prev || 'Vacío'}" a "${d.next || 'Vacío'}"`,
          cod_linea: context?.cod_linea || updatedObj.cod_linea || prevObj.cod_linea || '-',
          estructura: context?.estructura || updatedObj.poste_n || prevObj.poste_n || '-'
        });
      }
    } else {
      // Múltiples campos modificados de forma simultánea
      const fieldsSummary = diffs.map(d => formatFieldName(d.key)).join(', ');
      this.recordAudit({
        modulo,
        id_registro: idRegistro,
        accion: 'EDICIÓN',
        campo_modificado: `Múltiples campos (${diffs.length}: ${fieldsSummary.substring(0, 50)}...)`,
        valor_anterior: diffs.slice(0, 4).map(d => `${formatFieldName(d.key)}: ${d.prev}`).join(' | '),
        valor_nuevo: diffs.slice(0, 4).map(d => `${formatFieldName(d.key)}: ${d.next}`).join(' | '),
        observacion: context?.observacion || `Actualización múltiple de atributos en el registro ${idRegistro}`,
        cod_linea: context?.cod_linea || updatedObj.cod_linea || prevObj.cod_linea || '-',
        estructura: context?.estructura || updatedObj.poste_n || prevObj.poste_n || '-'
      });
    }
  }

  private saveAuditoria() {
    this.safeLocalStorageSet(STORAGE_KEYS.AUDITORIA, JSON.stringify(this.auditoria.slice(0, 1000)));
  }

  // --- LÍNEAS DE SUBTRANSMISIÓN ---
  getLineas(includeDeleted = false): LineaSubtransmision[] {
    if (includeDeleted) return this.lineas;
    return this.lineas.filter(l => l.estado_registro !== 'ELIMINADO');
  }

  getLineaByCode(codLinea: string): LineaSubtransmision | undefined {
    return this.lineas.find(l => l.cod_linea === codLinea && l.estado_registro !== 'ELIMINADO');
  }

  addLinea(linea: Omit<LineaSubtransmision, 'id_linea' | 'fecha_registro' | 'ultima_sincronizacion'>): { success: boolean; message: string; data?: LineaSubtransmision } {
    if (this.currentUser.rol === 'Contratista') {
      return { success: false, message: 'Permiso denegado: El contratista no puede registrar líneas.' };
    }
    const cleanCode = linea.cod_linea.trim().toUpperCase();
    if (this.lineas.some(l => l.cod_linea.toUpperCase() === cleanCode && l.estado_registro !== 'ELIMINADO')) {
      return { success: false, message: `Error: La línea con código "${cleanCode}" ya existe en el sistema.` };
    }
    const { fecha, hora } = getLimaDateTime();
    const newLine: LineaSubtransmision = {
      ...linea,
      cod_linea: cleanCode,
      id_linea: this.nextSequentialId('LIN-', this.lineas, 'id_linea', 3),
      estado: linea.estado || 'Activo',
      fecha_registro: fecha,
      ultima_sincronizacion: `${fecha} ${hora}`,
      ...this.getCreateControl()
    };
    this.lineas.push(newLine);
    this.saveLineas();

    realtimeService.mutate('lineas', 'create', newLine);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'LÍNEAS',
      id_registro: newLine.id_linea,
      cod_linea: newLine.cod_linea,
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: JSON.stringify(newLine),
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return { success: true, message: `Línea ${newLine.cod_linea} registrada exitosamente.`, data: newLine };
  }

  updateLinea(codLinea: string, updates: Partial<LineaSubtransmision>): { success: boolean; message: string; data?: LineaSubtransmision } {
    if (this.currentUser.rol === 'Contratista') {
      return { success: false, message: 'Permiso denegado: Los contratistas no tienen autorización para modificar líneas.' };
    }
    const index = this.lineas.findIndex(l => l.cod_linea === codLinea && l.estado_registro !== 'ELIMINADO');
    if (index === -1) {
      return { success: false, message: `Línea ${codLinea} no encontrada.` };
    }
    const prev = { ...this.lineas[index] };
    const { fecha, hora } = getLimaDateTime();
    this.lineas[index] = {
      ...this.lineas[index],
      ...updates,
      cod_linea: codLinea,
      ultima_sincronizacion: `${fecha} ${hora}`,
      ...this.getUpdateControl()
    };
    this.saveLineas();

    realtimeService.mutate('lineas', 'update', this.lineas[index]);

    this.recordFieldDiffsAudit('LÍNEAS', this.lineas[index].id_linea, prev, this.lineas[index], {
      cod_linea: codLinea,
      estructura: '-'
    });
    return { success: true, message: `Línea ${codLinea} actualizada correctamente.`, data: this.lineas[index] };
  }

  deactivateOrDeleteLinea(codLinea: string, forceDelete = false): { success: boolean; message: string; actionTaken: 'DESACTIVADA' | 'ELIMINADA' } {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede desactivar o eliminar líneas.');
    }
    const index = this.lineas.findIndex(l => l.cod_linea === codLinea && l.estado_registro !== 'ELIMINADO');
    if (index === -1) return { success: false, message: `Línea ${codLinea} no existe.`, actionTaken: 'DESACTIVADA' };

    const countEstructuras = this.estructuras.filter(e => e.cod_linea === codLinea && e.estado_registro !== 'ELIMINADO').length;
    const countDeficiencias = this.deficiencias.filter(d => d.cod_linea === codLinea && d.estado_registro !== 'ELIMINADO').length;
    const countCorona = this.corona.filter(c => c.cod_linea === codLinea && c.estado_registro !== 'ELIMINADO').length;
    const countTotal = countEstructuras + countDeficiencias + countCorona;

    if (countTotal > 0 && !forceDelete) {
      this.lineas[index] = {
        ...this.lineas[index],
        estado: 'Inactivo',
        ...this.getUpdateControl()
      };
      this.saveLineas();

      realtimeService.mutate('lineas', 'deactivate', this.lineas[index]);

      this.recordAudit({
        accion: 'DESACTIVACION',
        modulo: 'LÍNEAS',
        id_registro: this.lineas[index].id_linea,
        cod_linea: codLinea,
        estructura: '-',
        campo_modificado: 'Estado',
        valor_anterior: 'Activo',
        valor_nuevo: 'Inactivo',
        observacion: `Línea ${codLinea} desactivada lógicamente (${countTotal} registros dependientes)`,
        origen: 'Web',
        resultado: 'Exitoso'
      });
      return {
        success: true,
        message: `La línea ${codLinea} tiene ${countEstructuras} estructuras asociadas. Ha sido DESACTIVADA para preservar el historial.`,
        actionTaken: 'DESACTIVADA'
      };
    } else {
      const removed = {
        ...this.lineas[index],
        estado: 'Inactivo' as const,
        ...this.getDeleteControl()
      };
      this.lineas[index] = removed;
      this.saveLineas();

      realtimeService.mutate('lineas', 'delete', removed);

      this.recordAudit({
        accion: 'ELIMINACIÓN',
        modulo: 'LÍNEAS',
        id_registro: removed.id_linea,
        cod_linea: codLinea,
        estructura: '-',
        campo_modificado: 'ESTADO_REGISTRO',
        valor_anterior: 'ACTIVO',
        valor_nuevo: 'ELIMINADO',
        observacion: `Línea ${codLinea} marcada como ELIMINADO (eliminación lógica)`,
        origen: 'Web',
        resultado: 'Exitoso'
      });
      return {
        success: true,
        message: `Línea ${codLinea} eliminada lógicamente (historial conservado).`,
        actionTaken: 'ELIMINADA'
      };
    }
  }

  private saveLineas() {
    this.safeLocalStorageSet(STORAGE_KEYS.LINEAS, JSON.stringify(this.lineas));
  }

  // --- ESTRUCTURAS (POSTES) ---
  getEstructuras(codLinea?: string, includeDeleted = false): Estructura[] {
    let list = includeDeleted ? this.estructuras : this.estructuras.filter(e => e.estado_registro !== 'ELIMINADO');
    if (codLinea) {
      list = list.filter(e => e.cod_linea === codLinea);
    }
    return list;
  }

  private parsePosteNumber(posteN: string): { num: number; suffix: string } {
    const trimmed = (posteN || '').trim();
    const match = trimmed.match(/^(\d+)(.*)$/);
    if (match) {
      return { num: parseInt(match[1], 10), suffix: match[2] };
    }
    return { num: 999999, suffix: trimmed };
  }

  insertStructureWithShift(
    codLinea: string,
    targetPosteN: string,
    data: Omit<Estructura, 'id_poste' | 'cod_linea' | 'poste_n'>,
    shiftSubsequent = true
  ): { success: boolean; message: string; structure?: Estructura } {
    const targetParsed = this.parsePosteNumber(targetPosteN);
    let shiftedCount = 0;

    if (shiftSubsequent && targetParsed.num !== 999999) {
      const lineStructs = this.estructuras.filter(e => e.cod_linea === codLinea && e.estado_registro !== 'ELIMINADO');
      lineStructs.sort((a, b) => this.parsePosteNumber(b.poste_n).num - this.parsePosteNumber(a.poste_n).num);

      lineStructs.forEach(st => {
        const p = this.parsePosteNumber(st.poste_n);
        if (p.num >= targetParsed.num) {
          st.poste_n = String(p.num + 1) + p.suffix;
          shiftedCount++;
        }
      });
    }

    const newStruct: Estructura = {
      ...data,
      id_poste: 'POS-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      cod_linea: codLinea,
      poste_n: targetPosteN,
      estado: data.estado || 'Operativo',
      ...this.getCreateControl()
    };

    this.estructuras.push(newStruct);
    this.saveEstructuras();

    realtimeService.mutate('estructuras', 'create', newStruct, shiftSubsequent);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'ESTRUCTURAS',
      id_registro: newStruct.id_poste,
      cod_linea: codLinea,
      estructura: targetPosteN,
      valores_anteriores: 'N/A',
      valores_nuevos: `Nueva estructura insertada en POSTE_N=${targetPosteN}. ${shiftedCount} estructuras subsiguientes desplazadas +1`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return {
      success: true,
      message: `Estructura ${targetPosteN} insertada en ${codLinea}.${shiftedCount > 0 ? ` Se desplazaron ${shiftedCount} estructuras subsiguientes.` : ''}`,
      structure: newStruct
    };
  }

  deleteStructureWithShift(codLinea: string, targetPosteN: string, shiftSubsequent = true): { success: boolean; message: string } {
    const index = this.estructuras.findIndex(e => e.cod_linea === codLinea && e.poste_n === targetPosteN && e.estado_registro !== 'ELIMINADO');
    if (index === -1) return { success: false, message: `Estructura ${targetPosteN} no encontrada en línea ${codLinea}.` };

    const delCtrl = this.getDeleteControl();
    const deleted: Estructura = {
      ...this.estructuras[index],
      estado: 'Desactivado',
      ...delCtrl
    };
    this.estructuras[index] = deleted;
    const targetParsed = this.parsePosteNumber(targetPosteN);
    let shiftedCount = 0;

    if (shiftSubsequent && targetParsed.num !== 999999) {
      this.estructuras.forEach(st => {
        if (st.cod_linea === codLinea && st.estado_registro !== 'ELIMINADO') {
          const p = this.parsePosteNumber(st.poste_n);
          if (p.num > targetParsed.num) {
            st.poste_n = String(p.num - 1) + p.suffix;
            shiftedCount++;
          }
        }
      });
    }

    this.saveEstructuras();
    realtimeService.mutate('estructuras', 'delete', { id_poste: deleted.id_poste, cod_linea: codLinea, poste_n: targetPosteN, ...delCtrl }, shiftSubsequent);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'ESTRUCTURAS',
      id_registro: deleted.id_poste,
      cod_linea: codLinea,
      estructura: targetPosteN,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Estructura ${targetPosteN} marcada como ELIMINADO.${shiftedCount > 0 ? ` Se reordenaron ${shiftedCount} estructuras posteriores.` : ''}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return {
      success: true,
      message: `Estructura ${targetPosteN} eliminada lógicamente.${shiftedCount > 0 ? ` Se reordenaron ${shiftedCount} estructuras posteriores.` : ''}`
    };
  }

  updateEstructura(idPoste: string, updates: Partial<Estructura>): { success: boolean; message: string } {
    const idx = this.estructuras.findIndex(e => e.id_poste === idPoste);
    if (idx === -1) return { success: false, message: 'Estructura no encontrada.' };
    const prev = { ...this.estructuras[idx] };
    this.estructuras[idx] = { ...this.estructuras[idx], ...updates, ...this.getUpdateControl() };
    this.saveEstructuras();

    realtimeService.mutate('estructuras', 'update', this.estructuras[idx]);

    this.recordFieldDiffsAudit('ESTRUCTURAS', idPoste, prev, this.estructuras[idx], {
      cod_linea: this.estructuras[idx].cod_linea,
      estructura: this.estructuras[idx].poste_n
    });
    return { success: true, message: 'Estructura actualizada correctamente.' };
  }

  importEstructurasBatch(newStructs: Estructura[], mode: 'merge' | 'replace'): { success: boolean; message: string; count: number } {
    const createCtrl = this.getCreateControl();
    if (mode === 'replace') {
      this.estructuras = newStructs.map(s => ({ ...s, ...createCtrl }));
    } else {
      for (const ns of newStructs) {
        const existingIdx = this.estructuras.findIndex(
          e => e.cod_linea === ns.cod_linea && e.poste_n.trim().toLowerCase() === ns.poste_n.trim().toLowerCase() && e.estado_registro !== 'ELIMINADO'
        );
        if (existingIdx >= 0) {
          this.estructuras[existingIdx] = { ...this.estructuras[existingIdx], ...ns, ...this.getUpdateControl() };
        } else {
          this.estructuras.push({ ...ns, ...createCtrl });
        }
      }
    }
    this.saveEstructuras();
    realtimeService.mutate('estructuras', 'batch', this.estructuras);

    this.recordAudit({
      accion: 'IMPORTACION',
      modulo: 'ESTRUCTURAS',
      id_registro: 'BATCH',
      cod_linea: 'VARIAS',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Importadas ${newStructs.length} estructuras desde Excel (Modo: ${mode})`,
      origen: 'Importación Excel',
      resultado: 'Exitoso'
    });
    return { success: true, message: `Se importaron ${newStructs.length} estructuras exitosamente.`, count: newStructs.length };
  }

  private saveEstructuras() {
    this.safeLocalStorageSet(STORAGE_KEYS.ESTRUCTURAS, JSON.stringify(this.estructuras));
  }

  // --- EFECTO CORONA ---
  getCorona(codLinea?: string, includeDeleted = false): EfectoCorona[] {
    let list = includeDeleted ? this.corona : this.corona.filter(c => c.estado_registro !== 'ELIMINADO');
    if (codLinea) {
      list = list.filter(c => c.cod_linea === codLinea);
    }
    return list;
  }

  addCorona(item: Omit<EfectoCorona, 'id_corona'>): EfectoCorona {
    const maxPhotons = Math.max(Number(item.fase_r_conteo) || 0, Number(item.fase_s_conteo) || 0, Number(item.fase_t_conteo) || 0);
    const prioridad: Prioridad = item.prioridad || (maxPhotons > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO');
    const newItem: EfectoCorona = {
      ...item,
      prioridad,
      id_corona: 'COR-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ...this.getCreateControl()
    };
    this.corona.unshift(newItem);
    this.saveCorona();

    realtimeService.mutate('corona', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'EFECTO CORONA',
      id_registro: newItem.id_corona,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Medición Efecto Corona en ${newItem.cod_linea} P-${newItem.poste_n}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateCorona(idCorona: string, updates: Partial<EfectoCorona>): boolean {
    const idx = this.corona.findIndex(c => c.id_corona === idCorona);
    if (idx === -1) return false;
    const prev = { ...this.corona[idx] };
    this.corona[idx] = { ...this.corona[idx], ...updates, ...this.getUpdateControl() };
    this.saveCorona();

    realtimeService.mutate('corona', 'update', this.corona[idx]);

    this.recordFieldDiffsAudit('EFECTO CORONA', idCorona, prev, this.corona[idx], {
      cod_linea: this.corona[idx].cod_linea,
      estructura: this.corona[idx].poste_n
    });
    return true;
  }

  deleteCorona(idCorona: string): boolean {
    const idx = this.corona.findIndex(c => c.id_corona === idCorona && c.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.corona[idx], ...this.getDeleteControl() };
    this.corona[idx] = updated;
    this.saveCorona();

    realtimeService.mutate('corona', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'EFECTO CORONA',
      id_registro: idCorona,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Registro de Efecto Corona ${idCorona} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  getSituacionesCorona(): string[] {
    return this.situacionesCorona;
  }

  addSituacionCorona(sit: string) {
    if (!this.situacionesCorona.includes(sit.trim())) {
      this.situacionesCorona.push(sit.trim());
      this.safeLocalStorageSet(STORAGE_KEYS.SITUACIONES_CORONA, JSON.stringify(this.situacionesCorona));
    }
  }

  private saveCorona() {
    this.safeLocalStorageSet(STORAGE_KEYS.CORONA, JSON.stringify(this.corona));
  }

  // --- DEFICIENCIAS ---
  getDeficiencias(codLinea?: string, includeDeleted = false): Deficiencia[] {
    let list = includeDeleted ? this.deficiencias : this.deficiencias.filter(d => d.estado_registro !== 'ELIMINADO');
    if (codLinea) {
      list = list.filter(d => d.cod_linea === codLinea);
    }
    return list;
  }

  addDeficiencia(def: Omit<Deficiencia, 'id_deficiencia'>): Deficiencia {
    const prio: Prioridad = (def.prioridad === 'PRIORITARIO' || (def.prioridad as string) === 'ALTO' || (def.prioridad as string) === 'Alta' || (def.prioridad as string) === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO';
    const newItem: Deficiencia = {
      ...def,
      prioridad: prio,
      id_deficiencia: this.nextSequentialId('DEF-', this.deficiencias, 'id_deficiencia', 4),
      ...this.getCreateControl()
    };
    this.deficiencias.unshift(newItem);
    this.saveDeficiencias();

    realtimeService.mutate('deficiencias', 'create', newItem);

    // Sincronizar automáticamente con las Órdenes de Mantenimiento si tiene N° OM asignado
    if (newItem.numero_om && newItem.numero_om.trim() !== '') {
      this.syncDeficienciaToOM(newItem);
    }

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'DEFICIENCIAS',
      id_registro: newItem.id_deficiencia,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Deficiencia ${newItem.id_deficiencia} (${newItem.prioridad}) en ${newItem.cod_linea} P-${newItem.poste_n}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateDeficiencia(id: string, updates: Partial<Deficiencia>): boolean {
    const idx = this.deficiencias.findIndex(d => d.id_deficiencia === id);
    if (idx === -1) return false;
    const prev = { ...this.deficiencias[idx] };
    const normalizedUpdates = { ...updates };
    if (updates.prioridad) {
      normalizedUpdates.prioridad = (updates.prioridad === 'PRIORITARIO' || (updates.prioridad as string) === 'ALTO' || (updates.prioridad as string) === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO';
    }
    this.deficiencias[idx] = { ...this.deficiencias[idx], ...normalizedUpdates, ...this.getUpdateControl() };
    this.saveDeficiencias();

    realtimeService.mutate('deficiencias', 'update', this.deficiencias[idx]);

    // Si cambió o tiene N° OM, sincronizar en Órdenes de Mantenimiento
    if (this.deficiencias[idx].numero_om && this.deficiencias[idx].numero_om.trim() !== '' && this.deficiencias[idx].estado_registro !== 'ELIMINADO') {
      this.syncDeficienciaToOM(this.deficiencias[idx]);
    }

    this.recordFieldDiffsAudit('DEFICIENCIAS', id, prev, this.deficiencias[idx], {
      cod_linea: this.deficiencias[idx].cod_linea,
      estructura: this.deficiencias[idx].poste_n
    });
    return true;
  }

  syncDeficienciaToOM(def: Deficiencia): void {
    if (!def.numero_om || def.numero_om.trim() === '') return;
    const cleanNumOM = def.numero_om.trim();

    const existingOM = this.ordenesMantenimiento.find(
      o => o.numero_om.trim().toLowerCase() === cleanNumOM.toLowerCase() && o.estado_registro !== 'ELIMINADO'
    );

    const regItem: ItemRegistroOM = {
      id_registro: def.id_deficiencia,
      cod_linea: def.cod_linea,
      poste_n: def.poste_n,
      descripcion: `${def.tipo_deficiencia}${def.descripcion ? ` - ${def.descripcion}` : ''}`,
      prioridad: def.prioridad || 'PRIORITARIO',
      tipo_actividad: 'Deficiencias Técnicas',
      estado_original: def.estado,
      fecha_original: def.fecha_inspeccion,
      evidencia_url: def.evidencia_fotografica
    };

    if (existingOM) {
      existingOM.registros_asociados = existingOM.registros_asociados || [];
      const regIdx = existingOM.registros_asociados.findIndex(r => r.id_registro === def.id_deficiencia);
      if (regIdx >= 0) {
        existingOM.registros_asociados[regIdx] = regItem;
      } else {
        existingOM.registros_asociados.push(regItem);
      }
      Object.assign(existingOM, this.getUpdateControl());
      this.saveOrdenesMantenimiento();
      realtimeService.mutate('ordenes_om', 'update', existingOM);
    } else {
      const now = getLimaDateTime();
      const newOM: OrdenMantenimiento = {
        id_om: this.nextSequentialId('OM-ID-', this.ordenesMantenimiento, 'id_om', 3) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        numero_om: cleanNumOM,
        fecha_inicio: def.fecha_inspeccion || now.fecha,
        fecha_ejecucion: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        estado: 'Por subsanar',
        tipo_actividad: 'Deficiencias Técnicas',
        responsable: def.usuario_responsable || 'Montajes del Norte',
        observaciones: `OM generada por registro de deficiencia ${def.id_deficiencia} en ${def.cod_linea} P-${def.poste_n}`,
        fecha_registro: `${now.fecha} ${now.hora}`,
        registros_asociados: [regItem],
        ...this.getCreateControl()
      };
      this.ordenesMantenimiento.unshift(newOM);
      this.saveOrdenesMantenimiento();
      realtimeService.mutate('ordenes_om', 'create', newOM);
    }
  }

  deleteDeficiencia(id: string): { success: boolean; message: string; omAfectada?: string } {
    const idx = this.deficiencias.findIndex(d => d.id_deficiencia === id && d.estado_registro !== 'ELIMINADO');
    if (idx === -1) {
      return { success: false, message: `Deficiencia ${id} no encontrada en el sistema.` };
    }

    const delCtrl = this.getDeleteControl();
    const defEliminada: Deficiencia = {
      ...this.deficiencias[idx],
      ...delCtrl
    };
    const numOM = defEliminada.numero_om?.trim();

    // 1. Eliminación lógica de la deficiencia (conservando historial y trazabilidad)
    this.deficiencias[idx] = defEliminada;
    this.saveDeficiencias();

    // 2. Transmitir mutación de eliminación lógica de deficiencia
    realtimeService.mutate('deficiencias', 'delete', defEliminada);

    // 3. Desvincular o retirar de las Órdenes de Mantenimiento (OM) activas
    let omAfectada = numOM || '';
    let omChanged = false;
    const omEliminadasLogicas: OrdenMantenimiento[] = [];

    this.ordenesMantenimiento = this.ordenesMantenimiento.map(om => {
      if (om.estado_registro === 'ELIMINADO') return om;
      const tieneRegistro = om.registros_asociados?.some(r => r.id_registro === id);
      const coincideOM = numOM && (om.numero_om.trim().toLowerCase() === numOM.toLowerCase());

      if (tieneRegistro || coincideOM) {
        if (!omAfectada) omAfectada = om.numero_om;
        omChanged = true;
        const nuevosRegistros = (om.registros_asociados || []).filter(r => r.id_registro !== id);

        if (nuevosRegistros.length === 0) {
          const omDel: OrdenMantenimiento = {
            ...om,
            registros_asociados: nuevosRegistros,
            ...delCtrl
          };
          omEliminadasLogicas.push(omDel);
          return omDel;
        }
        return {
          ...om,
          registros_asociados: nuevosRegistros,
          ...this.getUpdateControl()
        };
      }
      return om;
    });

    // Notificar eliminación lógica de órdenes vacías
    omEliminadasLogicas.forEach(omDel => {
      realtimeService.mutate('ordenes_om', 'delete', omDel);
    });

    // Guardar y notificar órdenes modificadas que aún conservan otros registros
    if (omChanged) {
      this.saveOrdenesMantenimiento();
      this.ordenesMantenimiento.forEach(om => {
        if (om.numero_om === omAfectada && om.estado_registro !== 'ELIMINADO') {
          realtimeService.mutate('ordenes_om', 'update', om);
        }
      });
    }

    // 4. Eliminación lógica en mantenimientos de postes si existía relación directa
    if (numOM) {
      const mntIdx = this.mantenimiento.findIndex(m =>
        m.estado_registro !== 'ELIMINADO' &&
        ((m.orden_mantenimiento === numOM && m.poste_n === defEliminada.poste_n) ||
         (m.orden_mantenimiento === numOM && m.cod_linea === defEliminada.cod_linea))
      );
      if (mntIdx >= 0) {
        const deletedMnt = { ...this.mantenimiento[mntIdx], ...delCtrl };
        this.mantenimiento[mntIdx] = deletedMnt;
        this.saveMantenimiento();
        realtimeService.mutate('mantenimiento', 'delete', deletedMnt);
      }
    }

    // 5. Registrar auditoría
    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'DEFICIENCIAS',
      id_registro: id,
      cod_linea: defEliminada.cod_linea,
      estructura: defEliminada.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: omAfectada
        ? `Deficiencia ${id} eliminada lógicamente y retirada de la OM ${omAfectada}`
        : `Deficiencia ${id} eliminada lógicamente del sistema`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return {
      success: true,
      message: omAfectada
        ? `Deficiencia ${id} eliminada lógicamente y registro retirado de la OM ${omAfectada}.`
        : `Deficiencia ${id} eliminada lógicamente (historial conservado).`,
      omAfectada
    };
  }

  private saveDeficiencias() {
    this.safeLocalStorageSet(STORAGE_KEYS.DEFICIENCIAS, JSON.stringify(this.deficiencias));
  }

  // --- TOMA DE MEDICIÓN DE PUESTA A TIERRA (PAT) ---
  getPuestaTierra(codLinea?: string, includeDeleted = false): PuestaTierra[] {
    let list = includeDeleted ? this.puestaTierra : this.puestaTierra.filter(p => p.estado_registro !== 'ELIMINADO');
    if (codLinea && codLinea !== 'TODAS') {
      list = list.filter(p => p.cod_linea === codLinea);
    }
    return list;
  }

  addPuestaTierra(item: Omit<PuestaTierra, 'id_pat' | 'prioridad' | 'alerta_deficiencia'>): { pat: PuestaTierra; deficienciaCreada?: Deficiencia } {
    const isCritico = item.valor_resistencia_pat >= 5.0;
    const prioridad: Prioridad = isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO';

    // DEDUPLICATION FIX: Check if an active measurement already exists for this line and structure
    const existingIdx = this.puestaTierra.findIndex(p =>
      p.estado_registro !== 'ELIMINADO' &&
      p.cod_linea === item.cod_linea && String(p.poste_n).trim() === String(item.poste_n).trim()
    );

    if (existingIdx !== -1) {
      const existing = this.puestaTierra[existingIdx];
      this.updatePuestaTierra(existing.id_pat, {
        ...item,
        valor_resistencia_pat: item.valor_resistencia_pat
      });
      return { pat: this.puestaTierra[existingIdx] };
    }

    const idPat = this.nextSequentialId('PAT-', this.puestaTierra, 'id_pat', 3);

    let deficienciaCreada: Deficiencia | undefined;

    if (isCritico) {
      const defData: Omit<Deficiencia, 'id_deficiencia'> = {
        cod_linea: item.cod_linea,
        poste_n: String(item.poste_n).trim(),
        fecha_inspeccion: item.fecha_medicion || new Date().toISOString().split('T')[0],
        tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
        descripcion: `Alerta técnica PAT: Resistencia de puesta a tierra fuera de norma (${item.valor_resistencia_pat} Ω ≥ 5.0 Ω) en poste ${item.poste_n} de línea ${item.cod_linea}. Requiere atención prioritaria inmediata.`,
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: item.evidencia_url || 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link',
        observaciones: `Generado automáticamente por sistema tras medición de PAT (${item.valor_resistencia_pat} Ω). Coordenadas: Este ${item.utm_este || '-'}, Norte ${item.utm_norte || '-'}.`,
        usuario_responsable: item.responsable || `${this.currentUser.nombres} ${this.currentUser.apellidos}`,
        estado: 'Pendiente de revisión'
      };

      deficienciaCreada = this.addDeficiencia(defData);
    }

    const newPat: PuestaTierra = {
      ...item,
      id_pat: idPat,
      prioridad,
      alerta_deficiencia: isCritico,
      id_deficiencia_relacionada: deficienciaCreada?.id_deficiencia,
      ...this.getCreateControl()
    };

    this.puestaTierra.unshift(newPat);
    this.savePuestaTierra();

    realtimeService.mutate('puesta_tierra', 'create', newPat);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'PUESTA A TIERRA',
      id_registro: newPat.id_pat,
      cod_linea: newPat.cod_linea,
      estructura: newPat.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Medición PAT: ${newPat.valor_resistencia_pat} Ω (${newPat.prioridad}) - Estructura ${newPat.tipo_estructura || '-'}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return { pat: newPat, deficienciaCreada };
  }

  updatePuestaTierra(id: string, updates: Partial<PuestaTierra>): boolean {
    let idx = this.puestaTierra.findIndex(p => p.id_pat === id);
    if (idx === -1 && updates.cod_linea && updates.poste_n) {
      idx = this.puestaTierra.findIndex(p =>
        p.estado_registro !== 'ELIMINADO' &&
        p.cod_linea === updates.cod_linea && String(p.poste_n).trim() === String(updates.poste_n).trim()
      );
    }
    if (idx === -1) return false;

    const prev = { ...this.puestaTierra[idx] };
    const valor = updates.valor_resistencia_pat !== undefined ? updates.valor_resistencia_pat : this.puestaTierra[idx].valor_resistencia_pat;
    const isCritico = valor >= 5.0;

    this.puestaTierra[idx] = {
      ...this.puestaTierra[idx],
      ...updates,
      valor_resistencia_pat: valor,
      prioridad: updates.prioridad || (isCritico ? 'PRIORITARIO' : 'NO PRIORITARIO'),
      alerta_deficiencia: isCritico,
      ...this.getUpdateControl()
    };

    this.savePuestaTierra();
    realtimeService.mutate('puesta_tierra', 'update', this.puestaTierra[idx]);

    this.recordFieldDiffsAudit('PUESTA A TIERRA', id, prev, this.puestaTierra[idx], {
      cod_linea: this.puestaTierra[idx].cod_linea,
      estructura: this.puestaTierra[idx].poste_n
    });

    return true;
  }

  deletePuestaTierra(id: string): boolean {
    const idx = this.puestaTierra.findIndex(p => p.id_pat === id && p.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.puestaTierra[idx], ...this.getDeleteControl() };
    this.puestaTierra[idx] = updated;
    this.savePuestaTierra();

    realtimeService.mutate('puesta_tierra', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'PUESTA A TIERRA',
      id_registro: id,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Medición de Puesta a Tierra ${id} marcada como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  crearDeficienciaDesdePAT(idPat: string): Deficiencia | null {
    const pat = this.puestaTierra.find(p => p.id_pat === idPat && p.estado_registro !== 'ELIMINADO');
    if (!pat) return null;

    const defData: Omit<Deficiencia, 'id_deficiencia'> = {
      cod_linea: pat.cod_linea,
      poste_n: pat.poste_n,
      fecha_inspeccion: new Date().toISOString().split('T')[0],
      tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
      descripcion: `Levantamiento de deficiencia técnica por PAT crítica: ${pat.valor_resistencia_pat} Ω (Límite normativo 5.0 Ω).`,
      prioridad: 'PRIORITARIO',
      evidencia_fotografica: pat.evidencia_url || 'https://drive.google.com/drive/folders/1EWIKFMl2SYJ_LQ6lzsseKadLNOFbD6ro?usp=drive_link',
      observaciones: `Estructura ${pat.tipo_estructura || '-'} (${pat.material_estructura || '-'}), Medición PAT: ${pat.valor_resistencia_pat} Ω.`,
      usuario_responsable: `${this.currentUser.nombres} ${this.currentUser.apellidos}`,
      estado: 'Pendiente de revisión'
    };

    const nuevaDef = this.addDeficiencia(defData);
    pat.id_deficiencia_relacionada = nuevaDef.id_deficiencia;
    Object.assign(pat, this.getUpdateControl());
    this.savePuestaTierra();
    return nuevaDef;
  }

  private savePuestaTierra() {
    this.safeLocalStorageSet(STORAGE_KEYS.PUESTA_TIERRA, JSON.stringify(this.puestaTierra));
  }


  // --- TERMOGRAFÍA ---
  getTermografia(codLinea?: string, includeDeleted = false): Termografia[] {
    let list = includeDeleted ? this.termografia : this.termografia.filter(t => t.estado_registro !== 'ELIMINADO');
    if (codLinea) list = list.filter(t => t.cod_linea === codLinea);
    return list;
  }

  addTermografia(term: Omit<Termografia, 'id_termografia'>): Termografia {
    const newItem: Termografia = {
      ...term,
      id_termografia: this.nextSequentialId('TRM-', this.termografia, 'id_termografia', 4),
      ...this.getCreateControl()
    };
    this.termografia.unshift(newItem);
    this.saveTermografia();

    realtimeService.mutate('termografia', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'TERMOGRAFÍA',
      id_registro: newItem.id_termografia,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Inspección termográfica en ${newItem.cod_linea} P-${newItem.poste_n} (ΔT: +${newItem.delta_t}°C)`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateTermografia(id: string, updates: Partial<Termografia>): boolean {
    const idx = this.termografia.findIndex(t => t.id_termografia === id);
    if (idx === -1) return false;
    const prev = { ...this.termografia[idx] };
    this.termografia[idx] = { ...this.termografia[idx], ...updates, ...this.getUpdateControl() };
    this.saveTermografia();

    realtimeService.mutate('termografia', 'update', this.termografia[idx]);

    this.recordFieldDiffsAudit('TERMOGRAFÍA', id, prev, this.termografia[idx], {
      cod_linea: this.termografia[idx].cod_linea,
      estructura: this.termografia[idx].poste_n
    });
    return true;
  }

  deleteTermografia(id: string): boolean {
    const idx = this.termografia.findIndex(t => t.id_termografia === id && t.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.termografia[idx], ...this.getDeleteControl() };
    this.termografia[idx] = updated;
    this.saveTermografia();

    realtimeService.mutate('termografia', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'TERMOGRAFÍA',
      id_registro: id,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Registro termográfico ${id} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveTermografia() {
    this.safeLocalStorageSet(STORAGE_KEYS.TERMOGRAFIA, JSON.stringify(this.termografia));
  }

  // --- PODAS ---
  getPodas(codLinea?: string, includeDeleted = false): Poda[] {
    let list = includeDeleted ? this.podas : this.podas.filter(p => p.estado_registro !== 'ELIMINADO');
    if (codLinea) list = list.filter(p => p.cod_linea === codLinea);
    return list;
  }

  addPoda(poda: Omit<Poda, 'id_poda' | 'total_arboles'>): Poda {
    const total = (poda.algarrobo || 0) + (poda.palmera || 0) + (poda.ornamental || 0) + (poda.tamarindo || 0) + (poda.ponceana || 0) + (poda.otros || 0);
    const newItem: Poda = {
      ...poda,
      total_arboles: total,
      id_poda: this.nextSequentialId('POD-', this.podas, 'id_poda', 4),
      ...this.getCreateControl()
    };
    this.podas.unshift(newItem);
    this.savePodas();

    realtimeService.mutate('podas', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'CONTROL DE PODAS',
      id_registro: newItem.id_poda,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Poda registrada en ${newItem.cod_linea} P-${newItem.poste_n} (${newItem.total_arboles} árboles)`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updatePoda(id: string, updates: Partial<Poda>): boolean {
    const idx = this.podas.findIndex(p => p.id_poda === id);
    if (idx === -1) return false;
    const prev = { ...this.podas[idx] };
    const merged = { ...this.podas[idx], ...updates, ...this.getUpdateControl() };
    merged.total_arboles = (merged.algarrobo || 0) + (merged.palmera || 0) + (merged.ornamental || 0) + (merged.tamarindo || 0) + (merged.ponceana || 0) + (merged.otros || 0);
    this.podas[idx] = merged;
    this.savePodas();

    realtimeService.mutate('podas', 'update', this.podas[idx]);

    this.recordFieldDiffsAudit('CONTROL DE PODAS', id, prev, this.podas[idx], {
      cod_linea: merged.cod_linea,
      estructura: merged.poste_n
    });
    return true;
  }

  deletePoda(id: string): boolean {
    const idx = this.podas.findIndex(p => p.id_poda === id && p.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.podas[idx], ...this.getDeleteControl() };
    this.podas[idx] = updated;
    this.savePodas();

    realtimeService.mutate('podas', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'CONTROL DE PODAS',
      id_registro: id,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Registro de poda ${id} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private savePodas() {
    this.safeLocalStorageSet(STORAGE_KEYS.PODAS, JSON.stringify(this.podas));
  }

  // --- MANTENIMIENTO ---
  getMantenimiento(codLinea?: string, includeDeleted = false): Mantenimiento[] {
    let list = includeDeleted ? this.mantenimiento : this.mantenimiento.filter(m => m.estado_registro !== 'ELIMINADO');
    if (codLinea) list = list.filter(m => m.cod_linea === codLinea);
    return list;
  }

  addMantenimiento(mant: Omit<Mantenimiento, 'id_mantenimiento'>): Mantenimiento {
    const newItem: Mantenimiento = {
      ...mant,
      id_mantenimiento: this.nextSequentialId('MNT-', this.mantenimiento, 'id_mantenimiento', 4),
      ...this.getCreateControl()
    };
    this.mantenimiento.unshift(newItem);
    this.saveMantenimiento();

    realtimeService.mutate('mantenimiento', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'MANTENIMIENTO',
      id_registro: newItem.id_mantenimiento,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Mantenimiento ${newItem.orden_mantenimiento} en ${newItem.cod_linea} P-${newItem.poste_n}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateMantenimiento(id: string, updates: Partial<Mantenimiento>): boolean {
    const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === id);
    if (idx === -1) return false;
    const prev = { ...this.mantenimiento[idx] };
    const merged = { ...this.mantenimiento[idx], ...updates, ...this.getUpdateControl() };
    this.mantenimiento[idx] = merged;
    this.saveMantenimiento();

    realtimeService.mutate('mantenimiento', 'update', this.mantenimiento[idx]);

    this.recordFieldDiffsAudit('MANTENIMIENTO', id, prev, this.mantenimiento[idx], {
      cod_linea: merged.cod_linea,
      estructura: merged.poste_n
    });
    return true;
  }

  deleteMantenimiento(id: string): boolean {
    const idx = this.mantenimiento.findIndex(m => m.id_mantenimiento === id && m.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.mantenimiento[idx], ...this.getDeleteControl() };
    this.mantenimiento[idx] = updated;
    this.saveMantenimiento();

    realtimeService.mutate('mantenimiento', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'MANTENIMIENTO',
      id_registro: id,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Registro de mantenimiento ${id} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveMantenimiento() {
    this.safeLocalStorageSet(STORAGE_KEYS.MANTENIMIENTO, JSON.stringify(this.mantenimiento));
  }

  // --- ÓRDENES DE MANTENIMIENTO (OM) ---
  getOrdenesMantenimiento(includeDeleted = false): OrdenMantenimiento[] {
    if (includeDeleted) return this.ordenesMantenimiento;
    return this.ordenesMantenimiento.filter(o => o.estado_registro !== 'ELIMINADO');
  }

  addOrdenMantenimiento(om: Omit<OrdenMantenimiento, 'id_om' | 'fecha_registro'>): OrdenMantenimiento {
    const now = getLimaDateTime();
    const newItem: OrdenMantenimiento = {
      ...om,
      id_om: this.nextSequentialId('OM-ID-', this.ordenesMantenimiento, 'id_om', 3) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      fecha_registro: `${now.fecha} ${now.hora}`,
      ...this.getCreateControl()
    };
    this.ordenesMantenimiento.unshift(newItem);
    this.saveOrdenesMantenimiento();

    realtimeService.mutate('ordenes_om', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'ÓRDENES DE MANTENIMIENTO',
      id_registro: newItem.numero_om,
      cod_linea: newItem.registros_asociados[0]?.cod_linea || 'MULTIPLE',
      estructura: newItem.registros_asociados[0]?.poste_n || 'N/A',
      valores_anteriores: 'N/A',
      valores_nuevos: `Orden ${newItem.numero_om} (${newItem.tipo_actividad})`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return newItem;
  }

  updateOrdenMantenimiento(id_om: string, updates: Partial<OrdenMantenimiento>): boolean {
    const idx = this.ordenesMantenimiento.findIndex(o => o.id_om === id_om);
    if (idx === -1) return false;
    const prev = { ...this.ordenesMantenimiento[idx] };
    const merged = { ...this.ordenesMantenimiento[idx], ...updates, ...this.getUpdateControl() };
    this.ordenesMantenimiento[idx] = merged;
    this.saveOrdenesMantenimiento();

    realtimeService.mutate('ordenes_om', 'update', this.ordenesMantenimiento[idx]);

    this.recordFieldDiffsAudit('ÓRDENES DE MANTENIMIENTO', merged.numero_om || id_om, prev, merged, {
      cod_linea: merged.registros_asociados[0]?.cod_linea || 'MULTIPLE',
      estructura: merged.registros_asociados[0]?.poste_n || 'N/A'
    });

    return true;
  }

  deleteOrdenMantenimiento(id_om: string): boolean {
    const idx = this.ordenesMantenimiento.findIndex(o =>
      o.estado_registro !== 'ELIMINADO' &&
      (o.id_om === id_om || o.numero_om.toLowerCase() === id_om.toLowerCase())
    );
    if (idx === -1) return false;
    const delCtrl = this.getDeleteControl();
    const removed: OrdenMantenimiento = {
      ...this.ordenesMantenimiento[idx],
      ...delCtrl
    };
    this.ordenesMantenimiento[idx] = removed;
    this.saveOrdenesMantenimiento();

    // Desvincular N° de OM de las deficiencias asociadas
    if (removed.numero_om) {
      let defsChanged = false;
      this.deficiencias = this.deficiencias.map(d => {
        if (d.numero_om && d.numero_om.trim().toLowerCase() === removed.numero_om.trim().toLowerCase()) {
          defsChanged = true;
          return { ...d, numero_om: '' };
        }
        return d;
      });
      if (defsChanged) {
        this.saveDeficiencias();
      }
    }

    realtimeService.mutate('ordenes_om', 'delete', removed);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'ÓRDENES DE MANTENIMIENTO',
      id_registro: removed.numero_om,
      cod_linea: removed.registros_asociados[0]?.cod_linea || 'N/A',
      estructura: removed.registros_asociados[0]?.poste_n || 'N/A',
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Orden de Mantenimiento ${removed.numero_om} marcada como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return true;
  }

  private saveOrdenesMantenimiento() {
    this.safeLocalStorageSet(STORAGE_KEYS.ORDENES_MANTENIMIENTO, JSON.stringify(this.ordenesMantenimiento));
  }

  // Sincronización cruzada de prioridad por tipo de actividad
  updateRegistroPrioridad(tipoActividad: TipoActividadOM, idRegistro: string, nuevaPrioridad: Prioridad): boolean {
    if (tipoActividad === 'Deficiencias Técnicas') {
      return this.updateDeficiencia(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Puesta a Tierra') {
      const idx = this.puestaTierra.findIndex(p => p.id_pat === idRegistro);
      if (idx >= 0) {
        this.puestaTierra[idx].prioridad = nuevaPrioridad;
        this.savePuestaTierra();
        realtimeService.mutate('puesta_tierra', 'update', this.puestaTierra[idx]);
        return true;
      }
    } else if (tipoActividad === 'Termografía Infrarroja') {
      return this.updateTermografia(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Control de Podas') {
      return this.updatePoda(idRegistro, { prioridad: nuevaPrioridad });
    } else if (tipoActividad === 'Mantenimiento de Postes') {
      return this.updateMantenimiento(idRegistro, { prioridad: nuevaPrioridad });
    }
    return false;
  }

  bulkUpdateRegistrosPrioridad(tipoActividad: TipoActividadOM, ids: string[], nuevaPrioridad: Prioridad): void {
    ids.forEach(id => {
      this.updateRegistroPrioridad(tipoActividad, id, nuevaPrioridad);
    });

    // Also update any matching records within existing ordenesMantenimiento
    let omUpdated = false;
    this.ordenesMantenimiento = this.ordenesMantenimiento.map(om => {
      if (om.tipo_actividad !== tipoActividad) return om;
      const updatedRegs = om.registros_asociados.map(reg => {
        if (ids.includes(reg.id_registro)) {
          omUpdated = true;
          return { ...reg, prioridad: nuevaPrioridad };
        }
        return reg;
      });
      return { ...om, registros_asociados: updatedRegs };
    });
    if (omUpdated) {
      this.saveOrdenesMantenimiento();
    }
  }

  // --- DMS ---
  getDMS(codLinea?: string, includeDeleted = false): DMSItem[] {
    let list = includeDeleted ? this.dms : this.dms.filter(d => d.estado_registro !== 'ELIMINADO');
    if (codLinea) list = list.filter(d => d.cod_linea === codLinea);
    return list;
  }

  addDMS(item: Omit<DMSItem, 'id_dms'>): DMSItem {
    const newItem: DMSItem = {
      ...item,
      id_dms: 'DMS-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ...this.getCreateControl()
    };
    this.dms.unshift(newItem);
    this.saveDMS();

    realtimeService.mutate('dms', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'GESTIÓN DMS',
      id_registro: newItem.id_dms,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Caso DMS ${newItem.codigo_dms} en ${newItem.cod_linea} P-${newItem.poste_n}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateDMS(id: string, updates: Partial<DMSItem>): boolean {
    const idx = this.dms.findIndex(d => d.id_dms === id);
    if (idx === -1) return false;
    const prev = { ...this.dms[idx] };
    this.dms[idx] = { ...this.dms[idx], ...updates, ...this.getUpdateControl() };
    this.saveDMS();

    realtimeService.mutate('dms', 'update', this.dms[idx]);

    this.recordFieldDiffsAudit('GESTIÓN DMS', id, prev, this.dms[idx], {
      cod_linea: this.dms[idx].cod_linea,
      estructura: this.dms[idx].poste_n
    });
    return true;
  }

  deleteDMS(id: string): boolean {
    const idx = this.dms.findIndex(d => d.id_dms === id && d.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.dms[idx], ...this.getDeleteControl() };
    this.dms[idx] = updated;
    this.saveDMS();

    realtimeService.mutate('dms', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'GESTIÓN DMS',
      id_registro: id,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Caso DMS ${updated.codigo_dms || id} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  importDMSBatch(items: DMSItem[], broadcast = true): number {
    let count = 0;
    const createCtrl = this.getCreateControl();
    for (const item of items) {
      const existing = this.dms.findIndex(d => d.codigo_dms && d.codigo_dms === item.codigo_dms && d.estado_registro !== 'ELIMINADO');
      if (existing >= 0) {
        this.dms[existing] = { ...this.dms[existing], ...item, ...this.getUpdateControl() };
      } else {
        this.dms.push({ ...item, ...createCtrl });
      }
      count++;
    }
    this.saveDMS();

    if (broadcast) {
      realtimeService.mutate('dms', 'batch', items);
    }

    this.recordAudit({
      accion: 'IMPORTACION',
      modulo: 'DMS',
      id_registro: 'BATCH',
      cod_linea: 'VARIAS',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Importados ${count} registros DMS desde archivo Excel`,
      origen: 'Importación Excel',
      resultado: 'Exitoso'
    });
    return count;
  }

  private saveDMS() {
    this.safeLocalStorageSet(STORAGE_KEYS.DMS, JSON.stringify(this.dms));
  }

  // --- LEVANTAMIENTOS DMS ---
  getLevantamientos(idDms?: string, includeDeleted = false): LevantamientoDMS[] {
    let list = includeDeleted ? this.levantamientos : this.levantamientos.filter(l => l.estado_registro !== 'ELIMINADO');
    if (idDms) list = list.filter(l => l.id_dms === idDms);
    return list;
  }

  addLevantamiento(lev: Omit<LevantamientoDMS, 'id_levantamiento'>): LevantamientoDMS {
    const newItem: LevantamientoDMS = {
      ...lev,
      id_levantamiento: 'LEV-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ...this.getCreateControl()
    };
    this.levantamientos.unshift(newItem);
    this.saveLevantamientos();

    this.updateDMS(lev.id_dms, { estado: 'Levantada' });

    realtimeService.mutate('levantamientos', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'LEVANTAMIENTO DMS',
      id_registro: newItem.id_levantamiento,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'Pendiente/En Levantamiento',
      valores_nuevos: `Levantamiento registrado por ${newItem.contratista_responsable}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  private saveLevantamientos() {
    this.safeLocalStorageSet(STORAGE_KEYS.LEVANTAMIENTOS, JSON.stringify(this.levantamientos));
  }

  // --- INSPECCIONES Y CIERRE DMS ---
  getInspecciones(idDms?: string, includeDeleted = false): InspeccionCierreDMS[] {
    let list = includeDeleted ? this.inspecciones : this.inspecciones.filter(i => i.estado_registro !== 'ELIMINADO');
    if (idDms) list = list.filter(i => i.id_dms === idDms);
    return list;
  }

  addInspeccionCierre(insp: Omit<InspeccionCierreDMS, 'id_inspeccion_cierre'>): InspeccionCierreDMS {
    if (this.currentUser.rol === 'Contratista') {
      throw new Error('Permiso denegado: El contratista no puede realizar inspecciones ni cierre definitivo de DMS.');
    }
    const newItem: InspeccionCierreDMS = {
      ...insp,
      id_inspeccion_cierre: 'INSP-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ...this.getCreateControl()
    };
    this.inspecciones.unshift(newItem);
    this.saveInspecciones();

    if (insp.resultado === 'Levantamiento conforme') {
      this.updateDMS(insp.id_dms, { estado: 'Cerrada' });
    } else {
      this.updateDMS(insp.id_dms, { estado: 'En Levantamiento' });
    }

    realtimeService.mutate('inspecciones', 'create', newItem);

    this.recordAudit({
      accion: insp.resultado === 'Levantamiento conforme' ? 'CIERRE_DMS' : 'EDICIÓN',
      modulo: 'INSPECCION DMS',
      id_registro: newItem.id_inspeccion_cierre,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'Levantada',
      valores_nuevos: `Inspección de cierre: ${newItem.resultado}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });

    return newItem;
  }

  private saveInspecciones() {
    this.safeLocalStorageSet(STORAGE_KEYS.INSPECCIONES, JSON.stringify(this.inspecciones));
  }

  // --- USUARIOS ---
  getUsuarios(includeDeleted = false): Usuario[] {
    if (includeDeleted) return this.usuarios;
    return this.usuarios.filter(u => u.estado_registro !== 'ELIMINADO');
  }

  addUsuario(usr: Omit<Usuario, 'id_usuario' | 'fecha_creacion'>): Usuario {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede crear nuevos usuarios.');
    }
    const ctrl = this.getCreateControl();
    const rawUser: Usuario = {
      ...usr,
      id_usuario: this.nextSequentialId('USR-', this.usuarios, 'id_usuario', 3),
      ...ctrl,
      fecha_creacion: ctrl.fecha_creacion || getLimaDateTime().fecha_hora
    };
    const safeUser = sanitizeUserObj(rawUser);
    this.usuarios.push(safeUser);
    this.saveUsuarios();

    // Send full payload (including password) to server/Drive sync, never retaining password in local browser storage
    realtimeService.mutate('usuarios', 'create', rawUser);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'USUARIOS',
      id_registro: safeUser.id_usuario,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Usuario ${safeUser.nombres} ${safeUser.apellidos} (@${safeUser.username}) - ${safeUser.rol}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return safeUser;
  }

  updateUsuario(id: string, updates: Partial<Usuario>): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede editar usuarios o asignar roles.');
    }
    const idx = this.usuarios.findIndex(u => u.id_usuario === id);
    if (idx === -1) return false;
    const prev = { ...this.usuarios[idx] };
    const { fecha, hora } = getLimaDateTime();
    const hasNewPassword = Boolean(updates.password && updates.password.trim() !== '');
    const mergedRaw: Usuario = {
      ...this.usuarios[idx],
      ...updates,
      ...this.getUpdateControl(),
      ultima_actualizacion: `${fecha} ${hora}`
    };
    if (!hasNewPassword) {
      delete mergedRaw.password;
    }

    const safeMerged = sanitizeUserObj(mergedRaw);
    this.usuarios[idx] = safeMerged;
    this.saveUsuarios();

    realtimeService.mutate('usuarios', 'update', mergedRaw);

    this.recordFieldDiffsAudit('USUARIOS', id, prev, safeMerged);
    if (hasNewPassword) {
      this.recordAudit({
        accion: 'EDICIÓN',
        modulo: 'USUARIOS',
        id_registro: id,
        cod_linea: '-',
        estructura: '-',
        campo_modificado: 'Contraseña',
        valor_anterior: '********',
        valor_nuevo: '******** (Actualizada en Drive)',
        observacion: `Contraseña actualizada para @${safeMerged.username} (almacenada únicamente en Google Drive)`,
        origen: 'Web',
        resultado: 'Exitoso'
      });
    }
    return true;
  }

  deleteUsuario(id: string): { success: boolean; message: string } {
    if (this.currentUser.rol !== 'Administrador') {
      return { success: false, message: 'Solo el Administrador puede eliminar usuarios.' };
    }
    if (this.currentUser.id_usuario === id) {
      return { success: false, message: 'No puede eliminar el usuario con sesión activa actualmente.' };
    }
    const idx = this.usuarios.findIndex(u => u.id_usuario === id && u.estado_registro !== 'ELIMINADO');
    if (idx === -1) return { success: false, message: 'Usuario no encontrado.' };
    const updated: Usuario = sanitizeUserObj({
      ...this.usuarios[idx],
      estado: 'Inactivo',
      ...this.getDeleteControl()
    });
    this.usuarios[idx] = updated;
    this.saveUsuarios();

    realtimeService.mutate('usuarios', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'USUARIOS',
      id_registro: id,
      cod_linea: '-',
      estructura: '-',
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Usuario @${updated.username} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return { success: true, message: `Usuario @${updated.username} eliminado lógicamente.` };
  }

  setUsuarios(users: Usuario[]) {
    this.usuarios = this.normalizeControlArray(users).map(sanitizeUserObj);
    this.saveUsuarios();
  }

  private saveUsuarios() {
    this.safeLocalStorageSet(STORAGE_KEYS.USUARIOS, JSON.stringify(this.usuarios.map(sanitizeUserObj)));
  }

  // --- CONFIGURACIÓN DRIVE ---
  getConfigDrive(): ConfiguracionDrive {
    return this.config;
  }

  updateConfigDrive(updates: Partial<ConfiguracionDrive>, skipRemoteBroadcast = false) {
    this.config = { ...this.config, ...updates };
    this.safeLocalStorageSet(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    if (!skipRemoteBroadcast) {
      realtimeService.mutate('config_drive', 'update', this.config);
      this.recordAudit({
        accion: 'EDICION',
        modulo: 'CONFIG_DRIVE',
        id_registro: 'CONFIG',
        cod_linea: '-',
        estructura: '-',
        valores_anteriores: 'N/A',
        valores_nuevos: JSON.stringify(this.config),
        origen: 'Web',
        resultado: 'Exitoso'
      });
    }
  }

  // --- CONFLICTOS ---
  getConflictos(): ConflictoRegistro[] {
    return this.conflictos;
  }

  addConflicto(conf: Omit<ConflictoRegistro, 'id_conflicto' | 'fecha_deteccion' | 'resuelto'>) {
    const { fecha, hora } = getLimaDateTime();
    const item: ConflictoRegistro = {
      ...conf,
      id_conflicto: 'CONF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      fecha_deteccion: `${fecha} ${hora}`,
      resuelto: false
    };
    this.conflictos.unshift(item);
    this.safeLocalStorageSet(STORAGE_KEYS.CONFLICTOS, JSON.stringify(this.conflictos));
  }

  resolveConflicto(id: string, decision: 'Local' | 'Drive') {
    const idx = this.conflictos.findIndex(c => c.id_conflicto === id);
    if (idx >= 0) {
      this.conflictos[idx].resuelto = true;
      this.conflictos[idx].resolucion = decision;
      this.safeLocalStorageSet(STORAGE_KEYS.CONFLICTOS, JSON.stringify(this.conflictos));
      this.recordAudit({
        accion: 'SINCRONIZACION',
        modulo: 'CONFLICTOS',
        id_registro: id,
        cod_linea: '-',
        estructura: '-',
        valores_anteriores: `Discrepancia en ${this.conflictos[idx].campo}`,
        valores_nuevos: `Resuelto: Se conservó valor ${decision}`,
        origen: 'Web',
        resultado: 'Exitoso'
      });
    }
  }

  // --- EVIDENCIAS FOTOGRÁFICAS ---
  getEvidencias(codLinea?: string, posteN?: string): EvidenciaFotografica[] {
    let list = this.evidencias;
    if (codLinea) list = list.filter(e => e.cod_linea === codLinea);
    if (posteN) list = list.filter(e => e.poste_n === posteN);
    return list;
  }

  addEvidencia(ev: Omit<EvidenciaFotografica, 'id_evidencia' | 'fecha_registro'>): EvidenciaFotografica {
    const { fecha, hora } = getLimaDateTime();
    const newItem: EvidenciaFotografica = {
      ...ev,
      id_evidencia: 'EVI-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      fecha_registro: `${fecha} ${hora}`
    };
    this.evidencias.unshift(newItem);
    this.safeLocalStorageSet(STORAGE_KEYS.EVIDENCIAS, JSON.stringify(this.evidencias.slice(0, 500)));
    return newItem;
  }

  // --- CONTRATISTAS ---
  getContratistas(includeDeleted = false): Contratista[] {
    if (includeDeleted) return this.contratistas;
    return this.contratistas.filter(c => c.estado_registro !== 'ELIMINADO');
  }

  getContratistaById(id: string): Contratista | undefined {
    return this.contratistas.find(c => c.id_contratista === id && c.estado_registro !== 'ELIMINADO');
  }

  addContratista(c: Omit<Contratista, 'id_contratista' | 'fecha_registro'>): Contratista {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede registrar nuevas empresas contratistas.');
    }
    const { fecha } = getLimaDateTime();
    const newCont: Contratista = {
      ...c,
      id_contratista: this.nextSequentialId('CONT-', this.contratistas, 'id_contratista', 3),
      fecha_registro: fecha,
      estado: c.estado || 'Activo',
      actividades_asignadas: c.actividades_asignadas || ['ordenes_om'],
      ...this.getCreateControl()
    };
    this.contratistas.push(newCont);
    this.saveContratistas();

    realtimeService.mutate('contratistas', 'create', newCont);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'CONTRATISTAS',
      id_registro: newCont.id_contratista,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: 'N/A',
      valores_nuevos: `Empresa: ${newCont.razon_social} (RUC ${newCont.ruc}). Actividades: ${newCont.actividades_asignadas.join(', ')}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newCont;
  }

  updateContratista(id: string, updates: Partial<Contratista>): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede modificar datos o asignaciones de contratistas.');
    }
    const idx = this.contratistas.findIndex(c => c.id_contratista === id);
    if (idx === -1) return false;
    const prev = { ...this.contratistas[idx] };
    this.contratistas[idx] = { ...this.contratistas[idx], ...updates, ...this.getUpdateControl() };
    this.saveContratistas();

    realtimeService.mutate('contratistas', 'update', this.contratistas[idx]);

    this.recordFieldDiffsAudit('CONTRATISTAS', id, prev, this.contratistas[idx]);
    return true;
  }

  deleteContratista(id: string): boolean {
    if (this.currentUser.rol !== 'Administrador') {
      throw new Error('Solo el Administrador puede eliminar contratistas.');
    }
    const idx = this.contratistas.findIndex(c => c.id_contratista === id && c.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated: Contratista = {
      ...this.contratistas[idx],
      estado: 'Inactivo',
      ...this.getDeleteControl()
    };
    this.contratistas[idx] = updated;
    this.saveContratistas();

    realtimeService.mutate('contratistas', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'CONTRATISTAS',
      id_registro: id,
      cod_linea: '-',
      estructura: '-',
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Contratista ${updated.razon_social} marcada como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveContratistas() {
    this.safeLocalStorageSet(STORAGE_KEYS.CONTRATISTAS, JSON.stringify(this.contratistas));
  }

  // --- HIDROLAVADO ---
  getHidrolavado(codLinea?: string, includeDeleted = false): Hidrolavado[] {
    let list = includeDeleted ? this.hidrolavado : this.hidrolavado.filter(h => h.estado_registro !== 'ELIMINADO');
    if (codLinea && codLinea !== 'TODAS') {
      list = list.filter(h => h.cod_linea === codLinea);
    }
    return list;
  }

  addHidrolavado(item: Omit<Hidrolavado, 'id_hidrolavado'>): Hidrolavado {
    const newId = this.nextSequentialId('HLV-', this.hidrolavado, 'id_hidrolavado', 3);
    const newItem: Hidrolavado = {
      ...item,
      id_hidrolavado: newId,
      prioridad: item.prioridad || 'NO PRIORITARIO',
      ...this.getCreateControl()
    };
    this.hidrolavado.unshift(newItem);
    this.saveHidrolavado();

    realtimeService.mutate('hidrolavado', 'create', newItem);

    this.recordAudit({
      accion: 'CREACIÓN',
      modulo: 'HIDROLAVADO',
      id_registro: newItem.id_hidrolavado,
      cod_linea: newItem.cod_linea,
      estructura: newItem.poste_n,
      valores_anteriores: 'N/A',
      valores_nuevos: `Hidrolavado ${newItem.id_hidrolavado} en ${newItem.cod_linea} P-${newItem.poste_n}`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return newItem;
  }

  updateHidrolavado(id: string, updates: Partial<Hidrolavado>): boolean {
    const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === id);
    if (idx === -1) return false;
    const prev = { ...this.hidrolavado[idx] };
    this.hidrolavado[idx] = { ...this.hidrolavado[idx], ...updates, ...this.getUpdateControl() };
    this.saveHidrolavado();

    realtimeService.mutate('hidrolavado', 'update', this.hidrolavado[idx]);

    this.recordFieldDiffsAudit('HIDROLAVADO', id, prev, this.hidrolavado[idx], {
      cod_linea: this.hidrolavado[idx].cod_linea,
      estructura: this.hidrolavado[idx].poste_n
    });
    return true;
  }

  deleteHidrolavado(id: string): boolean {
    const idx = this.hidrolavado.findIndex(h => h.id_hidrolavado === id && h.estado_registro !== 'ELIMINADO');
    if (idx === -1) return false;
    const updated = { ...this.hidrolavado[idx], ...this.getDeleteControl() };
    this.hidrolavado[idx] = updated;
    this.saveHidrolavado();

    realtimeService.mutate('hidrolavado', 'delete', updated);

    this.recordAudit({
      accion: 'ELIMINACIÓN',
      modulo: 'HIDROLAVADO',
      id_registro: id,
      cod_linea: updated.cod_linea,
      estructura: updated.poste_n,
      campo_modificado: 'ESTADO_REGISTRO',
      valor_anterior: 'ACTIVO',
      valor_nuevo: 'ELIMINADO',
      observacion: `Registro de hidrolavado ${id} marcado como ELIMINADO`,
      origen: 'Web',
      resultado: 'Exitoso'
    });
    return true;
  }

  private saveHidrolavado() {
    this.safeLocalStorageSet(STORAGE_KEYS.HIDROLAVADO, JSON.stringify(this.hidrolavado));
  }

  // --- CONFIGURACIÓN DE AUTENTICACIÓN ---
  getAuthConfig(): ConfiguracionAutenticacion {
    return this.authConfig;
  }

  updateAuthConfig(updates: Partial<ConfiguracionAutenticacion>) {
    this.authConfig = { ...this.authConfig, ...updates };
    this.saveAuthConfig();
    realtimeService.mutate('auth_config', 'update', this.authConfig);
  }

  private saveAuthConfig() {
    this.safeLocalStorageSet(STORAGE_KEYS.AUTH_CONFIG, JSON.stringify(this.authConfig));
  }

  /**
   * Carga masiva Excel hacia el servidor web y sincronización inmediata en estado local
   */
  async bulkImportRecords(
    recordsByModule: Record<string, any[]>
  ): Promise<{ success: boolean; counts: Record<string, number>; total: number; message: string }> {
    try {
      const res = await fetch('/api/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordsByModule,
          user: this.currentUser
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.state) {
          this.applyFullServerState(data.state, true);
          this.notifyStateChange();
        }
        return {
          success: true,
          counts: data.counts || {},
          total: data.total || 0,
          message: data.message
        };
      }
      return {
        success: false,
        counts: {},
        total: 0,
        message: data.message || 'No se pudo completar la carga masiva.'
      };
    } catch (err: any) {
      return {
        success: false,
        counts: {},
        total: 0,
        message: `Error de red en carga masiva: ${err.message}`
      };
    }
  }
}

export const storageService = new StorageService();
