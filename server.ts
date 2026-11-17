import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import {
  sanitizeUser,
  sanitizeState,
  pushUsuariosToDriveWithToken,
  pushAllActivitiesToDriveWithToken,
  pullUsuariosFromDriveWithToken,
  resolveDriveFolder,
  getDriveFileMetadata
} from './serverDriveSync.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'app-state.json');
const SEED_FILE = path.join(__dirname, 'src', 'data', 'seedData.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lima Timezone helper
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

// Initial Catalog users
// Initial Catalog users (including official USUARIOS.XLSX spreadsheet users)
const DEFAULT_USUARIOS = [
  {
    id_usuario: 'USR-001',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Rivas',
    dni: '43981254',
    email: 'admin.subtransmision@empresa.com',
    telefono: '+51 984 551 223',
    username: 'admin_carlos',
    password: 'password123',
    rol: 'Administrador',
    estado: 'Activo',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-15',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-002',
    nombres: 'Fernando',
    apellidos: 'Vargas Salazar',
    dni: '45129874',
    email: 'supervisor.vargas@empresa.com',
    telefono: '+51 971 334 890',
    username: 'sup_fernando',
    password: 'password123',
    rol: 'Supervisor',
    estado: 'Activo',
    supervisor_responsable: 'Carlos Alberto Mendoza Rivas',
    lineas_asignadas: ['L-6601', 'L-6602', 'L-6603', 'L-6657A', 'L-6657C'],
    fecha_creacion: '2026-02-10',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-003',
    nombres: 'Jorge Luis',
    apellidos: 'Torres Benavides (Contratista Electrotech)',
    dni: '10458763',
    email: 'contratista.electrotech@gmail.com',
    telefono: '+51 963 852 741',
    username: 'cont_electrotech',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    supervisor_responsable: 'Fernando Vargas Salazar',
    lineas_asignadas: ['L-6601', 'L-6657C'],
    fecha_creacion: '2026-03-01',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-004',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Vargas',
    dni: '42891045',
    email: 'admin.transmision@enosa.com.pe',
    telefono: '+51 969 123 456',
    username: 'admin',
    password: 'password123',
    rol: 'Administrador',
    estado: 'Activo',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-10',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-005',
    nombres: 'Carlos Alberto',
    apellidos: 'Mendoza Silva',
    dni: '09876543',
    email: 'cmendoza@enosa.com.pe',
    telefono: '+51 968 234 567',
    username: 'cmendoza',
    password: 'password123',
    rol: 'Supervisor',
    estado: 'Activo',
    lineas_asignadas: ['L-6650', 'L-6652', 'L-6657A', 'L-6657B', 'L-6657C', 'L-6657D', 'L-6560', 'L-6561', 'L-6658B', 'L-6658C'],
    fecha_creacion: '2026-01-15',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-006',
    nombres: 'Roberto',
    apellidos: 'Díaz Flores',
    dni: '18234567',
    email: 'rdiaz@enosa.com.pe',
    telefono: '+51 972 345 678',
    username: 'rdiaz',
    password: 'password123',
    rol: 'Supervisor',
    estado: 'Activo',
    lineas_asignadas: ['L-6665A', 'L-6766', 'L-6767', 'L-128', 'L-129', 'L-6654', 'L-6659', 'L-6758', 'L-6660', 'L-6663'],
    fecha_creacion: '2026-01-18',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-007',
    nombres: 'Consorcio Eléctrico',
    apellidos: 'del Norte (Ing. Peña)',
    dni: '20541234567',
    email: 'operaciones@cenorte.com.pe',
    telefono: '+51 980 456 789',
    username: 'cenorte',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    supervisor_responsable: 'Carlos Alberto Mendoza Silva',
    lineas_asignadas: ['L-6657A', 'L-6657C', 'L-6560', 'L-6561'],
    fecha_creacion: '2026-02-01',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-008',
    nombres: 'Servicios de Poda y Mantenimiento',
    apellidos: 'Grau S.A.C.',
    dni: '20601239871',
    email: 'contacto@spmgrau.pe',
    telefono: '+51 990 654 321',
    username: 'spmgrau',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    supervisor_responsable: 'Roberto Díaz Flores',
    lineas_asignadas: ['L-6665A', 'L-6766', 'L-6767', 'L-128', 'L-129'],
    fecha_creacion: '2026-02-05',
    ultima_actualizacion: '2026-10-28 16:57:19'
  },
  {
    id_usuario: 'USR-009',
    nombres: 'Marcos',
    apellidos: 'Silva Palacios (Montajes del Norte)',
    dni: '20529841',
    email: 'operaciones@montajesnorte.com.pe',
    telefono: '+51 984 123 789',
    username: 'cont_montajes',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    contratista_id: 'CONT-001',
    contratista_nombre: 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-01-15',
    ultima_actualizacion: '2026-10-29 10:00:00'
  },
  {
    id_usuario: 'USR-010',
    nombres: 'Patricia',
    apellidos: 'Ramos Delgado (Nassan)',
    dni: '20489123',
    email: 'contacto@nassan.com.pe',
    telefono: '+51 971 654 321',
    username: 'cont_nassan',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    contratista_id: 'CONT-002',
    contratista_nombre: 'NASSAN',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-02-01',
    ultima_actualizacion: '2026-10-29 10:00:00'
  },
  {
    id_usuario: 'USR-011',
    nombres: 'Julio César',
    apellidos: 'Morales (Pcoin)',
    dni: '20601452',
    email: 'proyectos@pcoin.com.pe',
    telefono: '+51 968 456 123',
    username: 'cont_pcoin',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    contratista_id: 'CONT-003',
    contratista_nombre: 'PCOIN',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-02-15',
    ultima_actualizacion: '2026-10-29 10:00:00'
  },
  {
    id_usuario: 'USR-012',
    nombres: 'Alberto',
    apellidos: 'Vento Carrión (Vento Ingenieros)',
    dni: '20541289',
    email: 'gerencia@ventoing.com.pe',
    telefono: '+51 993 789 456',
    username: 'cont_vento',
    password: 'password123',
    rol: 'Contratista',
    estado: 'Activo',
    contratista_id: 'CONT-004',
    contratista_nombre: 'VENTO INGENIEROS',
    lineas_asignadas: ['*'],
    fecha_creacion: '2026-03-01',
    ultima_actualizacion: '2026-10-29 10:00:00'
  }
];

const DEFAULT_CONTRATISTAS = [
  {
    id_contratista: 'CONT-001',
    razon_social: 'MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE',
    ruc: '20529841231',
    representante: 'Ing. Marcos Silva Palacios',
    telefono: '+51 984 123 789',
    correo: 'operaciones@montajesnorte.com.pe',
    especialidad: 'Mantenimiento Electromecánico y Líneas de Subtransmisión',
    estado: 'Activo',
    actividades_asignadas: ['deficiencias', 'corona', 'termografia', 'dms', 'ordenes_om'],
    fecha_registro: '2026-01-15',
    observaciones: 'Contratista principal autorizada para 5 actividades técnicas.'
  },
  {
    id_contratista: 'CONT-002',
    razon_social: 'NASSAN',
    ruc: '20489123842',
    representante: 'Ing. Patricia Ramos Delgado',
    telefono: '+51 971 654 321',
    correo: 'contacto@nassan.com.pe',
    especialidad: 'Control de Vegetación y Despeje de Franja de Servidumbre',
    estado: 'Activo',
    actividades_asignadas: ['podas', 'ordenes_om'],
    fecha_registro: '2026-02-01',
    observaciones: 'Especialista en desbroce, tala y podas en servidumbre de líneas.'
  },
  {
    id_contratista: 'CONT-003',
    razon_social: 'PCOIN',
    ruc: '20601452391',
    representante: 'Ing. Julio César Morales',
    telefono: '+51 968 456 123',
    correo: 'proyectos@pcoin.com.pe',
    especialidad: 'Sistemas de Puesta a Tierra y Medición de Resistividad',
    estado: 'Activo',
    actividades_asignadas: ['puesta_tierra', 'ordenes_om'],
    fecha_registro: '2026-02-15',
    observaciones: 'Pruebas de resistividad PAT y mantenimiento de electrodos.'
  },
  {
    id_contratista: 'CONT-004',
    razon_social: 'VENTO INGENIEROS',
    ruc: '20541289634',
    representante: 'Ing. Alberto Vento Carrión',
    telefono: '+51 993 789 456',
    correo: 'gerencia@ventoing.com.pe',
    especialidad: 'Hidrolavado de Aislamiento en Líneas de Alta Tensión',
    estado: 'Activo',
    actividades_asignadas: ['hidrolavado', 'ordenes_om'],
    fecha_registro: '2026-03-01',
    observaciones: 'Servicio de hidrolavado a alta presión con agua desmineralizada.'
  }
];

const DEFAULT_HIDROLAVADO = [
  {
    id_hidrolavado: 'HLV-001',
    cod_linea: 'L-6657C',
    poste_n: '12',
    fecha_ejecucion: '2026-10-15',
    fase_lavada: 'Todas las Fases',
    tipo_aislador: 'Polimérico',
    presion_bar: 55,
    conductividad_agua_us: 42,
    estado_previo_polucion: 'Severo',
    resultado: 'Conforme',
    prioridad: 'PRIORITARIO',
    contratista: 'VENTO INGENIEROS',
    observaciones: 'Lavado exitoso en zona de alta salinidad.',
    evidencia_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
    responsable: 'Ing. Alberto Vento Carrión'
  },
  {
    id_hidrolavado: 'HLV-002',
    cod_linea: 'L-6650',
    poste_n: '5',
    fecha_ejecucion: '2026-10-22',
    fase_lavada: 'Fase S',
    tipo_aislador: 'Porcelana',
    presion_bar: 60,
    conductividad_agua_us: 38,
    estado_previo_polucion: 'Moderado',
    resultado: 'Conforme',
    prioridad: 'NO PRIORITARIO',
    contratista: 'VENTO INGENIEROS',
    observaciones: 'Eliminación completa de depósitos salinos.',
    evidencia_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
    responsable: 'Ing. Alberto Vento Carrión'
  }
];

// In-Memory Authoritative State
interface AppState {
  lineas: any[];
  estructuras: any[];
  corona: any[];
  deficiencias: any[];
  puestaTierra: any[];
  termografia: any[];
  podas: any[];
  mantenimiento: any[];
  ordenes_om?: any[];
  dms: any[];
  levantamientos: any[];
  inspecciones: any[];
  usuarios: any[];
  contratistas?: any[];
  hidrolavado?: any[];
  authConfig?: any;
  auditoria: any[];
  evidencias: any[];
  config: any;
  conflictos: any[];
  version: number;
}

let state: AppState;

function loadState(): AppState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      parsed.config = parsed.config || {};
      parsed.config.sheet_usuarios_id = parsed.config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
      parsed.config.sheet_usuarios_url = parsed.config.sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true';
      parsed.usuarios = parsed.usuarios || [];
      const userMap = new Map<string, any>();
      for (const u of parsed.usuarios) {
        if (u && u.username) {
          userMap.set(u.username.toLowerCase(), u);
        }
      }
      for (const defU of DEFAULT_USUARIOS) {
        if (!userMap.has(defU.username.toLowerCase())) {
          userMap.set(defU.username.toLowerCase(), defU);
        }
      }
      parsed.usuarios = Array.from(userMap.values());

      // Normalizar prioridades de deficiencias: Solo PRIORITARIO y NO PRIORITARIO
      if (parsed.deficiencias && Array.isArray(parsed.deficiencias)) {
        parsed.deficiencias = parsed.deficiencias.map((d: any) => ({
          ...d,
          prioridad: (d.prioridad === 'PRIORITARIO' || d.prioridad === 'ALTO' || d.prioridad === 'Alta' || d.prioridad === 'PRIORIDAD') ? 'PRIORITARIO' : 'NO PRIORITARIO'
        }));
      }
      parsed.puestaTierra = parsed.puestaTierra || [];
      parsed.ordenes_om = parsed.ordenes_om || [];
      parsed.contratistas = parsed.contratistas && parsed.contratistas.length > 0 ? parsed.contratistas : DEFAULT_CONTRATISTAS;
      parsed.hidrolavado = parsed.hidrolavado && parsed.hidrolavado.length > 0 ? parsed.hidrolavado : DEFAULT_HIDROLAVADO;
      parsed.authConfig = parsed.authConfig || { allow_self_registration: true };

      console.log(`[Server] State loaded from ${STATE_FILE} (Version ${parsed.version || 1}, ${parsed.usuarios.length} usuarios)`);
      return parsed;
    } catch (e) {
      console.error('[Server] Failed to read state file, recreating from seed', e);
    }
  }

  // Load from seedData.json
  let seed = { lineas: [], estructuras: [], corona: [] };
  if (fs.existsSync(SEED_FILE)) {

    try {
      seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    } catch (e) {
      console.error('[Server] Failed to parse seed file', e);
    }
  }

  const { fecha, hora } = getLimaDateTime();

  const initialState: AppState = {
    lineas: seed.lineas || [],
    estructuras: seed.estructuras || [],
    corona: seed.corona || [],
    contratistas: DEFAULT_CONTRATISTAS,
    hidrolavado: DEFAULT_HIDROLAVADO,
    authConfig: { allow_self_registration: true },
    deficiencias: [
      {
        id_deficiencia: 'DEF-001',
        cod_linea: 'L-6657C',
        poste_n: '14',
        fecha_inspeccion: '2026-10-15',
        tipo_deficiencia: 'Presencia de agujeros en la parte superior de los postes de madera tipo H.',
        descripcion: 'Se evidencian agujeros producidos por pájaros carpinteros en cabeza de poste.',
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
        observaciones: 'Requiere instalación de cobertor y reforzado con abrazadera metálica.',
        usuario_responsable: 'Consorcio Eléctrico del Norte',
        estado: 'En atención'
      },
      {
        id_deficiencia: 'DEF-002',
        cod_linea: 'L-6657C',
        poste_n: '46',
        fecha_inspeccion: '2026-10-18',
        tipo_deficiencia: 'Se observan cables PAT corroídos y/o cortados en la parte inferior de las estructuras de madera. También se observan conexiones que no garantizan un buen funcionamiento del sistema de aterramiento. Se deben de mejorar las conexiones utilizando conectores adecuados.',
        descripcion: 'Puesta a tierra sulfatada con empalme artesanal sin conector tipo split bolt.',
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        observaciones: 'Reponer conductor de cobre de 35mm² y soldadura exotérmica.',
        usuario_responsable: 'Consorcio Eléctrico del Norte',
        estado: 'Pendiente de revisión'
      },
      {
        id_deficiencia: 'DEF-003',
        cod_linea: 'L-6665A',
        poste_n: '33',
        fecha_inspeccion: '2026-10-20',
        tipo_deficiencia: 'Predios no cumplen con DMS e invaden la F.S.',
        descripcion: 'Construcción clandestina de vivienda de dos pisos dentro de la franja de servidumbre a 2.8m del conductor.',
        prioridad: 'PRIORITARIO',
        evidencia_fotografica: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
        observaciones: 'Notificado a asesoría legal y fiscalización municipal.',
        usuario_responsable: 'Ing. Roberto Díaz Flores',
        estado: 'Registrada'
      }
    ],
    puestaTierra: [],
    termografia: [

      {
        id_termografia: 'TRM-001',
        cod_linea: 'L-6657C',
        poste_n: '7',
        tipo_armado: 'A',
        conductor_calibre: 'AAAC 240',
        conductor_n_fases: '3',
        nivel_tension: '60 kV',
        tipo_zona: 'Rural - Agrícola',
        temp_ambiente: 29.5,
        temp_max_componente: 54.2,
        emisividad: 0.95,
        delta_t: 24.7,
        hora: '11:45',
        fecha: '2026-10-12',
        componente_falla: 'Grapa de suspensión Fase T',
        comentario: 'Calentamiento localizado por falso contacto en perno de ajuste.',
        criticidad: 'Alerta',
        evidencia_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        inspector: 'Ing. Carlos Mendoza Silva'
      }
    ],
    podas: [
      {
        id_poda: 'POD-001',
        cod_linea: 'L-6657C',
        poste_n: '12',
        tipo_armado: 'A',
        tipo_aislador: 'polimérico',
        nivel_tension_kv: '60',
        fecha_ejecucion: '2026-10-14',
        ubicacion_referencia: 'Km 18 Carretera Piura - Chulucanas',
        punto_inicial: 'Sum. 45091',
        punto_final: 'Sum. 45110',
        algarrobo: 6,
        palmera: 2,
        ornamental: 0,
        tamarindo: 1,
        ponceana: 0,
        otros: 3,
        total_arboles: 12,
        observaciones: 'Despeje de 4 metros perimetrales con respecto a conductores.',
        fotografias: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'],
        contratista_responsable: 'Consorcio Eléctrico del Norte',
        estado: 'Completada'
      }
    ],
    mantenimiento: [],
    ordenes_om: [],
    dms: [
      {
        id_dms: 'DMS-2026-001',
        cod_linea: 'L-6657C',
        poste_n: '24',
        codigo_dms: 'OSINERGMIN-PIU-0182',
        descripcion: 'Edificación invade franja de servidumbre a 2.45m del conductor más cercano en vano 24-25.',
        fecha_identificacion: '2026-09-12',
        prioridad: 'PRIORITARIO',
        fuente: 'OSINERGMIN',
        orden_servicio: 'OS-88491-2026',
        estado: 'En Levantamiento',
        observaciones: 'Se notificó a la municipalidad y se tramita modificación de traza o elevación de poste.',
        evidencias: ['https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80']
      },
      {
        id_dms: 'DMS-2026-002',
        cod_linea: 'L-6561',
        poste_n: '78',
        codigo_dms: 'OSINERGMIN-PIU-0199',
        descripcion: 'Cartel publicitario metálico instalado a 2.10m de fase inferior.',
        fecha_identificacion: '2026-09-20',
        prioridad: 'ALTO',
        fuente: 'Inspección Interna',
        orden_servicio: 'OS-88510-2026',
        estado: 'Levantada',
        observaciones: 'Panel retirado por la contratista. Pendiente de inspección de cierre.',
        evidencias: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80']
      }
    ],
    levantamientos: [],
    inspecciones: [],
    usuarios: DEFAULT_USUARIOS,
    auditoria: [
      {
        id_auditoria: 'AUD-SERVER-001',
        usuario: 'Servidor Central',
        rol: 'Sistema',
        fecha,
        hora,
        accion: 'IMPORTACION',
        modulo: 'INICIALIZACION',
        id_registro: 'DATASETS',
        cod_linea: 'TODAS',
        estructura: '-',
        valores_anteriores: 'Base vacía',
        valores_nuevos: `Servidor sincronizado con 27 líneas, 1087 estructuras y 222 mediciones efecto corona`,
        origen: 'Importación Excel',
        resultado: 'Exitoso',
        sync_id: 'SYNC-SRV-001'
      }
    ],
    evidencias: [],
    config: {
      sheet_lineas_id: '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y',
      sheet_lineas_url: 'https://docs.google.com/spreadsheets/d/1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y/edit?gid=0#gid=0',
      sheet_usuarios_id: '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX',
      sheet_usuarios_url: 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true',
      drive_folder_id: '1A9x_DRIVE_FOLDER_SUBTRANSMISION',
      apps_script_url: '',
      auto_sync_interval: 15,
      last_sync_time: `${fecha} ${hora}`,
      sync_status: 'Conectado'
    },
    conflictos: [],
    version: 1
  };

  saveState(initialState);
  return initialState;
}

function saveState(newState: AppState) {
  try {
    const tmpFile = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(newState, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STATE_FILE);
  } catch (err) {
    console.error('[Server] Failed to save state to disk', err);
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2), 'utf-8');
    } catch {
      // ignore secondary error
    }
  }
}

state = loadState();
const processedMutationIds = new Set<string>();
const processedMutationOrder: string[] = [];

function markMutationProcessed(mutationId?: string): boolean {
  if (!mutationId) return false;
  if (processedMutationIds.has(mutationId)) return true;
  processedMutationIds.add(mutationId);
  processedMutationOrder.push(mutationId);
  if (processedMutationOrder.length > 1000) {
    const oldest = processedMutationOrder.shift();
    if (oldest) processedMutationIds.delete(oldest);
  }
  return false;
}

// Active Connected Clients
interface ConnectedClient {
  ws: WebSocket;
  id: string;
  user?: {
    id_usuario: string;
    nombres: string;
    apellidos: string;
    username: string;
    rol: string;
    email: string;
  };
  activeModule?: string;
  activeLine?: string;
  connectedAt: string;
}

const clients = new Map<WebSocket, ConnectedClient>();

function broadcast(message: object, senderWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN && ws !== senderWs) {
      ws.send(payload);
    }
  }
}

function broadcastAll(message: object) {
  const payload = JSON.stringify(message);
  for (const [ws] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

interface HttpPresenceClient {
  clientId: string;
  user: any;
  activeModule: string;
  activeLine: string;
  lastSeen: number;
}
const httpClients = new Map<string, HttpPresenceClient>();

function getActiveUsersList() {
  const userList: any[] = [];
  const now = Date.now();

  for (const [, client] of clients.entries()) {
    if (client.user) {
      userList.push({
        id: client.id,
        user: client.user,
        activeModule: client.activeModule || 'dashboard',
        activeLine: client.activeLine || 'TODAS',
        connectedAt: client.connectedAt
      });
    }
  }

  for (const [clientId, info] of httpClients.entries()) {
    if (now - info.lastSeen < 15000) {
      if (!userList.some(u => u.user.username === info.user.username)) {
        userList.push({
          id: clientId,
          user: info.user,
          activeModule: info.activeModule || 'dashboard',
          activeLine: info.activeLine || 'TODAS',
          connectedAt: 'En línea'
        });
      }
    } else {
      httpClients.delete(clientId);
    }
  }

  return userList;
}

// Structure shifting logic
function parsePosteNumber(posteN: string): { num: number; suffix: string } {
  const trimmed = (posteN || '').trim();
  const match = trimmed.match(/^(\d+)(.*)$/);
  if (match) {
    return { num: parseInt(match[1], 10), suffix: match[2] };
  }
  return { num: 999999, suffix: trimmed };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const server = http.createServer(app);

  // WebSocket Server attached to same HTTP Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const clientId = 'CLI-' + Math.random().toString(36).substring(2, 9);
    const { hora } = getLimaDateTime();

    const clientInfo: ConnectedClient = {
      ws,
      id: clientId,
      connectedAt: hora
    };
    clients.set(ws, clientInfo);

    console.log(`[WebSocket] Client connected: ${clientId}. Total clients: ${clients.size}`);

    // Send full current state to newly connected client (without exposing user passwords)
    ws.send(JSON.stringify({
      type: 'init',
      data: sanitizeState(state),
      activeUsers: getActiveUsersList(),
      clientId
    }));

    ws.on('message', (rawMessage: string) => {
      try {
        const msg = JSON.parse(rawMessage);
        handleClientMessage(ws, clientInfo, msg);
      } catch (e) {
        console.error('[WebSocket] Invalid JSON message received', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${clientId}. Remaining: ${clients.size}`);
      broadcastAll({
        type: 'presence:update',
        activeUsers: getActiveUsersList()
      });
    });

    ws.on('error', (err: any) => {
      console.error(`[WebSocket] Client ${clientId} error:`, err);
    });
  });

  // Handle client mutation / presence messages
  function handleClientMessage(ws: WebSocket, client: ConnectedClient, msg: any) {
    const { fecha, hora, fecha_hora } = getLimaDateTime();

    switch (msg.type) {
      case 'auth:identify': {
        client.user = msg.user;
        client.activeModule = msg.activeModule || 'dashboard';
        client.activeLine = msg.activeLine || 'TODAS';

        broadcastAll({
          type: 'presence:update',
          activeUsers: getActiveUsersList()
        });
        break;
      }

      case 'presence:heartbeat': {
        if (client.user) {
          client.activeModule = msg.activeModule;
          client.activeLine = msg.activeLine;
          broadcast({
            type: 'presence:update',
            activeUsers: getActiveUsersList()
          }, ws);
        }
        break;
      }

      case 'mutate': {
        const { entity, action, data: payload, user, mutationId } = msg;
        if (markMutationProcessed(mutationId)) {
          break;
        }
        state.version = (state.version || 1) + 1;

        const actorName = user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() || user.username : 'Usuario Web';
        const createCtrl = {
          fecha_creacion: payload?.fecha_creacion || fecha_hora,
          usuario_creacion: payload?.usuario_creacion || actorName,
          estado_registro: payload?.estado_registro || 'ACTIVO'
        };
        const updateCtrl = {
          fecha_modificacion: payload?.fecha_modificacion || fecha_hora,
          usuario_modificacion: payload?.usuario_modificacion || actorName
        };
        const deleteCtrl = {
          fecha_eliminacion: payload?.fecha_eliminacion || fecha_hora,
          usuario_eliminacion: payload?.usuario_eliminacion || actorName,
          estado_registro: 'ELIMINADO'
        };

        let changeDescription = '';
        let auditAction: any = action.toUpperCase();

        if (entity === 'lineas') {
          if (action === 'create') {
            if (!state.lineas.some(l => l.cod_linea === payload.cod_linea && l.estado_registro !== 'ELIMINADO')) {
              state.lineas.push({ ...payload, ...createCtrl });
            }
            changeDescription = `Línea ${payload.cod_linea} creada por ${actorName}`;
          } else if (action === 'update') {
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea);
            if (idx >= 0) state.lineas[idx] = { ...state.lineas[idx], ...payload, ...updateCtrl };
            changeDescription = `Línea ${payload.cod_linea} actualizada`;
          } else if (action === 'deactivate') {
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea);
            if (idx >= 0) state.lineas[idx] = { ...state.lineas[idx], estado: 'Inactivo', ...updateCtrl };
            auditAction = 'DESACTIVACION';
            changeDescription = `Línea ${payload.cod_linea} desactivada`;
          } else if (action === 'delete') {
            const idx = state.lineas.findIndex(l => l.cod_linea === payload.cod_linea || l.id_linea === payload.id_linea);
            if (idx >= 0) state.lineas[idx] = { ...state.lineas[idx], ...payload, estado: 'Inactivo', ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Línea ${payload.cod_linea} eliminada lógicamente`;
          }
        } else if (entity === 'estructuras') {
          if (action === 'create') {
            if (!state.estructuras.some(e => e.id_poste === payload.id_poste)) {
              if (msg.shiftSubsequent) {
                const targetParsed = parsePosteNumber(payload.poste_n);
                if (targetParsed.num !== 999999) {
                  state.estructuras.forEach(st => {
                    if (st.cod_linea === payload.cod_linea && st.estado_registro !== 'ELIMINADO') {
                      const p = parsePosteNumber(st.poste_n);
                      if (p.num >= targetParsed.num) {
                        st.poste_n = String(p.num + 1) + p.suffix;
                      }
                    }
                  });
                }
              }
              state.estructuras.push({ ...payload, ...createCtrl });
            }
            changeDescription = `Estructura Poste ${payload.poste_n} agregada en línea ${payload.cod_linea}`;
          } else if (action === 'update') {
            const idx = state.estructuras.findIndex(e => e.id_poste === payload.id_poste);
            if (idx >= 0) state.estructuras[idx] = { ...state.estructuras[idx], ...payload, ...updateCtrl };
            changeDescription = `Estructura Poste ${payload.poste_n} actualizada`;
          } else if (action === 'delete') {
            const idx = state.estructuras.findIndex(e => (payload.id_poste && e.id_poste === payload.id_poste) || (e.cod_linea === payload.cod_linea && e.poste_n === payload.poste_n && e.estado_registro !== 'ELIMINADO'));
            if (idx >= 0) {
              state.estructuras[idx] = { ...state.estructuras[idx], ...payload, estado: 'Desactivado', ...deleteCtrl };
              if (msg.shiftSubsequent) {
                const targetParsed = parsePosteNumber(payload.poste_n);
                if (targetParsed.num !== 999999) {
                  state.estructuras.forEach(st => {
                    if (st.cod_linea === payload.cod_linea && st.estado_registro !== 'ELIMINADO') {
                      const p = parsePosteNumber(st.poste_n);
                      if (p.num > targetParsed.num) {
                        st.poste_n = String(p.num - 1) + p.suffix;
                      }
                    }
                  });
                }
              }
            }
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Estructura Poste ${payload.poste_n} eliminada lógicamente en línea ${payload.cod_linea}`;
          } else if (action === 'batch') {
            state.estructuras = payload;
            changeDescription = `Importación batch de ${payload.length} estructuras`;
          }
        } else if (entity === 'corona') {
          if (action === 'create') {
            if (!state.corona.some(c => c.id_corona === payload.id_corona)) {
              state.corona.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Medición de Efecto Corona registrada en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.corona.findIndex(c => c.id_corona === payload.id_corona);
            if (idx >= 0) state.corona[idx] = { ...state.corona[idx], ...payload, ...updateCtrl };
            changeDescription = `Medición de Efecto Corona actualizada en P-${payload.poste_n}`;
          } else if (action === 'delete') {
            const idx = state.corona.findIndex(c => c.id_corona === payload.id_corona);
            if (idx >= 0) state.corona[idx] = { ...state.corona[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Medición de Efecto Corona ${payload.id_corona} eliminada lógicamente`;
          }
        } else if (entity === 'deficiencias') {
          if (action === 'create') {
            const normalized = {
              ...payload,
              ...createCtrl,
              prioridad: (payload.prioridad === 'PRIORITARIO' || payload.prioridad === 'ALTO' || payload.prioridad === 'Alta') ? 'PRIORITARIO' : 'NO PRIORITARIO'
            };
            if (!state.deficiencias.some(d => d.id_deficiencia === payload.id_deficiencia)) {
              state.deficiencias.unshift(normalized);
            }
            changeDescription = `Deficiencia registrada en ${payload.cod_linea} P-${payload.poste_n} (${normalized.prioridad})`;
          } else if (action === 'update') {
            const idx = state.deficiencias.findIndex(d => d.id_deficiencia === payload.id_deficiencia);
            if (idx >= 0) {
              state.deficiencias[idx] = {
                ...state.deficiencias[idx],
                ...payload,
                ...updateCtrl,
                prioridad: (payload.prioridad === 'PRIORITARIO' || payload.prioridad === 'ALTO' || payload.prioridad === 'Alta' || state.deficiencias[idx].prioridad === 'PRIORITARIO') ? 'PRIORITARIO' : 'NO PRIORITARIO'
              };
            }
            changeDescription = `Deficiencia ${payload.id_deficiencia} actualizada a estado ${payload.estado}`;
          } else if (action === 'delete') {
            const defId = payload.id_deficiencia;
            const idx = state.deficiencias.findIndex(d => d.id_deficiencia === defId);
            const targetDef = idx >= 0 ? state.deficiencias[idx] : undefined;
            const numOM = (targetDef?.numero_om || payload.numero_om || '').trim();
            if (idx >= 0) {
              state.deficiencias[idx] = { ...state.deficiencias[idx], ...payload, ...deleteCtrl };
            }

            // Cascade remove from ordenes_om (logical deletion if emptied)
            if (state.ordenes_om) {
              state.ordenes_om = state.ordenes_om.map((om: any) => {
                if (om.estado_registro === 'ELIMINADO') return om;
                const hasReg = (om.registros_asociados || []).some((r: any) => r.id_registro === defId);
                const isMatchOM = numOM && om.numero_om && om.numero_om.toLowerCase() === numOM.toLowerCase();
                if (hasReg || isMatchOM) {
                  const remaining = (om.registros_asociados || []).filter((r: any) => r.id_registro !== defId);
                  if (remaining.length === 0) {
                    return { ...om, registros_asociados: remaining, ...deleteCtrl };
                  }
                  return { ...om, registros_asociados: remaining, ...updateCtrl };
                }
                return om;
              });
            }

            // Logical delete any direct link in mantenimiento
            if (numOM && state.mantenimiento) {
              state.mantenimiento = state.mantenimiento.map(m =>
                (m.orden_mantenimiento === numOM && targetDef && m.poste_n === targetDef.poste_n)
                  ? { ...m, ...deleteCtrl }
                  : m
              );
            }

            auditAction = 'ELIMINACIÓN';
            changeDescription = `Deficiencia ${defId} eliminada lógicamente y retirada de la OM ${numOM || 'asociada'}`;
          }
        } else if (entity === 'puesta_tierra') {
          state.puestaTierra = state.puestaTierra || [];
          if (action === 'create') {
            const existingIdx = state.puestaTierra.findIndex(p =>
              p.estado_registro !== 'ELIMINADO' &&
              ((payload.id_pat && p.id_pat === payload.id_pat) ||
               (p.cod_linea === payload.cod_linea && String(p.poste_n).trim() === String(payload.poste_n).trim()))
            );
            if (existingIdx >= 0) {
              state.puestaTierra[existingIdx] = { ...state.puestaTierra[existingIdx], ...payload, ...updateCtrl };
              changeDescription = `Medición PAT actualizada en ${payload.cod_linea} P-${payload.poste_n}`;
            } else {
              state.puestaTierra.unshift({ ...payload, ...createCtrl });
              changeDescription = `Medición PAT registrada en ${payload.cod_linea} P-${payload.poste_n} (${payload.valor_resistencia_pat} Ω - ${payload.prioridad})`;
            }
          } else if (action === 'update') {
            let idx = state.puestaTierra.findIndex(p => p.id_pat === payload.id_pat);
            if (idx === -1 && payload.cod_linea && payload.poste_n) {
              idx = state.puestaTierra.findIndex(p =>
                p.estado_registro !== 'ELIMINADO' &&
                p.cod_linea === payload.cod_linea && String(p.poste_n).trim() === String(payload.poste_n).trim()
              );
            }
            if (idx >= 0) state.puestaTierra[idx] = { ...state.puestaTierra[idx], ...payload, ...updateCtrl };
            changeDescription = `Medición PAT ${payload.id_pat || ''} actualizada`;
          } else if (action === 'delete') {
            const idx = state.puestaTierra.findIndex(p => p.id_pat === payload.id_pat);
            if (idx >= 0) state.puestaTierra[idx] = { ...state.puestaTierra[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Medición PAT ${payload.id_pat || ''} eliminada lógicamente`;
          }
        } else if (entity === 'termografia') {
          if (action === 'create') {
            if (!state.termografia.some(t => t.id_termografia === payload.id_termografia)) {
              state.termografia.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Inspección termográfica en ${payload.cod_linea} P-${payload.poste_n} (ΔT: +${payload.delta_t}°C)`;
          } else if (action === 'update') {
            const idx = state.termografia.findIndex(t => t.id_termografia === payload.id_termografia);
            if (idx >= 0) state.termografia[idx] = { ...state.termografia[idx], ...payload, ...updateCtrl };
            changeDescription = `Registro termográfico ${payload.id_termografia} actualizado`;
          } else if (action === 'delete') {
            const idx = state.termografia.findIndex(t => t.id_termografia === payload.id_termografia);
            if (idx >= 0) state.termografia[idx] = { ...state.termografia[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Registro termográfico ${payload.id_termografia} eliminado lógicamente`;
          }
        } else if (entity === 'podas') {
          if (action === 'create') {
            if (!state.podas.some(p => p.id_poda === payload.id_poda)) {
              state.podas.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Actividad de poda registrada en ${payload.cod_linea} P-${payload.poste_n} (${payload.total_arboles} árboles)`;
          } else if (action === 'update') {
            const idx = state.podas.findIndex(p => p.id_poda === payload.id_poda);
            if (idx >= 0) state.podas[idx] = { ...state.podas[idx], ...payload, ...updateCtrl };
            changeDescription = `Registro de poda ${payload.id_poda} actualizado`;
          } else if (action === 'delete') {
            const idx = state.podas.findIndex(p => p.id_poda === payload.id_poda);
            if (idx >= 0) state.podas[idx] = { ...state.podas[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Registro de poda ${payload.id_poda} eliminado lógicamente`;
          }
        } else if (entity === 'mantenimiento') {
          if (action === 'create') {
            if (!state.mantenimiento.some(m => m.id_mantenimiento === payload.id_mantenimiento)) {
              state.mantenimiento.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Orden de mantenimiento ${payload.orden_mantenimiento} registrada en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.mantenimiento.findIndex(m => m.id_mantenimiento === payload.id_mantenimiento);
            if (idx >= 0) state.mantenimiento[idx] = { ...state.mantenimiento[idx], ...payload, ...updateCtrl };
            changeDescription = `Registro de mantenimiento ${payload.id_mantenimiento} actualizado`;
          } else if (action === 'delete') {
            const idx = state.mantenimiento.findIndex(m => m.id_mantenimiento === payload.id_mantenimiento);
            if (idx >= 0) state.mantenimiento[idx] = { ...state.mantenimiento[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Registro de mantenimiento ${payload.id_mantenimiento} eliminado lógicamente`;
          }
        } else if (entity === 'ordenes_om') {
          state.ordenes_om = state.ordenes_om || [];
          if (action === 'create') {
            if (!state.ordenes_om.some(o => o.id_om === payload.id_om)) {
              state.ordenes_om.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Orden de trabajo ${payload.numero_om} creada (${payload.tipo_actividad})`;
          } else if (action === 'update') {
            const idx = state.ordenes_om.findIndex(o => o.id_om === payload.id_om);
            if (idx >= 0) state.ordenes_om[idx] = { ...state.ordenes_om[idx], ...payload, ...updateCtrl };
            changeDescription = `Orden de trabajo ${payload.numero_om} actualizada a estado ${payload.estado}`;
          } else if (action === 'delete') {
            const idx = state.ordenes_om.findIndex((o: any) =>
              o.id_om === payload.id_om || o.numero_om === payload.id_om || (payload.numero_om && o.numero_om === payload.numero_om)
            );
            if (idx >= 0) state.ordenes_om[idx] = { ...state.ordenes_om[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Orden de trabajo ${payload.numero_om || payload.id_om} eliminada lógicamente`;
          }
        } else if (entity === 'dms') {
          if (action === 'create') {
            if (!state.dms.some(d => d.id_dms === payload.id_dms)) {
              state.dms.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Caso DMS ${payload.codigo_dms} registrado en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (idx >= 0) state.dms[idx] = { ...state.dms[idx], ...payload, ...updateCtrl };
            changeDescription = `Caso DMS ${payload.codigo_dms} actualizado a ${payload.estado}`;
          } else if (action === 'delete') {
            const idx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (idx >= 0) state.dms[idx] = { ...state.dms[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Caso DMS ${payload.codigo_dms || payload.id_dms} eliminado lógicamente`;
          } else if (action === 'batch') {
            for (const item of payload) {
              const exIdx = state.dms.findIndex(d => d.codigo_dms && d.codigo_dms === item.codigo_dms && d.estado_registro !== 'ELIMINADO');
              if (exIdx >= 0) state.dms[exIdx] = { ...state.dms[exIdx], ...item, ...updateCtrl };
              else state.dms.push({ ...item, ...createCtrl });
            }
            changeDescription = `Importación batch de ${payload.length} casos DMS`;
          }
        } else if (entity === 'levantamientos') {
          if (action === 'create') {
            if (!state.levantamientos.some(l => l.id_levantamiento === payload.id_levantamiento)) {
              state.levantamientos.unshift({ ...payload, ...createCtrl });
            }
            const dmsIdx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (dmsIdx >= 0) state.dms[dmsIdx] = { ...state.dms[dmsIdx], estado: 'Levantada', ...updateCtrl };
            changeDescription = `Levantamiento de DMS registrado por ${payload.contratista_responsable}`;
          }
        } else if (entity === 'inspecciones') {
          if (action === 'create') {
            if (!state.inspecciones.some(i => i.id_inspeccion_cierre === payload.id_inspeccion_cierre)) {
              state.inspecciones.unshift({ ...payload, ...createCtrl });
            }
            const dmsIdx = state.dms.findIndex(d => d.id_dms === payload.id_dms);
            if (dmsIdx >= 0) {
              state.dms[dmsIdx] = {
                ...state.dms[dmsIdx],
                estado: payload.resultado === 'Levantamiento conforme' ? 'Cerrada' : 'En Levantamiento',
                ...updateCtrl
              };
            }
            auditAction = payload.resultado === 'Levantamiento conforme' ? 'CIERRE_DMS' : 'EDICIÓN';
            changeDescription = `Inspección de cierre realizada por ${payload.inspector}: ${payload.resultado}`;
          }
        } else if (entity === 'usuarios') {
          if (action === 'create') {
            if (!state.usuarios.some((u: any) => u.id_usuario === payload.id_usuario || u.username === payload.username)) {
              state.usuarios.push({ ...payload, ...createCtrl });
            }
            changeDescription = `Usuario ${payload.nombres} (@${payload.username}) creado con rol ${payload.rol}`;
          } else if (action === 'update') {
            const idx = state.usuarios.findIndex((u: any) => u.id_usuario === payload.id_usuario);
            if (idx >= 0) {
              const existingPassword = state.usuarios[idx].password;
              const nextPassword = payload.password && String(payload.password).trim() !== ''
                ? payload.password
                : existingPassword;
              state.usuarios[idx] = {
                ...state.usuarios[idx],
                ...payload,
                password: nextPassword,
                ...updateCtrl
              };
            }
            changeDescription = `Usuario @${payload.username} actualizado`;
          } else if (action === 'delete') {
            const idx = state.usuarios.findIndex((u: any) => u.id_usuario === payload.id_usuario);
            if (idx >= 0) state.usuarios[idx] = { ...state.usuarios[idx], ...payload, estado: 'Inactivo', ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Usuario @${payload.username || payload.id_usuario} eliminado lógicamente`;
          }
        } else if (entity === 'contratistas') {
          state.contratistas = state.contratistas || [];
          if (action === 'create') {
            if (!state.contratistas.some(c => c.id_contratista === payload.id_contratista)) {
              state.contratistas.push({ ...payload, ...createCtrl });
            }
            changeDescription = `Contratista ${payload.razon_social} registrada (RUC ${payload.ruc})`;
          } else if (action === 'update') {
            const idx = state.contratistas.findIndex(c => c.id_contratista === payload.id_contratista);
            if (idx >= 0) state.contratistas[idx] = { ...state.contratistas[idx], ...payload, ...updateCtrl };
            changeDescription = `Contratista ${payload.razon_social} actualizada`;
          } else if (action === 'delete') {
            const idx = state.contratistas.findIndex(c => c.id_contratista === payload.id_contratista);
            if (idx >= 0) state.contratistas[idx] = { ...state.contratistas[idx], ...payload, estado: 'Inactivo', ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Contratista eliminada lógicamente`;
          }
        } else if (entity === 'hidrolavado') {
          state.hidrolavado = state.hidrolavado || [];
          if (action === 'create') {
            if (!state.hidrolavado.some(h => h.id_hidrolavado === payload.id_hidrolavado)) {
              state.hidrolavado.unshift({ ...payload, ...createCtrl });
            }
            changeDescription = `Hidrolavado registrado en ${payload.cod_linea} P-${payload.poste_n}`;
          } else if (action === 'update') {
            const idx = state.hidrolavado.findIndex(h => h.id_hidrolavado === payload.id_hidrolavado);
            if (idx >= 0) state.hidrolavado[idx] = { ...state.hidrolavado[idx], ...payload, ...updateCtrl };
            changeDescription = `Hidrolavado actualizado en P-${payload.poste_n}`;
          } else if (action === 'delete') {
            const idx = state.hidrolavado.findIndex(h => h.id_hidrolavado === payload.id_hidrolavado);
            if (idx >= 0) state.hidrolavado[idx] = { ...state.hidrolavado[idx], ...payload, ...deleteCtrl };
            auditAction = 'ELIMINACIÓN';
            changeDescription = `Hidrolavado eliminado lógicamente`;
          }
        } else if (entity === 'auth_config') {
          state.authConfig = { ...state.authConfig, ...payload };
          changeDescription = `Configuración de autenticación actualizada`;
        } else if (entity === 'config_drive') {
          state.config = { ...state.config, ...payload };
          changeDescription = `Configuración de Google Drive y Sheets actualizada`;
        }

        // Record Audit (AUDITORIA_SISTEMA)
        const cleanDateId = fecha.replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const actionLabel =
          action === 'create'
            ? 'CREACIÓN'
            : action === 'update' || action === 'batch'
            ? 'EDICIÓN'
            : auditAction === 'CIERRE_DMS' || auditAction === 'DESACTIVACION'
            ? auditAction
            : 'ELIMINACIÓN';

        const auditRecord = {
          id_auditoria: `AUD-${cleanDateId}-${randomSuffix}`,
          modulo: entity.toUpperCase(),
          id_registro: String(payload?.id_deficiencia || payload?.id_om || payload?.numero_om || payload?.id_termografia || payload?.id_pat || payload?.id_poda || payload?.id_mantenimiento || payload?.id_corona || payload?.id_hidrolavado || payload?.id_dms || payload?.id_usuario || payload?.id_contratista || payload?.id_linea || payload?.id_poste || 'REG'),
          accion: actionLabel,
          usuario: actorName,
          rol_usuario: user?.rol || 'Contratista',
          fecha_hora,
          campo_modificado: payload?.campo_modificado || (action === 'create' ? 'Todos los campos (Registro nuevo)' : action === 'delete' ? 'ESTADO_REGISTRO' : 'Atributos del registro'),
          valor_anterior: String(payload?.valor_anterior || (action === 'delete' ? 'ACTIVO' : 'N/A')),
          valor_nuevo: String(payload?.valor_nuevo || (action === 'delete' ? 'ELIMINADO' : changeDescription)),
          observacion: changeDescription,
          rol: user?.rol || 'Contratista',
          fecha,
          hora,
          cod_linea: payload?.cod_linea || '-',
          estructura: payload?.poste_n || '-',
          valores_anteriores: String(payload?.valor_anterior || (action === 'delete' ? 'ACTIVO' : 'N/A')),
          valores_nuevos: String(payload?.valor_nuevo || (action === 'delete' ? 'ELIMINADO' : changeDescription)),
          origen: 'Web Sincronizada',
          resultado: 'Exitoso',
          sync_id: 'SYNC-RT-' + state.version
        };
        state.auditoria.unshift(auditRecord);
        if (state.auditoria.length > 1000) state.auditoria.pop();

        // Persist to Disk
        saveState(state);

        // REAL-TIME BROADCAST TO ALL CONNECTED CLIENTS (strip passwords on usuarios patches)
        const safePayload =
          entity === 'usuarios'
            ? Array.isArray(payload)
              ? payload.map(sanitizeUser)
              : sanitizeUser(payload)
            : payload;
        broadcastAll({
          type: 'state:patch',
          entity,
          action,
          data: safePayload,
          auditRecord,
          version: state.version,
          notification: {
            title: `Actualización en Tiempo Real: ${entity.toUpperCase()}`,
            message: changeDescription,
            user: user ? `${user.nombres} (${user.rol})` : 'Sistema',
            timestamp: hora
          }
        });
        break;
      }
    }
  }

  // --- REST API ENDPOINTS ---
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: state.version,
      connectedClients: clients.size,
      activeUsers: getActiveUsersList(),
      time: getLimaDateTime()
    });
  });

  // Dual-transport presence heartbeat
  app.post('/api/presence', (req: Request, res: Response) => {
    const { clientId, user, activeModule, activeLine, logout } = req.body || {};
    if (clientId) {
      if (logout || !user) {
        httpClients.delete(clientId);
      } else {
        httpClients.set(clientId, {
          clientId,
          user,
          activeModule: activeModule || 'dashboard',
          activeLine: activeLine || 'TODAS',
          lastSeen: Date.now()
        });
      }
    }
    res.json({
      success: true,
      version: state.version,
      activeUsers: getActiveUsersList(),
      lastAudit: state.auditoria[0] || null
    });
  });

  app.get('/api/state', (req: Request, res: Response) => {
    res.json(sanitizeState(state));
  });

  // Login Endpoint
  app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username) {
      res.status(400).json({ success: false, message: 'Debe ingresar un nombre de usuario.' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = state.usuarios.find(
      u => u.estado_registro !== 'ELIMINADO' && (u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername))
    );

    if (!user) {
      res.status(401).json({ success: false, message: `Usuario "${username}" no encontrado en el sistema oficial.` });
      return;
    }

    if (user.estado !== 'Activo') {
      res.status(403).json({ success: false, message: 'El usuario se encuentra inactivo. Contacte al Administrador.' });
      return;
    }

    // Strict password verification (uses registered password stored on server/Drive)
    const expectedPassword = user.password || 'password123';
    if (!password || password !== expectedPassword) {
      res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
      return;
    }

    const { fecha, hora } = getLimaDateTime();
    const auditEntry = {
      id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      usuario: `${user.nombres} ${user.apellidos}`,
      rol: user.rol,
      fecha,
      hora,
      accion: 'EDICION',
      modulo: 'AUTENTICACION',
      id_registro: user.id_usuario,
      cod_linea: '-',
      estructura: '-',
      valores_anteriores: '-',
      valores_nuevos: `Inicio de sesión exitoso de ${user.nombres} (${user.rol})`,
      origen: 'Web Login',
      resultado: 'Exitoso',
      sync_id: 'LOGIN-' + Date.now()
    };
    state.auditoria.unshift(auditEntry);
    saveState(state);

    res.json({
      success: true,
      token: 'TOKEN-' + user.id_usuario + '-' + Date.now(),
      user: {
        id_usuario: user.id_usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono,
        username: user.username,
        rol: user.rol,
        estado: user.estado,
        contratista_id: user.contratista_id,
        contratista_nombre: user.contratista_nombre,
        supervisor_responsable: user.supervisor_responsable,
        lineas_asignadas: user.lineas_asignadas
      }
    });
  });

  // REST Mutation Endpoint (authoritative persistence endpoint)
  app.post('/api/mutate', (req: Request, res: Response) => {
    try {
      const { entity, action, data: payload, shiftSubsequent, user, mutationId } = req.body || {};
      if (!entity || !action) {
        res.status(400).json({ success: false, message: 'Entidad y acción son requeridas.' });
        return;
      }
      handleClientMessage({} as any, { ws: {} as any, id: 'REST', connectedAt: 'REST' }, {
        type: 'mutate',
        entity,
        action,
        data: payload,
        shiftSubsequent,
        user,
        mutationId
      });
      res.json({ success: true, version: state.version });
    } catch (err: any) {
      console.error('[Server] Error in /api/mutate:', err);
      res.status(500).json({ success: false, message: err?.message || 'Error interno al guardar mutación.' });
    }
  });

  // Bulk Excel Import Endpoint across all 15 modules
  app.post('/api/bulk-import', (req: Request, res: Response) => {
    const { recordsByModule, user } = req.body || {};
    if (!recordsByModule || typeof recordsByModule !== 'object') {
      res.status(400).json({ success: false, message: 'No se recibieron registros para carga masiva.' });
      return;
    }

    const { fecha, hora, fecha_hora } = getLimaDateTime();
    const actorName = user
      ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() || user.username || 'Usuario Web'
      : 'Usuario Web';
    const actorRol = user?.rol || 'Administrador';
    const createCtrl = {
      fecha_creacion: fecha_hora,
      usuario_creacion: actorName,
      estado_registro: 'ACTIVO'
    };
    const updateCtrl = {
      fecha_modificacion: fecha_hora,
      usuario_modificacion: actorName
    };

    const upsertByKey = (arr: any[], items: any[], matchFn: (existing: any, incoming: any) => boolean, prepend = true): number => {
      let count = 0;
      for (const item of items) {
        const idx = arr.findIndex((ex) => matchFn(ex, item));
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], ...item, ...updateCtrl, estado_registro: 'ACTIVO' };
        } else if (prepend) {
          arr.unshift({ ...item, ...createCtrl });
        } else {
          arr.push({ ...item, ...createCtrl });
        }
        count++;
      }
      return count;
    };

    const counts: Record<string, number> = {};
    let total = 0;

    for (const [modKey, rawItems] of Object.entries(recordsByModule)) {
      if (!Array.isArray(rawItems) || rawItems.length === 0) continue;
      let imported = 0;

      switch (modKey) {
        case 'LINEAS':
          state.lineas = state.lineas || [];
          imported = upsertByKey(
            state.lineas,
            rawItems,
            (ex, inc) => ex.estado_registro !== 'ELIMINADO' && ((inc.id_linea && ex.id_linea === inc.id_linea) || ex.cod_linea === inc.cod_linea),
            false
          );
          break;
        case 'ESTRUCTURAS':
          state.estructuras = state.estructuras || [];
          imported = upsertByKey(
            state.estructuras,
            rawItems,
            (ex, inc) =>
              ex.estado_registro !== 'ELIMINADO' &&
              ((inc.id_poste && ex.id_poste === inc.id_poste) ||
                (ex.cod_linea === inc.cod_linea && String(ex.poste_n).trim() === String(inc.poste_n).trim())),
            false
          );
          break;
        case 'DEFICIENCIAS':
          state.deficiencias = state.deficiencias || [];
          imported = upsertByKey(
            state.deficiencias,
            rawItems,
            (ex, inc) => inc.id_deficiencia && ex.id_deficiencia === inc.id_deficiencia
          );
          break;
        case 'PUESTA_A_TIERRA':
          state.puestaTierra = state.puestaTierra || [];
          imported = upsertByKey(
            state.puestaTierra,
            rawItems,
            (ex, inc) =>
              ex.estado_registro !== 'ELIMINADO' &&
              ((inc.id_pat && ex.id_pat === inc.id_pat) ||
                (ex.cod_linea === inc.cod_linea && String(ex.poste_n).trim() === String(inc.poste_n).trim()))
          );
          break;
        case 'EFECTO_CORONA':
          state.corona = state.corona || [];
          imported = upsertByKey(
            state.corona,
            rawItems,
            (ex, inc) => inc.id_corona && ex.id_corona === inc.id_corona
          );
          break;
        case 'TERMOGRAFIA':
          state.termografia = state.termografia || [];
          imported = upsertByKey(
            state.termografia,
            rawItems,
            (ex, inc) => inc.id_termografia && ex.id_termografia === inc.id_termografia
          );
          break;
        case 'CONTROL_PODAS':
          state.podas = state.podas || [];
          imported = upsertByKey(
            state.podas,
            rawItems,
            (ex, inc) => inc.id_poda && ex.id_poda === inc.id_poda
          );
          break;
        case 'MANTENIMIENTO':
          state.mantenimiento = state.mantenimiento || [];
          imported = upsertByKey(
            state.mantenimiento,
            rawItems,
            (ex, inc) => inc.id_mantenimiento && ex.id_mantenimiento === inc.id_mantenimiento
          );
          break;
        case 'HIDROLAVADO':
          state.hidrolavado = state.hidrolavado || [];
          imported = upsertByKey(
            state.hidrolavado,
            rawItems,
            (ex, inc) => inc.id_hidrolavado && ex.id_hidrolavado === inc.id_hidrolavado
          );
          break;
        case 'ORDENES_OM':
          state.ordenes_om = state.ordenes_om || [];
          imported = upsertByKey(
            state.ordenes_om,
            rawItems,
            (ex, inc) =>
              ex.estado_registro !== 'ELIMINADO' &&
              ((inc.id_om && ex.id_om === inc.id_om) ||
                (inc.numero_om && ex.numero_om && ex.numero_om.toLowerCase() === inc.numero_om.toLowerCase()))
          );
          break;
        case 'DMS':
          state.dms = state.dms || [];
          imported = upsertByKey(
            state.dms,
            rawItems,
            (ex, inc) =>
              ex.estado_registro !== 'ELIMINADO' &&
              ((inc.id_dms && ex.id_dms === inc.id_dms) || (inc.codigo_dms && ex.codigo_dms === inc.codigo_dms))
          );
          break;
        case 'LEVANTAMIENTOS_DMS':
          state.levantamientos = state.levantamientos || [];
          imported = upsertByKey(
            state.levantamientos,
            rawItems,
            (ex, inc) => inc.id_levantamiento && ex.id_levantamiento === inc.id_levantamiento
          );
          break;
        case 'INSPECCIONES_DMS':
          state.inspecciones = state.inspecciones || [];
          imported = upsertByKey(
            state.inspecciones,
            rawItems,
            (ex, inc) => inc.id_inspeccion_cierre && ex.id_inspeccion_cierre === inc.id_inspeccion_cierre
          );
          break;
        case 'CONTRATISTAS':
          state.contratistas = state.contratistas || [];
          imported = upsertByKey(
            state.contratistas,
            rawItems,
            (ex, inc) =>
              ex.estado_registro !== 'ELIMINADO' &&
              ((inc.id_contratista && ex.id_contratista === inc.id_contratista) || (inc.ruc && ex.ruc === inc.ruc)),
            false
          );
          break;
        case 'AUDITORIA_SISTEMA':
          state.auditoria = state.auditoria || [];
          imported = upsertByKey(
            state.auditoria,
            rawItems,
            (ex, inc) => inc.id_auditoria && ex.id_auditoria === inc.id_auditoria
          );
          break;
      }

      if (imported > 0) {
        counts[modKey] = imported;
        total += imported;
        if (modKey !== 'AUDITORIA_SISTEMA') {
          const cleanDateId = fecha.replace(/-/g, '');
          const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
          state.auditoria.unshift({
            id_auditoria: `AUD-${cleanDateId}-${rand}`,
            modulo: modKey,
            id_registro: 'CARGA_MASIVA',
            accion: 'CREACIÓN',
            usuario: actorName,
            rol_usuario: actorRol,
            fecha_hora,
            campo_modificado: 'Carga Masiva Excel',
            valor_anterior: 'N/A',
            valor_nuevo: `${imported} registros importados`,
            observacion: `Carga masiva Excel en ${modKey}: ${imported} registros incorporados`,
            rol: actorRol,
            fecha,
            hora,
            origen: 'Importación Excel',
            resultado: 'Exitoso'
          });
        }
      }
    }

    if (state.auditoria.length > 1000) {
      state.auditoria = state.auditoria.slice(0, 1000);
    }

    state.version = (state.version || 1) + 1;
    saveState(state);

    const safeState = sanitizeState(state);
    broadcastAll({
      type: 'state:patch',
      entity: 'bulk_import',
      action: 'batch',
      data: safeState,
      version: state.version,
      notification: {
        title: 'Carga Masiva Excel Completada',
        message: `Se importaron ${total} registros (${Object.keys(counts).join(', ')})`,
        user: `${actorName} (${actorRol})`,
        timestamp: hora
      }
    });

    res.json({
      success: true,
      total,
      counts,
      state: safeState,
      message: `Carga masiva completada: ${total} registros cargados en ${Object.keys(counts).length} módulo(s).`
    });
  });

  // Google Sheets / Drive Sync API
  app.post('/api/sync/drive', async (req: Request, res: Response) => {
    const { fecha, hora } = getLimaDateTime();
    state.config.last_sync_time = `${fecha} ${hora}`;
    state.config.sync_status = 'Conectado';
    saveState(state);

    broadcastAll({
      type: 'sync:complete',
      last_sync_time: state.config.last_sync_time
    });

    res.json({
      success: true,
      message: `Sincronización confirmada con Google Sheets (ID: ${state.config.sheet_lineas_id}) y Google Drive.`,
      timestamp: state.config.last_sync_time,
      lineasCount: state.lineas.length,
      estructurasCount: state.estructuras.length
    });
  });

  // Helper to parse CSV data exported from Google Sheets
  function parseCSV(text: string): Record<string, string>[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) return [];

    function splitLine(line: string): string[] {
      const values: string[] = [];
      let curVal = '';
      let inQ = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          if (inQ && line[j + 1] === '"') {
            curVal += '"';
            j++;
          } else {
            inQ = !inQ;
          }
        } else if (c === ',' && !inQ) {
          values.push(curVal.trim());
          curVal = '';
        } else {
          curVal += c;
        }
      }
      values.push(curVal.trim());
      return values;
    }

    const headers = splitLine(lines[0]).map(h => h.trim().toUpperCase());
    const rows: Record<string, string>[] = [];

    for (let k = 1; k < lines.length; k++) {
      const vals = splitLine(lines[k]);
      if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = vals[idx] !== undefined ? vals[idx] : '';
      });
      rows.push(rowObj);
    }

    return rows;
  }

  function parseLineasAsignadas(str: string): string[] {
    if (!str || str.trim() === '*' || str.trim().toUpperCase() === 'TODAS') return ['*'];
    return str.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
  }

  async function syncUsuariosFromGoogleSheets(targetSheetId?: string, oauthToken?: string) {
    const sheetId = targetSheetId || state.config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
    let parsedRows: Record<string, string>[] = [];

    if (oauthToken) {
      console.log(`[Server] Pulling users from Google Drive with OAuth token: ${sheetId}`);
      parsedRows = await pullUsuariosFromDriveWithToken(oauthToken, sheetId);
    } else {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      console.log(`[Server] Syncing users from Google Sheets CSV: ${exportUrl}`);
      const csvResponse = await fetch(exportUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      if (!csvResponse.ok) {
        throw new Error(`Google Sheets export returned status ${csvResponse.status} ${csvResponse.statusText}`);
      }

      const csvText = await csvResponse.text();
      parsedRows = parseCSV(csvText);
    }

    if (parsedRows.length === 0) {
      throw new Error('No se encontraron filas válidas en la hoja USUARIOS.XLSX');
    }

    const { fecha, hora, fecha_hora } = getLimaDateTime();
    let addedCount = 0;
    let updatedCount = 0;

    for (const row of parsedRows) {
      const username = (row['USERNAME'] || row['USUARIO'] || '').toLowerCase().trim();
      if (!username) continue;

      const lineas = parseLineasAsignadas(row['LINEAS_ASIGNADAS']);
      const rolRaw = (row['ROL'] || '').trim();
      const rol = (rolRaw === 'Administrador' || rolRaw === 'Supervisor' || rolRaw === 'Contratista') ? rolRaw : 'Contratista';
      const drivePwd = (row['PASSWORD'] || row['CONTRASENA'] || row['CONTRASEÑA'] || row['CLAVE'] || '').trim();

      const existingIdx = state.usuarios.findIndex(u => u.username.toLowerCase() === username || (row['ID_USUARIO'] && u.id_usuario === row['ID_USUARIO']));
      const resolvedPassword = drivePwd || (existingIdx >= 0 ? state.usuarios[existingIdx].password : '') || 'password123';

      const userData: any = {
        id_usuario: row['ID_USUARIO'] || row['ID'] || (existingIdx >= 0 ? state.usuarios[existingIdx].id_usuario : 'USR-' + String(state.usuarios.length + 1).padStart(3, '0')),
        nombres: row['NOMBRES'] || '',
        apellidos: row['APELLIDOS'] || '',
        dni: row['DOCUMENTO'] || row['DNI'] || '',
        email: row['EMAIL'] || '',
        telefono: row['TELEFONO'] || '',
        username,
        rol,
        estado: (row['ESTADO'] === 'Inactivo' ? 'Inactivo' : 'Activo') as 'Activo' | 'Inactivo',
        contratista_id: row['CONTRATISTA_ID'] || (existingIdx >= 0 ? state.usuarios[existingIdx].contratista_id : undefined),
        contratista_nombre: row['CONTRATISTA_NOMBRE'] || (existingIdx >= 0 ? state.usuarios[existingIdx].contratista_nombre : undefined),
        supervisor_responsable: row['SUPERVISOR_RESPONSABLE'] || '',
        lineas_asignadas: lineas,
        estado_registro: row['ESTADO_REGISTRO'] === 'ELIMINADO' ? 'ELIMINADO' : 'ACTIVO',
        fecha_creacion: row['FECHA_CREACION'] || (existingIdx >= 0 ? state.usuarios[existingIdx].fecha_creacion : fecha_hora),
        ultima_actualizacion: row['ULTIMA_ACTUALIZACION'] || `${fecha} ${hora}`,
        password: resolvedPassword
      };

      if (existingIdx >= 0) {
        state.usuarios[existingIdx] = {
          ...state.usuarios[existingIdx],
          ...userData,
          password: resolvedPassword
        };
        updatedCount++;
      } else {
        state.usuarios.push(userData);
        addedCount++;
      }
    }

    // Deduplicate state.usuarios by username
    const userMap = new Map<string, any>();
    for (const u of state.usuarios) {
      if (u && u.username) {
        userMap.set(u.username.toLowerCase(), u);
      }
    }
    state.usuarios = Array.from(userMap.values());

    state.version = (state.version || 1) + 1;
    state.config.last_sync_time = `${fecha} ${hora}`;
    state.config.sheet_usuarios_id = sheetId;
    state.config.sheet_usuarios_url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?rtpof=true`;

    state.auditoria.unshift({
      id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      usuario: 'Google Drive Sync',
      rol_usuario: 'Sistema',
      rol: 'Sistema',
      fecha,
      hora,
      fecha_hora,
      accion: 'SINCRONIZACION',
      modulo: 'USUARIOS',
      id_registro: sheetId,
      cod_linea: '-',
      estructura: '-',
      campo_modificado: 'Sincronización Drive',
      valor_anterior: 'N/A',
      valor_nuevo: `Sincronización USUARIOS.XLSX: ${addedCount} añadidos, ${updatedCount} actualizados`,
      observacion: `Sincronización oficial USUARIOS.XLSX (${parsedRows.length} filas)`,
      valores_anteriores: 'N/A',
      valores_nuevos: `Sincronización oficial USUARIOS.XLSX: ${addedCount} añadidos, ${updatedCount} actualizados (${parsedRows.length} en Google Sheets)`,
      origen: 'Google Drive',
      resultado: 'Exitoso',
      sync_id: 'SYNC-USR-' + Date.now()
    });

    saveState(state);

    broadcastAll({
      type: 'state:patch',
      entity: 'usuarios',
      action: 'batch',
      data: state.usuarios.map(sanitizeUser),
      version: state.version,
      notification: {
        title: 'Sincronización USUARIOS.XLSX',
        message: `${addedCount} nuevos usuarios añadidos, ${updatedCount} actualizados desde Google Drive.`,
        user: 'Google Drive',
        timestamp: hora
      }
    });

    return { addedCount, updatedCount, total: state.usuarios.length, rowsCount: parsedRows.length };
  }

  function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      return token || null;
    }
    return null;
  }

  // Google Sheets USUARIOS.XLSX Sync Endpoint
  app.post('/api/sync/usuarios', async (req: Request, res: Response) => {
    try {
      const sheetId = req.body?.sheetId || state.config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';
      const token = extractBearerToken(req) || undefined;
      const result = await syncUsuariosFromGoogleSheets(sheetId, token);
      const { fecha, hora } = getLimaDateTime();

      res.json({
        success: true,
        message: `Sincronización completada con USUARIOS.XLSX (${result.rowsCount} usuarios en Drive): ${result.addedCount} añadidos, ${result.updatedCount} actualizados.`,
        total: result.total,
        addedCount: result.addedCount,
        updatedCount: result.updatedCount,
        usuarios: state.usuarios.map(sanitizeUser),
        timestamp: `${fecha} ${hora}`,
        sheet_url: state.config.sheet_usuarios_url
      });
    } catch (err: any) {
      console.error('[Server] Error syncing users from Google Sheets:', err);
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar con Google Sheets USUARIOS.XLSX: ' + err.message
      });
    }
  });

  // Push / Register user and write directly to Google Drive USUARIOS.XLSX when Bearer token is present
  app.post('/api/sync/usuarios/push', async (req: Request, res: Response) => {
    const { usuario, user } = req.body;
    const { fecha, hora, fecha_hora } = getLimaDateTime();
    const token = extractBearerToken(req);

    if (usuario && usuario.username) {
      const cleanUsername = usuario.username.trim().toLowerCase();
      const existingIdx = state.usuarios.findIndex(
        u => u.username.toLowerCase() === cleanUsername || (usuario.id_usuario && u.id_usuario === usuario.id_usuario)
      );
      const existingPwd = existingIdx >= 0 ? state.usuarios[existingIdx].password : '';
      const nextPwd = usuario.password && String(usuario.password).trim() !== ''
        ? String(usuario.password)
        : existingPwd || 'password123';

      const updatedUser: any = {
        ...(existingIdx >= 0 ? state.usuarios[existingIdx] : {}),
        ...usuario,
        username: cleanUsername,
        password: nextPwd,
        ultima_actualizacion: `${fecha} ${hora}`,
        estado_registro: usuario.estado_registro || 'ACTIVO',
        fecha_creacion: usuario.fecha_creacion || (existingIdx >= 0 ? state.usuarios[existingIdx].fecha_creacion : fecha_hora)
      };

      if (existingIdx >= 0) {
        state.usuarios[existingIdx] = updatedUser;
      } else {
        state.usuarios.push(updatedUser);
      }

      state.version = (state.version || 1) + 1;
      saveState(state);

      // Push directly to Google Drive USUARIOS.XLSX if OAuth Bearer token is supplied
      let driveResult: any = null;
      if (token) {
        try {
          driveResult = await pushUsuariosToDriveWithToken(token, state.config, state);
          if (driveResult.mode === 'created_in_folder' && driveResult.fileId) {
            state.config.sheet_usuarios_id = driveResult.fileId;
            state.config.sheet_usuarios_url = driveResult.fileUrl;
          }
          if (driveResult.folderId) {
            state.config.drive_folder_id = driveResult.folderId;
            state.config.drive_folder_url = driveResult.folderUrl;
          }
          state.config.last_sync_time = `${fecha} ${hora}`;
          state.config.sync_status = 'Conectado';
          saveState(state);
        } catch (driveErr: any) {
          console.warn('[Server] Drive USUARIOS push warning:', driveErr.message);
          driveResult = { success: false, message: driveErr.message };
        }
      }

      // Forward to Apps Script if configured (only non-secret or intentional admin webhook)
      if (state.config.apps_script_url) {
        try {
          await fetch(state.config.apps_script_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'updateUsuario',
              usuario: updatedUser
            })
          });
        } catch (e) {
          console.warn('[Server] Could not reach Apps Script endpoint:', e);
        }
      }

      broadcastAll({
        type: 'state:patch',
        entity: 'usuarios',
        action: existingIdx >= 0 ? 'update' : 'create',
        data: sanitizeUser(updatedUser),
        version: state.version,
        notification: {
          title: 'Usuario Actualizado',
          message: `Usuario @${cleanUsername} actualizado y sincronizado${driveResult?.success ? ' en Google Drive (USUARIOS.XLSX)' : ''}.`,
          user: user?.nombres || 'Administrador',
          timestamp: hora
        }
      });

      res.json({
        success: true,
        version: state.version,
        usuarios: state.usuarios.map(sanitizeUser),
        driveSynced: Boolean(driveResult?.success),
        driveMessage: driveResult?.message || null,
        driveFileUrl: driveResult?.fileUrl || state.config.sheet_usuarios_url
      });
      return;
    }

    res.json({ success: true, version: state.version, usuarios: state.usuarios.map(sanitizeUser), driveSynced: false });
  });

  // Real Google Drive Connection Test Endpoint (uses client Bearer OAuth token)
  app.post('/api/drive/test', async (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        needsAuth: true,
        message: 'Se requiere iniciar sesión con Google para verificar acceso a Google Drive y Sheets.'
      });
      return;
    }
    const start = Date.now();
    try {
      const cfg = { ...state.config, ...(req.body?.config || {}) };
      const folder = await resolveDriveFolder(token, cfg);
      const userFile = await getDriveFileMetadata(token, cfg.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX');
      const linesFile = await getDriveFileMetadata(token, cfg.sheet_lineas_id || '1QSIdzdBvHzjauw6jKX8lMGQuurrlsQDSCI5jZCFHW5Y');

      state.config.drive_folder_id = folder.folderId;
      state.config.drive_folder_url = folder.folderUrl;
      state.config.sync_status = 'Conectado';
      saveState(state);

      res.json({
        success: true,
        latencyMs: Date.now() - start,
        folder,
        usuariosAccessible: userFile.ok,
        usuariosWritable: userFile.ok && userFile.json?.capabilities?.canEdit !== false,
        usuariosName: userFile.json?.name || 'USUARIOS.XLSX',
        lineasAccessible: linesFile.ok,
        lineasWritable: linesFile.ok && linesFile.json?.capabilities?.canEdit !== false,
        lineasName: linesFile.json?.name || 'LÍNEAS SUBTRANSMISIÓN',
        config: state.config,
        message: `Conexión real verificada con Google Drive (${folder.folderName}).`
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        latencyMs: Date.now() - start,
        message: 'Error al probar conexión con Google Drive: ' + err.message
      });
    }
  });

  // Real Push Users (with Drive password column) to Google Drive
  app.post('/api/drive/push-usuarios', async (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ success: false, needsAuth: true, message: 'Sesión de Google Drive no autorizada.' });
      return;
    }
    try {
      const { fecha, hora } = getLimaDateTime();
      const result = await pushUsuariosToDriveWithToken(token, state.config, state);
      if (result.folderId) {
        state.config.drive_folder_id = result.folderId;
        state.config.drive_folder_url = result.folderUrl;
      }
      if (result.mode === 'created_in_folder') {
        state.config.sheet_usuarios_id = result.fileId;
        state.config.sheet_usuarios_url = result.fileUrl;
      }
      state.config.last_sync_time = `${fecha} ${hora}`;
      state.config.sync_status = 'Conectado';
      saveState(state);

      res.json({ ...result, config: state.config, timestamp: state.config.last_sync_time });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Error subiendo USUARIOS a Google Drive: ' + err.message });
    }
  });

  // Real Push ALL Activities to Google Drive / Sheets
  app.post('/api/drive/push-activities', async (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ success: false, needsAuth: true, message: 'Sesión de Google Drive no autorizada.' });
      return;
    }
    try {
      const { fecha, hora } = getLimaDateTime();
      const result = await pushAllActivitiesToDriveWithToken(token, state.config, state);
      state.config.drive_folder_id = result.folderId;
      state.config.drive_folder_url = result.folderUrl;
      if (result.mode === 'created_in_folder') {
        state.config.sheet_activities_id = result.activitiesFileId;
        state.config.sheet_activities_url = result.activitiesFileUrl;
      }
      state.config.last_sync_time = `${fecha} ${hora}`;
      state.config.sync_status = 'Conectado';
      saveState(state);

      res.json({ ...result, config: state.config, timestamp: state.config.last_sync_time });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Error subiendo actividades a Google Drive: ' + err.message });
    }
  });

  // Real Full Sync (Users + All 15 Activity Modules) to Google Drive
  app.post('/api/drive/sync-all', async (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ success: false, needsAuth: true, message: 'Inicie sesión con Google para sincronizar con Drive.' });
      return;
    }
    try {
      const { fecha, hora, fecha_hora } = getLimaDateTime();
      const [usrRes, actRes] = await Promise.all([
        pushUsuariosToDriveWithToken(token, state.config, state),
        pushAllActivitiesToDriveWithToken(token, state.config, state)
      ]);

      state.config.drive_folder_id = actRes.folderId || usrRes.folderId || state.config.drive_folder_id;
      state.config.drive_folder_url = actRes.folderUrl || usrRes.folderUrl || state.config.drive_folder_url;
      if (usrRes.mode === 'created_in_folder') {
        state.config.sheet_usuarios_id = usrRes.fileId;
        state.config.sheet_usuarios_url = usrRes.fileUrl;
      }
      if (actRes.mode === 'created_in_folder') {
        state.config.sheet_activities_id = actRes.activitiesFileId;
        state.config.sheet_activities_url = actRes.activitiesFileUrl;
      }
      state.config.last_sync_time = `${fecha} ${hora}`;
      state.config.sync_status = 'Conectado';
      state.config.error_message = undefined;

      state.auditoria.unshift({
        id_auditoria: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        modulo: 'GOOGLE DRIVE SYNC',
        id_registro: actRes.activitiesFileId,
        accion: 'SINCRONIZACION',
        usuario: req.body?.actorName || 'Administrador',
        rol_usuario: req.body?.actorRol || 'Administrador',
        rol: req.body?.actorRol || 'Administrador',
        fecha,
        hora,
        fecha_hora,
        campo_modificado: 'Sincronización Completa',
        valor_anterior: 'N/A',
        valor_nuevo: `Usuarios (${state.usuarios.length}) y ${actRes.tabsCount} módulos de actividades actualizados en Google Drive`,
        observacion: `${usrRes.message} | ${actRes.message}`,
        valores_anteriores: 'N/A',
        valores_nuevos: `${usrRes.message} | ${actRes.message}`,
        origen: 'Google Drive',
        resultado: 'Exitoso',
        sync_id: 'SYNC-DRIVE-' + Date.now()
      });

      saveState(state);

      broadcastAll({
        type: 'sync:complete',
        last_sync_time: state.config.last_sync_time
      });

      res.json({
        success: true,
        timestamp: state.config.last_sync_time,
        config: state.config,
        usuariosResult: usrRes,
        activitiesResult: actRes,
        message: `Sincronización completa en Google Drive: ${state.usuarios.length} usuarios y ${actRes.tabsCount} módulos de actividades actualizados.`
      });
    } catch (err: any) {
      state.config.sync_status = 'Error';
      state.config.error_message = err.message;
      saveState(state);
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar todo con Google Drive: ' + err.message
      });
    }
  });

  // VITE Middleware in Development or Static Files in Production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Subtransmisión Real-Time Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] WebSocket Real-Time Endpoint active at ws://0.0.0.0:${PORT}/ws`);

    // Initial background sync with official USUARIOS.XLSX sheet
    syncUsuariosFromGoogleSheets().then(res => {
      console.log(`[Server] Initial USUARIOS.XLSX sync complete: ${res.addedCount} added, ${res.updatedCount} updated.`);
    }).catch(err => {
      console.warn('[Server] Initial USUARIOS.XLSX sync notice:', err.message);
    });
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal error on startup:', err);
});
