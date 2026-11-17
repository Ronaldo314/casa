import { storageService } from './storageService';
import { Usuario, ConfiguracionDrive } from '../types';
import {
  getGoogleAccessToken,
  clearGoogleAccessTokenOnAuthError,
  isDriveAutoSyncAuthorized,
  markPendingDriveSync
} from './googleWorkspaceAuth';

export class GoogleDriveService {
  private static autoSyncTimer: any = null;
  private static debouncePushTimer: any = null;
  private static pendingPushMode: Set<'usuarios' | 'activities'> = new Set();

  private static getAuthHeaders(): Record<string, string> {
    const token = getGoogleAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Schedule automatic background push to Google Drive when authorized in session.
   * If Drive OAuth/confirmation hasn't happened yet in this session, flags pendingSync cleanly.
   */
  static scheduleAutoPush(target: 'usuarios' | 'activities' | 'all') {
    if (!isDriveAutoSyncAuthorized()) {
      markPendingDriveSync(true);
      return;
    }

    if (target === 'all') {
      this.pendingPushMode.add('usuarios');
      this.pendingPushMode.add('activities');
    } else {
      this.pendingPushMode.add(target);
    }

    if (this.debouncePushTimer) {
      clearTimeout(this.debouncePushTimer);
    }

    this.debouncePushTimer = setTimeout(async () => {
      const needsUsers = this.pendingPushMode.has('usuarios');
      const needsActs = this.pendingPushMode.has('activities');
      this.pendingPushMode.clear();

      if (!isDriveAutoSyncAuthorized()) {
        markPendingDriveSync(true);
        return;
      }

      try {
        if (needsUsers && needsActs) {
          await this.pushAllToDrive();
        } else if (needsUsers) {
          await this.pushAllUsuariosToDrive();
        } else if (needsActs) {
          await this.pushAllActivitiesToDrive();
        }
      } catch {
        markPendingDriveSync(true);
      }
    }, 900);
  }

  /**
   * Test real connection to Google Drive & Google Sheets API (or Apps Script)
   */
  static async testConnection(overrideConfig?: Partial<ConfiguracionDrive>): Promise<{
    success: boolean;
    needsAuth?: boolean;
    message: string;
    latencyMs: number;
  }> {
    const config = { ...storageService.getConfigDrive(), ...(overrideConfig || {}) };
    const start = Date.now();
    const token = getGoogleAccessToken();

    if (token) {
      try {
        const res = await fetch('/api/drive/test', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ config })
        });
        const json = await res.json();
        const latency = json.latencyMs ?? (Date.now() - start);
        if (res.status === 401) {
          clearGoogleAccessTokenOnAuthError();
          return {
            success: false,
            needsAuth: true,
            message: 'La sesión de Google expiró. Por favor vuelve a iniciar sesión con Google.',
            latencyMs: latency
          };
        }
        if (res.ok && json.success) {
          if (json.config) {
            storageService.updateConfigDrive({
              ...json.config,
              sync_status: 'Conectado',
              error_message: undefined
            });
          }
          const detailParts = [
            `Carpeta: ${json.folder?.folderName || 'Drive'}`,
            `USUARIOS: ${json.usuariosAccessible ? (json.usuariosWritable ? 'Lectura/Escritura' : 'Solo lectura (creará copia en tu carpeta)') : 'Se creará en tu carpeta'}`,
            `ACTIVIDADES: ${json.lineasAccessible ? (json.lineasWritable ? 'Lectura/Escritura' : 'Solo lectura (creará libro en tu carpeta)') : 'Se creará en tu carpeta'}`
          ];
          return {
            success: true,
            message: `Conexión real verificada (${latency}ms) • ${detailParts.join(' | ')}`,
            latencyMs: latency
          };
        }
        return {
          success: false,
          message: json.message || 'No se pudo verificar la conexión con Google Drive.',
          latencyMs: latency
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Error de red al probar conexión con Google Drive: ${err.message}`,
          latencyMs: Date.now() - start
        };
      }
    }

    if (config.apps_script_url) {
      try {
        const url = `${config.apps_script_url}?action=ping`;
        const res = await fetch(url, { method: 'GET', mode: 'cors' });
        const json = await res.json();
        const latency = Date.now() - start;
        if (json.status === 'success') {
          storageService.updateConfigDrive({ sync_status: 'Conectado', error_message: undefined });
          return {
            success: true,
            message: `Conexión exitosa con Apps Script (${latency}ms). Hoja: ${config.sheet_lineas_id}`,
            latencyMs: latency
          };
        }
        return { success: false, message: `Error del servicio: ${json.message}`, latencyMs: latency };
      } catch (err: any) {
        return {
          success: false,
          message: `Error al conectar con Apps Script: ${err.message}`,
          latencyMs: Date.now() - start
        };
      }
    }

    storageService.updateConfigDrive({ sync_status: 'Desconectado' });
    return {
      success: false,
      needsAuth: true,
      message: 'Falta conectar tu cuenta de Google ("Sign in with Google") para habilitar la escritura real en Google Drive y Sheets.',
      latencyMs: Date.now() - start
    };
  }

  /**
   * Push ALL modules (Users with passwords + all 15 activity tabs) to Google Drive
   */
  static async pushAllToDrive(): Promise<{
    success: boolean;
    needsAuth?: boolean;
    message: string;
    config?: ConfiguracionDrive;
  }> {
    const token = getGoogleAccessToken();
    if (!token) {
      markPendingDriveSync(true);
      return {
        success: false,
        needsAuth: true,
        message: 'Inicia sesión con Google para subir usuarios y actividades a Google Drive.'
      };
    }

    const currentUser = storageService.getCurrentUser();
    try {
      storageService.updateConfigDrive({ sync_status: 'Sincronizando' }, true);
      const res = await fetch('/api/drive/sync-all', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          actorName: `${currentUser.nombres} ${currentUser.apellidos}`.trim(),
          actorRol: currentUser.rol
        })
      });
      if (res.status === 401) {
        clearGoogleAccessTokenOnAuthError();
        markPendingDriveSync(true);
        return {
          success: false,
          needsAuth: true,
          message: 'El token de Google expiró. Vuelve a iniciar sesión con Google.'
        };
      }
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) {
          storageService.updateConfigDrive({
            ...data.config,
            sync_status: 'Conectado',
            error_message: undefined
          }, true);
        }
        markPendingDriveSync(false);
        return {
          success: true,
          message: data.message,
          config: data.config
        };
      }
      storageService.updateConfigDrive({
        sync_status: 'Error',
        error_message: data.message
      }, true);
      markPendingDriveSync(true);
      return {
        success: false,
        message: data.message || 'No se pudo completar la sincronización con Google Drive.'
      };
    } catch (err: any) {
      markPendingDriveSync(true);
      return {
        success: false,
        message: `Error de conexión al sincronizar con Google Drive: ${err.message}`
      };
    }
  }

  /**
   * Push all users (server includes Drive PASSWORD column) to USUARIOS.XLSX in Google Drive
   */
  static async pushAllUsuariosToDrive(): Promise<{ success: boolean; needsAuth?: boolean; message: string }> {
    const token = getGoogleAccessToken();
    if (!token) {
      markPendingDriveSync(true);
      return {
        success: false,
        needsAuth: true,
        message: 'Usuario guardado en el servidor web. Conecta Google Drive para reflejarlo en USUARIOS.XLSX.'
      };
    }

    try {
      const res = await fetch('/api/drive/push-usuarios', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({})
      });
      if (res.status === 401) {
        clearGoogleAccessTokenOnAuthError();
        markPendingDriveSync(true);
        return { success: false, needsAuth: true, message: 'Sesión de Google expirada.' };
      }
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) {
          storageService.updateConfigDrive({ ...data.config, sync_status: 'Conectado' }, true);
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'No se pudo actualizar USUARIOS.XLSX en Drive.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Push ALL activity modules to Google Drive / Sheets
   */
  static async pushAllActivitiesToDrive(): Promise<{ success: boolean; needsAuth?: boolean; message: string }> {
    const token = getGoogleAccessToken();
    if (!token) {
      markPendingDriveSync(true);
      return {
        success: false,
        needsAuth: true,
        message: 'Conecta Google Drive para sincronizar todas las actividades.'
      };
    }

    try {
      const res = await fetch('/api/drive/push-activities', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({})
      });
      if (res.status === 401) {
        clearGoogleAccessTokenOnAuthError();
        markPendingDriveSync(true);
        return { success: false, needsAuth: true, message: 'Sesión de Google expirada.' };
      }
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) {
          storageService.updateConfigDrive({ ...data.config, sync_status: 'Conectado' }, true);
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'No se pudieron actualizar las actividades en Drive.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Legacy alias: Sincronizar Líneas y Actividades hacia Google Drive / Sheets
   */
  static async pushLineasToDrive(): Promise<{ success: boolean; message: string; count: number }> {
    const res = await this.pushAllActivitiesToDrive();
    const count = storageService.getLineas().length;
    return { success: res.success, message: res.message, count };
  }

  /**
   * Pull / Actualizar desde Google Drive
   */
  static async pullLineasFromDrive(): Promise<{
    success: boolean;
    needsAuth?: boolean;
    message: string;
    updatedCount: number;
    conflicts: number;
  }> {
    const token = getGoogleAccessToken();
    if (token && isDriveAutoSyncAuthorized()) {
      const res = await this.pushAllToDrive();
      return {
        success: res.success,
        needsAuth: res.needsAuth,
        message: res.message,
        updatedCount: storageService.getLineas().length,
        conflicts: 0
      };
    }

    // Read-only / non-OAuth pull fallback for users sheet
    const usrRes = await this.syncUsuariosFromDrive();
    return {
      success: usrRes.success,
      needsAuth: !token,
      message: token
        ? usrRes.message
        : `${usrRes.message} (Conecte Google Drive para activar la escritura automática de actividades y contraseñas).`,
      updatedCount: storageService.getLineas().length,
      conflicts: 0
    };
  }

  /**
   * Sincronizar Usuarios desde la hoja oficial USUARIOS.XLSX en Google Sheets/Drive
   */
  static async syncUsuariosFromDrive(sheetId?: string): Promise<{
    success: boolean;
    message: string;
    total: number;
    addedCount: number;
    updatedCount: number;
    usuarios?: Usuario[];
  }> {
    const config = storageService.getConfigDrive();
    const targetSheet = sheetId || config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX';

    try {
      const res = await fetch('/api/sync/usuarios', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ sheetId: targetSheet })
      });

      const data = await res.json();
      if (data.success && data.usuarios) {
        storageService.setUsuarios(data.usuarios);
        storageService.updateConfigDrive({
          sheet_usuarios_id: targetSheet,
          sheet_usuarios_url: data.sheet_url || `https://docs.google.com/spreadsheets/d/${targetSheet}/edit?rtpof=true`,
          last_sync_time: data.timestamp,
          sync_status: 'Conectado'
        }, true);
        return {
          success: true,
          message: data.message,
          total: data.total,
          addedCount: data.addedCount,
          updatedCount: data.updatedCount,
          usuarios: data.usuarios
        };
      } else {
        throw new Error(data.message || 'No se pudo sincronizar los usuarios.');
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Error al sincronizar usuarios con Google Sheets: ' + err.message,
        total: storageService.getUsuarios().length,
        addedCount: 0,
        updatedCount: 0
      };
    }
  }

  /**
   * Registrar / Actualizar usuario (con contraseña) y sincronizar automáticamente con Google Drive USUARIOS.XLSX
   */
  static async pushUsuarioToDrive(
    usuario: Usuario,
    rawPassword?: string
  ): Promise<{ success: boolean; driveSynced?: boolean; message: string }> {
    const currentUser = storageService.getCurrentUser();
    const payloadUsuario: Usuario = { ...usuario };
    if (rawPassword && rawPassword.trim() !== '') {
      payloadUsuario.password = rawPassword.trim();
    } else {
      delete payloadUsuario.password;
    }

    try {
      const res = await fetch('/api/sync/usuarios/push', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ usuario: payloadUsuario, user: currentUser })
      });
      const data = await res.json();
      if (data.success && data.usuarios) {
        storageService.setUsuarios(data.usuarios);
      }

      if (data.driveSynced) {
        markPendingDriveSync(false);
        return {
          success: true,
          driveSynced: true,
          message: data.driveMessage || `Usuario @${usuario.username} sincronizado en Google Drive (USUARIOS.XLSX).`
        };
      }

      markPendingDriveSync(true);
      return {
        success: true,
        driveSynced: false,
        message: `Usuario @${usuario.username} guardado en el servidor. Conecta Google Drive para subirlo a USUARIOS.XLSX.`
      };
    } catch (err: any) {
      return {
        success: false,
        driveSynced: false,
        message: `Error al sincronizar usuario con Drive: ${err.message}`
      };
    }
  }

  /**
   * Trigger a simulated conflict to test resolution UI
   */
  static triggerSampleConflict(codLinea: string) {
    const line = storageService.getLineaByCode(codLinea);
    if (!line) return;

    storageService.addConflicto({
      modulo: 'LÍNEAS',
      id_registro: line.id_linea,
      campo: 'NOMBRE',
      valor_local: line.nombre,
      valor_drive: line.nombre + ' [Editado directamente en Drive por Supervisor Operaciones]'
    });
  }

  /**
   * Configure Auto-Sync Interval
   */
  static setAutoSync(intervalMinutes: number, callback?: () => void) {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (intervalMinutes > 0) {
      this.autoSyncTimer = setInterval(async () => {
        if (isDriveAutoSyncAuthorized()) {
          await this.pushAllToDrive();
        }
        if (callback) callback();
      }, intervalMinutes * 60 * 1000);
    }
  }
}
