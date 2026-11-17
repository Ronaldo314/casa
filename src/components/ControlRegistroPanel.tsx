import React from 'react';
import { ControlRegistro } from '../types';
import { ShieldCheck, Trash2, Clock, User, Edit3, AlertTriangle, X } from 'lucide-react';

export type EstadoRegistroFilterValue = 'ACTIVO' | 'ELIMINADO' | 'TODOS';

export const EstadoRegistroBadge: React.FC<{
  estado?: 'ACTIVO' | 'ELIMINADO';
  size?: 'sm' | 'md';
  theme?: 'dark' | 'light';
}> = ({ estado = 'ACTIVO', size = 'sm', theme = 'dark' }) => {
  const isEliminado = estado === 'ELIMINADO';
  const colorClasses =
    theme === 'dark'
      ? isEliminado
        ? 'bg-rose-950/90 text-rose-300 border-rose-700/80'
        : 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80'
      : isEliminado
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider border ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px] rounded' : 'px-2.5 py-1 text-xs rounded-md'
      } ${colorClasses}`}
    >
      {isEliminado ? <Trash2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
      {isEliminado ? 'ELIMINADO' : 'ACTIVO'}
    </span>
  );
};

export const ControlRegistroTableCell: React.FC<{
  record: ControlRegistro;
  theme?: 'dark' | 'light';
}> = ({ record, theme = 'dark' }) => {
  const isEliminado = record.estado_registro === 'ELIMINADO';
  const isDark = theme === 'dark';

  return (
    <div className="space-y-1 text-[11px] leading-tight min-w-[170px]">
      <div className="flex items-center gap-1.5">
        <EstadoRegistroBadge estado={record.estado_registro} size="sm" theme={theme} />
      </div>
      <div
        className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
        title={`Creado por: ${record.usuario_creacion || 'Sistema Central'}`}
      >
        <span className={isDark ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'}>Creó:</span>{' '}
        <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {record.usuario_creacion || 'Sistema Central'}
        </span>
      </div>
      <div className={`text-[10px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {record.fecha_creacion || '10/11/2026 08:30:00'}
      </div>
      {isEliminado ? (
        <div
          className={`pt-0.5 border-t truncate ${
            isDark ? 'border-rose-900/60 text-rose-300' : 'border-rose-100 text-rose-700'
          }`}
          title={`Eliminado por: ${record.usuario_eliminacion || '-'}`}
        >
          <span className="font-semibold">Elim:</span> {record.usuario_eliminacion || '-'}
          {record.fecha_eliminacion && (
            <div className={`text-[10px] tabular-nums ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>
              {record.fecha_eliminacion}
            </div>
          )}
        </div>
      ) : record.usuario_modificacion ? (
        <div
          className={`pt-0.5 border-t truncate ${
            isDark ? 'border-slate-700/70 text-slate-300' : 'border-slate-100 text-slate-600'
          }`}
          title={`Última modificación: ${record.usuario_modificacion}`}
        >
          <span className={isDark ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'}>Modif:</span>{' '}
          <span className={`font-medium ${isDark ? 'text-cyan-300' : 'text-slate-700'}`}>
            {record.usuario_modificacion}
          </span>
          {record.fecha_modificacion && (
            <div className={`text-[10px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              {record.fecha_modificacion}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const ControlRegistroPanel: React.FC<{
  record: ControlRegistro;
  compact?: boolean;
  theme?: 'dark' | 'light';
}> = ({ record, compact = false, theme = 'dark' }) => {
  const isEliminado = record.estado_registro === 'ELIMINADO';
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <div
        className={`rounded-xl border p-3.5 ${
          isDark
            ? isEliminado
              ? 'bg-rose-950/30 border-rose-800/70'
              : 'bg-slate-900/80 border-slate-700'
            : isEliminado
            ? 'bg-rose-50/50 border-rose-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-slate-500'}`} />
            CONTROL DE REGISTRO
          </span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
              isDark
                ? isEliminado
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : isEliminado
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {isEliminado ? 'REGISTRO ELIMINADO' : 'REGISTRO ACTIVO'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div
            className={`rounded-lg border px-3 py-2 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              Datos de creación
            </div>
            <div className={`font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {record.usuario_creacion || 'Sistema Central'}
            </div>
            <div className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {record.fecha_creacion || '10/11/2026 08:30:00'}
            </div>
          </div>
          <div
            className={`rounded-lg border px-3 py-2 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              Última modificación
            </div>
            <div className={`font-semibold truncate ${isDark ? 'text-cyan-200' : 'text-slate-800'}`}>
              {record.usuario_modificacion || 'Sin modificaciones'}
            </div>
            <div className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {record.fecha_modificacion || '—'}
            </div>
          </div>
          {isEliminado && (
            <div
              className={`sm:col-span-2 rounded-lg border px-3 py-2 ${
                isDark ? 'bg-rose-950/50 border-rose-800/80' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                Datos de eliminación lógica
              </div>
              <div
                className={`flex flex-wrap justify-between gap-2 text-xs ${
                  isDark ? 'text-rose-100' : 'text-rose-900'
                }`}
              >
                <span className="font-semibold">{record.usuario_eliminacion || '-'}</span>
                <span className={`font-mono tabular-nums ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                  {record.fecha_eliminacion || '-'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between ${
          isDark
            ? isEliminado
              ? 'bg-rose-950/60 border-rose-800/80'
              : 'bg-slate-900 border-slate-700'
            : isEliminado
            ? 'bg-rose-50 border-rose-200'
            : 'bg-slate-100 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-slate-600'}`} />
          <h4
            className={`text-xs font-extrabold uppercase tracking-wider ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
          >
            CONTROL DE REGISTRO
          </h4>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${
            isDark
              ? isEliminado
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : isEliminado
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}
        >
          {isEliminado ? <Trash2 className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {isEliminado ? 'REGISTRO ELIMINADO' : 'REGISTRO ACTIVO'}
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className={`rounded-lg border p-3 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            Datos de creación
          </div>
          <ul className={`space-y-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <li className="flex justify-between gap-2">
              <span className="text-slate-400">Usuario creación:</span>
              <span className={`font-semibold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {record.usuario_creacion || 'Sistema Central'}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-slate-400">Fecha creación:</span>
              <span className={`font-mono tabular-nums text-right ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {record.fecha_creacion || '10/11/2026 08:30:00'}
              </span>
            </li>
          </ul>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            Última modificación
          </div>
          <ul className={`space-y-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <li className="flex justify-between gap-2">
              <span className="text-slate-400">Usuario modificación:</span>
              <span className={`font-semibold text-right ${isDark ? 'text-cyan-200' : 'text-slate-900'}`}>
                {record.usuario_modificacion || 'Sin modificaciones'}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-slate-400">Fecha modificación:</span>
              <span className={`font-mono tabular-nums text-right ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {record.fecha_modificacion || '—'}
              </span>
            </li>
          </ul>
        </div>

        {isEliminado && (
          <div
            className={`md:col-span-2 rounded-lg border p-3 ${
              isDark ? 'bg-rose-950/40 border-rose-800/80' : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-2 ${
                isDark ? 'text-rose-300' : 'text-rose-700'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Datos de eliminación lógica
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className={isDark ? 'text-rose-300' : 'text-rose-700'}>Usuario eliminación:</span>
                <span className={`font-semibold ${isDark ? 'text-rose-100' : 'text-rose-950'}`}>
                  {record.usuario_eliminacion || '-'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className={isDark ? 'text-rose-300' : 'text-rose-700'}>Fecha eliminación:</span>
                <span className={`font-mono tabular-nums ${isDark ? 'text-rose-200' : 'text-rose-900'}`}>
                  {record.fecha_eliminacion || '-'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const EstadoRegistroFilter: React.FC<{
  value: EstadoRegistroFilterValue;
  onChange: (val: EstadoRegistroFilterValue) => void;
  theme?: 'dark' | 'light';
}> = ({ value, onChange, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as EstadoRegistroFilterValue)}
      className={
        isDark
          ? 'bg-slate-900 text-xs font-bold text-emerald-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer'
          : 'px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer'
      }
      title="Filtrar por estado de registro (Control de Auditoría)"
    >
      <option value="ACTIVO">Registros: ACTIVO</option>
      <option value="ELIMINADO">Registros: ELIMINADO</option>
      <option value="TODOS">Registros: TODOS</option>
    </select>
  );
};

export const ConfirmDeleteModal: React.FC<{
  isOpen: boolean;
  title?: string;
  recordLabel: string;
  extraNote?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title = 'Confirmar Eliminación Lógica', recordLabel, extraNote, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-rose-900/60 overflow-hidden">
        <div className="px-5 py-4 bg-rose-950/60 border-b border-rose-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-950 border border-rose-700 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-200">
          <p>
            ¿Confirma que desea eliminar el registro <span className="font-bold text-cyan-300">{recordLabel}</span>?
          </p>
          <p className="text-xs text-slate-300 bg-slate-900/90 border border-slate-700 rounded-xl p-3 leading-relaxed">
            Se aplicará <span className="font-semibold text-rose-300">eliminación lógica</span> (ESTADO_REGISTRO = ELIMINADO). El registro conservará su historial completo, usuario y fecha de eliminación en la auditoría del sistema.
          </p>
          {extraNote && (
            <p className="text-xs text-amber-200 bg-amber-950/40 border border-amber-800/70 rounded-xl p-3">
              {extraNote}
            </p>
          )}
        </div>
        <div className="px-5 py-3.5 bg-slate-900/70 border-t border-slate-700 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-600 bg-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-600 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar Registro
          </button>
        </div>
      </div>
    </div>
  );
};
