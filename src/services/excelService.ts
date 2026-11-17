import * as XLSX from 'xlsx';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Poda,
  Mantenimiento,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  AuditoriaRegistro,
  Usuario,
  PuestaTierra,
  Termografia,
  OrdenMantenimiento,
  Contratista,
  Hidrolavado,
  ControlRegistro
} from '../types';

export class ExcelService {
  private static withControlFields(r: Partial<ControlRegistro>) {
    return {
      ESTADO_REGISTRO: r.estado_registro || 'ACTIVO',
      FECHA_CREACION: r.fecha_creacion || '-',
      USUARIO_CREACION: r.usuario_creacion || 'Sistema Central',
      FECHA_MODIFICACION: r.fecha_modificacion || '-',
      USUARIO_MODIFICACION: r.usuario_modificacion || '-',
      FECHA_ELIMINACION: r.fecha_eliminacion || '-',
      USUARIO_ELIMINACION: r.usuario_eliminacion || '-'
    };
  }

  /**
   * Helper to download tabular data as real, genuine .xlsx binary workbook
   */
  private static downloadExcelFile(data: Record<string, any>[], filename: string, sheetName = 'DATOS') {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar a Excel');
      return;
    }

    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const cleanSheetName = (sheetName || 'DATOS').substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');

    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

      // Generate real binary .xlsx array buffer
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', finalFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error generando archivo Excel (.xlsx):', err);
    }
  }

  // 1. Export Líneas
  static exportLineas(lineas: LineaSubtransmision[], filename = 'Registro_Lineas.xlsx') {
    const data = lineas.map(l => ({
      ID_LINEA: l.id_linea,
      COD_LINEA: String(l.cod_linea),
      NOMBRE: l.nombre,
      TIPO_SISTEMA: l.tipo_sistema,
      TENSION_NOM: String(l.tension_nom),
      NODO_SALIDA: l.nodo_salida,
      NODO_LLEGADA: l.nodo_llegada,
      CELDA_SALIDA: l.celda_salida,
      CELDA_LLEGADA: l.celda_llegada,
      ESTADO: l.estado,
      ULTIMA_SINCRONIZACION: l.ultima_sincronizacion,
      ...this.withControlFields(l)
    }));
    this.downloadExcelFile(data, filename);
  }

  // 2. Export Estructuras
  static exportEstructuras(estructuras: Estructura[], filename = 'Planilla_Estructuras.xlsx') {
    const data = estructuras.map(e => ({
      ID_POSTE: e.id_poste,
      COD_LINEA: String(e.cod_linea),
      POSTE_N: String(e.poste_n),
      TIPO_ARMADO: e.tipo_armado,
      POSTE_CANTIDAD: e.poste_cantidad,
      POSTE_MATERIAL: e.poste_material,
      CRUCETA_MATERIAL: e.cruceta_material,
      MENSULA_MATERIAL: e.mensula_material || '-',
      RIOSTRA_O_AMARRE_MATERIAL: e.riostra_o_amarre_material || '-',
      AISLADOR_MATERIAL: e.aislador_material,
      AISLADOR_CANT: e.aislador_cant,
      AISLADOR_TIPO: e.aislador_tipo || '-',
      CONDUCTOR_MATERIAL: e.conductor_material,
      CONDUCTOR_CALIBRE: e.conductor_calibre,
      CONDUCTOR_N_FASES: e.conductor_n_fases,
      ESTADO: e.estado,
      OBSERVACIONES: e.observaciones || '-',
      ...this.withControlFields(e)
    }));
    this.downloadExcelFile(data, filename);
  }

  // 3. Export Deficiencias
  static exportDeficiencias(deficiencias: Deficiencia[], filename = 'Inspeccion_Deficiencias.xlsx') {
    const data = deficiencias.map(d => ({
      ID_DEFICIENCIA: d.id_deficiencia,
      COD_LINEA: String(d.cod_linea),
      POSTE_N: String(d.poste_n),
      TIPO_POSTE: d.tipo_poste || '-',
      FECHA_INSPECCION: d.fecha_inspeccion,
      TIPO_DEFICIENCIA: d.tipo_deficiencia,
      DESCRIPCION: d.descripcion,
      PRIORIDAD: d.prioridad,
      NUMERO_OM: d.numero_om || '-',
      ESTADO: d.estado,
      USUARIO_RESPONSABLE: d.usuario_responsable,
      EVIDENCIA_URL: d.evidencia_fotografica,
      OBSERVACIONES: d.observaciones,
      ...this.withControlFields(d)
    }));
    this.downloadExcelFile(data, filename, 'DEFICIENCIAS');
  }

  // 4. Export Puesta a Tierra
  static exportPuestaTierra(patList: PuestaTierra[], filename = 'Mediciones_Puesta_a_Tierra.xlsx') {
    const data = patList.map(p => ({
      ID_PAT: p.id_pat,
      COD_LINEA: String(p.cod_linea),
      POSTE_N: String(p.poste_n),
      FECHA_MEDICION: p.fecha_medicion,
      VALOR_RESISTENCIA_OHMIOS: p.valor_resistencia_pat,
      PRIORIDAD: p.prioridad,
      ALERTA_DEFICIENCIA: p.alerta_deficiencia ? 'SI (≥ 5 Ω)' : 'NO (< 5 Ω)',
      TIPO_ESTRUCTURA: p.tipo_estructura || '-',
      MATERIAL_ESTRUCTURA: p.material_estructura || '-',
      UTM_ESTE: p.utm_este || '-',
      UTM_NORTE: p.utm_norte || '-',
      RESPONSABLE: p.responsable || '-',
      COMENTARIO: p.comentario || '-',
      EVIDENCIA_URL: p.evidencia_url || '-',
      ...this.withControlFields(p)
    }));
    this.downloadExcelFile(data, filename, 'PUESTA_A_TIERRA');
  }

  // 5. Export Efecto Corona
  static exportEfectoCorona(coronaList: EfectoCorona[], filename = 'Mediciones_Efecto_Corona_UV.xlsx') {
    const data = coronaList.map(c => ({
      ID_CORONA: c.id_corona,
      COD_LINEA: String(c.cod_linea),
      POSTE_N: String(c.poste_n),
      TIPO_ARMADO: c.tipo_armado,
      TIPO_AISLADOR: c.tipo_aislador,
      NIVEL_TENSION_KV: c.nivel_tension_kv,
      PRIORIDAD: c.prioridad || 'NO PRIORITARIO',
      DESCRIPCION_DETALLADA: c.descripcion_detallada || '-',
      CAUSA_PROBABLE: c.causa_probable || '-',
      ACCION_RECOMENDADA: c.accion_recomendada || '-',
      FECHA: c.fecha,
      HORA: c.hora,
      TEMP_C: c.temp_c,
      HUMEDAD_PCT: c.humedad_pct,
      FASE_R_GANANCIA: c.fase_r_ganancia,
      FASE_R_CONTEO: c.fase_r_conteo,
      FASE_S_GANANCIA: c.fase_s_ganancia,
      FASE_S_CONTEO: c.fase_s_conteo,
      FASE_T_GANANCIA: c.fase_t_ganancia,
      FASE_T_CONTEO: c.fase_t_conteo,
      SITUACIONES: (c.situaciones || []).join(', '),
      COMENTARIOS: c.comentarios,
      INSPECTOR: c.inspector,
      EVIDENCIA_URL: c.evidencia_url,
      ...this.withControlFields(c)
    }));
    this.downloadExcelFile(data, filename, 'EFECTO_CORONA');
  }

  // Alias for backward compatibility
  static exportCorona(coronaList: EfectoCorona[], filename = 'Mediciones_Efecto_Corona_UV.xlsx') {
    this.exportEfectoCorona(coronaList, filename);
  }

  // 6. Export Termografía
  static exportTermografia(termografiaList: Termografia[], filename = 'Inspecciones_Termograficas.xlsx') {
    const data = termografiaList.map(t => ({
      ID_TERMOGRAFIA: t.id_termografia,
      COD_LINEA: String(t.cod_linea),
      POSTE_N: String(t.poste_n),
      FECHA: t.fecha,
      HORA: t.hora,
      PRIORIDAD: t.prioridad || 'NO PRIORITARIO',
      COMPONENTE_FALLA: t.componente_falla,
      TEMP_AMBIENTE_C: t.temp_ambiente,
      TEMP_MAX_COMPONENTE_C: t.temp_max_componente,
      DELTA_T_C: t.delta_t,
      CRITICIDAD: t.criticidad,
      EMISIVIDAD: t.emisividad,
      NIVEL_TENSION: t.nivel_tension,
      TIPO_ZONA: t.tipo_zona,
      COMENTARIO: t.comentario,
      INSPECTOR: t.inspector,
      EVIDENCIA_URL: t.evidencia_url,
      ...this.withControlFields(t)
    }));
    this.downloadExcelFile(data, filename, 'TERMOGRAFIA');
  }

  // 7. Export Podas
  static exportPodas(podasList: Poda[], filename = 'Control_Podas_Franja_Servidumbre.xlsx') {
    const data = podasList.map(p => ({
      ID_PODA: p.id_poda,
      COD_LINEA: String(p.cod_linea),
      POSTE_N: String(p.poste_n),
      PRIORIDAD: p.prioridad || 'NO PRIORITARIO',
      FECHA_EJECUCION: p.fecha_ejecucion,
      ESTADO: p.estado,
      ALGARROBO: p.algarrobo,
      PALMERA: p.palmera,
      ORNAMENTAL: p.ornamental,
      TAMARINDO: p.tamarindo,
      PONCEANA: p.ponceana,
      OTROS: p.otros,
      TOTAL_ARBOLES: p.total_arboles,
      UBICACION_REFERENCIA: p.ubicacion_referencia,
      PUNTO_INICIAL: p.punto_inicial,
      PUNTO_FINAL: p.punto_final,
      CONTRATISTA_RESPONSABLE: p.contratista_responsable,
      OBSERVACIONES: p.observaciones,
      ...this.withControlFields(p)
    }));
    this.downloadExcelFile(data, filename, 'CONTROL_PODAS');
  }

  // 8. Export Mantenimiento
  static exportMantenimiento(mantList: Mantenimiento[], filename = 'Mantenimiento_Subtransmision.xlsx') {
    const data = mantList.map(m => ({
      ID_MANTENIMIENTO: m.id_mantenimiento,
      COD_LINEA: String(m.cod_linea),
      POSTE_N: String(m.poste_n),
      PRIORIDAD: m.prioridad || 'NO PRIORITARIO',
      ORDEN_MANTENIMIENTO: m.orden_mantenimiento,
      FECHA_EJECUCION: m.fecha_ejecucion,
      TIPO_MANTENIMIENTO: m.tipo_mantenimiento,
      ACTIVIDAD_REALIZADA: m.actividad_realizada,
      ESTADO: m.estado,
      ALTERA_ESTRUCTURAS: m.altera_estructuras ? 'SI' : 'NO',
      CONTRATISTA_RESPONSABLE: m.contratista_responsable,
      OBSERVACIONES: m.observaciones,
      ...this.withControlFields(m)
    }));
    this.downloadExcelFile(data, filename, 'MANTENIMIENTO');
  }

  // 9. Export DMS
  static exportDMS(
    dmsList: DMSItem[],
    _levantamientos?: LevantamientoDMS[],
    _inspecciones?: InspeccionCierreDMS[],
    filename = 'Infracciones_DMS.xlsx'
  ) {
    const data = dmsList.map(d => ({
      ID_DMS: d.id_dms,
      CODIGO_DMS: d.codigo_dms,
      COD_LINEA: String(d.cod_linea),
      POSTE_N: String(d.poste_n),
      FECHA_IDENTIFICACION: d.fecha_identificacion,
      DESCRIPCION: d.descripcion,
      PRIORIDAD: d.prioridad,
      FUENTE: d.fuente,
      ORDEN_SERVICIO: d.orden_servicio,
      ESTADO: d.estado,
      OBSERVACIONES: d.observaciones,
      ...this.withControlFields(d)
    }));
    this.downloadExcelFile(data, filename);
  }

  // 10. Export Usuarios
  static exportUsuarios(usuariosList: Usuario[], filename = 'USUARIOS.xlsx') {
    const data = usuariosList.map(u => ({
      ID_USUARIO: u.id_usuario,
      NOMBRES: u.nombres,
      APELLIDOS: u.apellidos,
      DNI: u.dni,
      EMAIL: u.email,
      TELEFONO: u.telefono,
      USERNAME: u.username,
      ROL: u.rol,
      ESTADO: u.estado,
      SUPERVISOR_RESPONSABLE: u.supervisor_responsable || '-',
      LINEAS_ASIGNADAS: u.lineas_asignadas.join(', '),
      ULTIMA_ACTUALIZACION: u.ultima_actualizacion || '-',
      ...this.withControlFields(u)
    }));
    this.downloadExcelFile(data, filename);
  }

  // 11. Export Auditoría (AUDITORIA_SISTEMA)
  static exportAuditoria(auditList: AuditoriaRegistro[], filename = 'AUDITORIA_SISTEMA.xlsx') {
    const data = auditList.map(a => ({
      ID_AUDITORIA: a.id_auditoria,
      MODULO: a.modulo,
      ID_REGISTRO: a.id_registro,
      ACCION: a.accion,
      USUARIO: a.usuario,
      ROL_USUARIO: a.rol_usuario || a.rol || '-',
      FECHA_HORA: a.fecha_hora || `${a.fecha || ''} ${a.hora || ''}`.trim(),
      CAMPO_MODIFICADO: a.campo_modificado || '-',
      VALOR_ANTERIOR: a.valor_anterior || a.valores_anteriores || 'N/A',
      VALOR_NUEVO: a.valor_nuevo || a.valores_nuevos || '-',
      OBSERVACION: a.observacion || '-'
    }));
    this.downloadExcelFile(data, filename, 'AUDITORIA_SISTEMA');
  }

  // 12. Export Órdenes de Mantenimiento
  static exportOrdenesMantenimiento(omList: OrdenMantenimiento[], filename = 'Ordenes_de_Mantenimiento.xlsx') {
    const data = omList.map(om => ({
      ID_OM: om.id_om,
      NUMERO_OM: om.numero_om,
      FECHA_INICIO: om.fecha_inicio,
      FECHA_EJECUCION: om.fecha_ejecucion,
      ESTADO: om.estado,
      TIPO_ACTIVIDAD: om.tipo_actividad,
      TOTAL_REGISTROS_ASOCIADOS: om.registros_asociados?.length || 0,
      PRIORITARIOS: (om.registros_asociados || []).filter(r => r.prioridad === 'PRIORITARIO').length,
      NO_PRIORITARIOS: (om.registros_asociados || []).filter(r => r.prioridad === 'NO PRIORITARIO').length,
      RESPONSABLE: om.responsable || '-',
      FECHA_REGISTRO: om.fecha_registro,
      OBSERVACIONES: om.observaciones || '-',
      ...this.withControlFields(om)
    }));
    this.downloadExcelFile(data, filename, 'ORDENES_OM');
  }

  // 13. Export Contratistas
  static exportContratistas(contratistas: Contratista[], filename = 'Catalogo_Contratistas.xlsx') {
    const data = contratistas.map(c => ({
      ID_CONTRATISTA: c.id_contratista,
      RAZON_SOCIAL: c.razon_social,
      RUC: String(c.ruc),
      REPRESENTANTE: c.representante,
      TELEFONO: c.telefono,
      CORREO: c.correo,
      ESPECIALIDAD: c.especialidad,
      ESTADO: c.estado,
      TOTAL_ACTIVIDADES: c.actividades_asignadas?.length || 0,
      ACTIVIDADES_ASIGNADAS: (c.actividades_asignadas || []).join(', '),
      FECHA_REGISTRO: c.fecha_registro,
      OBSERVACIONES: c.observaciones || '-',
      ...this.withControlFields(c)
    }));
    this.downloadExcelFile(data, filename, 'CONTRATISTAS');
  }

  // 14. Export Hidrolavado
  static exportHidrolavado(hidroList: Hidrolavado[], filename = 'Registro_Hidrolavado.xlsx') {
    const data = hidroList.map(h => ({
      ID_HIDROLAVADO: h.id_hidrolavado,
      COD_LINEA: h.cod_linea,
      POSTE_N: h.poste_n,
      FECHA_EJECUCION: h.fecha_ejecucion,
      FASE_LAVADA: h.fase_lavada,
      TIPO_AISLADOR: h.tipo_aislador,
      PRESION_BAR: h.presion_bar,
      CONDUCTIVIDAD_AGUA_US: h.conductividad_agua_us,
      ESTADO_PREVIO_POLUCION: h.estado_previo_polucion,
      RESULTADO: h.resultado,
      PRIORIDAD: h.prioridad,
      CONTRATISTA: h.contratista,
      RESPONSABLE: h.responsable || '-',
      OBSERVACIONES: h.observaciones || '-',
      ...this.withControlFields(h)
    }));
    this.downloadExcelFile(data, filename, 'HIDROLAVADO');
  }

  // Read Excel/CSV file into sheet rows
  static async readExcelFile(file: File): Promise<{ sheetNames: string[]; data: Record<string, any[]> }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const wb = XLSX.read(buffer, { type: 'array' });
          const result: Record<string, any[]> = {};
          wb.SheetNames.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            result[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          });
          resolve({ sheetNames: wb.SheetNames, data: result });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
