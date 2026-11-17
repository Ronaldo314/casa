import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Shield,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Key,
  Layers,
  Phone,
  Mail,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  Lock,
  Building2,
  Check,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  EyeOff,
  Cloud
} from 'lucide-react';
import { Usuario, LineaSubtransmision, RolUsuario, Contratista, ConfiguracionAutenticacion } from '../types';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import { subscribeGoogleWorkspaceAuth, GoogleWorkspaceSession } from '../services/googleWorkspaceAuth';
import { ExcelService } from '../services/excelService';
import { CATALOGO_ACTIVIDADES } from '../data/catalogs';
import {
  ControlRegistroTableCell,
  ControlRegistroPanel,
  EstadoRegistroFilter,
  EstadoRegistroFilterValue,
  ConfirmDeleteModal
} from './ControlRegistroPanel';

interface UsuariosViewProps {
  usuarios: Usuario[];
  lineas: LineaSubtransmision[];
  currentUser: Usuario;
  onRefresh: () => void;
  onSwitchUser: (username: string) => void;
  onRequestDriveSync?: (scope?: 'activities' | 'all') => void | Promise<void>;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  lineas,
  currentUser,
  onRefresh,
  onSwitchUser,
  onRequestDriveSync
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Usuario> | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSession, setDriveSession] = useState<GoogleWorkspaceSession | null>(null);
  const [authConfig, setAuthConfig] = useState<ConfiguracionAutenticacion>(storageService.getAuthConfig());
  const contratistasList = storageService.getContratistas();
  const [estadoRegistroFilter, setEstadoRegistroFilter] = useState<EstadoRegistroFilterValue>('ACTIVO');
  const [detailUser, setDetailUser] = useState<Usuario | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<Usuario | null>(null);

  React.useEffect(() => {
    return subscribeGoogleWorkspaceAuth((s) => setDriveSession(s));
  }, []);

  const sourceUsuarios = useMemo(
    () => (estadoRegistroFilter === 'ACTIVO' ? usuarios : storageService.getUsuarios(true)),
    [usuarios, estadoRegistroFilter]
  );

  const filteredUsuarios = useMemo(() => {
    if (estadoRegistroFilter === 'TODOS') return sourceUsuarios;
    return sourceUsuarios.filter(u => (u.estado_registro || 'ACTIVO') === estadoRegistroFilter);
  }, [sourceUsuarios, estadoRegistroFilter]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleToggleSelfRegistration = () => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede modificar la política de autenticación.');
      return;
    }
    const newConfig = {
      ...authConfig,
      allow_self_registration: !authConfig.allow_self_registration
    };
    storageService.updateAuthConfig(newConfig);
    setAuthConfig(newConfig);
    showNotification(
      'success',
      newConfig.allow_self_registration
        ? 'Auto-registro habilitado en la pantalla de inicio.'
        : 'Auto-registro DESACTIVADO: Ahora solo el Administrador puede crear cuentas oficiales.'
    );
  };

  const handleSyncDriveUsers = async () => {
    setIsSyncingDrive(true);
    try {
      const res = await GoogleDriveService.syncUsuariosFromDrive();
      if (res.success) {
        showNotification('success', res.message);
        onRefresh();
      } else {
        showNotification('error', res.message);
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleExportUsuarios = () => {
    ExcelService.exportUsuarios(usuarios);
    showNotification('success', `Exportados ${usuarios.length} usuarios en formato compatible con USUARIOS.XLSX.`);
  };

  const handleStartNew = () => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede crear usuarios.');
      return;
    }
    const defaultCont = contratistasList[0];
    setPasswordInput('');
    setShowPasswordInput(false);
    setEditingUser({
      nombres: '',
      apellidos: '',
      dni: '',
      email: '',
      telefono: '',
      username: '',
      rol: 'Contratista',
      estado: 'Activo',
      contratista_id: defaultCont?.id_contratista,
      contratista_nombre: defaultCont?.razon_social,
      supervisor_responsable: 'Carlos Alberto Mendoza Silva',
      lineas_asignadas: ['L-6657C']
    });
    setIsNew(true);
    setIsEditing(true);
  };

  const handleStartEdit = (u: Usuario) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('error', 'Solo el Administrador puede editar usuarios o cambiar roles.');
      return;
    }
    const { password: _omitted, ...safeEditUser } = u;
    setPasswordInput('');
    setShowPasswordInput(false);
    setEditingUser(safeEditUser);
    setIsNew(false);
    setIsEditing(true);
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteTargetUser) return;
    const res = storageService.deleteUsuario(deleteTargetUser.id_usuario);
    if (res.success) {
      showNotification('success', res.message);
      onRefresh();
    } else {
      showNotification('error', res.message);
    }
    setDeleteTargetUser(null);
  };

  const handleToggleLine = (codLinea: string) => {
    if (!editingUser) return;
    const current = editingUser.lineas_asignadas || [];
    if (codLinea === '*') {
      setEditingUser({ ...editingUser, lineas_asignadas: current.includes('*') ? [] : ['*'] });
      return;
    }
    const filtered = current.filter(l => l !== '*');
    const exists = filtered.includes(codLinea);
    const updated = exists ? filtered.filter(l => l !== codLinea) : [...filtered, codLinea];
    setEditingUser({ ...editingUser, lineas_asignadas: updated });
  };

  const handleSave = async () => {
    if (!editingUser || !editingUser.nombres || !editingUser.username || !editingUser.email) {
      showNotification('error', 'Nombres, email y nombre de usuario son obligatorios.');
      return;
    }

    // DNI EXACT 8 DIGITS VALIDATION
    const dniClean = (editingUser.dni || '').trim();
    if (!/^\d{8}$/.test(dniClean)) {
      showNotification('error', 'El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }

    // Password validation: required on create, optional on edit (never shown on web UI)
    const cleanPassword = passwordInput.trim();
    if (isNew && cleanPassword.length < 4) {
      showNotification('error', 'Debe ingresar una contraseña (mínimo 4 caracteres) para almacenar en Google Drive.');
      return;
    }
    if (!isNew && cleanPassword.length > 0 && cleanPassword.length < 4) {
      showNotification('error', 'La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    // Contratista verification
    if (editingUser.rol === 'Contratista' && !editingUser.contratista_id && !editingUser.contratista_nombre) {
      showNotification('error', 'Debe seleccionar una empresa contratista para usuarios con rol Contratista.');
      return;
    }

    try {
      let savedUser: Usuario;
      if (isNew) {
        savedUser = storageService.addUsuario({
          nombres: editingUser.nombres,
          apellidos: editingUser.apellidos || '',
          dni: dniClean,
          email: editingUser.email,
          telefono: editingUser.telefono || '',
          username: editingUser.username.trim().toLowerCase(),
          rol: (editingUser.rol as RolUsuario) || 'Contratista',
          estado: editingUser.estado || 'Activo',
          contratista_id: editingUser.contratista_id,
          contratista_nombre: editingUser.contratista_nombre,
          supervisor_responsable: editingUser.supervisor_responsable,
          lineas_asignadas: editingUser.lineas_asignadas || ['*'],
          password: cleanPassword
        });
      } else {
        const payloadToUpdate: Partial<Usuario> = {
          ...editingUser,
          dni: dniClean
        };
        if (cleanPassword) {
          payloadToUpdate.password = cleanPassword;
        } else {
          delete payloadToUpdate.password;
        }
        storageService.updateUsuario(editingUser.id_usuario!, payloadToUpdate);
        const { password: _omitted, ...safeUser } = { ...editingUser, dni: dniClean } as Usuario;
        savedUser = safeUser;
      }

      // Immediately push user + password to server and Google Drive USUARIOS.XLSX
      const pushRes = await GoogleDriveService.pushUsuarioToDrive(savedUser, cleanPassword || undefined);
      showNotification(
        'success',
        pushRes.driveSynced
          ? `Usuario @${savedUser.username} guardado y sincronizado en Google Drive (USUARIOS.XLSX).`
          : `Usuario @${savedUser.username} guardado en el sistema. ${driveSession?.hasAccessToken ? 'Sincronización Drive completada.' : 'Conecta Google Drive arriba para subirlo a USUARIOS.XLSX.'}`
      );

      setPasswordInput('');
      setShowPasswordInput(false);
      setIsEditing(false);
      setEditingUser(null);
      onRefresh();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'Administrador':
        return 'bg-purple-950 text-purple-300 border-purple-800 font-bold';
      case 'Supervisor':
        return 'bg-blue-950 text-blue-300 border-blue-800 font-bold';
      case 'Contratista':
        return 'bg-amber-950 text-amber-300 border-amber-800 font-bold';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-red-950/80 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Administración de Usuarios y Roles (RBAC)</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {usuarios.length} usuarios
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de permisos: Administrador (Control Total), Supervisor (Líneas Asignadas), Contratista (Registro de Actividades).
          </p>
        </div>

        {currentUser.rol === 'Administrador' && (
          <button
            onClick={handleStartNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Usuario</span>
          </button>
        )}
      </div>

      {/* Google Sheets USUARIOS.XLSX Live Sync Integration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-700/50 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-600/70 text-emerald-400 mt-0.5">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm">Hoja Oficial Google Sheets: USUARIOS.XLSX</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                ID: 1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Sincronización Bidireccional
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Los usuarios se añaden y actualizan directamente desde la hoja de cálculo de Google Drive. Los cambios hechos por supervisores y contratistas se reflejan instantáneamente en toda la red.
            </p>
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncDriveUsers}
            disabled={isSyncingDrive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition cursor-pointer disabled:opacity-50"
            title="Importar y actualizar usuarios desde el archivo oficial de Google Drive"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? 'Sincronizando...' : 'Traer de Drive'}</span>
          </button>

          {onRequestDriveSync && (
            <>
              <button
                onClick={() => onRequestDriveSync('all')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition cursor-pointer"
                title="Subir todos los usuarios (con contraseñas ocultas en web) hacia USUARIOS.XLSX en Google Drive"
              >
                <Cloud className="h-4 w-4" />
                <span>Subir a Drive</span>
              </button>

              <button
                onClick={() => onRequestDriveSync('all')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/80 text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Sincronizar Usuarios y los 15 módulos de actividades con Google Drive"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-300" />
                <span>Sincronizar Todo a Google Drive</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportUsuarios}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/80 text-xs font-semibold transition cursor-pointer"
            title="Descargar libro Excel sin exponer contraseñas"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Descargar USUARIOS.xlsx</span>
          </button>

          <a
            href={storageService.getConfigDrive().sheet_usuarios_url || 'https://docs.google.com/spreadsheets/d/1ImWOATNSbkIFIefgu1em8wvPWMv_M3FX/edit?rtpof=true'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
            title="Abrir hoja de cálculo oficial en Google Drive"
          >
            <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
            <span>Abrir en Google Drive</span>
          </a>
        </div>
      </div>

      {/* Edit / New Modal */}
      {isEditing && editingUser && (
        <div className="bg-slate-800/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                {isNew ? 'Registrar Nuevo Usuario' : `Editar Usuario: ${editingUser.nombres} (@${editingUser.username})`}
              </h2>
              <p className="text-xs text-slate-400">
                Configure el rol y las líneas de subtransmisión autorizadas.
              </p>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">NOMBRES <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={editingUser.nombres || ''}
                onChange={(e) => setEditingUser({ ...editingUser, nombres: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Carlos Alberto"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">APELLIDOS</label>
              <input
                type="text"
                value={editingUser.apellidos || ''}
                onChange={(e) => setEditingUser({ ...editingUser, apellidos: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Mendoza Silva"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                DNI (8 DÍGITOS) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                maxLength={8}
                value={editingUser.dni || ''}
                onChange={(e) => setEditingUser({ ...editingUser, dni: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
                placeholder="09876543"
              />
              <span className="text-[10px] text-slate-400">
                {(editingUser.dni || '').length}/8 dígitos numéricos
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">CORREO ELECTRÓNICO <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="cmendoza@enosa.com.pe"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">TELÉFONO</label>
              <input
                type="text"
                value={editingUser.telefono || ''}
                onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                placeholder="+51 968 234 567"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NOMBRE DE USUARIO <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={editingUser.username || ''}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                disabled={!isNew}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
                placeholder="cmendoza"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                {isNew ? (
                  <>CONTRASEÑA (SOLO EN DRIVE) <span className="text-red-400">*</span></>
                ) : (
                  <>NUEVA CONTRASEÑA (OPCIONAL)</>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPasswordInput ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-emerald-700/70 rounded-lg pl-8 pr-9 py-2 text-white font-mono"
                  placeholder={isNew ? 'Mínimo 4 caracteres' : 'Dejar vacío para no cambiar'}
                />
                <Lock className="h-3.5 w-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput(!showPasswordInput)}
                  className="text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                  title="Mostrar/ocultar mientras escribe"
                >
                  {showPasswordInput ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-emerald-400/90 mt-0.5 block">
                Se almacena en Google Drive (USUARIOS.XLSX) y permanece oculta en la web.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ROL DEL SISTEMA <span className="text-red-400">*</span></label>
              <select
                value={editingUser.rol || 'Contratista'}
                onChange={(e) => {
                  const newRol = e.target.value as RolUsuario;
                  setEditingUser({
                    ...editingUser,
                    rol: newRol,
                    contratista_id: newRol === 'Contratista' ? (editingUser.contratista_id || contratistasList[0]?.id_contratista) : undefined,
                    contratista_nombre: newRol === 'Contratista' ? (editingUser.contratista_nombre || contratistasList[0]?.razon_social) : undefined
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Administrador">Administrador (Acceso Total)</option>
                <option value="Supervisor">Supervisor (Líneas Asignadas & Cierre DMS)</option>
                <option value="Contratista">Contratista (Registro de Actividades Asignadas)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
              <select
                value={editingUser.estado || 'Activo'}
                onChange={(e) => setEditingUser({ ...editingUser, estado: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">SUPERVISOR RESPONSABLE</label>
              <input
                type="text"
                value={editingUser.supervisor_responsable || ''}
                onChange={(e) => setEditingUser({ ...editingUser, supervisor_responsable: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ing. Carlos Mendoza Silva"
              />
            </div>

            {/* Selector de Contratista cuando el rol es Contratista */}
            {editingUser.rol === 'Contratista' && (
              <div className="lg:col-span-3 bg-amber-950/40 p-4 rounded-xl border border-amber-700/70">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-amber-300">
                    EMPRESA CONTRATISTA VINCULADA <span className="text-red-400">*</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  El usuario contratista visualizará exclusivamente los formularios de las actividades asignadas a la empresa seleccionada:
                </p>
                <select
                  value={editingUser.contratista_id || ''}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const selectedC = contratistasList.find(c => c.id_contratista === cId);
                    setEditingUser({
                      ...editingUser,
                      contratista_id: cId,
                      contratista_nombre: selectedC?.razon_social || ''
                    });
                  }}
                  className="w-full bg-slate-950 border border-amber-600 rounded-xl px-3 py-2 text-amber-200 font-bold"
                >
                  <option value="">-- Seleccione la empresa contratista --</option>
                  {contratistasList.map(c => (
                    <option key={c.id_contratista} value={c.id_contratista}>
                      {c.razon_social} (RUC {c.ruc}) — {c.actividades_asignadas.length} actividades
                    </option>
                  ))}
                </select>

                {/* Preview de actividades autorizadas para esta empresa */}
                {editingUser.contratista_id && (
                  <div className="mt-3 pt-3 border-t border-amber-800/40">
                    <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                      Actividades que este usuario podrá visualizar y registrar al iniciar sesión:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const selC = contratistasList.find(c => c.id_contratista === editingUser.contratista_id);
                        return (selC?.actividades_asignadas || []).map(actId => {
                          const actInfo = CATALOGO_ACTIVIDADES.find(a => a.id === actId);
                          return (
                            <span
                              key={actId}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> {actInfo?.nombre || actId}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Line Selection */}
            <div className="lg:col-span-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">LÍNEAS DE SUBTRANSMISIÓN ASIGNADAS:</span>
                <button
                  type="button"
                  onClick={() => handleToggleLine('*')}
                  className={`px-3 py-1 rounded text-xs font-bold border transition ${
                    (editingUser.lineas_asignadas || []).includes('*')
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {(editingUser.lineas_asignadas || []).includes('*') ? '✓ Todas las líneas autorizadas' : 'Autorizar Todas'}
                </button>
              </div>

              {!(editingUser.lineas_asignadas || []).includes('*') && (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {Array.from(new Set(lineas.map(l => l.cod_linea))).map(lineCode => {
                    const isChecked = (editingUser.lineas_asignadas || []).includes(lineCode);
                    return (
                      <button
                        type="button"
                        key={lineCode}
                        onClick={() => handleToggleLine(lineCode)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition ${
                          isChecked
                            ? 'bg-blue-950 text-cyan-300 border-cyan-600'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '} {lineCode}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {!isNew && (
            <div className="mt-5">
              <ControlRegistroPanel record={editingUser} compact />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
            >
              Guardar Usuario
            </button>
          </div>
        </div>
      )}

      {/* Configuración de Autenticación y Registro (Solo Administrador) */}
      {currentUser.rol === 'Administrador' && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Configuración de Autenticación y Auto-Registro
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  authConfig.allow_self_registration
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}>
                  {authConfig.allow_self_registration ? 'Auto-Registro Habilitado' : 'Solo Administrador Crea Cuentas'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {authConfig.allow_self_registration
                  ? 'Cualquier usuario puede registrarse desde la pantalla de bienvenida. Desactive esta opción para que solo el Administrador cree cuentas.'
                  : 'Modo seguro activo: El auto-registro está bloqueado. Únicamente el Administrador puede registrar o asignar roles a usuarios.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSelfRegistration}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 ${
              authConfig.allow_self_registration
                ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700'
                : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-700'
            }`}
          >
            {authConfig.allow_self_registration ? (
              <>
                <ToggleRight className="h-4 w-4" />
                <span>Desactivar Auto-registro</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4" />
                <span>Habilitar Auto-registro</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Listado de Usuarios ({filteredUsuarios.length})
          </span>
          <EstadoRegistroFilter value={estadoRegistroFilter} onChange={setEstadoRegistroFilter} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">USUARIO / NOMBRE</th>
                <th className="px-3 py-3">ROL & EMPRESA</th>
                <th className="px-3 py-3">CONTACTO</th>
                <th className="px-3 py-3">SUPERVISOR</th>
                <th className="px-4 py-3">LÍNEAS ASIGNADAS</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3">CONTROL DE REGISTRO</th>
                <th className="px-4 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron usuarios con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u, uIdx) => {
                  const isDeleted = u.estado_registro === 'ELIMINADO';
                  return (
                  <tr key={u.id_usuario ? `${u.id_usuario}-${u.username}-${uIdx}` : `usr-${uIdx}`} className={isDeleted ? 'opacity-70 bg-rose-950/15 hover:bg-rose-950/25 transition' : 'hover:bg-slate-750/70 transition'}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm">{u.nombres} {u.apellidos}</div>
                      <div className="text-[11px] text-cyan-400 font-mono">@{u.username} • DNI: {u.dni || '-'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getRoleBadge(u.rol)}`}>
                        {u.rol}
                      </span>
                      {u.rol === 'Contratista' && (
                        <div className="text-[10px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0 text-amber-400" />
                          <span className="truncate max-w-[140px]" title={u.contratista_nombre || 'Contratista'}>
                            {u.contratista_nombre || 'Contratista Asignado'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      <div className="text-slate-200">{u.email}</div>
                      <div className="text-[10px]">{u.telefono}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {u.supervisor_responsable || '-'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {u.lineas_asignadas.includes('*') ? (
                        <span className="text-[10px] font-semibold text-emerald-400">Todas las líneas (Acceso General)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.lineas_asignadas.map((l, lIdx) => (
                            <span key={`${l}-${lIdx}`} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.estado === 'Activo'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ControlRegistroTableCell record={u} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailUser(u)}
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300"
                          title="Ver detalle y control de registro"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!isDeleted && (
                          <button
                            onClick={() => onSwitchUser(u.username)}
                            className="px-2 py-1 rounded bg-slate-700 hover:bg-cyan-900 text-[10px] text-cyan-300 font-semibold border border-slate-600 transition"
                            title="Simular sesión como este usuario"
                          >
                            Iniciar como
                          </button>
                        )}
                        {!isDeleted && currentUser.rol === 'Administrador' && (
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-amber-400"
                            title="Editar usuario"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isDeleted && currentUser.rol === 'Administrador' && currentUser.id_usuario !== u.id_usuario && (
                          <button
                            onClick={() => setDeleteTargetUser(u)}
                            className="p-1.5 rounded bg-slate-700 hover:bg-red-900 text-red-400"
                            title="Eliminar lógicamente usuario"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ver Detalle de Usuario */}
      {detailUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                <span>Detalle de Usuario: {detailUser.nombres} {detailUser.apellidos} (@{detailUser.username})</span>
              </h3>
              <button onClick={() => setDetailUser(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                  <tr><th className="px-3 py-2 w-1/3">Información</th><th className="px-3 py-2">Valor</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Nombre / Usuario</td><td className="px-3 py-2 font-bold text-white">{detailUser.nombres} {detailUser.apellidos} (@{detailUser.username})</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">DNI / Rol</td><td className="px-3 py-2 font-mono">{detailUser.dni || '-'} • {detailUser.rol}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Correo / Teléfono</td><td className="px-3 py-2">{detailUser.email} • {detailUser.telefono || '-'}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Contratista Vinculada</td><td className="px-3 py-2">{detailUser.contratista_nombre || 'N/A'}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Líneas Asignadas</td><td className="px-3 py-2 font-mono">{detailUser.lineas_asignadas.includes('*') ? 'Todas (*)' : detailUser.lineas_asignadas.join(', ')}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Estado</td><td className="px-3 py-2 font-bold">{detailUser.estado}</td></tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400 font-semibold">Contraseña</td>
                    <td className="px-3 py-2 text-emerald-300 font-medium flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Protegida — Almacenada únicamente en Google Drive (oculta en web)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ControlRegistroPanel record={detailUser} />
            <div className="flex justify-end pt-2">
              <button onClick={() => setDetailUser(null)} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetUser)}
        recordLabel={deleteTargetUser ? `${deleteTargetUser.nombres} ${deleteTargetUser.apellidos} (@${deleteTargetUser.username})` : ''}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setDeleteTargetUser(null)}
      />
    </div>
  );
};
