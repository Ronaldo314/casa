import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Plus,
  Filter,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Gauge,
  Activity,
  Calendar,
  Building2,
  Eye
} from 'lucide-react';
import { Hidrolavado, LineaSubtransmision, Estructura, Usuario, Prioridad } from '../types';
import { storageService } from '../services/storageService';
import { ExcelService } from '../services/excelService';
import {
  EstadoRegistroFilterValue,
  EstadoRegistroFilter,
  ControlRegistroTableCell,
  ControlRegistroPanel,
  ConfirmDeleteModal
} from './ControlRegistroPanel';
import { ModuleDriveSyncButtons } from './GoogleDriveAuthControls';
import type { BulkModuleKey } from '../services/bulkExcelImportService';

interface HidrolavadoViewProps {
  hidrolavado: Hidrolavado[];
  lineas: LineaSubtransmision[];
  estructuras: Estructura[];
  currentUser: Usuario;
  onRefresh: () => void;
  onRequestDriveSync?: (scope?: 'activities' | 'all') => void | Promise<void>;
  onOpenBulkImport?: (moduleKey: BulkModuleKey | 'AUTO_MULTI_SHEET') => void;
  onOpenPhoto?: (url: string, title: string) => void;
}

export const HidrolavadoView: React.FC<HidrolavadoViewProps> = ({
  hidrolavado,
  lineas,
  estructuras,
  currentUser,
  onRefresh,
  onRequestDriveSync,
  onOpenBulkImport,
  onOpenPhoto
}) => {
  const [selectedLinea, setSelectedLinea] = useState<string>('TODAS');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('TODAS');
  const [estadoRegistroFilter, setEstadoRegistroFilter] = useState<EstadoRegistroFilterValue>('ACTIVO');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Hidrolavado> | null>(null);
  const [viewingItem, setViewingItem] = useState<Hidrolavado | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Hidrolavado | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Dynamic poste numbers for the modal based on selected line
  const modalLineStructures = useMemo(() => {
    if (!editingItem?.cod_linea) return [];
    return estructuras
      .filter(e => e.cod_linea === editingItem.cod_linea)
      .sort((a, b) => {
        const numA = parseInt(a.poste_n.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.poste_n.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
  }, [editingItem?.cod_linea, estructuras]);

  const handleStartCreate = () => {
    const firstLine = lineas[0]?.cod_linea || 'L-6657C';
    const firstLinePosts = estructuras.filter(e => e.cod_linea === firstLine);
    const defaultPoste = firstLinePosts[0]?.poste_n || '1';

    setEditingItem({
      cod_linea: firstLine,
      poste_n: defaultPoste,
      fecha_ejecucion: new Date().toISOString().split('T')[0],
      fase_lavada: 'Todas las Fases',
      tipo_aislador: 'Polimérico',
      presion_bar: 55,
      conductividad_agua_us: 40,
      estado_previo_polucion: 'Severo',
      resultado: 'Conforme',
      prioridad: 'PRIORITARIO',
      contratista: currentUser.contratista_nombre || 'VENTO INGENIEROS',
      responsable: `${currentUser.nombres} ${currentUser.apellidos}`,
      observaciones: '',
      evidencia_url: ''
    });
    setIsNew(true);
    setIsModalOpen(true);
  };

  const handleStartEdit = (item: Hidrolavado) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setIsModalOpen(true);
  };

  const handleDelete = (item: Hidrolavado) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    try {
      storageService.deleteHidrolavado(itemToDelete.id_hidrolavado);
      showNotification('success', `Registro ${itemToDelete.id_hidrolavado} marcado como ELIMINADO (eliminación lógica).`);
      onRefresh();
    } catch (err: any) {
      showNotification('error', err.message);
    }
    setItemToDelete(null);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.cod_linea || !editingItem.poste_n) {
      showNotification('error', 'Línea y Poste N° son campos obligatorios.');
      return;
    }

    try {
      if (isNew) {
        storageService.addHidrolavado({
          cod_linea: editingItem.cod_linea,
          poste_n: editingItem.poste_n,
          fecha_ejecucion: editingItem.fecha_ejecucion || new Date().toISOString().split('T')[0],
          fase_lavada: editingItem.fase_lavada || 'Todas las Fases',
          tipo_aislador: editingItem.tipo_aislador || 'Polimérico',
          presion_bar: Number(editingItem.presion_bar) || 50,
          conductividad_agua_us: Number(editingItem.conductividad_agua_us) || 40,
          estado_previo_polucion: editingItem.estado_previo_polucion || 'Moderado',
          resultado: editingItem.resultado || 'Conforme',
          prioridad: (editingItem.prioridad as Prioridad) || 'NO PRIORITARIO',
          contratista: editingItem.contratista || 'VENTO INGENIEROS',
          responsable: editingItem.responsable || `${currentUser.nombres} ${currentUser.apellidos}`,
          observaciones: editingItem.observaciones || '',
          evidencia_url: editingItem.evidencia_url || ''
        });
        showNotification('success', `Lavado registrado en poste ${editingItem.poste_n} (${editingItem.cod_linea}).`);
      } else {
        storageService.updateHidrolavado(editingItem.id_hidrolavado!, editingItem);
        showNotification('success', `Registro actualizado correctamente.`);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      onRefresh();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleExportExcel = () => {
    ExcelService.exportHidrolavado(filteredItems);
    showNotification('success', `Exportados ${filteredItems.length} registros de hidrolavado a Excel (.xlsx).`);
  };

  const sourceList = useMemo(() => {
    return estadoRegistroFilter === 'ACTIVO'
      ? hidrolavado
      : storageService.getHidrolavado(undefined, true);
  }, [hidrolavado, estadoRegistroFilter]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return sourceList.filter(item => {
      const regEstado = item.estado_registro || 'ACTIVO';
      const matchRegEstado = estadoRegistroFilter === 'TODOS' || regEstado === estadoRegistroFilter;
      const matchLine = selectedLinea === 'TODAS' || item.cod_linea === selectedLinea;
      const matchPrio = filterPrioridad === 'TODAS' || item.prioridad === filterPrioridad;
      const matchSearch =
        item.poste_n.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cod_linea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contratista.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.observaciones || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchRegEstado && matchLine && matchPrio && matchSearch;
    });
  }, [sourceList, estadoRegistroFilter, selectedLinea, filterPrioridad, searchTerm]);

  // Statistics
  const totalLavados = filteredItems.length;
  const conformesCount = filteredItems.filter(h => h.resultado === 'Conforme').length;
  const prioritariosCount = filteredItems.filter(h => h.prioridad === 'PRIORITARIO').length;
  const avgConductividad = totalLavados > 0
    ? (filteredItems.reduce((acc, h) => acc + (h.conductividad_agua_us || 0), 0) / totalLavados).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-red-950/80 border-red-700 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header and Actions */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Hidrolavado de Aislamiento en Líneas</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
              VENTO INGENIEROS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lavado de cadenas de aisladores con agua desmineralizada a alta presión para control de polución y salinidad.
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

          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Hidrolavado</span>
          </button>

          <ModuleDriveSyncButtons
            moduleLabel="HIDROLAVADO"
            onRequestDriveSync={onRequestDriveSync}
            onNotify={showNotification}
            bulkModuleKey="HIDROLAVADO"
            onOpenBulkImport={onOpenBulkImport}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Total Lavados</div>
          <div className="text-2xl font-bold text-white mt-1">{totalLavados}</div>
          <div className="text-[11px] text-cyan-400 mt-1">Estructuras intervenidas</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Conformes</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{conformesCount}</div>
          <div className="text-[11px] text-emerald-300 mt-1">
            {totalLavados > 0 ? `${Math.round((conformesCount / totalLavados) * 100)}% de efectividad` : '0%'}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Prioridad Alta</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{prioritariosCount}</div>
          <div className="text-[11px] text-rose-300 mt-1">Polución severa / crítica</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Conductividad Media</div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">{avgConductividad} <span className="text-sm font-normal text-slate-400">µS/cm</span></div>
          <div className="text-[11px] text-cyan-400 mt-1">Norma: &lt; 50 µS/cm</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por poste, línea o contratista..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedLinea}
            onChange={(e) => setSelectedLinea(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold"
          >
            <option value="TODAS">Todas las líneas</option>
            {lineas.map(l => (
              <option key={l.cod_linea} value={l.cod_linea}>
                {l.cod_linea} - {l.nombre}
              </option>
            ))}
          </select>

          <select
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold"
          >
            <option value="TODAS">Todas las prioridades</option>
            <option value="PRIORITARIO">PRIORITARIO</option>
            <option value="NO PRIORITARIO">NO PRIORITARIO</option>
          </select>

          <EstadoRegistroFilter value={estadoRegistroFilter} onChange={setEstadoRegistroFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">LÍNEA / POSTE N°</th>
                <th className="px-3 py-3">FECHA</th>
                <th className="px-3 py-3">FASE / AISLADOR</th>
                <th className="px-3 py-3">PRESIÓN & AGUA</th>
                <th className="px-3 py-3">POLUCIÓN</th>
                <th className="px-3 py-3">RESULTADO</th>
                <th className="px-3 py-3">PRIORIDAD</th>
                <th className="px-3 py-3">CONTRATISTA</th>
                <th className="px-3 py-3">CONTROL DE REGISTRO</th>
                <th className="px-4 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron registros de hidrolavado con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isEliminado = item.estado_registro === 'ELIMINADO';
                  return (
                  <tr key={item.id_hidrolavado} className={`transition ${isEliminado ? 'opacity-65 bg-rose-950/15' : 'hover:bg-slate-750/70'}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm">
                        {item.cod_linea} • Poste {item.poste_n}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono">{item.id_hidrolavado}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {item.fecha_ejecucion}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-white">{item.fase_lavada}</div>
                      <div className="text-[11px] text-slate-400">{item.tipo_aislador}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-mono text-cyan-300 font-semibold">{item.presion_bar} bar</div>
                      <div className="text-[10px] text-slate-400">{item.conductividad_agua_us} µS/cm</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.estado_previo_polucion === 'Severo'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-900 text-slate-300 border border-slate-700'
                      }`}>
                        {item.estado_previo_polucion}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.resultado === 'Conforme'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.resultado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.prioridad === 'PRIORITARIO'
                          ? 'bg-red-950 text-red-300 border-red-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}>
                        {item.prioridad}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      <div className="font-semibold text-xs text-amber-300">{item.contratista}</div>
                      <div className="text-[10px] text-slate-400">{item.responsable || '-'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <ControlRegistroTableCell record={item} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="p-1.5 rounded bg-slate-700 hover:bg-cyan-600 text-cyan-300 hover:text-white transition"
                          title="Ver detalle y control de registro"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {item.evidencia_url && (
                          <button
                            onClick={() => onOpenPhoto && onOpenPhoto(item.evidencia_url!, `Hidrolavado ${item.cod_linea} P-${item.poste_n}`)}
                            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-cyan-400 transition"
                            title="Ver evidencia"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isEliminado && (
                          <>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded bg-slate-700 hover:bg-amber-600 text-amber-400 hover:text-white transition"
                              title="Editar registro"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded bg-slate-700 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                              title="Eliminar registro (lógico)"
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

      {/* Modal Crear / Editar */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">
                  {isNew ? 'Registrar Servicio de Hidrolavado' : `Editar Hidrolavado: ${editingItem.cod_linea} P-${editingItem.poste_n}`}
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
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  LÍNEA DE SUBTRANSMISIÓN <span className="text-red-400">*</span>
                </label>
                <select
                  value={editingItem.cod_linea || ''}
                  onChange={(e) => {
                    const newLine = e.target.value;
                    const posts = estructuras.filter(st => st.cod_linea === newLine);
                    setEditingItem({
                      ...editingItem,
                      cod_linea: newLine,
                      poste_n: posts[0]?.poste_n || '1'
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {lineas.map(l => (
                    <option key={l.cod_linea} value={l.cod_linea}>
                      {l.cod_linea} - {l.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  POSTE N° (ESTRUCTURA DE LÍNEA) <span className="text-red-400">*</span>
                </label>
                <select
                  value={editingItem.poste_n || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, poste_n: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-bold"
                >
                  {modalLineStructures.length > 0 ? (
                    modalLineStructures.map(st => (
                      <option key={st.id_poste || st.poste_n} value={st.poste_n}>
                        Poste {st.poste_n} ({st.poste_material || 'Concreto'} - {st.tipo_armado || 'Alineamiento'})
                      </option>
                    ))
                  ) : (
                    <option value={editingItem.poste_n || '1'}>
                      Poste {editingItem.poste_n || '1'}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">FECHA DE EJECUCIÓN</label>
                <input
                  type="date"
                  value={editingItem.fecha_ejecucion || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, fecha_ejecucion: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">FASE INTERVENIDA</label>
                <select
                  value={editingItem.fase_lavada || 'Todas las Fases'}
                  onChange={(e) => setEditingItem({ ...editingItem, fase_lavada: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Todas las Fases">Todas las Fases (R, S, T)</option>
                  <option value="Fase R">Fase R</option>
                  <option value="Fase S">Fase S</option>
                  <option value="Fase T">Fase T</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">TIPO DE AISLADOR</label>
                <select
                  value={editingItem.tipo_aislador || 'Polimérico'}
                  onChange={(e) => setEditingItem({ ...editingItem, tipo_aislador: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Polimérico">Polimérico</option>
                  <option value="Porcelana">Porcelana</option>
                  <option value="Vidrio">Vidrio</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">PRESIÓN DE TRABAJO (BAR)</label>
                <input
                  type="number"
                  min="20"
                  max="100"
                  value={editingItem.presion_bar || 55}
                  onChange={(e) => setEditingItem({ ...editingItem, presion_bar: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CONDUCTIVIDAD DEL AGUA (µS/CM)</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={editingItem.conductividad_agua_us || 40}
                  onChange={(e) => setEditingItem({ ...editingItem, conductividad_agua_us: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">Máximo permitido: 50 µS/cm</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ESTADO PREVIO DE POLUCIÓN</label>
                <select
                  value={editingItem.estado_previo_polucion || 'Severo'}
                  onChange={(e) => setEditingItem({ ...editingItem, estado_previo_polucion: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="Leve">Leve</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Severo">Severo</option>
                  <option value="Crítico">Crítico</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">RESULTADO DEL SERVICIO</label>
                <select
                  value={editingItem.resultado || 'Conforme'}
                  onChange={(e) => setEditingItem({ ...editingItem, resultado: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="Conforme">Conforme</option>
                  <option value="Observado">Observado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">PRIORIDAD</label>
                <select
                  value={editingItem.prioridad || 'NO PRIORITARIO'}
                  onChange={(e) => setEditingItem({ ...editingItem, prioridad: e.target.value as Prioridad })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="NO PRIORITARIO">NO PRIORITARIO</option>
                  <option value="PRIORITARIO">PRIORITARIO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">EMPRESA CONTRATISTA</label>
                <input
                  type="text"
                  value={editingItem.contratista || 'VENTO INGENIEROS'}
                  onChange={(e) => setEditingItem({ ...editingItem, contratista: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">RESPONSABLE TÉCNICO</label>
                <input
                  type="text"
                  value={editingItem.responsable || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, responsable: e.target.value })}
                  placeholder="Ing. Alberto Vento Carrión"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">URL DE EVIDENCIA FOTOGRÁFICA</label>
                <input
                  type="url"
                  value={editingItem.evidencia_url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, evidencia_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">OBSERVACIONES TÉCNICAS</label>
                <textarea
                  rows={2}
                  value={editingItem.observaciones || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, observaciones: e.target.value })}
                  placeholder="Detalle de aislamiento lavado, limpieza de campanas, etc..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {!isNew && (
              <ControlRegistroPanel record={editingItem} compact />
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
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
              >
                Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Hidrolavado */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-sm font-bold">
                  {viewingItem.id_hidrolavado}
                </span>
                <h3 className="text-lg font-bold text-white">Módulo: HIDROLAVADO</h3>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/60">
              <div className="grid grid-cols-2 text-xs divide-y divide-slate-800">
                <div className="px-4 py-2.5 bg-slate-950/60 text-slate-400 font-bold uppercase">Información</div>
                <div className="px-4 py-2.5 bg-slate-950/60 text-slate-400 font-bold uppercase">Valor</div>
                <div className="px-4 py-2 text-slate-400">Código</div>
                <div className="px-4 py-2 font-mono font-bold text-cyan-300">{viewingItem.id_hidrolavado}</div>
                <div className="px-4 py-2 text-slate-400">Línea / Estructura</div>
                <div className="px-4 py-2 font-mono font-bold text-white">{viewingItem.cod_linea} • E-{viewingItem.poste_n} ({viewingItem.fase_lavada})</div>
                <div className="px-4 py-2 text-slate-400">Presión / Conductividad</div>
                <div className="px-4 py-2 font-mono font-bold text-cyan-300">{viewingItem.presion_bar} bar — {viewingItem.conductividad_agua_us} µS/cm</div>
                <div className="px-4 py-2 text-slate-400">Resultado / Prioridad</div>
                <div className="px-4 py-2 font-semibold text-white">{viewingItem.resultado} — {viewingItem.prioridad}</div>
                <div className="px-4 py-2 text-slate-400">Contratista / Responsable</div>
                <div className="px-4 py-2 text-slate-200">{viewingItem.contratista} — {viewingItem.responsable || '-'}</div>
                <div className="px-4 py-2 text-slate-400">Fecha / Observaciones</div>
                <div className="px-4 py-2 text-slate-300">{viewingItem.fecha_ejecucion} — {viewingItem.observaciones || '-'}</div>
              </div>
            </div>

            <ControlRegistroPanel record={viewingItem} />

            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <div>
                {viewingItem.estado_registro !== 'ELIMINADO' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingItem;
                      setViewingItem(null);
                      setItemToDelete(target);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 font-medium text-xs flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar Registro
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {viewingItem.estado_registro !== 'ELIMINADO' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingItem;
                      setViewingItem(null);
                      handleStartEdit(target);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                  >
                    <Edit2 className="h-4 w-4" /> Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        recordLabel={itemToDelete ? `${itemToDelete.id_hidrolavado} (${itemToDelete.cod_linea} P-${itemToDelete.poste_n})` : ''}
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
