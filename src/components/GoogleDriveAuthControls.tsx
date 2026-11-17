import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  RefreshCw,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ConfiguracionDrive } from '../types';
import { GoogleDriveService } from '../services/googleDriveService';
import {
  subscribeGoogleWorkspaceAuth,
  GoogleWorkspaceSession
} from '../services/googleWorkspaceAuth';
import type { BulkModuleKey } from '../services/bulkExcelImportService';

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Official Google Sign-In button markup & classes following Google Identity guidelines
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  disabled = false,
  label = 'Sign in with Google'
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="gsi-material-button"
    >
      <div className="gsi-material-button-state"></div>
      <div className="gsi-material-button-content-wrapper">
        <div className="gsi-material-button-icon">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            style={{ display: 'block' }}
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            ></path>
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            ></path>
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            ></path>
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            ></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
        </div>
        <span className="gsi-material-button-contents">{label}</span>
        <span style={{ display: 'none' }}>{label}</span>
      </div>
    </button>
  );
};

interface ConfirmDriveSyncModalProps {
  isOpen: boolean;
  googleEmail?: string | null;
  config: ConfiguracionDrive;
  mode: 'authorize_auto' | 'manual_push';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Explicit user confirmation dialog required before writing or overwriting Drive / Sheets files
 */
export const ConfirmDriveSyncModal: React.FC<ConfirmDriveSyncModalProps> = ({
  isOpen,
  googleEmail,
  config,
  mode,
  isProcessing = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-600/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'authorize_auto'
                  ? 'Confirmar Sincronización Automática con Google Drive'
                  : 'Confirmar Actualización en Google Drive y Sheets'}
              </h3>
              <p className="text-xs text-slate-400">
                Cuenta conectada: <strong className="text-cyan-300">{googleEmail || 'Google Workspace'}</strong>
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white" disabled={isProcessing}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Al confirmar, la plataforma actualizará y sobrescribirá las hojas correspondientes en su cuenta de Google Drive para reflejar todos los registros web en tiempo real:
            </span>
          </div>

          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Archivo Oficial de Usuarios (USUARIOS.XLSX)</div>
                <div className="text-[11px] text-slate-400 font-mono break-all">
                  ID: {config.sheet_usuarios_id || '1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX'}
                </div>
                <div className="text-[11px] text-emerald-300 mt-0.5">
                  Sincronizará todos los usuarios registrados (incluyendo la columna PASSWORD almacenada únicamente en Drive y oculta en web).
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80">
              <FileSpreadsheet className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Líneas y Todas las Actividades del Sistema</div>
                <div className="text-[11px] text-slate-400 font-mono break-all">
                  Hoja Principal: {config.sheet_lineas_id}
                </div>
                <div className="text-[11px] text-cyan-300 mt-0.5">
                  Actualizará las hojas de Líneas, Estructuras, Deficiencias, Puesta a Tierra, Efecto Corona, Termografía, Control de Podas, Mantenimiento, Hidrolavado, Órdenes de Mantenimiento, DMS, Levantamientos DMS, Inspecciones DMS, Contratistas y Auditoría.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Su token de acceso OAuth permanece únicamente en memoria de esta sesión y nunca se guarda en almacenamiento persistente del navegador.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            <span>
              {isProcessing
                ? 'Sincronizando con Drive...'
                : mode === 'authorize_auto'
                ? 'Confirmar y Sincronizar Automáticamente'
                : 'Confirmar y Subir a Drive'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ModuleDriveSyncButtonsProps {
  moduleLabel: string;
  onRequestDriveSync?: (scope?: 'activities' | 'all') => void | Promise<void>;
  onNotify?: (type: 'success' | 'error', message: string) => void;
  bulkModuleKey?: BulkModuleKey | 'AUTO_MULTI_SHEET';
  onOpenBulkImport?: (moduleKey: BulkModuleKey | 'AUTO_MULTI_SHEET') => void;
}

/**
 * Reusable manual Drive action buttons displayed across activity modules and Drive configuration.
 * Provides "Carga Masiva Excel", "Subir a Drive", and "Sincronizar Todo a Google Drive".
 */
export const ModuleDriveSyncButtons: React.FC<ModuleDriveSyncButtonsProps> = ({
  moduleLabel,
  onRequestDriveSync,
  onNotify,
  bulkModuleKey,
  onOpenBulkImport
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [driveSession, setDriveSession] = useState<GoogleWorkspaceSession | null>(null);

  useEffect(() => {
    return subscribeGoogleWorkspaceAuth((s) => setDriveSession(s));
  }, []);

  const handleUploadModule = async () => {
    setIsUploading(true);
    try {
      if (onRequestDriveSync) {
        await onRequestDriveSync('activities');
      } else {
        const res = await GoogleDriveService.pushAllActivitiesToDrive();
        onNotify?.(res.success ? 'success' : 'error', res.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      if (onRequestDriveSync) {
        await onRequestDriveSync('all');
      } else {
        const res = await GoogleDriveService.pushAllToDrive();
        onNotify?.(res.success ? 'success' : 'error', res.message);
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  const isConnected = Boolean(driveSession?.hasAccessToken);

  return (
    <>
      {bulkModuleKey && onOpenBulkImport && (
        <button
          type="button"
          onClick={() => onOpenBulkImport(bulkModuleKey)}
          disabled={isUploading || isSyncingAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/80 text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          title={`Carga masiva desde archivo Excel para ${moduleLabel}`}
        >
          <FileSpreadsheet className="h-4 w-4 text-indigo-300" />
          <span>Carga Masiva Excel</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleUploadModule}
        disabled={isUploading || isSyncingAll}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-900/80 hover:bg-teal-800 text-teal-200 border border-teal-700/80 text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
        title={`Subir registros de ${moduleLabel} y hojas de actividades a Google Drive`}
      >
        <CloudUpload className={`h-4 w-4 text-teal-300 ${isUploading ? 'animate-pulse' : ''}`} />
        <span>{isUploading ? 'Subiendo...' : 'Subir a Drive'}</span>
      </button>

      <button
        type="button"
        onClick={handleSyncAll}
        disabled={isUploading || isSyncingAll}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/80 text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
        title={
          isConnected
            ? 'Sincronizar Usuarios (USUARIOS.XLSX) y los 15 módulos de actividades con Google Drive'
            : 'Conectar Google Drive y sincronizar todo el sistema'
        }
      >
        <RefreshCw className={`h-3.5 w-3.5 text-cyan-300 ${isSyncingAll ? 'animate-spin' : ''}`} />
        <span>Sincronizar Todo a Google Drive</span>
      </button>
    </>
  );
};

