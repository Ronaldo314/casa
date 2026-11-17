import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FileCode,
  Cloud,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { ConfiguracionDrive } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import {
  subscribeGoogleWorkspaceAuth,
  googleSignInForWorkspace,
  googleLogoutFromWorkspace,
  GoogleWorkspaceSession
} from '../services/googleWorkspaceAuth';
import { GoogleSignInButton, ModuleDriveSyncButtons } from './GoogleDriveAuthControls';
import type { BulkModuleKey } from '../services/bulkExcelImportService';

interface ConfiguracionDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionDrive;
  onRefresh: () => void;
  onOpenDocs: () => void;
  onRequestDriveSync: (scope?: 'activities' | 'all') => void | Promise<void>;
  onOpenBulkImport?: (moduleKey: BulkModuleKey | 'AUTO_MULTI_SHEET') => void;
}

export const ConfiguracionDriveModal: React.FC<ConfiguracionDriveModalProps> = ({
  isOpen,
  onClose,
  config,
  onRefresh,
  onOpenDocs,
  onRequestDriveSync,
  onOpenBulkImport
}) => {
  const [form, setForm] = useState<ConfiguracionDrive>({ ...config });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [driveSession, setDriveSession] = useState<GoogleWorkspaceSession | null>(null);

  useEffect(() => {
    setForm({ ...config });
  }, [config, isOpen]);

  useEffect(() => {
    return subscribeGoogleWorkspaceAuth((s) => setDriveSession(s));
  }, []);

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    setTestResult(null);
    const res = await googleSignInForWorkspace();
    if (res.success) {
      setTestResult({
        success: true,
        message: `Cuenta Google conectada (${res.user?.email}). Ahora puedes probar conexión o confirmar sincronización automática.`
      });
    } else if (res.error) {
      setTestResult({ success: false, message: res.error });
    }
  };

  const handleGoogleDisconnect = async () => {
    await googleLogoutFromWorkspace();
    storageService.updateConfigDrive({ sync_status: 'Desconectado' });
    setTestResult({ success: true, message: 'Sesión de Google Drive cerrada correctamente.' });
    onRefresh();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      storageService.updateConfigDrive(form);
      const res = await GoogleDriveService.testConnection(form);
      setTestResult({ success: res.success, message: res.message });
      onRefresh();
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    storageService.updateConfigDrive(form);
    GoogleDriveService.setAutoSync(form.auto_sync_interval);
    onRefresh();
    onClose();
  };

  const folderHref =
    form.drive_folder_url ||
    (form.drive_folder_id && form.drive_folder_id !== '1A9x_DRIVE_FOLDER_SUBTRANSMISION'
      ? `https://drive.google.com/drive/folders/${form.drive_folder_id}`
      : 'https://drive.google.com/drive/my-drive');

  const activitiesHref = form.sheet_activities_url || form.sheet_lineas_url;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Configuración de Google Drive & Sheets API</h2>
              <p className="text-xs text-slate-400">Conexión OAuth real y sincronización automática bidireccional</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Google OAuth Connection Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-white">
                    {driveSession?.hasAccessToken
                      ? `Google Conectado: ${driveSession.user?.email || 'Sesión Activa'}`
                      : 'Conectar Cuenta Google Drive & Sheets'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {driveSession?.hasAccessToken
                    ? driveSession.driveWriteConfirmed
                      ? 'Sincronización automática autorizada: cada usuario y actividad creada o editada se registra en Drive.'
                      : 'Cuenta conectada. Confirme la sincronización para activar el guardado automático en Drive.'
                    : 'Inicie sesión con su cuenta de Google para escribir automáticamente usuarios y actividades en Drive.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!driveSession?.hasAccessToken ? (
                  <GoogleSignInButton onClick={handleGoogleConnect} label="Sign in with Google" />
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 border border-slate-700 cursor-pointer text-xs font-semibold"
                    title="Desconectar Google"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Desconectar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                Sincronización manual inmediata:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <ModuleDriveSyncButtons
                  moduleLabel="Configuración Drive"
                  bulkModuleKey="AUTO_MULTI_SHEET"
                  onOpenBulkImport={(mk) => {
                    onClose();
                    onOpenBulkImport?.(mk);
                  }}
                  onRequestDriveSync={async (scope) => {
                    storageService.updateConfigDrive(form);
                    if (scope === 'activities' && driveSession?.hasAccessToken && driveSession?.driveWriteConfirmed) {
                      const res = await GoogleDriveService.pushAllActivitiesToDrive();
                      setTestResult({ success: res.success, message: res.message });
                      onRefresh();
                      return;
                    }
                    onClose();
                    await onRequestDriveSync(scope);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Main Spreadsheet ID */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              ID DEL ARCHIVO PRINCIPAL DE LÍNEAS / ACTIVIDADES (Google Sheets) <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={form.sheet_lineas_id}
              onChange={(e) => setForm({ ...form, sheet_lineas_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Si la hoja no es editable por tu cuenta, se creará automáticamente <code>REGISTRO_ACTIVIDADES_SUBTRANSMISION</code> en tu carpeta Drive.
            </span>
          </div>

          {/* Spreadsheet URL */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">URL DE ACCESO (LÍNEAS & TODAS LAS ACTIVIDADES)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={activitiesHref}
                onChange={(e) => setForm({ ...form, sheet_lineas_url: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <a
                href={activitiesHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg flex items-center gap-1 font-semibold shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir</span>
              </a>
            </div>
          </div>

          {/* Usuarios Spreadsheet ID & URL */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-800/50 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-emerald-300">
                  ID DE LA HOJA OFICIAL DE USUARIOS (USUARIOS.XLSX)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Incluye PASSWORD solo en Drive</span>
              </div>
              <input
                type="text"
                value={form.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX'}
                onChange={(e) => setForm({ ...form, sheet_usuarios_id: e.target.value })}
                className="w-full bg-slate-800 border border-emerald-700/60 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">URL ACCESO DIRECTO USUARIOS.XLSX</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true'}
                  onChange={(e) => setForm({ ...form, sheet_usuarios_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                />
                <a
                  href={form.sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/70 rounded-lg flex items-center gap-1 font-semibold shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir</span>
                </a>
              </div>
            </div>
          </div>

          {/* Sync Interval & Drive Folder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">SINCRONIZACIÓN PERIÓDICA</label>
              <select
                value={form.auto_sync_interval}
                onChange={(e) => setForm({ ...form, auto_sync_interval: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="0">Desactivada (Solo en tiempo real / manual)</option>
                <option value="5">Cada 5 minutos</option>
                <option value="15">Cada 15 minutos (Recomendado)</option>
                <option value="30">Cada 30 minutos</option>
                <option value="60">Cada 60 minutos</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">CARPETA RAÍZ EN DRIVE</label>
                <a
                  href={folderHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]"
                >
                  <FolderOpen className="h-3 w-3" />
                  <span>Abrir Carpeta</span>
                </a>
              </div>
              <input
                type="text"
                value={form.drive_folder_id}
                onChange={(e) => setForm({ ...form, drive_folder_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Optional Apps Script */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                URL DE GOOGLE APPS SCRIPT (Opcional)
              </label>
              <button
                type="button"
                onClick={() => { onClose(); onOpenDocs(); }}
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <FileCode className="h-3 w-3" />
                <span>Ver CódigoServidor.gs</span>
              </button>
            </div>
            <input
              type="text"
              value={form.apps_script_url || ''}
              onChange={(e) => setForm({ ...form, apps_script_url: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
            />
          </div>

          {/* Test Result Feedback */}
          {testResult && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              testResult.success ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-red-950/80 border-red-700 text-red-200'
            }`}>
              {testResult.success ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
              <span className="text-xs">{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 cursor-pointer"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
