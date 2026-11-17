import * as XLSX from 'xlsx';
import { Prioridad, Usuario } from '../types';

export type BulkModuleKey =
  | 'LINEAS'
  | 'ESTRUCTURAS'
  | 'DEFICIENCIAS'
  | 'PUESTA_A_TIERRA'
  | 'EFECTO_CORONA'
  | 'TERMOGRAFIA'
  | 'CONTROL_PODAS'
  | 'MANTENIMIENTO'
  | 'HIDROLAVADO'
  | 'ORDENES_OM'
  | 'DMS'
  | 'LEVANTAMIENTOS_DMS'
  | 'INSPECCIONES_DMS'
  | 'CONTRATISTAS'
  | 'AUDITORIA_SISTEMA';

export interface BulkModuleConfig {
  key: BulkModuleKey;
  label: string;
  sheetName: string;
  requiredHint: string;
  sampleRow: Record<string, any>;
}

export const BULK_MODULE_CONFIGS: BulkModuleConfig[] = [
  {
    key: 'LINEAS',
    label: 'Líneas de Subtransmisión',
    sheetName: 'LINEAS',
    requiredHint: 'COD_LINEA, NOMBRE',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      NOMBRE: 'LST 60 kV Ejemplo Carga Masiva',
      TIPO_SISTEMA: 'I',
      TENSION_NOM: '60',
      NODO_SALIDA: 'S.E. Piura Oeste',
      NODO_LLEGADA: 'S.E. Chulucanas',
      CELDA_SALIDA: '601',
      CELDA_LLEGADA: '602',
      ESTADO: 'Activo'
    }
  },
  {
    key: 'ESTRUCTURAS',
    label: 'Planilla de Estructuras',
    sheetName: 'ESTRUCTURAS',
    requiredHint: 'COD_LINEA, POSTE_N',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '15',
      TIPO_ARMADO: 'A',
      POSTE_CANTIDAD: 1,
      POSTE_MATERIAL: 'concreto',
      CRUCETA_MATERIAL: 'concreto',
      MENSULA_MATERIAL: '-',
      RIOSTRA_O_AMARRE_MATERIAL: '-',
      AISLADOR_MATERIAL: 'polimérico',
      AISLADOR_CANT: 3,
      AISLADOR_TIPO: 'suspensión',
      CONDUCTOR_MATERIAL: 'AAAC',
      CONDUCTOR_CALIBRE: '240 mm²',
      CONDUCTOR_N_FASES: '3',
      ESTADO: 'Activo',
      OBSERVACIONES: 'Carga masiva desde Excel'
    }
  },
  {
    key: 'DEFICIENCIAS',
    label: 'Deficiencias Técnicas',
    sheetName: 'DEFICIENCIAS',
    requiredHint: 'COD_LINEA, POSTE_N, TIPO_DEFICIENCIA / DESCRIPCION',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '14',
      TIPO_POSTE: 'Madera',
      FECHA_INSPECCION: '2026-11-13',
      TIPO_DEFICIENCIA: 'Presencia de agujeros en la parte superior de los postes de madera tipo H.',
      DESCRIPCION: 'Inspección cargada masivamente desde plantilla Excel',
      PRIORIDAD: 'PRIORITARIO',
      NUMERO_OM: 'OM-2026-001',
      ESTADO: 'Registrada',
      USUARIO_RESPONSABLE: 'Consorcio Eléctrico del Norte',
      EVIDENCIA_URL: '',
      OBSERVACIONES: 'Generado por carga masiva'
    }
  },
  {
    key: 'PUESTA_A_TIERRA',
    label: 'Puesta a Tierra (PAT)',
    sheetName: 'PUESTA_A_TIERRA',
    requiredHint: 'COD_LINEA, POSTE_N, VALOR_RESISTENCIA_OHMIOS',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '14',
      FECHA_MEDICION: '2026-11-13',
      VALOR_RESISTENCIA_OHMIOS: 4.2,
      TIPO_ESTRUCTURA: 'A',
      MATERIAL_ESTRUCTURA: 'concreto',
      UTM_ESTE: '539210',
      UTM_NORTE: '9425810',
      RESPONSABLE: 'PCOIN',
      COMENTARIO: 'Medición PAT cargada desde Excel',
      EVIDENCIA_URL: ''
    }
  },
  {
    key: 'EFECTO_CORONA',
    label: 'Efecto Corona (UV)',
    sheetName: 'EFECTO_CORONA',
    requiredHint: 'COD_LINEA, POSTE_N',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '18',
      TIPO_ARMADO: 'A',
      TIPO_AISLADOR: 'polimérico',
      NIVEL_TENSION_KV: '60',
      PRIORIDAD: 'NO PRIORITARIO',
      DESCRIPCION_DETALLADA: 'Descarga parcial leve en cadena fase R',
      CAUSA_PROBABLE: 'Contaminación salina',
      ACCION_RECOMENDADA: 'Programar hidrolavado',
      FECHA: '2026-11-13',
      HORA: '10:30',
      TEMP_C: '28',
      HUMEDAD_PCT: '70',
      FASE_R_GANANCIA: '100',
      FASE_R_CONTEO: 45,
      FASE_S_GANANCIA: '100',
      FASE_S_CONTEO: 22,
      FASE_T_GANANCIA: '100',
      FASE_T_CONTEO: 18,
      SITUACIONES: 'Contaminación salina',
      COMENTARIOS: 'Carga masiva UV',
      INSPECTOR: 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE',
      EVIDENCIA_URL: ''
    }
  },
  {
    key: 'TERMOGRAFIA',
    label: 'Termografía Infrarroja',
    sheetName: 'TERMOGRAFIA',
    requiredHint: 'COD_LINEA, POSTE_N, TEMP_AMBIENTE_C, TEMP_MAX_COMPONENTE_C',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '7',
      FECHA: '2026-11-13',
      HORA: '11:30',
      PRIORIDAD: 'PRIORITARIO',
      COMPONENTE_FALLA: 'Grapa de suspensión Fase R',
      TEMP_AMBIENTE_C: 28.0,
      TEMP_MAX_COMPONENTE_C: 52.5,
      DELTA_T_C: 24.5,
      CRITICIDAD: 'Alerta',
      EMISIVIDAD: 0.95,
      NIVEL_TENSION: '60 kV',
      TIPO_ZONA: 'Costa - Salina',
      COMENTARIO: 'Punto caliente detectado en inspección',
      INSPECTOR: 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE',
      EVIDENCIA_URL: ''
    }
  },
  {
    key: 'CONTROL_PODAS',
    label: 'Control de Podas',
    sheetName: 'CONTROL_PODAS',
    requiredHint: 'COD_LINEA, POSTE_N',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '12',
      PRIORIDAD: 'NO PRIORITARIO',
      FECHA_EJECUCION: '2026-11-13',
      ESTADO: 'Completada',
      ALGARROBO: 4,
      PALMERA: 1,
      ORNAMENTAL: 0,
      TAMARINDO: 2,
      PONCEANA: 0,
      OTROS: 1,
      UBICACION_REFERENCIA: 'Vano 12-13 Carretera Piura',
      PUNTO_INICIAL: 'P-12',
      PUNTO_FINAL: 'P-13',
      CONTRATISTA_RESPONSABLE: 'NASSAN',
      OBSERVACIONES: 'Despeje franja de servidumbre'
    }
  },
  {
    key: 'MANTENIMIENTO',
    label: 'Mantenimiento / Postes',
    sheetName: 'MANTENIMIENTO',
    requiredHint: 'COD_LINEA, POSTE_N, ACTIVIDAD_REALIZADA',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '20',
      PRIORIDAD: 'NO PRIORITARIO',
      ORDEN_MANTENIMIENTO: 'OM-2026-010',
      FECHA_EJECUCION: '2026-11-13',
      TIPO_MANTENIMIENTO: 'Preventivo',
      ACTIVIDAD_REALIZADA: 'Ajuste de ferretería y cambio de amortiguadores',
      ESTADO: 'Completado',
      ALTERA_ESTRUCTURAS: 'NO',
      CONTRATISTA_RESPONSABLE: 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE',
      OBSERVACIONES: 'Ejecutado conforme'
    }
  },
  {
    key: 'HIDROLAVADO',
    label: 'Hidrolavado Aislamiento',
    sheetName: 'HIDROLAVADO',
    requiredHint: 'COD_LINEA, POSTE_N',
    sampleRow: {
      COD_LINEA: 'L-6657C',
      POSTE_N: '15',
      FECHA_EJECUCION: '2026-11-13',
      FASE_LAVADA: 'Todas (R-S-T)',
      TIPO_AISLADOR: 'Polimérico',
      PRESION_BAR: 180,
      CONDUCTIVIDAD_AGUA_US: 4.5,
      ESTADO_PREVIO_POLUCION: 'Alto',
      RESULTADO: 'Conforme',
      PRIORIDAD: 'NO PRIORITARIO',
      CONTRATISTA: 'VENTO INGENIEROS',
      RESPONSABLE: 'Ing. Jefe Cuadrilla',
      OBSERVACIONES: 'Lavado con agua desmineralizada'
    }
  },
  {
    key: 'ORDENES_OM',
    label: 'Órdenes de Mantenimiento (OM)',
    sheetName: 'ORDENES_OM',
    requiredHint: 'NUMERO_OM, TIPO_ACTIVIDAD',
    sampleRow: {
      NUMERO_OM: 'OM-2026-099',
      FECHA_INICIO: '2026-11-13',
      FECHA_EJECUCION: '2026-11-20',
      ESTADO: 'Por subsanar',
      TIPO_ACTIVIDAD: 'Deficiencias Técnicas',
      RESPONSABLE: 'Supervisor Operaciones',
      OBSERVACIONES: 'Orden de mantenimiento cargada desde Excel'
    }
  },
  {
    key: 'DMS',
    label: 'Gestión de DMS',
    sheetName: 'DMS',
    requiredHint: 'COD_LINEA, POSTE_N, DESCRIPCION',
    sampleRow: {
      CODIGO_DMS: 'OSINERGMIN-PIU-2026-100',
      COD_LINEA: 'L-6657C',
      POSTE_N: '24',
      FECHA_IDENTIFICACION: '2026-11-13',
      DESCRIPCION: 'Edificación cercana a franja de servidumbre',
      PRIORIDAD: 'PRIORITARIO',
      FUENTE: 'OSINERGMIN',
      ORDEN_SERVICIO: 'OS-2026-100',
      ESTADO: 'Pendiente',
      OBSERVACIONES: 'Cargado desde Excel'
    }
  },
  {
    key: 'LEVANTAMIENTOS_DMS',
    label: 'Levantamientos DMS',
    sheetName: 'LEVANTAMIENTOS_DMS',
    requiredHint: 'COD_LINEA, POSTE_N, DESCRIPCION_TRABAJO',
    sampleRow: {
      ID_DMS: 'DMS-2026-001',
      COD_LINEA: 'L-6657C',
      POSTE_N: '24',
      FECHA_EJECUCION: '2026-11-13',
      DESCRIPCION_TRABAJO: 'Adecuación de altura y despeje de distancias mínimas de seguridad',
      ORDEN_SERVICIO: 'OS-2026-100',
      CONTRATISTA_RESPONSABLE: 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE',
      ESTADO: 'Registrado',
      OBSERVACIONES: 'Trabajo culminado en campo'
    }
  },
  {
    key: 'INSPECCIONES_DMS',
    label: 'Inspecciones de Cierre DMS',
    sheetName: 'INSPECCIONES_DMS',
    requiredHint: 'COD_LINEA, POSTE_N, INSPECTOR',
    sampleRow: {
      ID_DMS: 'DMS-2026-001',
      ID_LEVANTAMIENTO: 'LEV-AUTO',
      COD_LINEA: 'L-6657C',
      POSTE_N: '24',
      FECHA_INSPECCION: '2026-11-13',
      INSPECTOR: 'Ing. Carlos Mendoza',
      RESULTADO: 'Levantamiento conforme',
      ESTADO_FINAL: 'Cerrada',
      OBSERVACIONES: 'Cumple distancias CNE Suministro'
    }
  },
  {
    key: 'CONTRATISTAS',
    label: 'Empresas Contratistas',
    sheetName: 'CONTRATISTAS',
    requiredHint: 'RAZON_SOCIAL, RUC (11 dígitos)',
    sampleRow: {
      RAZON_SOCIAL: 'SERVICIOS ELÉCTRICOS REGIONALES S.A.C.',
      RUC: '20601234567',
      REPRESENTANTE: 'Ing. Luis Paredes',
      TELEFONO: '944112233',
      CORREO: 'contacto@serel.pe',
      ESPECIALIDAD: 'Mantenimiento de Líneas de Subtransmisión',
      ESTADO: 'Activo',
      ACTIVIDADES_ASIGNADAS: 'deficiencias, ordenes_om',
      OBSERVACIONES: 'Contratista cargada masivamente'
    }
  },
  {
    key: 'AUDITORIA_SISTEMA',
    label: 'Auditoría del Sistema',
    sheetName: 'AUDITORIA_SISTEMA',
    requiredHint: 'MODULO, ACCION, USUARIO',
    sampleRow: {
      MODULO: 'TERMOGRAFIA',
      ID_REGISTRO: 'TRM-001',
      ACCION: 'EDICIÓN',
      USUARIO: 'Ing. Carlos Mendoza Silva',
      ROL_USUARIO: 'Administrador',
      FECHA_HORA: '13/11/2026 09:30:00',
      CAMPO_MODIFICADO: 'Estado',
      VALOR_ANTERIOR: 'Pendiente',
      VALOR_NUEVO: 'Aprobado',
      OBSERVACION: 'Registro de auditoría importado desde Excel'
    }
  }
];

export const BULK_MODULE_MAP: Record<BulkModuleKey, BulkModuleConfig> = BULK_MODULE_CONFIGS.reduce(
  (acc, cfg) => {
    acc[cfg.key] = cfg;
    return acc;
  },
  {} as Record<BulkModuleKey, BulkModuleConfig>
);

function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row || {})) {
    out[normalizeHeaderKey(k)] = v;
  }
  return out;
}

function pick(normRow: Record<string, any>, aliases: string[], fallback: any = ''): any {
  for (const alias of aliases) {
    const key = normalizeHeaderKey(alias);
    const val = normRow[key];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      return typeof val === 'string' ? val.trim() : val;
    }
  }
  return fallback;
}

function toISODate(raw: any, fallbackToday = true): string {
  if (raw === undefined || raw === null || raw === '') {
    return fallbackToday ? new Date().toISOString().split('T')[0] : '';
  }
  if (typeof raw === 'number' && raw > 20000 && raw < 90000) {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  const str = String(raw).trim();
  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  return str;
}

function toPrioridad(raw: any, fallback: Prioridad = 'NO PRIORITARIO'): Prioridad {
  const s = String(raw || '').toUpperCase().trim();
  if (!s) return fallback;
  if (s === 'PRIORITARIO' || s === 'ALTO' || s === 'ALTA' || s === 'PRIORIDAD' || s === 'URGENTE') {
    return 'PRIORITARIO';
  }
  if (s === 'NO PRIORITARIO' || s === 'BAJO' || s === 'NORMAL' || s === 'MEDIO') {
    return 'NO PRIORITARIO';
  }
  return fallback;
}

function toNum(raw: any, fallback = 0): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const cleaned = String(raw ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? fallback : n;
}

function randId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

export interface ParsedBulkResult {
  moduleKey: BulkModuleKey;
  validRecords: any[];
  skippedCount: number;
  errors: string[];
}

export function parseExcelRowsForModule(
  moduleKey: BulkModuleKey,
  rawRows: Record<string, any>[],
  currentUser?: Usuario
): ParsedBulkResult {
  const validRecords: any[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  const actorFullName = currentUser
    ? `${currentUser.nombres || ''} ${currentUser.apellidos || ''}`.trim() || currentUser.username
    : 'Usuario Web';
  const today = new Date().toISOString().split('T')[0];

  rawRows.forEach((rawRow, idx) => {
    const r = normalizeRow(rawRow);
    const rowNum = idx + 2;

    // Skip completely empty rows
    const hasAnyValue = Object.values(r).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!hasAnyValue) return;

    switch (moduleKey) {
      case 'LINEAS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'CODIGO_LINEA', 'LINEA', 'CODIGO'])).toUpperCase();
        const nombre = String(pick(r, ['NOMBRE', 'NOMBRE_LINEA', 'DESCRIPCION']));
        if (!cod_linea || !nombre) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o NOMBRE.`);
          return;
        }
        validRecords.push({
          id_linea: String(pick(r, ['ID_LINEA'])) || randId('LIN'),
          cod_linea,
          nombre,
          tipo_sistema: String(pick(r, ['TIPO_SISTEMA', 'SISTEMA'], 'I')),
          tension_nom: String(pick(r, ['TENSION_NOM', 'TENSION', 'TENSION_KV'], '60')),
          nodo_salida: String(pick(r, ['NODO_SALIDA', 'SALIDA'], '')),
          nodo_llegada: String(pick(r, ['NODO_LLEGADA', 'LLEGADA'], '')),
          celda_salida: String(pick(r, ['CELDA_SALIDA'], '')),
          celda_llegada: String(pick(r, ['CELDA_LLEGADA'], '')),
          estado: String(pick(r, ['ESTADO'], 'Activo')) === 'Inactivo' ? 'Inactivo' : 'Activo',
          fecha_registro: today,
          ultima_sincronizacion: new Date().toISOString()
        });
        break;
      }

      case 'ESTRUCTURAS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA', 'CODIGO_LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA', 'N_POSTE', 'NUM_POSTE']));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        validRecords.push({
          id_poste: String(pick(r, ['ID_POSTE'])) || randId('EST'),
          cod_linea,
          poste_n,
          tipo_armado: String(pick(r, ['TIPO_ARMADO', 'ARMADO'], 'A')),
          poste_cantidad: toNum(pick(r, ['POSTE_CANTIDAD', 'CANTIDAD_POSTES'], 1), 1),
          poste_material: String(pick(r, ['POSTE_MATERIAL', 'MATERIAL_POSTE', 'MATERIAL'], 'concreto')),
          cruceta_material: String(pick(r, ['CRUCETA_MATERIAL', 'CRUCETA'], 'concreto')),
          mensula_material: String(pick(r, ['MENSULA_MATERIAL', 'MENSULA'], '-')),
          riostra_o_amarre_material: String(pick(r, ['RIOSTRA_O_AMARRE_MATERIAL', 'RIOSTRA_AMARRE', 'RIOSTRA'], '-')),
          aislador_material: String(pick(r, ['AISLADOR_MATERIAL', 'AISLADOR'], 'polimérico')),
          aislador_cant: toNum(pick(r, ['AISLADOR_CANT', 'CANTIDAD_AISLADORES'], 3), 3),
          aislador_tipo: String(pick(r, ['AISLADOR_TIPO', 'TIPO_AISLADOR'], 'suspensión')),
          conductor_material: String(pick(r, ['CONDUCTOR_MATERIAL', 'CONDUCTOR'], 'AAAC')),
          conductor_calibre: String(pick(r, ['CONDUCTOR_CALIBRE', 'CALIBRE'], '240 mm²')),
          conductor_n_fases: String(pick(r, ['CONDUCTOR_N_FASES', 'FASES', 'N_FASES'], '3')),
          estado: String(pick(r, ['ESTADO'], 'Activo')) === 'Desactivado' ? 'Desactivado' : 'Activo',
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Cargado desde Excel'))
        });
        break;
      }

      case 'DEFICIENCIAS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA', 'CODIGO_LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        const tipo_deficiencia = String(pick(r, ['TIPO_DEFICIENCIA', 'DEFICIENCIA', 'TIPO']));
        const descripcion = String(pick(r, ['DESCRIPCION', 'DETALLE'], tipo_deficiencia));
        if (!cod_linea || !poste_n || (!tipo_deficiencia && !descripcion)) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA, POSTE_N o TIPO_DEFICIENCIA/DESCRIPCION.`);
          return;
        }
        const rawTipoPoste = String(pick(r, ['TIPO_POSTE'], ''));
        const tipo_poste =
          rawTipoPoste === 'Concreto' || rawTipoPoste === 'Celosía' || rawTipoPoste === 'Madera'
            ? rawTipoPoste
            : undefined;
        validRecords.push({
          id_deficiencia: String(pick(r, ['ID_DEFICIENCIA'])) || randId('DEF'),
          cod_linea,
          poste_n,
          ...(tipo_poste ? { tipo_poste } : {}),
          fecha_inspeccion: toISODate(pick(r, ['FECHA_INSPECCION', 'FECHA'])),
          tipo_deficiencia: tipo_deficiencia || descripcion,
          descripcion: descripcion || tipo_deficiencia,
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), 'NO PRIORITARIO'),
          numero_om: String(pick(r, ['NUMERO_OM', 'OM', 'ORDEN_MANTENIMIENTO'], '')),
          estado: String(pick(r, ['ESTADO'], 'Registrada')),
          usuario_responsable: String(pick(r, ['USUARIO_RESPONSABLE', 'RESPONSABLE'], actorFullName)),
          evidencia_fotografica: String(pick(r, ['EVIDENCIA_URL', 'EVIDENCIA_FOTOGRAFICA', 'FOTO'], '')),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Cargado masivamente desde Excel'))
        });
        break;
      }

      case 'PUESTA_A_TIERRA': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        const rawRes = pick(r, ['VALOR_RESISTENCIA_OHMIOS', 'VALOR_RESISTENCIA_OHM', 'VALOR_RESISTENCIA_PAT', 'RESISTENCIA', 'OHMIOS'], null);
        if (!cod_linea || !poste_n || rawRes === null) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA, POSTE_N o VALOR_RESISTENCIA_OHMIOS.`);
          return;
        }
        const valor = toNum(rawRes, 0);
        const alerta = valor >= 5.0;
        validRecords.push({
          id_pat: String(pick(r, ['ID_PAT'])) || randId('PAT'),
          cod_linea,
          poste_n,
          fecha_medicion: toISODate(pick(r, ['FECHA_MEDICION', 'FECHA'])),
          valor_resistencia_pat: valor,
          prioridad: alerta ? 'PRIORITARIO' : 'NO PRIORITARIO',
          alerta_deficiencia: alerta,
          tipo_estructura: String(pick(r, ['TIPO_ESTRUCTURA', 'TIPO_ARMADO'], '')),
          material_estructura: String(pick(r, ['MATERIAL_ESTRUCTURA', 'MATERIAL'], '')),
          utm_este: String(pick(r, ['UTM_ESTE', 'ESTE'], '')),
          utm_norte: String(pick(r, ['UTM_NORTE', 'NORTE'], '')),
          responsable: String(pick(r, ['RESPONSABLE'], actorFullName)),
          comentario: String(pick(r, ['COMENTARIO', 'OBSERVACIONES'], 'Carga masiva PAT')),
          evidencia_url: String(pick(r, ['EVIDENCIA_URL', 'FOTO'], ''))
        });
        break;
      }

      case 'EFECTO_CORONA': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        const rCnt = toNum(pick(r, ['FASE_R_CONTEO', 'CONTEO_R'], 0));
        const sCnt = toNum(pick(r, ['FASE_S_CONTEO', 'CONTEO_S'], 0));
        const tCnt = toNum(pick(r, ['FASE_T_CONTEO', 'CONTEO_T'], 0));
        const maxPhotons = Math.max(rCnt, sCnt, tCnt);
        const sitRaw = String(pick(r, ['SITUACIONES'], ''));
        validRecords.push({
          id_corona: String(pick(r, ['ID_CORONA'])) || randId('COR'),
          cod_linea,
          poste_n,
          tipo_armado: String(pick(r, ['TIPO_ARMADO', 'ARMADO'], 'A')),
          tipo_aislador: String(pick(r, ['TIPO_AISLADOR', 'AISLADOR'], 'polimérico')),
          nivel_tension_kv: String(pick(r, ['NIVEL_TENSION_KV', 'TENSION'], '60')),
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), maxPhotons > 100 ? 'PRIORITARIO' : 'NO PRIORITARIO'),
          descripcion_detallada: String(pick(r, ['DESCRIPCION_DETALLADA', 'DESCRIPCION'], '')),
          causa_probable: String(pick(r, ['CAUSA_PROBABLE'], '')),
          accion_recomendada: String(pick(r, ['ACCION_RECOMENDADA'], '')),
          fecha: toISODate(pick(r, ['FECHA'])),
          hora: String(pick(r, ['HORA'], '10:00')),
          temp_c: String(pick(r, ['TEMP_C', 'TEMPERATURA'], '28')),
          humedad_pct: String(pick(r, ['HUMEDAD_PCT', 'HUMEDAD'], '70')),
          fase_r_ganancia: String(pick(r, ['FASE_R_GANANCIA'], '100')),
          fase_r_conteo: rCnt,
          fase_s_ganancia: String(pick(r, ['FASE_S_GANANCIA'], '100')),
          fase_s_conteo: sCnt,
          fase_t_ganancia: String(pick(r, ['FASE_T_GANANCIA'], '100')),
          fase_t_conteo: tCnt,
          situaciones: sitRaw ? sitRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [],
          comentarios: String(pick(r, ['COMENTARIOS', 'OBSERVACIONES'], 'Carga masiva Corona UV')),
          inspector: String(pick(r, ['INSPECTOR', 'RESPONSABLE'], actorFullName)),
          evidencia_url: String(pick(r, ['EVIDENCIA_URL', 'FOTO'], ''))
        });
        break;
      }

      case 'TERMOGRAFIA': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        const tAmb = toNum(pick(r, ['TEMP_AMBIENTE_C', 'TEMP_AMBIENTE'], 28));
        const tMax = toNum(pick(r, ['TEMP_MAX_COMPONENTE_C', 'TEMP_MAX_C', 'TEMP_MAX_COMPONENTE'], tAmb + 5));
        const deltaT = Math.round((toNum(pick(r, ['DELTA_T_C', 'DELTA_T'], tMax - tAmb), tMax - tAmb)) * 10) / 10;
        const critRaw = String(pick(r, ['CRITICIDAD'], ''));
        const criticidad =
          critRaw === 'Emergencia' || critRaw === 'Alerta' || critRaw === 'Normal'
            ? critRaw
            : deltaT > 35
            ? 'Emergencia'
            : deltaT > 15
            ? 'Alerta'
            : 'Normal';
        validRecords.push({
          id_termografia: String(pick(r, ['ID_TERMOGRAFIA'])) || randId('TRM'),
          cod_linea,
          poste_n,
          fecha: toISODate(pick(r, ['FECHA'])),
          hora: String(pick(r, ['HORA'], '11:00')),
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), criticidad === 'Normal' ? 'NO PRIORITARIO' : 'PRIORITARIO'),
          componente_falla: String(pick(r, ['COMPONENTE_FALLA', 'COMPONENTE'], 'Grapa de suspensión')),
          temp_ambiente: tAmb,
          temp_max_componente: tMax,
          delta_t: deltaT,
          criticidad,
          emisividad: toNum(pick(r, ['EMISIVIDAD'], 0.95), 0.95),
          nivel_tension: String(pick(r, ['NIVEL_TENSION', 'TENSION'], '60 kV')),
          tipo_zona: String(pick(r, ['TIPO_ZONA', 'ZONA'], 'Costa - Salina')),
          comentario: String(pick(r, ['COMENTARIO', 'OBSERVACIONES'], 'Carga masiva termográfica')),
          inspector: String(pick(r, ['INSPECTOR', 'RESPONSABLE'], actorFullName)),
          evidencia_url: String(pick(r, ['EVIDENCIA_URL', 'FOTO'], ''))
        });
        break;
      }

      case 'CONTROL_PODAS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        const algarrobo = toNum(pick(r, ['ALGARROBO'], 0));
        const palmera = toNum(pick(r, ['PALMERA'], 0));
        const ornamental = toNum(pick(r, ['ORNAMENTAL'], 0));
        const tamarindo = toNum(pick(r, ['TAMARINDO'], 0));
        const ponceana = toNum(pick(r, ['PONCEANA'], 0));
        const otros = toNum(pick(r, ['OTROS'], 0));
        const sum = algarrobo + palmera + ornamental + tamarindo + ponceana + otros;
        validRecords.push({
          id_poda: String(pick(r, ['ID_PODA'])) || randId('POD'),
          cod_linea,
          poste_n,
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), 'NO PRIORITARIO'),
          fecha_ejecucion: toISODate(pick(r, ['FECHA_EJECUCION', 'FECHA'])),
          estado: String(pick(r, ['ESTADO'], 'Completada')),
          algarrobo,
          palmera,
          ornamental,
          tamarindo,
          ponceana,
          otros,
          total_arboles: toNum(pick(r, ['TOTAL_ARBOLES'], sum), sum) || sum,
          ubicacion_referencia: String(pick(r, ['UBICACION_REFERENCIA', 'UBICACION'], '-')),
          punto_inicial: String(pick(r, ['PUNTO_INICIAL'], '-')),
          punto_final: String(pick(r, ['PUNTO_FINAL'], '-')),
          contratista_responsable: String(pick(r, ['CONTRATISTA_RESPONSABLE', 'CONTRATISTA', 'RESPONSABLE'], actorFullName)),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Carga masiva podas')),
          fotografias: []
        });
        break;
      }

      case 'MANTENIMIENTO': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        const actividad_realizada = String(pick(r, ['ACTIVIDAD_REALIZADA', 'ACTIVIDAD', 'DESCRIPCION'], 'Mantenimiento general'));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        const altRaw = String(pick(r, ['ALTERA_ESTRUCTURAS'], 'NO')).toUpperCase();
        validRecords.push({
          id_mantenimiento: String(pick(r, ['ID_MANTENIMIENTO'])) || randId('MNT'),
          cod_linea,
          poste_n,
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), 'NO PRIORITARIO'),
          orden_mantenimiento: String(pick(r, ['ORDEN_MANTENIMIENTO', 'NUMERO_OM', 'OM'], 'OM-SIN-ASIGNAR')),
          fecha_ejecucion: toISODate(pick(r, ['FECHA_EJECUCION', 'FECHA'])),
          tipo_mantenimiento: String(pick(r, ['TIPO_MANTENIMIENTO', 'TIPO'], 'Preventivo')),
          actividad_realizada,
          estado: String(pick(r, ['ESTADO'], 'Completado')),
          altera_estructuras: altRaw === 'SI' || altRaw === 'TRUE' || altRaw === '1',
          contratista_responsable: String(pick(r, ['CONTRATISTA_RESPONSABLE', 'CONTRATISTA', 'RESPONSABLE'], actorFullName)),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Carga masiva mantenimiento')),
          fotografias: []
        });
        break;
      }

      case 'HIDROLAVADO': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        validRecords.push({
          id_hidrolavado: String(pick(r, ['ID_HIDROLAVADO'])) || randId('HLV'),
          cod_linea,
          poste_n,
          fecha_ejecucion: toISODate(pick(r, ['FECHA_EJECUCION', 'FECHA'])),
          fase_lavada: String(pick(r, ['FASE_LAVADA', 'FASE'], 'Todas (R-S-T)')),
          tipo_aislador: String(pick(r, ['TIPO_AISLADOR', 'AISLADOR'], 'Polimérico')),
          presion_bar: toNum(pick(r, ['PRESION_BAR', 'PRESION'], 180), 180),
          conductividad_agua_us: toNum(pick(r, ['CONDUCTIVIDAD_AGUA_US', 'CONDUCTIVIDAD'], 4.5), 4.5),
          estado_previo_polucion: String(pick(r, ['ESTADO_PREVIO_POLUCION', 'POLUCION'], 'Medio')),
          resultado: String(pick(r, ['RESULTADO', 'ESTADO'], 'Conforme')),
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), 'NO PRIORITARIO'),
          contratista: String(pick(r, ['CONTRATISTA'], 'VENTO INGENIEROS')),
          responsable: String(pick(r, ['RESPONSABLE'], actorFullName)),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Carga masiva hidrolavado')),
          fotografias: []
        });
        break;
      }

      case 'ORDENES_OM': {
        const numero_om = String(pick(r, ['NUMERO_OM', 'OM', 'ORDEN_MANTENIMIENTO', 'CODIGO']));
        const tipo_actividad = String(pick(r, ['TIPO_ACTIVIDAD', 'ACTIVIDAD'], 'Deficiencias Técnicas'));
        if (!numero_om) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta NUMERO_OM.`);
          return;
        }
        const estadoRaw = String(pick(r, ['ESTADO'], 'Por subsanar'));
        validRecords.push({
          id_om: String(pick(r, ['ID_OM'])) || randId('OM'),
          numero_om,
          fecha_inicio: toISODate(pick(r, ['FECHA_INICIO', 'FECHA'])),
          fecha_ejecucion: toISODate(pick(r, ['FECHA_EJECUCION', 'FECHA_FIN'])),
          estado: estadoRaw.toLowerCase().includes('subsanado') && !estadoRaw.toLowerCase().includes('por')
            ? 'Subsanado'
            : 'Por subsanar',
          tipo_actividad,
          registros_asociados: [],
          responsable: String(pick(r, ['RESPONSABLE'], actorFullName)),
          fecha_registro: toISODate(pick(r, ['FECHA_REGISTRO']), true),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Orden de mantenimiento cargada desde Excel'))
        });
        break;
      }

      case 'DMS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        const descripcion = String(pick(r, ['DESCRIPCION', 'DETALLE', 'OBSERVACIONES']));
        if (!cod_linea || !poste_n || !descripcion) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA, POSTE_N o DESCRIPCION.`);
          return;
        }
        validRecords.push({
          id_dms: String(pick(r, ['ID_DMS'])) || randId('DMS'),
          codigo_dms: String(pick(r, ['CODIGO_DMS', 'CODIGO'])) || `DMS-XLS-${rowNum}`,
          cod_linea,
          poste_n,
          fecha_identificacion: toISODate(pick(r, ['FECHA_IDENTIFICACION', 'FECHA'])),
          descripcion,
          prioridad: toPrioridad(pick(r, ['PRIORIDAD']), 'PRIORITARIO'),
          fuente: String(pick(r, ['FUENTE'], 'OSINERGMIN')),
          orden_servicio: String(pick(r, ['ORDEN_SERVICIO', 'OS'], '')),
          estado: String(pick(r, ['ESTADO'], 'Pendiente')),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Cargado desde Excel')),
          evidencias: []
        });
        break;
      }

      case 'LEVANTAMIENTOS_DMS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        const descripcion_trabajo = String(pick(r, ['DESCRIPCION_TRABAJO', 'DESCRIPCION', 'TRABAJO']));
        if (!cod_linea || !poste_n || !descripcion_trabajo) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA, POSTE_N o DESCRIPCION_TRABAJO.`);
          return;
        }
        validRecords.push({
          id_levantamiento: String(pick(r, ['ID_LEVANTAMIENTO'])) || randId('LEV'),
          id_dms: String(pick(r, ['ID_DMS'], 'DMS-EXT')),
          cod_linea,
          poste_n,
          fecha_ejecucion: toISODate(pick(r, ['FECHA_EJECUCION', 'FECHA'])),
          descripcion_trabajo,
          orden_servicio: String(pick(r, ['ORDEN_SERVICIO', 'OS'], '')),
          fotografias: [],
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Carga masiva levantamiento DMS')),
          contratista_responsable: String(pick(r, ['CONTRATISTA_RESPONSABLE', 'CONTRATISTA', 'RESPONSABLE'], actorFullName)),
          estado: String(pick(r, ['ESTADO'], 'Registrado'))
        });
        break;
      }

      case 'INSPECCIONES_DMS': {
        const cod_linea = String(pick(r, ['COD_LINEA', 'LINEA'])).toUpperCase();
        const poste_n = String(pick(r, ['POSTE_N', 'POSTE', 'ESTRUCTURA']));
        const inspector = String(pick(r, ['INSPECTOR', 'RESPONSABLE'], actorFullName));
        if (!cod_linea || !poste_n) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta COD_LINEA o POSTE_N.`);
          return;
        }
        validRecords.push({
          id_inspeccion_cierre: String(pick(r, ['ID_INSPECCION_CIERRE', 'ID_INSPECCION'])) || randId('INSP'),
          id_dms: String(pick(r, ['ID_DMS'], 'DMS-EXT')),
          id_levantamiento: String(pick(r, ['ID_LEVANTAMIENTO'], 'LEV-EXT')),
          cod_linea,
          poste_n,
          fecha_inspeccion: toISODate(pick(r, ['FECHA_INSPECCION', 'FECHA'])),
          inspector,
          resultado: String(pick(r, ['RESULTADO'], 'Levantamiento conforme')),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Inspección cargada desde Excel')),
          evidencias_fotograficas: [],
          estado_final: String(pick(r, ['ESTADO_FINAL', 'ESTADO'], 'Cerrada')) === 'Observada' ? 'Observada' : 'Cerrada'
        });
        break;
      }

      case 'CONTRATISTAS': {
        const razon_social = String(pick(r, ['RAZON_SOCIAL', 'EMPRESA', 'NOMBRE'])).toUpperCase();
        const ruc = String(pick(r, ['RUC'])).replace(/\D/g, '');
        if (!razon_social || ruc.length !== 11) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta RAZON_SOCIAL o RUC válido de 11 dígitos.`);
          return;
        }
        const actsRaw = String(pick(r, ['ACTIVIDADES_ASIGNADAS', 'ACTIVIDADES'], 'ordenes_om'));
        const actividades = actsRaw.split(/[,;]+/).map((a) => a.trim().toLowerCase()).filter(Boolean);
        validRecords.push({
          id_contratista: String(pick(r, ['ID_CONTRATISTA'])) || randId('CONT'),
          razon_social,
          ruc,
          representante: String(pick(r, ['REPRESENTANTE', 'CONTACTO'], '-')),
          telefono: String(pick(r, ['TELEFONO', 'CELULAR'], '-')),
          correo: String(pick(r, ['CORREO', 'EMAIL'], '-')),
          especialidad: String(pick(r, ['ESPECIALIDAD'], 'Mantenimiento de Líneas')),
          estado: String(pick(r, ['ESTADO'], 'Activo')) === 'Inactivo' ? 'Inactivo' : 'Activo',
          actividades_asignadas: actividades.length > 0 ? actividades : ['ordenes_om'],
          fecha_registro: toISODate(pick(r, ['FECHA_REGISTRO']), true),
          observaciones: String(pick(r, ['OBSERVACIONES', 'OBSERVACION'], 'Cargado desde Excel'))
        });
        break;
      }

      case 'AUDITORIA_SISTEMA': {
        const modulo = String(pick(r, ['MODULO'], 'GENERAL')).toUpperCase();
        const accion = String(pick(r, ['ACCION'], 'EDICIÓN')).toUpperCase();
        const usuario = String(pick(r, ['USUARIO'], actorFullName));
        if (!modulo && !usuario) {
          skippedCount++;
          errors.push(`Fila ${rowNum}: Falta MODULO o USUARIO.`);
          return;
        }
        const nowStr = new Date().toISOString().split('T')[0];
        validRecords.push({
          id_auditoria: String(pick(r, ['ID_AUDITORIA'])) || randId('AUD'),
          modulo,
          id_registro: String(pick(r, ['ID_REGISTRO'], 'XLS')),
          accion,
          usuario,
          rol_usuario: String(pick(r, ['ROL_USUARIO', 'ROL'], currentUser?.rol || 'Administrador')),
          fecha_hora: String(pick(r, ['FECHA_HORA'], `${nowStr.split('-').reverse().join('/')} 09:00:00`)),
          campo_modificado: String(pick(r, ['CAMPO_MODIFICADO', 'CAMPO'], 'Importación masiva')),
          valor_anterior: String(pick(r, ['VALOR_ANTERIOR', 'VALORES_ANTERIORES'], 'N/A')),
          valor_nuevo: String(pick(r, ['VALOR_NUEVO', 'VALORES_NUEVOS'], 'Importado desde Excel')),
          observacion: String(pick(r, ['OBSERVACION', 'OBSERVACIONES'], 'Registro de auditoría cargado desde Excel')),
          rol: String(pick(r, ['ROL_USUARIO', 'ROL'], currentUser?.rol || 'Administrador')),
          fecha: nowStr,
          hora: '09:00:00',
          origen: 'Importación Excel',
          resultado: 'Exitoso'
        });
        break;
      }
    }
  });

  return { moduleKey, validRecords, skippedCount, errors };
}

export function matchSheetNameToModule(sheetName: string): BulkModuleKey | null {
  const norm = normalizeHeaderKey(sheetName);
  const direct = BULK_MODULE_CONFIGS.find((c) => c.key === norm || normalizeHeaderKey(c.sheetName) === norm);
  if (direct) return direct.key;

  if (norm.includes('LINEA')) return 'LINEAS';
  if (norm.includes('ESTRUCTURA') || norm.includes('POSTE')) return 'ESTRUCTURAS';
  if (norm.includes('DEFICIEN')) return 'DEFICIENCIAS';
  if (norm.includes('PUESTA') || norm.includes('TIERRA') || norm === 'PAT') return 'PUESTA_A_TIERRA';
  if (norm.includes('CORONA')) return 'EFECTO_CORONA';
  if (norm.includes('TERMO')) return 'TERMOGRAFIA';
  if (norm.includes('PODA')) return 'CONTROL_PODAS';
  if (norm.includes('MANTENIMIENTO')) return 'MANTENIMIENTO';
  if (norm.includes('HIDROLAV')) return 'HIDROLAVADO';
  if (norm.includes('ORDEN') || norm.includes('OM')) return 'ORDENES_OM';
  if (norm.includes('LEVANTAMIENTO')) return 'LEVANTAMIENTOS_DMS';
  if (norm.includes('INSPECCION')) return 'INSPECCIONES_DMS';
  if (norm.includes('DMS')) return 'DMS';
  if (norm.includes('CONTRATISTA')) return 'CONTRATISTAS';
  if (norm.includes('AUDITORIA')) return 'AUDITORIA_SISTEMA';
  return null;
}

export function downloadBulkTemplate(target: BulkModuleKey | 'ALL_MODULES') {
  const wb = XLSX.utils.book_new();
  const list = target === 'ALL_MODULES' ? BULK_MODULE_CONFIGS : [BULK_MODULE_MAP[target]];
  for (const cfg of list) {
    const ws = XLSX.utils.json_to_sheet([cfg.sampleRow]);
    XLSX.utils.book_append_sheet(wb, ws, cfg.sheetName.substring(0, 31));
  }
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fname =
    target === 'ALL_MODULES'
      ? 'Plantilla_Carga_Masiva_Completa.xlsx'
      : `Plantilla_${BULK_MODULE_MAP[target].sheetName}.xlsx`;
  link.setAttribute('download', fname);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
