import * as XLSX from 'xlsx';

export interface DriveSyncTargetInfo {
  usuariosFileId?: string;
  usuariosFileUrl?: string;
  usuariosMode?: 'updated_configured' | 'created_in_folder' | 'readonly_fallback';
  activitiesFileId?: string;
  activitiesFileUrl?: string;
  activitiesMode?: 'updated_configured' | 'created_in_folder';
  folderId?: string;
  folderUrl?: string;
}

export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password'> {
  if (!user || typeof user !== 'object') return user;
  const { password: _omitted, ...safe } = user;
  return safe;
}

export function sanitizeState<T extends Record<string, any>>(state: T): T {
  return {
    ...state,
    usuarios: Array.isArray(state.usuarios) ? state.usuarios.map(sanitizeUser) : []
  };
}

function withControlColumns(r: any) {
  return {
    ESTADO_REGISTRO: r?.estado_registro || 'ACTIVO',
    FECHA_CREACION: r?.fecha_creacion || '-',
    USUARIO_CREACION: r?.usuario_creacion || 'Sistema Central',
    FECHA_MODIFICACION: r?.fecha_modificacion || '-',
    USUARIO_MODIFICACION: r?.usuario_modificacion || '-',
    FECHA_ELIMINACION: r?.fecha_eliminacion || '-',
    USUARIO_ELIMINACION: r?.usuario_eliminacion || '-'
  };
}

export function buildUsuariosDriveRows(usuarios: any[]): Record<string, any>[] {
  return (usuarios || []).map((u) => ({
    ID_USUARIO: u.id_usuario || '',
    NOMBRES: u.nombres || '',
    APELLIDOS: u.apellidos || '',
    DNI: String(u.dni || ''),
    EMAIL: u.email || '',
    TELEFONO: u.telefono || '',
    USERNAME: u.username || '',
    PASSWORD: u.password || 'password123',
    ROL: u.rol || 'Contratista',
    ESTADO: u.estado || 'Activo',
    CONTRATISTA_ID: u.contratista_id || '',
    CONTRATISTA_NOMBRE: u.contratista_nombre || '',
    SUPERVISOR_RESPONSABLE: u.supervisor_responsable || '',
    LINEAS_ASIGNADAS: Array.isArray(u.lineas_asignadas)
      ? u.lineas_asignadas.join(', ')
      : String(u.lineas_asignadas || '*'),
    ULTIMA_ACTUALIZACION: u.ultima_actualizacion || '-',
    ...withControlColumns(u)
  }));
}

export function buildActivitySheetsData(state: any): Record<string, Record<string, any>[]> {
  return {
    LINEAS: (state.lineas || []).map((l: any) => ({
      ID_LINEA: l.id_linea || '',
      COD_LINEA: String(l.cod_linea || ''),
      NOMBRE: l.nombre || '',
      TIPO_SISTEMA: l.tipo_sistema || '',
      TENSION_NOM: String(l.tension_nom || ''),
      NODO_SALIDA: l.nodo_salida || '',
      NODO_LLEGADA: l.nodo_llegada || '',
      CELDA_SALIDA: l.celda_salida || '',
      CELDA_LLEGADA: l.celda_llegada || '',
      ESTADO: l.estado || '',
      ULTIMA_SINCRONIZACION: l.ultima_sincronizacion || '',
      ...withControlColumns(l)
    })),
    ESTRUCTURAS: (state.estructuras || []).map((e: any) => ({
      ID_POSTE: e.id_poste || '',
      COD_LINEA: String(e.cod_linea || ''),
      POSTE_N: String(e.poste_n || ''),
      TIPO_ARMADO: e.tipo_armado || '',
      POSTE_CANTIDAD: e.poste_cantidad || '',
      POSTE_MATERIAL: e.poste_material || '',
      CRUCETA_MATERIAL: e.cruceta_material || '',
      MENSULA_MATERIAL: e.mensula_material || '-',
      RIOSTRA_AMARRE: e.riostra_o_amarre_material || '-',
      AISLADOR_MATERIAL: e.aislador_material || '',
      AISLADOR_CANT: e.aislador_cant || '',
      AISLADOR_TIPO: e.aislador_tipo || '-',
      CONDUCTOR_MATERIAL: e.conductor_material || '',
      CONDUCTOR_CALIBRE: e.conductor_calibre || '',
      CONDUCTOR_N_FASES: e.conductor_n_fases || '',
      ESTADO: e.estado || '',
      OBSERVACIONES: e.observaciones || '-',
      ...withControlColumns(e)
    })),
    DEFICIENCIAS: (state.deficiencias || []).map((d: any) => ({
      ID_DEFICIENCIA: d.id_deficiencia || '',
      COD_LINEA: String(d.cod_linea || ''),
      POSTE_N: String(d.poste_n || ''),
      TIPO_POSTE: d.tipo_poste || '-',
      FECHA_INSPECCION: d.fecha_inspeccion || '',
      TIPO_DEFICIENCIA: d.tipo_deficiencia || '',
      DESCRIPCION: d.descripcion || '',
      PRIORIDAD: d.prioridad || '',
      NUMERO_OM: d.numero_om || '-',
      ESTADO: d.estado || '',
      USUARIO_RESPONSABLE: d.usuario_responsable || '',
      EVIDENCIA_URL: d.evidencia_fotografica || '',
      OBSERVACIONES: d.observaciones || '',
      ...withControlColumns(d)
    })),
    PUESTA_A_TIERRA: (state.puestaTierra || []).map((p: any) => ({
      ID_PAT: p.id_pat || '',
      COD_LINEA: String(p.cod_linea || ''),
      POSTE_N: String(p.poste_n || ''),
      FECHA_MEDICION: p.fecha_medicion || '',
      VALOR_RESISTENCIA_OHM: p.valor_resistencia_pat ?? '',
      PRIORIDAD: p.prioridad || '',
      ALERTA_DEFICIENCIA: p.alerta_deficiencia ? 'SI (>= 5 Ohm)' : 'NO (< 5 Ohm)',
      TIPO_ESTRUCTURA: p.tipo_estructura || '-',
      MATERIAL_ESTRUCTURA: p.material_estructura || '-',
      UTM_ESTE: p.utm_este || '-',
      UTM_NORTE: p.utm_norte || '-',
      RESPONSABLE: p.responsable || '-',
      COMENTARIO: p.comentario || '-',
      EVIDENCIA_URL: p.evidencia_url || '-',
      ...withControlColumns(p)
    })),
    EFECTO_CORONA: (state.corona || []).map((c: any) => ({
      ID_CORONA: c.id_corona || '',
      COD_LINEA: String(c.cod_linea || ''),
      POSTE_N: String(c.poste_n || ''),
      TIPO_ARMADO: c.tipo_armado || '',
      TIPO_AISLADOR: c.tipo_aislador || '',
      NIVEL_TENSION_KV: c.nivel_tension_kv || '',
      PRIORIDAD: c.prioridad || 'NO PRIORITARIO',
      DESCRIPCION_DETALLADA: c.descripcion_detallada || '-',
      CAUSA_PROBABLE: c.causa_probable || '-',
      ACCION_RECOMENDADA: c.accion_recomendada || '-',
      FECHA: c.fecha || '',
      HORA: c.hora || '',
      TEMP_C: c.temp_c || '',
      HUMEDAD_PCT: c.humedad_pct || '',
      FASE_R_CONTEO: c.fase_r_conteo ?? 0,
      FASE_S_CONTEO: c.fase_s_conteo ?? 0,
      FASE_T_CONTEO: c.fase_t_conteo ?? 0,
      SITUACIONES: Array.isArray(c.situaciones) ? c.situaciones.join(', ') : '',
      COMENTARIOS: c.comentarios || '',
      INSPECTOR: c.inspector || '',
      EVIDENCIA_URL: c.evidencia_url || '',
      ...withControlColumns(c)
    })),
    TERMOGRAFIA: (state.termografia || []).map((t: any) => ({
      ID_TERMOGRAFIA: t.id_termografia || '',
      COD_LINEA: String(t.cod_linea || ''),
      POSTE_N: String(t.poste_n || ''),
      FECHA: t.fecha || '',
      HORA: t.hora || '',
      PRIORIDAD: t.prioridad || 'NO PRIORITARIO',
      COMPONENTE_FALLA: t.componente_falla || '',
      TEMP_AMBIENTE_C: t.temp_ambiente ?? '',
      TEMP_MAX_C: t.temp_max_componente ?? '',
      DELTA_T_C: t.delta_t ?? '',
      CRITICIDAD: t.criticidad || '',
      EMISIVIDAD: t.emisividad ?? '',
      NIVEL_TENSION: t.nivel_tension || '',
      TIPO_ZONA: t.tipo_zona || '',
      COMENTARIO: t.comentario || '',
      INSPECTOR: t.inspector || '',
      EVIDENCIA_URL: t.evidencia_url || '',
      ...withControlColumns(t)
    })),
    CONTROL_PODAS: (state.podas || []).map((p: any) => ({
      ID_PODA: p.id_poda || '',
      COD_LINEA: String(p.cod_linea || ''),
      POSTE_N: String(p.poste_n || ''),
      PRIORIDAD: p.prioridad || 'NO PRIORITARIO',
      FECHA_EJECUCION: p.fecha_ejecucion || '',
      ESTADO: p.estado || '',
      ALGARROBO: p.algarrobo ?? 0,
      PALMERA: p.palmera ?? 0,
      ORNAMENTAL: p.ornamental ?? 0,
      TAMARINDO: p.tamarindo ?? 0,
      PONCEANA: p.ponceana ?? 0,
      OTROS: p.otros ?? 0,
      TOTAL_ARBOLES: p.total_arboles ?? 0,
      UBICACION_REFERENCIA: p.ubicacion_referencia || '',
      CONTRATISTA_RESPONSABLE: p.contratista_responsable || '',
      OBSERVACIONES: p.observaciones || '',
      ...withControlColumns(p)
    })),
    MANTENIMIENTO: (state.mantenimiento || []).map((m: any) => ({
      ID_MANTENIMIENTO: m.id_mantenimiento || '',
      COD_LINEA: String(m.cod_linea || ''),
      POSTE_N: String(m.poste_n || ''),
      PRIORIDAD: m.prioridad || 'NO PRIORITARIO',
      ORDEN_MANTENIMIENTO: m.orden_mantenimiento || '',
      FECHA_EJECUCION: m.fecha_ejecucion || '',
      TIPO_MANTENIMIENTO: m.tipo_mantenimiento || '',
      ACTIVIDAD_REALIZADA: m.actividad_realizada || '',
      ESTADO: m.estado || '',
      ALTERA_ESTRUCTURAS: m.altera_estructuras ? 'SI' : 'NO',
      CONTRATISTA_RESPONSABLE: m.contratista_responsable || '',
      OBSERVACIONES: m.observaciones || '',
      ...withControlColumns(m)
    })),
    HIDROLAVADO: (state.hidrolavado || []).map((h: any) => ({
      ID_HIDROLAVADO: h.id_hidrolavado || '',
      COD_LINEA: String(h.cod_linea || ''),
      POSTE_N: String(h.poste_n || ''),
      FECHA_EJECUCION: h.fecha_ejecucion || '',
      FASE_LAVADA: h.fase_lavada || '',
      TIPO_AISLADOR: h.tipo_aislador || '',
      PRESION_BAR: h.presion_bar ?? '',
      CONDUCTIVIDAD_AGUA_US: h.conductividad_agua_us ?? '',
      ESTADO_PREVIO_POLUCION: h.estado_previo_polucion || '',
      RESULTADO: h.resultado || '',
      PRIORIDAD: h.prioridad || 'NO PRIORITARIO',
      CONTRATISTA: h.contratista || '',
      RESPONSABLE: h.responsable || '-',
      OBSERVACIONES: h.observaciones || '-',
      ...withControlColumns(h)
    })),
    ORDENES_OM: (state.ordenes_om || []).map((om: any) => ({
      ID_OM: om.id_om || '',
      NUMERO_OM: om.numero_om || '',
      FECHA_INICIO: om.fecha_inicio || '',
      FECHA_EJECUCION: om.fecha_ejecucion || '',
      ESTADO: om.estado || '',
      TIPO_ACTIVIDAD: om.tipo_actividad || '',
      TOTAL_REGISTROS: Array.isArray(om.registros_asociados) ? om.registros_asociados.length : 0,
      PRIORITARIOS: Array.isArray(om.registros_asociados)
        ? om.registros_asociados.filter((r: any) => r.prioridad === 'PRIORITARIO').length
        : 0,
      NO_PRIORITARIOS: Array.isArray(om.registros_asociados)
        ? om.registros_asociados.filter((r: any) => r.prioridad === 'NO PRIORITARIO').length
        : 0,
      RESPONSABLE: om.responsable || '-',
      FECHA_REGISTRO: om.fecha_registro || '',
      OBSERVACIONES: om.observaciones || '-',
      ...withControlColumns(om)
    })),
    DMS: (state.dms || []).map((d: any) => ({
      ID_DMS: d.id_dms || '',
      CODIGO_DMS: d.codigo_dms || '',
      COD_LINEA: String(d.cod_linea || ''),
      POSTE_N: String(d.poste_n || ''),
      FECHA_IDENTIFICACION: d.fecha_identificacion || '',
      DESCRIPCION: d.descripcion || '',
      PRIORIDAD: d.prioridad || '',
      FUENTE: d.fuente || '',
      ORDEN_SERVICIO: d.orden_servicio || '',
      ESTADO: d.estado || '',
      OBSERVACIONES: d.observaciones || '',
      ...withControlColumns(d)
    })),
    LEVANTAMIENTOS_DMS: (state.levantamientos || []).map((l: any) => ({
      ID_LEVANTAMIENTO: l.id_levantamiento || '',
      ID_DMS: l.id_dms || '',
      COD_LINEA: String(l.cod_linea || ''),
      POSTE_N: String(l.poste_n || ''),
      FECHA_EJECUCION: l.fecha_ejecucion || '',
      DESCRIPCION_TRABAJO: l.descripcion_trabajo || '',
      ORDEN_SERVICIO: l.orden_servicio || '',
      CONTRATISTA_RESPONSABLE: l.contratista_responsable || '',
      ESTADO: l.estado || '',
      OBSERVACIONES: l.observaciones || '',
      ...withControlColumns(l)
    })),
    INSPECCIONES_DMS: (state.inspecciones || []).map((i: any) => ({
      ID_INSPECCION_CIERRE: i.id_inspeccion_cierre || '',
      ID_DMS: i.id_dms || '',
      ID_LEVANTAMIENTO: i.id_levantamiento || '',
      COD_LINEA: String(i.cod_linea || ''),
      POSTE_N: String(i.poste_n || ''),
      FECHA_INSPECCION: i.fecha_inspeccion || '',
      INSPECTOR: i.inspector || '',
      RESULTADO: i.resultado || '',
      ESTADO_FINAL: i.estado_final || '',
      OBSERVACIONES: i.observaciones || '',
      ...withControlColumns(i)
    })),
    CONTRATISTAS: (state.contratistas || []).map((c: any) => ({
      ID_CONTRATISTA: c.id_contratista || '',
      RAZON_SOCIAL: c.razon_social || '',
      RUC: String(c.ruc || ''),
      REPRESENTANTE: c.representante || '',
      TELEFONO: c.telefono || '',
      CORREO: c.correo || '',
      ESPECIALIDAD: c.especialidad || '',
      ESTADO: c.estado || '',
      ACTIVIDADES_ASIGNADAS: Array.isArray(c.actividades_asignadas) ? c.actividades_asignadas.join(', ') : '',
      FECHA_REGISTRO: c.fecha_registro || '',
      OBSERVACIONES: c.observaciones || '-',
      ...withControlColumns(c)
    })),
    AUDITORIA_SISTEMA: (state.auditoria || []).slice(0, 500).map((a: any) => ({
      ID_AUDITORIA: a.id_auditoria || '',
      MODULO: a.modulo || '',
      ID_REGISTRO: a.id_registro || '',
      ACCION: a.accion || '',
      USUARIO: a.usuario || '',
      ROL_USUARIO: a.rol_usuario || a.rol || '-',
      FECHA_HORA: a.fecha_hora || `${a.fecha || ''} ${a.hora || ''}`.trim(),
      CAMPO_MODIFICADO: a.campo_modificado || '-',
      VALOR_ANTERIOR: a.valor_anterior || a.valores_anteriores || 'N/A',
      VALOR_NUEVO: a.valor_nuevo || a.valores_nuevos || '-',
      OBSERVACION: a.observacion || '-'
    }))
  };
}

function rowsToAOA(rows: Record<string, any>[], fallbackHeaders: string[]): any[][] {
  if (!rows || rows.length === 0) {
    return [fallbackHeaders];
  }
  const headers = Object.keys(rows[0]);
  const aoa: any[][] = [headers];
  for (const r of rows) {
    aoa.push(
      headers.map((h) => {
        const val = r[h];
        if (val === undefined || val === null) return '';
        return val;
      })
    );
  }
  return aoa;
}

async function driveJsonFetch(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, rawText: text };
}

export async function getDriveFileMetadata(token: string, fileId: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?fields=id,name,mimeType,parents,webViewLink,capabilities&supportsAllDrives=true`;
  return driveJsonFetch(url, token);
}

export async function resolveDriveFolder(
  token: string,
  config: any
): Promise<{ folderId: string; folderUrl: string; folderName: string }> {
  const configuredFolder = (config?.drive_folder_id || '').trim();
  if (configuredFolder && configuredFolder !== '1A9x_DRIVE_FOLDER_SUBTRANSMISION') {
    const check = await getDriveFileMetadata(token, configuredFolder);
    if (check.ok && check.json?.mimeType === 'application/vnd.google-apps.folder') {
      return {
        folderId: check.json.id,
        folderUrl: check.json.webViewLink || `https://drive.google.com/drive/folders/${check.json.id}`,
        folderName: check.json.name || 'Carpeta Subtransmisión'
      };
    }
  }

  // Try discovering parent folder from configured sheets
  for (const candidateId of [config?.sheet_usuarios_id, config?.sheet_lineas_id]) {
    if (!candidateId) continue;
    const meta = await getDriveFileMetadata(token, candidateId);
    if (meta.ok && Array.isArray(meta.json?.parents) && meta.json.parents.length > 0) {
      const parentId = meta.json.parents[0];
      const pMeta = await getDriveFileMetadata(token, parentId);
      if (pMeta.ok && pMeta.json?.capabilities?.canAddChildren) {
        return {
          folderId: pMeta.json.id,
          folderUrl: pMeta.json.webViewLink || `https://drive.google.com/drive/folders/${pMeta.json.id}`,
          folderName: pMeta.json.name || 'Carpeta Subtransmisión'
        };
      }
    }
  }

  // Search for existing folder in user's Drive
  const q = encodeURIComponent(
    "name = 'SISTEMA_SUBTRANSMISION_DRIVE' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const search = await driveJsonFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=5`,
    token
  );
  if (search.ok && Array.isArray(search.json?.files) && search.json.files.length > 0) {
    const f = search.json.files[0];
    return {
      folderId: f.id,
      folderUrl: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      folderName: f.name
    };
  }

  // Create the root folder in My Drive
  const created = await driveJsonFetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'SISTEMA_SUBTRANSMISION_DRIVE',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  if (!created.ok) {
    throw new Error(
      `No se pudo acceder ni crear carpeta en Google Drive (${created.status}): ${created.json?.error?.message || created.rawText}`
    );
  }
  return {
    folderId: created.json.id,
    folderUrl: created.json.webViewLink || `https://drive.google.com/drive/folders/${created.json.id}`,
    folderName: created.json.name
  };
}

async function uploadOrPatchXlsxFile(
  token: string,
  fileId: string | null,
  fileName: string,
  parentFolderId: string | null,
  sheetsMap: Record<string, Record<string, any>[]>
): Promise<{ id: string; webViewLink: string }> {
  const wb = XLSX.utils.book_new();
  for (const [rawName, rows] of Object.entries(sheetsMap)) {
    const sheetName = rawName.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
    const ws = rows && rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['SIN_REGISTROS']]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (fileId) {
    const patchRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        fileId
      )}?uploadType=media&fields=id,webViewLink&supportsAllDrives=true`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': xlsxMime
        },
        body: new Uint8Array(buffer)
      }
    );
    const patchText = await patchRes.text();
    let patchJson: any = {};
    try {
      patchJson = JSON.parse(patchText);
    } catch {
      patchJson = {};
    }
    if (!patchRes.ok) {
      const errMsg = patchJson?.error?.message || patchText;
      const err = new Error(`Drive XLSX PATCH failed (${patchRes.status}): ${errMsg}`) as Error & { status?: number };
      err.status = patchRes.status;
      throw err;
    }
    return {
      id: patchJson.id || fileId,
      webViewLink: patchJson.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}/edit?rtpof=true`
    };
  }

  // Create new XLSX file via multipart upload
  const metadata = {
    name: fileName,
    mimeType: xlsxMime,
    ...(parentFolderId ? { parents: [parentFolderId] } : {})
  };
  const boundary = '-------subtransmision_xlsx_boundary_' + Date.now();
  const part1 = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${xlsxMime}\r\n\r\n`,
    'utf-8'
  );
  const part3 = Buffer.from(`\r\n--${boundary}--`, 'utf-8');
  const bodyBuffer = Buffer.concat([part1, buffer, part3]);

  const createRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: new Uint8Array(bodyBuffer)
    }
  );
  const createJson = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`No se pudo crear archivo ${fileName} en Drive: ${createJson?.error?.message || createRes.status}`);
  }
  return {
    id: createJson.id,
    webViewLink: createJson.webViewLink || `https://docs.google.com/spreadsheets/d/${createJson.id}/edit?rtpof=true`
  };
}

async function syncGoogleSpreadsheetTabs(
  token: string,
  spreadsheetId: string,
  sheetsMap: Record<string, Record<string, any>[]>
): Promise<{ id: string; webViewLink: string }> {
  // 1. Inspect existing sheet tabs first (never assume "Sheet1")
  const metaRes = await driveJsonFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetUrl,sheets.properties`,
    token
  );
  if (!metaRes.ok) {
    const err = new Error(
      `Sheets metadata error (${metaRes.status}): ${metaRes.json?.error?.message || metaRes.rawText}`
    ) as Error & { status?: number };
    err.status = metaRes.status;
    throw err;
  }

  const existingSheets: { sheetId: number; title: string }[] = (metaRes.json?.sheets || []).map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title
  }));
  const existingNames = new Set(existingSheets.map((s) => s.title));
  const spreadsheetUrl =
    metaRes.json?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Special case: if updating a single sheet map and target only has 1 tab (e.g. USUARIOS sheet)
  const targetEntries = Object.entries(sheetsMap);
  const resolvedTabNames = new Map<string, string>();

  if (targetEntries.length === 1 && targetEntries[0][0] === 'USUARIOS') {
    const matching = existingSheets.find((s) => s.title.toUpperCase().includes('USUARIO'));
    if (matching) {
      resolvedTabNames.set('USUARIOS', matching.title);
    } else if (existingSheets.length === 1) {
      resolvedTabNames.set('USUARIOS', existingSheets[0].title);
    } else {
      resolvedTabNames.set('USUARIOS', 'USUARIOS');
    }
  } else {
    for (const [key] of targetEntries) {
      const clean = key.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
      resolvedTabNames.set(key, clean);
    }
  }

  // 2. Create missing tabs if needed
  const addRequests: any[] = [];
  for (const [, tabTitle] of resolvedTabNames.entries()) {
    if (!existingNames.has(tabTitle)) {
      addRequests.push({
        addSheet: {
          properties: { title: tabTitle }
        }
      });
    }
  }

  if (addRequests.length > 0) {
    const batchAdd = await driveJsonFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: addRequests })
      }
    );
    if (!batchAdd.ok) {
      const err = new Error(
        `No se pudieron crear pestañas en Sheets (${batchAdd.status}): ${batchAdd.json?.error?.message || batchAdd.rawText}`
      ) as Error & { status?: number };
      err.status = batchAdd.status;
      throw err;
    }
  }

  // 3. Batch clear target sheets
  const rangesToClear = Array.from(resolvedTabNames.values()).map((title) => `'${title.replace(/'/g, "''")}'!A:ZZ`);
  await driveJsonFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranges: rangesToClear })
    }
  );

  // 4. Batch update all values cleanly in one call
  const dataPayload = targetEntries.map(([key, rows]) => {
    const title = resolvedTabNames.get(key) || key;
    const values = rowsToAOA(rows, ['SIN_REGISTROS']);
    return {
      range: `'${title.replace(/'/g, "''")}'!A1`,
      majorDimension: 'ROWS',
      values
    };
  });

  const batchUpdateRes = await driveJsonFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload
      })
    }
  );

  if (!batchUpdateRes.ok) {
    const err = new Error(
      `Error al escribir datos en Google Sheets (${batchUpdateRes.status}): ${
        batchUpdateRes.json?.error?.message || batchUpdateRes.rawText
      }`
    ) as Error & { status?: number };
    err.status = batchUpdateRes.status;
    throw err;
  }

  return { id: spreadsheetId, webViewLink: spreadsheetUrl };
}

async function findOrCreateFileInFolder(
  token: string,
  folderId: string,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  const escaped = fileName.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${escaped}' and '${folderId}' in parents and mimeType = '${mimeType}' and trashed = false`
  );
  const res = await driveJsonFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=5`,
    token
  );
  if (res.ok && Array.isArray(res.json?.files) && res.json.files.length > 0) {
    return res.json.files[0].id;
  }
  return null;
}

export async function pushUsuariosToDriveWithToken(
  token: string,
  config: any,
  state: any
): Promise<{
  success: boolean;
  fileId: string;
  fileUrl: string;
  mode: 'updated_configured' | 'created_in_folder';
  folderId?: string;
  folderUrl?: string;
  message: string;
}> {
  const targetId = (config?.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX').trim();
  const rows = buildUsuariosDriveRows(state.usuarios || []);

  // First try updating the configured file ID directly
  const meta = await getDriveFileMetadata(token, targetId);
  if (meta.ok && meta.json) {
    const mime = meta.json.mimeType || '';
    const canEdit = meta.json.capabilities?.canEdit !== false;
    if (canEdit) {
      try {
        if (mime === 'application/vnd.google-apps.spreadsheet') {
          const updated = await syncGoogleSpreadsheetTabs(token, targetId, { USUARIOS: rows });
          return {
            success: true,
            fileId: updated.id,
            fileUrl: updated.webViewLink,
            mode: 'updated_configured',
            message: `${rows.length} usuarios (con contraseñas protegidas en Drive) sincronizados en Google Sheets (${meta.json.name}).`
          };
        } else {
          // Binary .xlsx file (like USUARIOS.XLSX)
          // Preserve any extra sheets if file already has multiple sheets
          let sheetsMap: Record<string, Record<string, any>[]> = { USUARIOS: rows };
          try {
            const dl = await fetch(
              `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(targetId)}?alt=media&supportsAllDrives=true`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (dl.ok) {
              const ab = await dl.arrayBuffer();
              const existingWb = XLSX.read(new Uint8Array(ab), { type: 'array' });
              const firstSheet = existingWb.SheetNames[0] || 'USUARIOS';
              const preserved: Record<string, Record<string, any>[]> = {};
              for (const sName of existingWb.SheetNames) {
                if (sName === firstSheet || sName.toUpperCase().includes('USUARIO')) {
                  preserved[sName] = rows;
                } else {
                  preserved[sName] = XLSX.utils.sheet_to_json(existingWb.Sheets[sName], { defval: '' });
                }
              }
              sheetsMap = Object.keys(preserved).length > 0 ? preserved : { USUARIOS: rows };
            }
          } catch {
            // fallback to single USUARIOS sheet
          }
          const updated = await uploadOrPatchXlsxFile(token, targetId, meta.json.name || 'USUARIOS.XLSX', null, sheetsMap);
          return {
            success: true,
            fileId: updated.id,
            fileUrl: updated.webViewLink,
            mode: 'updated_configured',
            message: `${rows.length} usuarios sincronizados directamente en ${meta.json.name || 'USUARIOS.XLSX'} en Google Drive.`
          };
        }
      } catch (err: any) {
        if (err?.status !== 403 && err?.status !== 404) {
          throw err;
        }
      }
    }
  }

  // Fallback: create or update USUARIOS.XLSX inside user's Drive folder
  const folder = await resolveDriveFolder(token, config);
  const existingBackupId = await findOrCreateFileInFolder(
    token,
    folder.folderId,
    'USUARIOS.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  const saved = await uploadOrPatchXlsxFile(token, existingBackupId, 'USUARIOS.xlsx', folder.folderId, {
    USUARIOS: rows
  });
  return {
    success: true,
    fileId: saved.id,
    fileUrl: saved.webViewLink,
    mode: 'created_in_folder',
    folderId: folder.folderId,
    folderUrl: folder.folderUrl,
    message: `${rows.length} usuarios sincronizados en ${folder.folderName}/USUARIOS.xlsx en tu Google Drive.`
  };
}

export async function pushAllActivitiesToDriveWithToken(
  token: string,
  config: any,
  state: any
): Promise<{
  success: boolean;
  activitiesFileId: string;
  activitiesFileUrl: string;
  folderId: string;
  folderUrl: string;
  mode: 'updated_configured' | 'created_in_folder';
  tabsCount: number;
  message: string;
}> {
  const folder = await resolveDriveFolder(token, config);
  const datasets = buildActivitySheetsData(state);
  const tabsCount = Object.keys(datasets).length;
  const configuredId = (config?.sheet_lineas_id || '').trim();

  // 1. Try updating configured sheet_lineas_id directly if writable
  if (configuredId) {
    const meta = await getDriveFileMetadata(token, configuredId);
    if (meta.ok && meta.json && meta.json.capabilities?.canEdit !== false) {
      const mime = meta.json.mimeType || '';
      try {
        if (mime === 'application/vnd.google-apps.spreadsheet') {
          const updated = await syncGoogleSpreadsheetTabs(token, configuredId, datasets);
          return {
            success: true,
            activitiesFileId: updated.id,
            activitiesFileUrl: updated.webViewLink,
            folderId: folder.folderId,
            folderUrl: folder.folderUrl,
            mode: 'updated_configured',
            tabsCount,
            message: `${tabsCount} módulos y actividades sincronizados en ${meta.json.name || 'Google Sheets'}.`
          };
        } else if (mime.includes('spreadsheetml') || mime.includes('ms-excel')) {
          const updated = await uploadOrPatchXlsxFile(
            token,
            configuredId,
            meta.json.name || 'ACTIVIDADES_SUBTRANSMISION.xlsx',
            null,
            datasets
          );
          return {
            success: true,
            activitiesFileId: updated.id,
            activitiesFileUrl: updated.webViewLink,
            folderId: folder.folderId,
            folderUrl: folder.folderUrl,
            mode: 'updated_configured',
            tabsCount,
            message: `${tabsCount} módulos sincronizados en ${meta.json.name} en Google Drive.`
          };
        }
      } catch (err: any) {
        if (err?.status !== 403 && err?.status !== 404) {
          throw err;
        }
      }
    }
  }

  // 2. Otherwise use or create REGISTRO_ACTIVIDADES_SUBTRANSMISION in the Drive folder
  let targetSheetId = (config?.sheet_activities_id || '').trim();
  if (targetSheetId) {
    const check = await getDriveFileMetadata(token, targetSheetId);
    if (!check.ok || check.json?.capabilities?.canEdit === false) {
      targetSheetId = '';
    }
  }

  if (!targetSheetId) {
    const foundId = await findOrCreateFileInFolder(
      token,
      folder.folderId,
      'REGISTRO_ACTIVIDADES_SUBTRANSMISION',
      'application/vnd.google-apps.spreadsheet'
    );
    if (foundId) {
      targetSheetId = foundId;
    } else {
      const created = await driveJsonFetch(
        'https://www.googleapis.com/drive/v3/files?fields=id,webViewLink',
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'REGISTRO_ACTIVIDADES_SUBTRANSMISION',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [folder.folderId]
          })
        }
      );
      if (!created.ok) {
        throw new Error(
          `No se pudo crear hoja de actividades en Drive: ${created.json?.error?.message || created.rawText}`
        );
      }
      targetSheetId = created.json.id;
    }
  }

  const updated = await syncGoogleSpreadsheetTabs(token, targetSheetId, datasets);
  return {
    success: true,
    activitiesFileId: updated.id,
    activitiesFileUrl: updated.webViewLink,
    folderId: folder.folderId,
    folderUrl: folder.folderUrl,
    mode: 'created_in_folder',
    tabsCount,
    message: `${tabsCount} módulos y todas las actividades sincronizadas en ${folder.folderName}/REGISTRO_ACTIVIDADES_SUBTRANSMISION.`
  };
}

export async function pullUsuariosFromDriveWithToken(
  token: string,
  fileId: string
): Promise<Record<string, string>[]> {
  const meta = await getDriveFileMetadata(token, fileId);
  if (!meta.ok || !meta.json) {
    throw new Error(`No se pudo leer USUARIOS desde Drive (${meta.status}): ${meta.json?.error?.message || meta.rawText}`);
  }

  const mime = meta.json.mimeType || '';
  if (mime === 'application/vnd.google-apps.spreadsheet') {
    const ssRes = await driveJsonFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(fileId)}?fields=sheets.properties.title`,
      token
    );
    if (!ssRes.ok) {
      throw new Error(`Error leyendo pestañas de Sheets (${ssRes.status})`);
    }
    const sheets = (ssRes.json?.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
    const title = sheets.find((t: string) => t.toUpperCase().includes('USUARIO')) || sheets[0];
    if (!title) return [];

    const valsRes = await driveJsonFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(fileId)}/values/${encodeURIComponent(
        `'${title.replace(/'/g, "''")}'!A1:ZZ`
      )}`,
      token
    );
    if (!valsRes.ok) {
      throw new Error(`Error leyendo valores de ${title} (${valsRes.status})`);
    }
    const values: any[][] = valsRes.json?.values || [];
    if (values.length < 2) return [];
    const headers = values[0].map((h) => String(h || '').trim().toUpperCase());
    return values.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
      });
      return obj;
    });
  }

  // Binary XLSX file
  const dlRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!dlRes.ok) {
    throw new Error(`Error descargando archivo XLSX desde Drive (${dlRes.status})`);
  }
  const ab = await dlRes.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
  const sheetName =
    wb.SheetNames.find((n) => n.toUpperCase().includes('USUARIO')) || wb.SheetNames[0];
  if (!sheetName) return [];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[sheetName], { defval: '' });
  return rawRows.map((r) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      normalized[String(k).trim().toUpperCase()] = String(v ?? '').trim();
    }
    return normalized;
  });
}
