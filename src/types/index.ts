export type RolUsuario = 'Administrador' | 'Supervisor' | 'Contratista';

export type EstadoRegistro = 'ACTIVO' | 'ELIMINADO';

export interface ControlRegistro {
  fecha_creacion?: string; // Fecha y hora en que se creó el registro (DD/MM/YYYY HH:mm:ss)
  usuario_creacion?: string; // Usuario que creó el registro
  fecha_modificacion?: string; // Fecha y hora de la última modificación
  usuario_modificacion?: string; // Usuario que realizó la última modificación
  fecha_eliminacion?: string; // Fecha y hora de eliminación
  usuario_eliminacion?: string; // Usuario que eliminó el registro
  estado_registro?: EstadoRegistro; // ACTIVO / ELIMINADO
}

export interface Usuario extends ControlRegistro {
  id_usuario: string;
  nombres: string;
  apellidos: string;
  dni: string; // Valida 8 dígitos
  email: string;
  telefono: string;
  username: string;
  rol: RolUsuario;
  estado: 'Activo' | 'Inactivo';
  contratista_id?: string;
  contratista_nombre?: string;
  supervisor_responsable?: string;
  lineas_asignadas: string[]; // List of COD_LINEA, or ['*'] for all
  fecha_creacion: string;
  password?: string;
  ultima_actualizacion?: string;
}

export interface LineaSubtransmision extends ControlRegistro {
  id_linea: string;
  cod_linea: string;
  nombre: string;
  tipo_sistema: string;
  tension_nom: string;
  nodo_salida: string;
  nodo_llegada: string;
  celda_salida: string;
  celda_llegada: string;
  estado: 'Activo' | 'Inactivo' | 'En Mantenimiento';
  fecha_registro: string;
  ultima_sincronizacion: string;
}

export interface Estructura extends ControlRegistro {
  id_poste: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  poste_cantidad: string;
  poste_material: string;
  cruceta_material: string;
  mensula_material: string;
  riostra_o_amarre_material: string;
  aislador_material: string;
  aislador_cant: string;
  aislador_tipo: string;
  conductor_material: string;
  conductor_calibre: string;
  conductor_n_fases: string;
  estado: 'Operativo' | 'En Mantenimiento' | 'Desactivado';
  observaciones?: string;
}

export type Prioridad = 'PRIORITARIO' | 'NO PRIORITARIO';

export interface PuestaTierra extends ControlRegistro {
  id_pat: string;
  item?: number;
  cod_linea: string;
  poste_n: string;
  utm_este?: string;
  utm_norte?: string;
  tipo_estructura?: string;
  material_estructura?: string;
  fecha_medicion: string;
  valor_resistencia_pat: number;
  comentario?: string;
  prioridad: Prioridad;
  alerta_deficiencia?: boolean;
  id_deficiencia_relacionada?: string;
  evidencia_url?: string;
  responsable?: string;
}

export type EstadoDeficiencia = 
  | 'Registrada'
  | 'Pendiente de revisión'
  | 'En atención'
  | 'Corregida'
  | 'Pendiente de verificación'
  | 'Cerrada'
  | 'Rechazada para corrección';

export type TipoPosteDeficiencia = 'Madera' | 'Concreto' | 'Celosía';

export interface Deficiencia extends ControlRegistro {
  id_deficiencia: string;
  cod_linea: string;
  poste_n: string;
  tipo_poste?: TipoPosteDeficiencia;
  fecha_inspeccion: string;
  tipo_deficiencia: string;
  descripcion: string;
  prioridad: Prioridad;
  numero_om?: string; // N° de OM autocompletado
  evidencia_fotografica: string;
  evidencia_drive_id?: string;
  observaciones: string;
  usuario_responsable: string;
  estado: EstadoDeficiencia;
  fecha_cierre?: string;
}

export interface Termografia extends ControlRegistro {
  id_termografia: string;
  id_poste?: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  conductor_calibre: string;
  conductor_n_fases: string;
  nivel_tension: string; // e.g. '60 kV'
  tipo_zona: string; // e.g. 'Costa - Salina', 'Rural', 'Urbana'
  temp_ambiente: number; // °C
  temp_max_componente: number; // °C
  emisividad: number; // e.g. 0.95
  delta_t: number; // temp_max - temp_ambiente
  hora: string;
  fecha: string;
  componente_falla: string;
  comentario: string;
  criticidad: 'Normal' | 'Alerta' | 'Emergencia';
  prioridad: Prioridad;
  evidencia_url: string;
  inspector: string;
}

export interface EfectoCorona extends ControlRegistro {
  id_corona: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  tipo_aislador: string;
  nivel_tension_kv: string;
  temp_c: string;
  humedad_pct: string;
  fase_r_ganancia: string;
  fase_r_conteo: number;
  fase_s_ganancia: string;
  fase_s_conteo: number;
  fase_t_ganancia: string;
  fase_t_conteo: number;
  fecha: string;
  hora: string;
  prioridad: Prioridad; // Prioritario / No Prioritario
  descripcion_detallada?: string; // Descripción detallada del problema detectado
  causa_probable?: string; // Causa probable identificada
  accion_recomendada?: string; // Acción técnica recomendada
  comentarios: string;
  situaciones: string[];
  evidencia_url: string;
  inspector: string;
}

export interface Poda extends ControlRegistro {
  id_poda: string;
  cod_linea: string;
  poste_n: string;
  tipo_armado: string;
  tipo_aislador: string;
  nivel_tension_kv: string;
  fecha_ejecucion: string;
  ubicacion_referencia: string;
  punto_inicial: string;
  punto_final: string;
  algarrobo: number;
  palmera: number;
  ornamental: number;
  tamarindo: number;
  ponceana: number;
  otros: number;
  total_arboles: number;
  observaciones: string;
  prioridad: Prioridad;
  fotografias: string[];
  contratista_responsable: string;
  estado: 'Programada' | 'En Ejecución' | 'Completada' | 'Verificada';
}

export interface Mantenimiento extends ControlRegistro {
  id_mantenimiento: string;
  cod_linea: string;
  poste_n: string;
  fecha_ejecucion: string;
  tipo_mantenimiento: 'Preventivo' | 'Correctivo' | 'Rutinario' | 'Emergencia' | 'Estructural' | 'Predictivo';
  actividad_realizada: string;
  orden_mantenimiento: string;
  observaciones: string;
  prioridad: Prioridad;
  fotografias: string[];
  contratista_responsable: string;
  estado: 'Programado' | 'En Proceso' | 'Finalizado' | 'Aprobado';
  altera_estructuras?: boolean;
  detalle_reordenamiento?: string;
}

export type EstadoOrdenMantenimiento = 'Subsanado' | 'Por subsanar';

export type TipoActividadOM =
  | 'Deficiencias Técnicas'
  | 'Puesta a Tierra'
  | 'Termografía Infrarroja'
  | 'Control de Podas'
  | 'Mantenimiento de Postes';

export interface ItemRegistroOM {
  id_registro: string;
  cod_linea: string;
  poste_n: string;
  descripcion: string;
  prioridad: Prioridad;
  tipo_actividad: TipoActividadOM;
  estado_original?: string;
  fecha_original?: string;
  evidencia_url?: string;
}

export interface OrdenMantenimiento extends ControlRegistro {
  id_om: string;
  numero_om: string;
  fecha_inicio: string;
  fecha_ejecucion: string;
  estado: EstadoOrdenMantenimiento;
  tipo_actividad: TipoActividadOM;
  registros_asociados: ItemRegistroOM[];
  responsable?: string;
  observaciones?: string;
  fecha_registro: string;
}

export type EstadoDMS = 
  | 'Pendiente'
  | 'Asignada'
  | 'En Levantamiento'
  | 'Levantada'
  | 'Verificada'
  | 'Cerrada';

export interface DMSItem extends ControlRegistro {
  id_dms: string;
  cod_linea: string;
  poste_n: string;
  codigo_dms: string;
  descripcion: string;
  fecha_identificacion: string;
  prioridad: Prioridad;
  fuente: string; // e.g. OSINERGMIN, Inspección Interna
  orden_servicio: string;
  estado: EstadoDMS;
  observaciones: string;
  evidencias: string[];
}

export interface LevantamientoDMS extends ControlRegistro {
  id_levantamiento: string;
  id_dms: string;
  cod_linea: string;
  poste_n: string;
  fecha_ejecucion: string;
  descripcion_trabajo: string;
  orden_servicio: string;
  fotografias: string[];
  observaciones: string;
  contratista_responsable: string;
  estado: 'Registrado' | 'Aceptado por Supervisor' | 'Rechazado';
}

export interface InspeccionCierreDMS extends ControlRegistro {
  id_inspeccion_cierre: string;
  id_dms: string;
  id_levantamiento: string;
  cod_linea: string;
  poste_n: string;
  fecha_inspeccion: string;
  inspector: string;
  resultado: 'Levantamiento conforme' | 'Levantamiento no conforme' | 'Requiere nueva intervención';
  observaciones: string;
  evidencias_fotograficas: string[];
  estado_final: 'Cerrada' | 'En Corrección' | 'Pendiente';
}

export interface EvidenciaFotografica {
  id_evidencia: string;
  id_actividad: string;
  tipo_actividad: 'Deficiencia' | 'Termografía' | 'Efecto Corona' | 'Poda' | 'Mantenimiento' | 'DMS' | 'Estructura';
  cod_linea: string;
  poste_n: string;
  drive_file_id?: string;
  enlace_drive?: string;
  tipo_foto: 'Antes' | 'Durante' | 'Después' | 'Detalle' | 'UV_Corona' | 'Termograma';
  fecha_registro: string;
  usuario_responsable: string;
  descripcion: string;
  url: string; // Data URL or Web link
}

export interface AuditoriaRegistro {
  id_auditoria: string; // Identificador único (ej: AUD-20261112-98421)
  modulo: string; // DEFICIENCIAS, EFECTO CORONA, TERMOGRAFÍA, CONTROL DE PODAS, PUESTA A TIERRA, HIDROLAVADO, MANTENIMIENTO, ÓRDENES DE MANTENIMIENTO, GESTIÓN DMS, USUARIOS, CONTRATISTAS
  id_registro: string; // ID del registro modificado
  accion: 'CREACIÓN' | 'EDICIÓN' | 'ELIMINACIÓN' | 'CREACION' | 'EDICION' | 'ELIMINACION' | 'REORDENAMIENTO' | 'DESACTIVACION' | 'SINCRONIZACION' | 'IMPORTACION' | 'CIERRE_DMS';
  usuario: string; // Nombre del usuario que realizó la acción
  rol_usuario: RolUsuario | string; // Supervisor, Contratista, Administrador
  fecha_hora: string; // Fecha y hora exacta (DD/MM/YYYY HH:mm:ss America/Lima)
  campo_modificado: string; // Campo que fue modificado (o 'Todos los campos (Registro nuevo)' / 'Registro completo')
  valor_anterior: string; // Valor antes del cambio o 'N/A'
  valor_nuevo: string; // Valor después del cambio o 'Eliminado'
  observacion: string; // Detalle adicional del movimiento

  // Propiedades de compatibilidad con versiones previas y metadatos técnicos
  rol?: string;
  fecha?: string;
  hora?: string;
  cod_linea?: string;
  estructura?: string;
  valores_anteriores?: string;
  valores_nuevos?: string;
  origen?: 'Web' | 'Google Drive' | 'Importación Excel' | 'Automático' | 'Web Sincronizada' | 'Web Login';
  resultado?: 'Exitoso' | 'Fallido' | 'Conflicto';
  sync_id?: string;
}

export type AuditoriaSistema = AuditoriaRegistro;

export interface ConfiguracionDrive {
  sheet_lineas_id: string;
  sheet_lineas_url: string;
  sheet_usuarios_id?: string;
  sheet_usuarios_url?: string;
  sheet_activities_id?: string;
  sheet_activities_url?: string;
  drive_folder_id: string;
  drive_folder_url?: string;
  apps_script_url: string;
  auto_sync_interval: number; // minutes, 0 = off
  last_sync_time: string;
  sync_status: 'Conectado' | 'Desconectado' | 'Sincronizando' | 'Error';
  error_message?: string;
}

export interface ConflictoRegistro {
  id_conflicto: string;
  modulo: string;
  id_registro: string;
  campo: string;
  valor_local: string;
  valor_drive: string;
  fecha_deteccion: string;
  resuelto: boolean;
  resolucion?: 'Local' | 'Drive';
}

export type CodigoActividad =
  | 'deficiencias'        // DEFICIENCIAS TÉCNICAS
  | 'corona'              // EFECTO CORONA
  | 'termografia'         // TERMOGRAFÍA INFRARROJA
  | 'dms'                 // GESTIÓN DMS
  | 'ordenes_om'          // ÓRDENES DE MANTENIMIENTO
  | 'podas'               // CONTROL DE PODAS
  | 'puesta_tierra'       // PUESTA A TIERRA
  | 'hidrolavado'         // HIDROLAVADO
  | 'mantenimiento';      // MANTENIMIENTO DE POSTES

export interface Contratista extends ControlRegistro {
  id_contratista: string;
  razon_social: string;
  ruc: string; // Valida 11 dígitos
  representante: string;
  telefono: string;
  correo: string;
  especialidad: string;
  estado: 'Activo' | 'Inactivo';
  actividades_asignadas: CodigoActividad[];
  fecha_registro: string;
  ultima_actualizacion?: string;
  observaciones?: string;
}

export interface Hidrolavado extends ControlRegistro {
  id_hidrolavado: string;
  cod_linea: string;
  poste_n: string;
  fecha_ejecucion: string;
  fase_lavada: 'Fase R' | 'Fase S' | 'Fase T' | 'Todas las Fases';
  tipo_aislador: 'Polimérico' | 'Porcelana' | 'Vidrio';
  presion_bar: number; // e.g. 55 bar
  conductividad_agua_us: number; // e.g. 45 uS/cm (< 100)
  estado_previo_polucion: 'Leve' | 'Moderado' | 'Severo';
  resultado: 'Conforme' | 'Requiere Segundo Lavado';
  prioridad: Prioridad;
  contratista: string;
  observaciones: string;
  evidencia_url: string;
  responsable?: string;
}

export interface ConfiguracionAutenticacion {
  allow_self_registration: boolean; // Si es falso, solo el administrador puede registrar cuentas
  require_password_change_first_login?: boolean;
  session_timeout_minutes?: number;
  require_admin_approval?: boolean;
}
