import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  FileSpreadsheet,
  Filter,
  Shield,
  Clock,
  ArrowRight,
  Eye,
  X,
  CheckCircle2,
  Trash2,
  PlusCircle,
  Edit3,
  Calendar,
  RotateCcw,
  Info
} from 'lucide-react';
import { AuditoriaRegistro, Usuario } from '../types';
import { ExcelService } from '../services/excelService';
import { ModuleDriveSyncButtons } from './GoogleDriveAuthControls';
import type { BulkModuleKey } from '../services/bulkExcelImportService';

interface AuditoriaViewProps {
  auditoria: AuditoriaRegistro[];
  currentUser: Usuario;
  onRequestDriveSync?: (scope?: 'activities' | 'all') => void | Promise<void>;
  onOpenBulkImport?: (moduleKey: BulkModuleKey | 'AUTO_MULTI_SHEET') => void;
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({
  auditoria,
  currentUser,
  onRequestDriveSync,
  onOpenBulkImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccion, setFilterAccion] = useState<string>('TODAS');
  const [filterModulo, setFilterModulo] = useState<string>('TODOS');
  const [filterRol, setFilterRol] = useState<string>('TODOS');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<AuditoriaRegistro | null>(null);
  const pageSize = 25;

  // KPIs
  const counts = useMemo(() => {
    let creaciones = 0;
    let ediciones = 0;
    let eliminaciones = 0;

    for (const a of auditoria) {
      const act = (a.accion || '').toUpperCase();
      if (act.includes('CREA')) {
        creaciones++;
      } else if (act.includes('ELIM') || act.includes('DESACT')) {
        eliminaciones++;
      } else {
        ediciones++;
      }
    }

    return {
      total: auditoria.length,
      creaciones,
      ediciones,
      eliminaciones
    };
  }, [auditoria]);

  // Filtering
  const filteredList = useMemo(() => {
    return auditoria.filter(a => {
      const act = (a.accion || '').toUpperCase();
      const normAct = act.includes('CREA')
        ? 'CREACIÓN'
        : act.includes('ELIM') || act.includes('DESACT')
        ? 'ELIMINACIÓN'
        : 'EDICIÓN';

      // Accion Filter
      if (filterAccion !== 'TODAS' && normAct !== filterAccion) {
        return false;
      }

      // Modulo Filter
      if (filterModulo !== 'TODOS') {
        const modUpper = (a.modulo || '').toUpperCase();
        if (!modUpper.includes(filterModulo.toUpperCase())) {
          return false;
        }
      }

      // Rol Filter
      if (filterRol !== 'TODOS') {
        const rol = (a.rol_usuario || a.rol || '').toUpperCase();
        if (!rol.includes(filterRol.toUpperCase())) {
          return false;
        }
      }

      // Date Range Filter (America/Lima YYYY-MM-DD or parse from fecha_hora DD/MM/YYYY)
      let rowDate = a.fecha || '';
      if (!rowDate && a.fecha_hora) {
        const parts = a.fecha_hora.split(' ')[0].split('/');
        if (parts.length === 3) {
          rowDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      if (fechaDesde && rowDate && rowDate < fechaDesde) {
        return false;
      }
      if (fechaHasta && rowDate && rowDate > fechaHasta) {
        return false;
      }

      // Text Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const fullContent = `
          ${a.id_auditoria || ''} 
          ${a.modulo || ''} 
          ${a.id_registro || ''} 
          ${a.usuario || ''} 
          ${a.rol_usuario || a.rol || ''} 
          ${a.campo_modificado || ''} 
          ${a.valor_anterior || a.valores_anteriores || ''} 
          ${a.valor_nuevo || a.valores_nuevos || ''} 
          ${a.observacion || ''} 
          ${a.cod_linea || ''} 
          ${a.estructura || ''}
        `.toLowerCase();
        if (!fullContent.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [auditoria, filterAccion, filterModulo, filterRol, fechaDesde, fechaHasta, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleExportExcel = () => {
    ExcelService.exportAuditoria(filteredList.length > 0 ? filteredList : auditoria, 'AUDITORIA_SISTEMA.xlsx');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterAccion('TODAS');
    setFilterModulo('TODOS');
    setFilterRol('TODOS');
    setFechaDesde('');
    setFechaHasta('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || filterAccion !== 'TODAS' || filterModulo !== 'TODOS' || filterRol !== 'TODOS' || fechaDesde !== '' || fechaHasta !== '';

  const getActionBadge = (accion: string) => {
    const act = (accion || '').toUpperCase();
    if (act.includes('CREA')) {
      return {
        bg: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300',
        dot: 'bg-emerald-400',
        label: 'CREACIÓN',
        icon: PlusCircle
      };
    }
    if (act.includes('ELIM') || act.includes('DESACT')) {
      return {
        bg: 'bg-rose-950/70 border-rose-700/60 text-rose-300',
        dot: 'bg-rose-400',
        label: 'ELIMINACIÓN',
        icon: Trash2
      };
    }
    return {
      bg: 'bg-blue-950/70 border-blue-700/60 text-blue-300',
      dot: 'bg-blue-400',
      label: 'EDICIÓN',
      icon: Edit3
    };
  };

  const getRoleBadge = (rol: string) => {
    const r = (rol || '').toLowerCase();
    if (r.includes('admin')) {
      return 'text-amber-300 bg-amber-950/60 border-amber-800/60';
    }
    if (r.includes('superv')) {
      return 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60';
    }
    return 'text-indigo-300 bg-indigo-950/60 border-indigo-800/60';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header Contract */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  AUDITORÍA DEL SISTEMA
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="font-semibold text-slate-300">VISTA REFERENCIAL DEL MÓDULO</span>
                  <span aria-hidden="true">·</span>
                  <span>Servidor Central</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-cyan-400">Zona Horaria: America/Lima</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Solo lectura (Inmutable)
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 max-w-2xl leading-relaxed">
              Registro continuo y automático de todas las operaciones realizadas en los módulos del sistema (creación, edición y eliminación). Registro con sello de tiempo del servidor para máxima trazabilidad y cumplimiento normativo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Descargar tabla completa AUDITORIA_SISTEMA en formato Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Exportar AUDITORIA_SISTEMA.xlsx</span>
            </button>

            <ModuleDriveSyncButtons
              moduleLabel="AUDITORIA_SISTEMA"
              onRequestDriveSync={onRequestDriveSync}
              bulkModuleKey="AUDITORIA_SISTEMA"
              onOpenBulkImport={onOpenBulkImport}
            />
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Interactive Segmented Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de movimientos */}
        <button
          onClick={() => { setFilterAccion('TODAS'); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterAccion === 'TODAS'
              ? 'bg-slate-800/90 border-cyan-500/80 ring-2 ring-cyan-500/30 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total de movimientos</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
              {counts.total.toLocaleString('es-PE')}
            </span>
            <span className="text-xs text-slate-400">registros</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>Trazabilidad completa de operaciones</span>
          </div>
        </button>

        {/* Creaciones */}
        <button
          onClick={() => { setFilterAccion(filterAccion === 'CREACIÓN' ? 'TODAS' : 'CREACIÓN'); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterAccion === 'CREACIÓN'
              ? 'bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Creaciones</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <PlusCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-300 font-mono tabular-nums">
              {counts.creaciones.toLocaleString('es-PE')}
            </span>
            <span className="text-xs text-slate-400">nuevos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Altas registradas por usuarios</span>
          </div>
        </button>

        {/* Ediciones */}
        <button
          onClick={() => { setFilterAccion(filterAccion === 'EDICIÓN' ? 'TODAS' : 'EDICIÓN'); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterAccion === 'EDICIÓN'
              ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">Ediciones</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-blue-400">
              <Edit3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-300 font-mono tabular-nums">
              {counts.ediciones.toLocaleString('es-PE')}
            </span>
            <span className="text-xs text-slate-400">modificaciones</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>Cambios en campos y estados</span>
          </div>
        </button>

        {/* Eliminaciones */}
        <button
          onClick={() => { setFilterAccion(filterAccion === 'ELIMINACIÓN' ? 'TODAS' : 'ELIMINACIÓN'); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterAccion === 'ELIMINACIÓN'
              ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400">Eliminaciones</span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-300 font-mono tabular-nums">
              {counts.eliminaciones.toLocaleString('es-PE')}
            </span>
            <span className="text-xs text-slate-400">bajas</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Registros eliminados del sistema</span>
          </div>
        </button>
      </div>

      {/* Search & Filters Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">Filtros de búsqueda</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Quick Search */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Búsqueda rápida</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar usuario, ID, módulo, campo, valor, observación..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Módulo Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Módulo / Actividad</label>
            <select
              value={filterModulo}
              onChange={(e) => { setFilterModulo(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="TODOS">Todos los Módulos</option>
              <option value="DEFICIENCIAS">DEFICIENCIAS TÉCNICAS</option>
              <option value="CORONA">EFECTO CORONA</option>
              <option value="TERMOGRAF">TERMOGRAFÍA INFRARROJA</option>
              <option value="PODA">CONTROL DE PODAS</option>
              <option value="PUESTA">PUESTA A TIERRA</option>
              <option value="HIDROLAVADO">HIDROLAVADO</option>
              <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              <option value="ORDEN">ÓRDENES DE MANTENIMIENTO</option>
              <option value="DMS">GESTIÓN DMS</option>
              <option value="USUARIOS">USUARIOS Y ROLES</option>
              <option value="CONTRATISTAS">EMPRESAS CONTRATISTAS</option>
              <option value="LINEAS">LÍNEAS DE SUBTRANSMISIÓN</option>
              <option value="ESTRUCTURAS">PLANILLA DE ESTRUCTURAS</option>
            </select>
          </div>

          {/* Acción Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Acción</label>
            <select
              value={filterAccion}
              onChange={(e) => { setFilterAccion(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="TODAS">Todas las Acciones</option>
              <option value="CREACIÓN">CREACIÓN</option>
              <option value="EDICIÓN">EDICIÓN</option>
              <option value="ELIMINACIÓN">ELIMINACIÓN</option>
            </select>
          </div>

          {/* Rol Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Rol de Usuario</label>
            <select
              value={filterRol}
              onChange={(e) => { setFilterRol(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="TODOS">Todos los Roles</option>
              <option value="Administrador">Administrador</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Contratista">Contratista</option>
            </select>
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>Rango de fechas:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="ml-auto text-xs text-slate-400 font-mono">
            Mostrando <strong className="text-white tabular-nums">{filteredList.length}</strong> de <strong className="text-white tabular-nums">{auditoria.length}</strong> movimientos
          </div>
        </div>
      </div>

      {/* Historial de Movimientos Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Historial de movimientos</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Tabla: <strong className="text-slate-300">AUDITORIA_SISTEMA</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3.5 whitespace-nowrap">Fecha y Hora</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Módulo</th>
                <th className="px-3 py-3.5 whitespace-nowrap">ID Registro</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Acción</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Usuario</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Rol</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Campo Modificado</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Valor Anterior</th>
                <th className="px-3 py-3.5 whitespace-nowrap">Valor Nuevo</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Observación</th>
                <th className="px-2 py-3.5 text-center whitespace-nowrap">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500">
                    <History className="h-8 w-8 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="text-sm font-medium">No se encontraron movimientos con los filtros seleccionados.</p>
                    <p className="text-xs text-slate-500 mt-1">Modifique los criterios de búsqueda o limpie los filtros.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((a) => {
                  const badge = getActionBadge(a.accion);
                  const BadgeIcon = badge.icon;
                  const displayFechaHora = a.fecha_hora || (a.fecha && a.hora ? `${a.fecha.split('-').reverse().join('/')} ${a.hora}` : `${a.hora || ''}`);
                  const displayRol = a.rol_usuario || a.rol || 'Usuario';
                  const displayCampo = a.campo_modificado || (badge.label === 'CREACIÓN' ? 'Todos los campos' : badge.label === 'ELIMINACIÓN' ? 'Registro completo' : 'Datos');
                  const displayAnt = a.valor_anterior || a.valores_anteriores || 'N/A';
                  const displayNuevo = a.valor_nuevo || a.valores_nuevos || '-';

                  return (
                    <tr
                      key={a.id_auditoria}
                      onClick={() => setSelectedRecord(a)}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* Fecha y Hora */}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-200 tabular-nums">{displayFechaHora}</span>
                        </div>
                      </td>

                      {/* Módulo */}
                      <td className="px-3 py-3 font-semibold text-white whitespace-nowrap">
                        <span className="text-xs text-slate-200">{a.modulo}</span>
                        {a.cod_linea && a.cod_linea !== '-' && a.cod_linea !== 'TODAS' && (
                          <span className="block text-[10px] text-cyan-400 font-mono">
                            {a.cod_linea} {a.estructura && a.estructura !== '-' ? `P-${a.estructura}` : ''}
                          </span>
                        )}
                      </td>

                      {/* ID Registro */}
                      <td className="px-3 py-3 font-mono text-cyan-300 font-semibold whitespace-nowrap">
                        {a.id_registro}
                      </td>

                      {/* Acción */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          <BadgeIcon className="h-3 w-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Usuario */}
                      <td className="px-3 py-3 font-medium text-white whitespace-nowrap">
                        {a.usuario}
                      </td>

                      {/* Rol */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getRoleBadge(displayRol)}`}>
                          {displayRol}
                        </span>
                      </td>

                      {/* Campo Modificado */}
                      <td className="px-3 py-3 text-slate-300 font-medium whitespace-nowrap max-w-xs truncate" title={displayCampo}>
                        {displayCampo}
                      </td>

                      {/* Valor Anterior */}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={displayAnt}>
                        <span className={displayAnt === 'N/A' ? 'text-slate-600' : 'text-slate-300'}>
                          {displayAnt}
                        </span>
                      </td>

                      {/* Valor Nuevo */}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-200 max-w-xs truncate" title={displayNuevo}>
                        <span className={badge.label === 'ELIMINACIÓN' ? 'text-rose-400 font-semibold' : badge.label === 'CREACIÓN' ? 'text-emerald-400' : 'text-cyan-300'}>
                          {displayNuevo}
                        </span>
                      </td>

                      {/* Observación */}
                      <td className="px-4 py-3 text-slate-300 max-w-sm truncate" title={a.observacion}>
                        {a.observacion || '-'}
                      </td>

                      {/* Detalle */}
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedRecord(a); }}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition cursor-pointer"
                          title="Inspeccionar detalle forense del movimiento"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Página <strong className="text-white tabular-nums">{currentPage}</strong> de <strong className="text-white tabular-nums">{totalPages}</strong>
            <span className="mx-2 text-slate-600">·</span>
            <span className="font-mono">{filteredList.length} registros filtrados</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Detail Modal (Read-Only) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    DETALLE DE AUDITORÍA Y TRAZABILIDAD
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono text-cyan-400">{selectedRecord.id_auditoria}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedRecord.modulo}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* Top Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Fecha y Hora</span>
                  <span className="font-mono text-slate-200 font-semibold text-xs tabular-nums">
                    {selectedRecord.fecha_hora || `${selectedRecord.fecha || ''} ${selectedRecord.hora || ''}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Acción</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getActionBadge(selectedRecord.accion).bg}`}>
                    {getActionBadge(selectedRecord.accion).label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">ID Registro</span>
                  <span className="font-mono text-cyan-300 font-bold">{selectedRecord.id_registro}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Usuario Responsable</span>
                  <span className="font-semibold text-white">{selectedRecord.usuario}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Rol en el Sistema</span>
                  <span className="text-slate-300">{selectedRecord.rol_usuario || selectedRecord.rol}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Línea / Estructura</span>
                  <span className="font-mono text-slate-300">
                    {selectedRecord.cod_linea || '-'} {selectedRecord.estructura && selectedRecord.estructura !== '-' ? `P-${selectedRecord.estructura}` : ''}
                  </span>
                </div>
              </div>

              {/* Forensic Diff: Anterior vs Nuevo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Campo Afectado: <strong className="text-white font-sans">{selectedRecord.campo_modificado || 'Datos del registro'}</strong>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Diferencial de Estado</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  {/* Valor Anterior */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Valor Anterior
                    </span>
                    <div className="font-mono text-xs text-slate-300 break-words whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 max-h-40 overflow-y-auto">
                      {selectedRecord.valor_anterior || selectedRecord.valores_anteriores || 'N/A'}
                    </div>
                  </div>

                  {/* Valor Nuevo */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                      Valor Nuevo
                    </span>
                    <div className="font-mono text-xs text-cyan-200 break-words whitespace-pre-wrap bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-800/40 max-h-40 overflow-y-auto">
                      {selectedRecord.valor_nuevo || selectedRecord.valores_nuevos || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Observación */}
              <div className="space-y-1 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Detalle Técnico y Observación
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedRecord.observacion || 'Sin observaciones adicionales registradas.'}
                </p>
              </div>

              {/* Immutability & Forensic Footnote */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Registro inmutable sellado en servidor central (America/Lima)</span>
                </div>
                <span className="font-mono text-slate-500 text-[10px]">
                  {selectedRecord.sync_id || 'ID-SYNC-OFICIAL'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
