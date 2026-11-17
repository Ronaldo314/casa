import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Shield,
  Eye,
  Check,
  Ban,
  Phone,
  Mail,
  User,
  Activity,
  Layers,
  Wrench,
  Search
} from 'lucide-react';
import { Contratista, CodigoActividad, Usuario } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import { CATALOGO_ACTIVIDADES } from '../data/catalogs';
import {
  ControlRegistroTableCell,
  ControlRegistroPanel,
  EstadoRegistroFilter,
  EstadoRegistroFilterValue,
  ConfirmDeleteModal
} from './ControlRegistroPanel';
import { ModuleDriveSyncButtons } from './GoogleDriveAuthControls';
import type { BulkModuleKey } from '../services/bulkExcelImportService';

interface ContratistasViewProps {
  contratistas: Contratista[];
  currentUser: Usuario;
  onRefresh: () => void;
  onRequestDriveSync?: (scope?: 'activities' | 'all') => void | Promise<void>;
  onOpenBulkImport?: (moduleKey: BulkModuleKey | 'AUTO_MULTI_SHEET') => void;
  onSimulateContractor?: (contratista: Contratista) => void;
}

export const ContratistasView: React.FC<ContratistasViewProps> = ({
  contratistas,
  currentUser,
  onRefresh,
  onRequestDriveSync,
  onOpenBulkImport,
  onSimulateContractor
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'Activo' | 'Inactivo'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContratista, setEditingContratista] = useState<Partial<Contratista> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [selectedForPreview, setSelectedForPreview] = useState<string>(
    contratistas[0]?.id_contratista || 'CONT-001'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [estadoRegistroFilter, setEstadoRegistroFilter] = useState<EstadoRegistroFilterValue>('ACTIVO');
  const [detailContratista, setDetailContratista] = useState<Contratista | null>(null);
  const [deleteTargetContratista, setDeleteTargetContratista] = useState<Contratista | null>(null);

  const sourceContratistas = useMemo(
    () => (estadoRegistroFilter === 'ACTIVO' ? contratistas : storageService.getContratistas(true)),
    [contratistas, estadoRegistroFilter]
  );

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleStartCreate = () => {
    setEditingContratista({
      razon_social: '',
      ruc: '',
      representante: '',
      telefono: '',
      correo: '',
      especialidad: '',
      estado: 'Activo',
      actividades_asignadas: ['ordenes_om'], // Las ordenes de mantenimiento disponibles para todas
      observaciones: ''
    });
    setIsNew(true);
    setIsModalOpen(true);
  };

  const handleStartEdit = (c: Contratista) => {
    setEditingContratista({ ...c });
    setIsNew(false);
    setIsModalOpen(true);
  };

  const handleDelete = (c: Contratista) => {
    if (currentUser.rol !== 'Administrador') {
      showNotification('Solo el Administrador puede eliminar contratistas.', true);
      return;
    }
    setDeleteTargetContratista(c);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetContratista) return;
    try {
      storageService.deleteContratista(deleteTargetContratista.id_contratista);
      showNotification(`Contratista ${deleteTargetContratista.razon_social} eliminada lógicamente.`);
      onRefresh();
    } catch (err: any) {
      showNotification(err.message, true);
    }
    setDeleteTargetContratista(null);
  };

  const handleToggleActivity = (actId: CodigoActividad) => {
    if (!editingContratista) return;
    const current = editingContratista.actividades_asignadas || [];
    const exists = current.includes(actId);
    const updated = exists ? current.filter(a => a !== actId) : [...current, actId];
    setEditingContratista({ ...editingContratista, actividades_asignadas: updated });
  };

  const handleSave = () => {
    if (!editingContratista) return;

    if (!editingContratista.razon_social?.trim()) {
      showNotification('La Razón Social es obligatoria.', true);
      return;
    }

    // Validar RUC: exactamente 11 dígitos numéricos
    const rucClean = (editingContratista.ruc || '').trim();
    if (!/^\d{11}$/.test(rucClean)) {
      showNotification('El RUC debe tener exactamente 11 dígitos numéricos.', true);
      return;
    }

    if (!editingContratista.actividades_asignadas || editingContratista.actividades_asignadas.length === 0) {
      showNotification('Debe asignar al menos una actividad a la empresa contratista.', true);
      return;
    }

    try {
      if (isNew) {
        storageService.addContratista({
          razon_social: editingContratista.razon_social.trim(),
          ruc: rucClean,
          representante: editingContratista.representante?.trim() || '',
          telefono: editingContratista.telefono?.trim() || '',
          correo: editingContratista.correo?.trim() || '',
          especialidad: editingContratista.especialidad?.trim() || 'Servicios Eléctricos Generales',
          estado: editingContratista.estado || 'Activo',
          actividades_asignadas: editingContratista.actividades_asignadas,
          observaciones: editingContratista.observaciones || ''
        });
        showNotification(`Contratista "${editingContratista.razon_social}" registrada exitosamente.`);
      } else {
        storageService.updateContratista(editingContratista.id_contratista!, {
          ...editingContratista,
          ruc: rucClean
        });
        showNotification(`Contratista "${editingContratista.razon_social}" actualizada exitosamente.`);
      }

      setIsModalOpen(false);
      setEditingContratista(null);
      onRefresh();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleExportExcel = () => {
    ExcelService.exportContratistas(filteredContratistas);
    showNotification(`Catálogo de contratistas (${filteredContratistas.length} empresas) exportado a Excel (.xlsx).`);
  };

  // Filtered list
  const filteredContratistas = useMemo(() => {
    return sourceContratistas.filter(c => {
      const matchesSearch =
        c.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ruc.includes(searchTerm) ||
        c.representante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.especialidad.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = filterEstado === 'TODOS' || c.estado === filterEstado;
      const matchesRegistro = estadoRegistroFilter === 'TODOS' || (c.estado_registro || 'ACTIVO') === estadoRegistroFilter;
      return matchesSearch && matchesEstado && matchesRegistro;
    });
  }, [sourceContratistas, searchTerm, filterEstado, estadoRegistroFilter]);

  const activeContractorForPreview =
    contratistas.find(c => c.id_contratista === selectedForPreview) || contratistas[0];

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-700 bg-red-950/80 text-red-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-700 bg-emerald-950/80 text-emerald-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header and Stats */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Registro y Asignación de Empresas Contratistas</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
              {contratistas.length} Contratistas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Matriz de actividades autorizadas por contratista: Deficiencias, Corona, Termografía, DMS, OM, Podas, Puesta a Tierra e Hidrolavado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          {currentUser.rol === 'Administrador' && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Contratista</span>
            </button>
          )}

          <ModuleDriveSyncButtons
            moduleLabel="CONTRATISTAS"
            onRequestDriveSync={onRequestDriveSync}
            bulkModuleKey="CONTRATISTAS"
            onOpenBulkImport={onOpenBulkImport}
          />
        </div>
      </div>

      {/* Interactive Simulator: Simulación de Inicio de Sesión de Contratista */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-cyan-800/60 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-400">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  Simulador de Inicio de Sesión de Contratista
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono">
                  Matriz Dinámica
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seleccione una empresa para previsualizar los formularios y actividades autorizadas que verá el usuario contratista al iniciar sesión.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-300 font-semibold">Simular inicio de sesión de:</label>
            <select
              value={selectedForPreview}
              onChange={(e) => setSelectedForPreview(e.target.value)}
              className="bg-slate-950 border border-cyan-600 rounded-xl px-3 py-1.5 text-xs text-cyan-200 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {contratistas.map(c => (
                <option key={c.id_contratista} value={c.id_contratista}>
                  {c.razon_social} ({c.actividades_asignadas.length} actividades)
                </option>
              ))}
            </select>

            {onSimulateContractor && activeContractorForPreview && (
              <button
                onClick={() => onSimulateContractor(activeContractorForPreview)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/30 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Probar Vista Real</span>
              </button>
            )}
          </div>
        </div>

        {/* Matrix Visualization for Selected Contractor */}
        {activeContractorForPreview && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{activeContractorForPreview.razon_social}</span>
                <span className="text-[11px] font-mono text-slate-400">RUC: {activeContractorForPreview.ruc}</span>
                <span className="text-[11px] text-amber-400 font-medium">• {activeContractorForPreview.especialidad}</span>
              </div>
              <span className="text-xs text-slate-400">
                Total actividades permitidas: <strong className="text-cyan-400">{activeContractorForPreview.actividades_asignadas.length} de {CATALOGO_ACTIVIDADES.length}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {CATALOGO_ACTIVIDADES.map(act => {
                const isPermitted = activeContractorForPreview.actividades_asignadas.includes(act.id);
                return (
                  <div
                    key={act.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                      isPermitted
                        ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase">{act.nombre}</span>
                        {isPermitted ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                            <Check className="h-3 w-3" /> Permitido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            <Ban className="h-3 w-3" /> Restringido
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug line-clamp-2">
                        {act.descripcion}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Razón Social, RUC, representante..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Estado:</span>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="Activo">Solo Activos</option>
            <option value="Inactivo">Solo Inactivos</option>
          </select>

          <EstadoRegistroFilter value={estadoRegistroFilter} onChange={setEstadoRegistroFilter} />
        </div>
      </div>

      {/* Contratistas Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">EMPRESA CONTRATISTA</th>
                <th className="px-3 py-3">RUC (11 DÍGITOS)</th>
                <th className="px-3 py-3">REPRESENTANTE & CONTACTO</th>
                <th className="px-3 py-3">ESPECIALIDAD</th>
                <th className="px-4 py-3">ACTIVIDADES AUTORIZADAS</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3">CONTROL DE REGISTRO</th>
                <th className="px-4 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredContratistas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron empresas contratistas registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredContratistas.map((c) => {
                  const isDeleted = c.estado_registro === 'ELIMINADO';
                  return (
                  <tr key={c.id_contratista} className={isDeleted ? 'opacity-70 bg-rose-950/15 hover:bg-rose-950/25 transition' : 'hover:bg-slate-750/70 transition'}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm">{c.razon_social}</div>
                      <div className="text-[11px] text-amber-400 font-mono">{c.id_contratista} • Reg: {c.fecha_registro}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {c.ruc}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-white font-medium">{c.representante || '-'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {c.telefono && <span>📞 {c.telefono}</span>}
                        {c.correo && <span>✉️ {c.correo}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-300 max-w-xs">
                      {c.especialidad}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="flex flex-wrap gap-1">
                        {c.actividades_asignadas.map((act) => {
                          const catInfo = CATALOGO_ACTIVIDADES.find(a => a.id === act);
                          return (
                            <span
                              key={act}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800"
                            >
                              {catInfo?.nombre || act}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.estado === 'Activo'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ControlRegistroTableCell record={c} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailContratista(c)}
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300 transition"
                          title="Ver detalle y control de registro"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {!isDeleted && onSimulateContractor && (
                          <button
                            onClick={() => onSimulateContractor(c)}
                            className="px-2 py-1 rounded bg-slate-700 hover:bg-cyan-900 text-[10px] text-cyan-300 font-semibold border border-slate-600 transition"
                            title="Simular vista de este contratista"
                          >
                            Simular
                          </button>
                        )}
                        {!isDeleted && currentUser.rol === 'Administrador' && (
                          <>
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-amber-400 transition"
                              title="Editar contratista"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className="p-1.5 rounded bg-slate-700 hover:bg-red-900 text-red-400 transition"
                              title="Eliminar contratista"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
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

      {/* Modal Crear / Editar Contratista */}
      {isModalOpen && editingContratista && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">
                  {isNew ? 'Registrar Nueva Contratista' : `Modificar Contratista: ${editingContratista.razon_social}`}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">
                  RAZÓN SOCIAL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingContratista.razon_social || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, razon_social: e.target.value })}
                  placeholder="Ej. MONTAJES Y OBRAS ELÉCTRICAS DEL NORTE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  RUC (11 DÍGITOS NUMÉRICOS) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={editingContratista.ruc || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, ruc: e.target.value.replace(/\D/g, '') })}
                  placeholder="20529841231"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">
                  {(editingContratista.ruc || '').length}/11 dígitos
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ESTADO</label>
                <select
                  value={editingContratista.estado || 'Activo'}
                  onChange={(e) => setEditingContratista({ ...editingContratista, estado: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">REPRESENTANTE LEGAL</label>
                <input
                  type="text"
                  value={editingContratista.representante || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, representante: e.target.value })}
                  placeholder="Ing. Marcos Silva Palacios"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">TELÉFONO DE CONTACTO</label>
                <input
                  type="text"
                  value={editingContratista.telefono || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, telefono: e.target.value })}
                  placeholder="+51 984 123 789"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CORREO ELECTRÓNICO</label>
                <input
                  type="email"
                  value={editingContratista.correo || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, correo: e.target.value })}
                  placeholder="contacto@empresa.com.pe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ESPECIALIDAD TÉCNICA</label>
                <input
                  type="text"
                  value={editingContratista.especialidad || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, especialidad: e.target.value })}
                  placeholder="Mantenimiento de Líneas de Alta Tensión"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Matriz de actividades checkboxes */}
              <div className="md:col-span-2 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-300 uppercase tracking-wide">
                    ACTIVIDADES ASIGNADAS A ESTA CONTRATISTA
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Seleccionadas: {(editingContratista.actividades_asignadas || []).length} de {CATALOGO_ACTIVIDADES.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Los usuarios asignados a esta empresa únicamente tendrán acceso a los formularios de las actividades marcadas a continuación:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {CATALOGO_ACTIVIDADES.map(act => {
                    const isChecked = (editingContratista.actividades_asignadas || []).includes(act.id);
                    return (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => handleToggleActivity(act.id)}
                        className={`p-2 rounded-lg border text-left flex items-start gap-2 transition ${
                          isChecked
                            ? 'bg-amber-950/70 border-amber-600 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isChecked ? 'bg-amber-600 border-amber-500 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">{act.nombre}</div>
                          <div className="text-[9px] text-slate-400 line-clamp-1">{act.descripcion}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES O ALCANCE DEL CONTRATO</label>
                <textarea
                  rows={2}
                  value={editingContratista.observaciones || ''}
                  onChange={(e) => setEditingContratista({ ...editingContratista, observaciones: e.target.value })}
                  placeholder="Detalle de asignaciones, contrato o alcance específico..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {!isNew && (
              <ControlRegistroPanel record={editingContratista} compact />
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30"
              >
                Guardar Contratista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle Contratista */}
      {detailContratista && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                <span>Detalle de Contratista: {detailContratista.razon_social}</span>
              </h3>
              <button onClick={() => setDetailContratista(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                  <tr><th className="px-3 py-2 w-1/3">Información</th><th className="px-3 py-2">Valor</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Código / Razón Social</td><td className="px-3 py-2 font-bold text-white">{detailContratista.id_contratista} • {detailContratista.razon_social}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">RUC</td><td className="px-3 py-2 font-mono text-cyan-300">{detailContratista.ruc}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Representante</td><td className="px-3 py-2">{detailContratista.representante || '-'}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Contacto</td><td className="px-3 py-2">{detailContratista.telefono || '-'} • {detailContratista.correo || '-'}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Especialidad</td><td className="px-3 py-2">{detailContratista.especialidad}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Estado</td><td className="px-3 py-2 font-bold">{detailContratista.estado}</td></tr>
                  <tr><td className="px-3 py-2 text-slate-400 font-semibold">Actividades Autorizadas</td><td className="px-3 py-2">{detailContratista.actividades_asignadas.map(id => CATALOGO_ACTIVIDADES.find(a => a.id === id)?.nombre || id).join(', ')}</td></tr>
                </tbody>
              </table>
            </div>
            <ControlRegistroPanel record={detailContratista} />
            <div className="flex justify-end pt-2">
              <button onClick={() => setDetailContratista(null)} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetContratista)}
        recordLabel={deleteTargetContratista ? `${deleteTargetContratista.razon_social} (RUC ${deleteTargetContratista.ruc})` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetContratista(null)}
      />
    </div>
  );
};
