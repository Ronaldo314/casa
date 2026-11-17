/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Zap,
  TowerControl as Tower,
  Activity,
  AlertTriangle,
  Flame,
  Scissors,
  Wrench,
  ShieldCheck,
  Camera,
  FileText,
  History,
  Users,
  Settings,
  ChevronRight,
  Menu,
  X,
  Radio,
  Bell,
  ClipboardList,
  Building2,
  Droplets
} from 'lucide-react';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { LineasView } from './components/LineasView';
import { EstructurasView } from './components/EstructurasView';
import { CoronaView } from './components/CoronaView';
import { DeficienciasView } from './components/DeficienciasView';
import { TermografiaView } from './components/TermografiaView';
import { PodasView } from './components/PodasView';
import { MantenimientoView } from './components/MantenimientoView';
import { DMSView } from './components/DMSView';
import { OrdenesMantenimientoView } from './components/OrdenesMantenimientoView';
import { PuestaTierraView } from './components/PuestaTierraView';
import { EvidenciasView } from './components/EvidenciasView';
import { ReportesView } from './components/ReportesView';
import { AuditoriaView } from './components/AuditoriaView';
import { UsuariosView } from './components/UsuariosView';
import { ContratistasView } from './components/ContratistasView';
import { HidrolavadoView } from './components/HidrolavadoView';
import { ConfiguracionDriveModal } from './components/ConfiguracionDriveModal';
import { ConflictosModal } from './components/ConflictosModal';
import { DocsGuiaModal } from './components/DocsGuiaModal';
import { PhotoModal } from './components/PhotoModal';
import { ConfirmDriveSyncModal } from './components/GoogleDriveAuthControls';
import { BulkExcelImportModal } from './components/BulkExcelImportModal';
import type { BulkModuleKey } from './services/bulkExcelImportService';
import { storageService } from './services/storageService';
import { GoogleDriveService } from './services/googleDriveService';
import { realtimeService, LiveNotification } from './services/realtimeService';
import {
  subscribeGoogleWorkspaceAuth,
  googleSignInForWorkspace,
  googleLogoutFromWorkspace,
  setDriveWriteConfirmed,
  GoogleWorkspaceSession
} from './services/googleWorkspaceAuth';
import {
  LineaSubtransmision,
  Estructura,
  EfectoCorona,
  Deficiencia,
  Termografia,
  Poda,
  Mantenimiento,
  DMSItem,
  LevantamientoDMS,
  InspeccionCierreDMS,
  AuditoriaRegistro,
  Usuario,
  ConfiguracionDrive,
  ConflictoRegistro,
  PuestaTierra,
  OrdenMantenimiento,
  Contratista,
  Hidrolavado
} from './types';


export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('st_auth_user');
  });
  const [currentUser, setCurrentUser] = useState<Usuario>(() => {
    const saved = localStorage.getItem('st_auth_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return storageService.getCurrentUser();
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('TODAS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App State from storageService
  const [lineas, setLineas] = useState<LineaSubtransmision[]>([]);
  const [estructuras, setEstructuras] = useState<Estructura[]>([]);
  const [corona, setCorona] = useState<EfectoCorona[]>([]);
  const [deficiencias, setDeficiencias] = useState<Deficiencia[]>([]);
  const [puestaTierra, setPuestaTierra] = useState<PuestaTierra[]>([]);
  const [termografia, setTermografia] = useState<Termografia[]>([]);
  const [podas, setPodas] = useState<Poda[]>([]);
  const [mantenimiento, setMantenimiento] = useState<Mantenimiento[]>([]);
  const [ordenesMantenimiento, setOrdenesMantenimiento] = useState<OrdenMantenimiento[]>([]);
  const [dms, setDMS] = useState<DMSItem[]>([]);
  const [levantamientos, setLevantamientos] = useState<LevantamientoDMS[]>([]);
  const [inspecciones, setInspecciones] = useState<InspeccionCierreDMS[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [hidrolavado, setHidrolavado] = useState<Hidrolavado[]>([]);
  const [simulatedContractor, setSimulatedContractor] = useState<Contratista | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaRegistro[]>([]);
  const [configDrive, setConfigDrive] = useState<ConfiguracionDrive>(storageService.getConfigDrive());
  const [conflictos, setConflictos] = useState<ConflictoRegistro[]>([]);

  // Real-time live toasts
  const [liveToasts, setLiveToasts] = useState<LiveNotification[]>([]);

  // Modals state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConflictosOpen, setIsConflictosOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [driveSession, setDriveSession] = useState<GoogleWorkspaceSession | null>(null);
  const [confirmDriveModal, setConfirmDriveModal] = useState<{
    isOpen: boolean;
    mode: 'authorize_auto' | 'manual_push';
    scope?: 'activities' | 'all';
  }>({ isOpen: false, mode: 'authorize_auto', scope: 'all' });
  const [isSyncingAllDrive, setIsSyncingAllDrive] = useState(false);
  const [bulkImportModal, setBulkImportModal] = useState<{
    isOpen: boolean;
    initialModule: BulkModuleKey | 'AUTO_MULTI_SHEET';
  }>({ isOpen: false, initialModule: 'LINEAS' });
  const [photoModalData, setPhotoModalData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const refreshState = useCallback(() => {
    setLineas([...storageService.getLineas()]);
    setEstructuras([...storageService.getEstructuras()]);
    setCorona([...storageService.getCorona()]);
    setDeficiencias([...storageService.getDeficiencias()]);
    setPuestaTierra([...storageService.getPuestaTierra()]);
    setTermografia([...storageService.getTermografia()]);
    setPodas([...storageService.getPodas()]);
    setMantenimiento([...storageService.getMantenimiento()]);
    setOrdenesMantenimiento([...storageService.getOrdenesMantenimiento()]);
    setDMS([...storageService.getDMS()]);
    setLevantamientos([...storageService.getLevantamientos()]);
    setInspecciones([...storageService.getInspecciones()]);
    setUsuarios([...storageService.getUsuarios()]);
    setContratistas([...storageService.getContratistas()]);
    setHidrolavado([...storageService.getHidrolavado()]);
    setAuditoria([...storageService.getAuditoria()]);
    setConfigDrive({ ...storageService.getConfigDrive() });
    setConflictos([...storageService.getConflictos()]);
  }, []);


  // Connect to Realtime WebSocket and listen for remote updates
  useEffect(() => {
    refreshState();

    const unsubStorage = storageService.onStateChange(() => {
      refreshState();
    });

    if (isAuthenticated && currentUser) {
      realtimeService.connect(currentUser);
      realtimeService.identify(currentUser, activeTab, selectedLineFilter);
      void storageService.syncWithServer();
    }

    // Subscribe to state updates from server / other users
    const unsubState = realtimeService.onStateUpdate(() => {
      refreshState();
    });

    // Subscribe to live notifications from other users
    const unsubNotif = realtimeService.onNotification((notif) => {
      setLiveToasts(prev => [notif, ...prev.slice(0, 4)]);
      setTimeout(() => {
        setLiveToasts(prev => prev.filter(n => n.id !== notif.id));
      }, 7000);
    });

    // Subscribe to Google Drive OAuth session & automatic Drive push on local mutations
    const unsubDrive = subscribeGoogleWorkspaceAuth((s) => {
      setDriveSession(s);
    });

    const unsubMutation = realtimeService.onLocalMutation((entity) => {
      if (entity === 'config_drive' || entity === 'auth_config') return;
      GoogleDriveService.scheduleAutoPush(entity === 'usuarios' ? 'usuarios' : 'activities');
    });

    return () => {
      unsubStorage();
      unsubState();
      unsubNotif();
      unsubDrive();
      unsubMutation();
    };
  }, [isAuthenticated, refreshState]);

  // Update presence whenever user switches module or line filter
  useEffect(() => {
    if (isAuthenticated) {
      realtimeService.updatePresence(activeTab, selectedLineFilter);
    }
  }, [activeTab, selectedLineFilter, isAuthenticated]);

  const pushToast = useCallback((title: string, message: string, userLabel = 'Google Drive Sync') => {
    const id = 'TOAST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setLiveToasts(prev => [
      {
        id,
        title,
        message,
        user: userLabel,
        timestamp: new Date().toTimeString().slice(0, 8)
      },
      ...prev.slice(0, 4)
    ]);
    setTimeout(() => {
      setLiveToasts(prev => prev.filter(n => n.id !== id));
    }, 7000);
  }, []);

  const handleOpenBulkImport = useCallback((moduleKey: BulkModuleKey | 'AUTO_MULTI_SHEET' = 'AUTO_MULTI_SHEET') => {
    setBulkImportModal({ isOpen: true, initialModule: moduleKey });
  }, []);

  const handleRequestGoogleConnect = async (scope: 'activities' | 'all' = 'all') => {
    const res = await googleSignInForWorkspace();
    if (res.success) {
      setConfirmDriveModal({ isOpen: true, mode: 'authorize_auto', scope });
    } else if (res.error) {
      pushToast('Autorización Google Drive', res.error, 'Google OAuth');
    }
  };

  const handleRequestDriveSync = async (scope: 'activities' | 'all' = 'all') => {
    if (!driveSession?.hasAccessToken) {
      await handleRequestGoogleConnect(scope);
      return;
    }

    if (scope === 'activities' && driveSession.driveWriteConfirmed) {
      const res = await GoogleDriveService.pushAllActivitiesToDrive();
      if (res.needsAuth) {
        setDriveWriteConfirmed(false);
        await handleRequestGoogleConnect('activities');
        return;
      }
      refreshState();
      pushToast(
        res.success ? 'Subida a Google Drive Completada' : 'Aviso Google Drive',
        res.message,
        driveSession?.user?.email || 'Google Drive'
      );
      return;
    }

    setConfirmDriveModal({
      isOpen: true,
      mode: driveSession.driveWriteConfirmed ? 'manual_push' : 'authorize_auto',
      scope
    });
  };

  const handleConfirmDriveSync = async () => {
    setIsSyncingAllDrive(true);
    try {
      setDriveWriteConfirmed(true);
      const res =
        confirmDriveModal.mode === 'manual_push' && confirmDriveModal.scope === 'activities'
          ? await GoogleDriveService.pushAllActivitiesToDrive()
          : await GoogleDriveService.pushAllToDrive();
      if (res.needsAuth) {
        setDriveWriteConfirmed(false);
        setConfirmDriveModal({ isOpen: false, mode: 'authorize_auto', scope: 'all' });
        await handleRequestGoogleConnect(confirmDriveModal.scope || 'all');
        return;
      }
      setConfirmDriveModal({ isOpen: false, mode: 'manual_push', scope: 'all' });
      refreshState();
      pushToast(
        res.success ? 'Google Drive Actualizado' : 'Aviso Google Drive',
        res.message,
        driveSession?.user?.email || 'Google Drive'
      );
    } finally {
      setIsSyncingAllDrive(false);
    }
  };

  const handleLoginSuccess = async (user: Usuario) => {
    setCurrentUser(user);
    setSimulatedContractor(null);
    setSelectedLineFilter('TODAS');
    storageService.setCurrentUser(user);
    setIsAuthenticated(true);
    realtimeService.connect(user);
    await storageService.syncWithServer();
    refreshState();
  };

  const handleLogout = async () => {
    await realtimeService.flushPendingMutations();
    realtimeService.disconnect();
    storageService.logout();
    googleLogoutFromWorkspace();
    setSimulatedContractor(null);
    setSelectedLineFilter('TODAS');
    setIsAuthenticated(false);
  };

  const handleSwitchUser = (username: string) => {
    storageService.setCurrentUser(username);
    const updated = storageService.getCurrentUser();
    setCurrentUser(updated);
    realtimeService.identify(updated, activeTab, selectedLineFilter);
    refreshState();
  };

  const handleOpenPhoto = (url: string, title: string) => {
    setPhotoModalData({ isOpen: true, url, title });
  };

  const handleClosePhoto = () => {
    setPhotoModalData({ isOpen: false, url: '', title: '' });
  };

  // Simulated Contractor Mode (Allows Administrator to preview exact contractor views)
  const effectiveUser = useMemo<Usuario>(() => {
    if (simulatedContractor && currentUser.rol === 'Administrador') {
      return {
        id_usuario: 'USR-SIM-' + simulatedContractor.id_contratista,
        nombres: simulatedContractor.representante?.split(' ')[0] || 'Contratista',
        apellidos: simulatedContractor.razon_social,
        dni: '20529841',
        email: simulatedContractor.correo,
        telefono: simulatedContractor.telefono,
        username: 'sim_' + simulatedContractor.id_contratista.toLowerCase(),
        rol: 'Contratista',
        estado: 'Activo',
        contratista_id: simulatedContractor.id_contratista,
        contratista_nombre: simulatedContractor.razon_social,
        lineas_asignadas: ['*'],
        fecha_creacion: '2026-01-01'
      };
    }
    return currentUser;
  }, [currentUser, simulatedContractor]);

  // Compute authorized tabs based on effective role and matrix
  const authorizedTabs = useMemo(() => {
    return storageService.getAuthorizedTabs(effectiveUser);
  }, [effectiveUser, contratistas]);

  // Ensure active tab is permitted; if not, redirect to first allowed tab
  useEffect(() => {
    if (authorizedTabs.length > 0 && !authorizedTabs.includes(activeTab)) {
      setActiveTab(authorizedTabs[0]);
    }
  }, [authorizedTabs, activeTab]);

  // Available lines based on current user permissions (deduplicated by code)
  const availableLines = useMemo(() => {
    const list = storageService.getAccessibleLines().map(l => l.cod_linea);
    return Array.from(new Set(list));
  }, [lineas, effectiveUser]);

  // If not logged in, show the Login View first
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} allUsuarios={usuarios} />;
  }

  // All navigation menu items
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard, badge: null },
    { id: 'lineas', label: 'Líneas Subtransmisión', icon: Zap, badge: lineas.length },
    { id: 'estructuras', label: 'Planilla de Estructuras', icon: Tower, badge: estructuras.length },
    { id: 'corona', label: 'Efecto Corona (UV)', icon: Activity, badge: corona.length },
    { id: 'deficiencias', label: 'Deficiencias Técnicas', icon: AlertTriangle, badge: deficiencias.length },
    { id: 'puesta_tierra', label: 'Puesta a Tierra (PAT)', icon: ShieldCheck, badge: puestaTierra.length },
    { id: 'termografia', label: 'Termografía Infrarroja', icon: Flame, badge: termografia.length },
    { id: 'podas', label: 'Control de Podas', icon: Scissors, badge: podas.length },
    { id: 'mantenimiento', label: 'Mantenimiento / Postes', icon: Wrench, badge: mantenimiento.length },
    { id: 'hidrolavado', label: 'Hidrolavado Aislamiento', icon: Droplets, badge: hidrolavado.length },
    { id: 'ordenes_om', label: 'Órdenes de Mantenimiento', icon: ClipboardList, badge: ordenesMantenimiento.length },
    { id: 'dms', label: 'Gestión de DMS', icon: ShieldCheck, badge: dms.length },
    { id: 'evidencias', label: 'Evidencias Fotográficas', icon: Camera, badge: null },
    { id: 'contratistas', label: 'Empresas Contratistas', icon: Building2, badge: contratistas.length },
    { id: 'reportes', label: 'Centro de Reportes', icon: FileText, badge: '15' },
    { id: 'auditoria', label: 'Auditoría del Sistema', icon: History, badge: null },
    { id: 'usuarios', label: 'Usuarios y Roles', icon: Users, badge: usuarios.length }
  ];

  // Dynamic filter: only show tabs that the current user or simulated contractor is authorized to access
  const navItems = allNavItems.filter(item => authorizedTabs.includes(item.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentUser={effectiveUser}
        usuarios={usuarios}
        onSwitchUser={handleSwitchUser}
        config={configDrive}
        conflictos={conflictos}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenConflictos={() => setIsConflictosOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onSyncComplete={refreshState}
        onRequestGoogleConnect={handleRequestGoogleConnect}
        onRequestDriveSync={handleRequestDriveSync}
        selectedLineFilter={selectedLineFilter}
        onSelectLineFilter={setSelectedLineFilter}
        availableLines={availableLines}
        onLogout={handleLogout}
      />

      {/* Floating Real-Time Notifications Toast Container */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
        {liveToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>{toast.title}</span>
              </div>
              <button
                onClick={() => setLiveToasts(prev => prev.filter(n => n.id !== toast.id))}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-200 mt-1 font-medium">{toast.message}</p>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Por: <strong className="text-slate-300">{toast.user}</strong></span>
              <span className="font-mono">{toast.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex-shrink-0 hidden lg:flex flex-col justify-between p-3 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Módulos Operativos
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Card in Sidebar with Live Google Drive & Multi-user status */}
          <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase">Google Drive & Sheets</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  driveSession?.hasAccessToken && driveSession?.driveWriteConfirmed
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400'
                }`}
              />
            </div>
            <div className="text-[11px] font-mono text-cyan-300 truncate" title={configDrive.sheet_activities_id || configDrive.sheet_lineas_id}>
              {driveSession?.hasAccessToken
                ? driveSession.user?.email || 'Google Conectado'
                : 'Sin sesión Google Drive'}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleRequestDriveSync('all')}
                className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[10px] font-bold transition cursor-pointer"
              >
                {driveSession?.hasAccessToken
                  ? driveSession.driveWriteConfirmed
                    ? 'Sincronizar Drive Ahora'
                    : 'Autorizar Auto-Sync'
                  : 'Conectar Google Drive'}
              </button>
              <a
                href={configDrive.drive_folder_url || configDrive.sheet_activities_url || configDrive.sheet_lineas_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400 hover:underline text-center truncate"
              >
                Abrir archivos en Drive ↗
              </a>
            </div>
          </div>
        </aside>

        {/* Mobile Nav Drawer toggle */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-3.5 bg-cyan-600 text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/80 z-30 p-4 pt-16 flex flex-col justify-end">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-h-[80vh] overflow-y-auto space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950 space-y-4">
          {/* Active Simulation Notification Banner */}
          {simulatedContractor && (
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border border-amber-600/80 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Modo Simulación de Contratista Activo
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      {simulatedContractor.actividades_asignadas.length} actividades permitidas
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Visualizando plataforma como <strong>{simulatedContractor.razon_social}</strong> (RUC: {simulatedContractor.ruc}). Los formularios no autorizados para esta contratista han sido ocultados de la barra lateral.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSimulatedContractor(null)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition cursor-pointer shrink-0"
              >
                ✕ Salir de Simulación
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              lineas={lineas}
              estructuras={estructuras}
              corona={corona}
              deficiencias={deficiencias}
              puestaTierra={puestaTierra}
              termografia={termografia}
              podas={podas}
              mantenimiento={mantenimiento}
              ordenesMantenimiento={ordenesMantenimiento}
              dms={dms}
              configDrive={configDrive}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'lineas' && (
            <LineasView
              lineas={lineas}
              currentUser={effectiveUser}
              configDrive={configDrive}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onSelectLineDetail={(cod) => {
                setSelectedLineFilter(cod);
                setActiveTab('estructuras');
              }}
            />
          )}

          {activeTab === 'estructuras' && (
            <EstructurasView
              estructuras={estructuras}
              lineas={lineas}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onViewActivityHistory={(cod, pos) => {
                setSelectedLineFilter(cod);
                setActiveTab('reportes');
              }}
            />
          )}

          {activeTab === 'corona' && (
            <CoronaView
              corona={corona}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'deficiencias' && (
            <DeficienciasView
              deficiencias={deficiencias}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'puesta_tierra' && (
            <PuestaTierraView
              puestaTierraList={puestaTierra}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
              onGoToDeficiencias={() => setActiveTab('deficiencias')}
            />
          )}


          {activeTab === 'termografia' && (
            <TermografiaView
              termografia={termografia}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'podas' && (
            <PodasView
              podas={podas}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'mantenimiento' && (
            <MantenimientoView
              mantenimiento={mantenimiento}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'hidrolavado' && (
            <HidrolavadoView
              hidrolavado={hidrolavado}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'ordenes_om' && (
            <OrdenesMantenimientoView
              ordenes={ordenesMantenimiento}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'dms' && (
            <DMSView
              dmsList={dms}
              levantamientos={levantamientos}
              inspecciones={inspecciones}
              lineas={lineas}
              estructuras={estructuras}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'evidencias' && (
            <EvidenciasView
              lineas={lineas}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
              onOpenPhoto={handleOpenPhoto}
            />
          )}

          {activeTab === 'contratistas' && (
            <ContratistasView
              contratistas={contratistas}
              currentUser={effectiveUser}
              onRefresh={refreshState}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
              onSimulateContractor={(c) => {
                setSimulatedContractor(c);
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesView
              lineas={lineas}
              estructuras={estructuras}
              corona={corona}
              deficiencias={deficiencias}
              termografia={termografia}
              podas={podas}
              mantenimiento={mantenimiento}
              dms={dms}
              levantamientos={levantamientos}
              inspecciones={inspecciones}
              auditoria={auditoria}
              puestaTierra={puestaTierra}
              currentUser={effectiveUser}
              selectedLine={selectedLineFilter}
              onSelectLine={setSelectedLineFilter}
            />
          )}

          {activeTab === 'auditoria' && (
            <AuditoriaView
              auditoria={auditoria}
              currentUser={effectiveUser}
              onRequestDriveSync={handleRequestDriveSync}
              onOpenBulkImport={handleOpenBulkImport}
            />
          )}

          {activeTab === 'usuarios' && (
            <UsuariosView
              usuarios={usuarios}
              lineas={lineas}
              currentUser={effectiveUser}
              onRefresh={refreshState}
              onSwitchUser={handleSwitchUser}
              onRequestDriveSync={handleRequestDriveSync}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ConfiguracionDriveModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={configDrive}
        onRefresh={refreshState}
        onOpenDocs={() => setIsDocsOpen(true)}
        onRequestDriveSync={handleRequestDriveSync}
        onOpenBulkImport={handleOpenBulkImport}
      />

      <BulkExcelImportModal
        isOpen={bulkImportModal.isOpen}
        initialModule={bulkImportModal.initialModule}
        currentUser={effectiveUser}
        onClose={() => setBulkImportModal(prev => ({ ...prev, isOpen: false }))}
        onImportComplete={refreshState}
        onRequestDriveSync={handleRequestDriveSync}
        onToast={pushToast}
      />

      <ConfirmDriveSyncModal
        isOpen={confirmDriveModal.isOpen}
        googleEmail={driveSession?.user?.email}
        config={configDrive}
        mode={confirmDriveModal.mode}
        isProcessing={isSyncingAllDrive}
        onConfirm={handleConfirmDriveSync}
        onCancel={() => setConfirmDriveModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ConflictosModal
        isOpen={isConflictosOpen}
        onClose={() => setIsConflictosOpen(false)}
        conflictos={conflictos}
        onRefresh={refreshState}
      />

      <DocsGuiaModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <PhotoModal
        isOpen={photoModalData.isOpen}
        onClose={handleClosePhoto}
        photoUrl={photoModalData.url}
        title={photoModalData.title}
      />
    </div>
  );
}
