import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Cloud,
  Layers
} from 'lucide-react';
import { Usuario } from '../types';
import { ExcelService } from '../services/excelService';
import { storageService } from '../services/storageService';
import { GoogleDriveService } from '../services/googleDriveService';
import {
  isDriveAutoSyncAuthorized,
  subscribeGoogleWorkspaceAuth,
  GoogleWorkspaceSession
} from '../services/googleWorkspaceAuth';
import {
  BULK_MODULE_CONFIGS,
  BULK_MODULE_MAP,
  BulkModuleKey,
  downloadBulkTemplate,
  matchSheetNameToModule,
  parseExcelRowsForModule,
  ParsedBulkResult
} from '../services/bulkExcelImportService';

interface BulkExcelImportModalProps {
  isOpen: boolean;
  initialModule: BulkModuleKey | 'AUTO_MULTI_SHEET';
  currentUser: Usuario;
  onClose: () => void;
  onImportComplete: () => void;
  onRequestDriveSync: (scope?: 'activities' | 'all') => void | Promise<void>;
  onToast: (title: string, message: string, userLabel?: string) => void;
}

export const BulkExcelImportModal: React.FC<BulkExcelImportModalProps> = ({
  isOpen,
  initialModule,
  currentUser,
  onClose,
  onImportComplete,
  onRequestDriveSync,
  onToast
}) => {
  const [selectedModule, setSelectedModule] = useState<BulkModuleKey | 'AUTO_MULTI_SHEET'>(initialModule);
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [rawWorkbookData, setRawWorkbookData] = useState<Record<string, any[]> | null>(null);
  const [syncToDrive, setSyncToDrive] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [driveSession, setDriveSession] = useState<GoogleWorkspaceSession | null>(null);

  useEffect(() => {
    return subscribeGoogleWorkspaceAuth((s) => setDriveSession(s));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedModule(initialModule);
      setFileName('');
      setSheetNames([]);
      setActiveSheetName('');
      setRawWorkbookData(null);
      setErrorMsg(null);
      setIsImporting(false);
    }
  }, [isOpen, initialModule]);

  const parsedResults = useMemo<ParsedBulkResult[]>(() => {
    if (!rawWorkbookData) return [];

    if (selectedModule === 'AUTO_MULTI_SHEET') {
      const results: ParsedBulkResult[] = [];
      for (const sName of sheetNames) {
        const matchedKey = matchSheetNameToModule(sName);
        if (matchedKey) {
          const parsed = parseExcelRowsForModule(matchedKey, rawWorkbookData[sName] || [], currentUser);
          if (parsed.validRecords.length > 0 || parsed.skippedCount > 0) {
            results.push(parsed);
          }
        }
      }
      return results;
    }

    const sheetToUse = activeSheetName || sheetNames[0] || '';
    const rows = rawWorkbookData[sheetToUse] || [];
    return [parseExcelRowsForModule(selectedModule, rows, currentUser)];
  }, [rawWorkbookData, selectedModule, sheetNames, activeSheetName, currentUser]);

  const totalValidCount = useMemo(
    () => parsedResults.reduce((acc, r) => acc + r.validRecords.length, 0),
    [parsedResults]
  );

  const totalSkippedCount = useMemo(
    () => parsedResults.reduce((acc, r) => acc + r.skippedCount, 0),
    [parsedResults]
  );

  const allErrors = useMemo(
    () => parsedResults.flatMap((r) => r.errors).slice(0, 5),
    [parsedResults]
  );

  const previewRows = useMemo(() => {
    const first = parsedResults.find((r) => r.validRecords.length > 0);
    return first ? first.validRecords.slice(0, 6) : [];
  }, [parsedResults]);

  const previewCols = useMemo(() => {
    if (previewRows.length === 0) return [];
    return Object.keys(previewRows[0]).slice(0, 6);
  }, [previewRows]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    try {
      const { sheetNames: names, data } = await ExcelService.readExcelFile(file);
      if (!names || names.length === 0) {
        setErrorMsg('El archivo Excel no contiene hojas válidas.');
        return;
      }
      setFileName(file.name);
      setSheetNames(names);
      setRawWorkbookData(data);

      if (selectedModule !== 'AUTO_MULTI_SHEET') {
        const matchingSheet = names.find((n) => matchSheetNameToModule(n) === selectedModule);
        setActiveSheetName(matchingSheet || names[0]);
      } else {
        setActiveSheetName(names[0]);
      }
    } catch (err: any) {
      setErrorMsg(`No se pudo leer el archivo Excel: ${err.message}`);
    }
  };

  const handleExecuteImport = async () => {
    if (totalValidCount === 0) {
      setErrorMsg('No hay registros válidos para importar. Verifica las columnas de tu archivo Excel o descarga la plantilla.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const recordsByModule: Record<string, any[]> = {};
      for (const r of parsedResults) {
        if (r.validRecords.length > 0) {
          recordsByModule[r.moduleKey] = [
            ...(recordsByModule[r.moduleKey] || []),
            ...r.validRecords
          ];
        }
      }

      const importRes = await storageService.bulkImportRecords(recordsByModule);
      if (!importRes.success) {
        setErrorMsg(importRes.message);
        return;
      }

      onImportComplete();

      if (syncToDrive) {
        if (isDriveAutoSyncAuthorized()) {
          const driveRes = await GoogleDriveService.pushAllActivitiesToDrive();
          onImportComplete();
          if (driveRes.needsAuth) {
            onToast(
              'Cargado en Web (Falta Autorizar Drive)',
              `${importRes.message} Conecte su cuenta de Google para subir a Drive.`,
              currentUser.nombres
            );
            onClose();
            await onRequestDriveSync('activities');
            return;
          }
          onToast(
            driveRes.success ? 'Carga Masiva + Sync Drive Completados' : 'Cargado en Web (Aviso Drive)',
            `${importRes.message} ${driveRes.message}`,
            driveSession?.user?.email || currentUser.nombres
          );
          onClose();
          return;
        } else {
          onToast(
            'Carga Masiva Guardada en Web',
            `${importRes.message} Complete la autorización de Google Drive para subir los registros.`,
            currentUser.nombres
          );
          onClose();
          await onRequestDriveSync('activities');
          return;
        }
      }

      onToast('Carga Masiva Completada', importRes.message, currentUser.nombres);
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  const activeConfig = selectedModule !== 'AUTO_MULTI_SHEET' ? BULK_MODULE_MAP[selectedModule] : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-600/60 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-6">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Carga Masiva desde Excel (.xlsx / .xls / .csv)
              </h3>
              <p className="text-xs text-slate-400">
                Importa múltiples registros a la web y sincroniza automáticamente con Google Drive y Google Sheets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Module & Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
          <div className="md:col-span-7">
            <label className="block font-semibold text-slate-300 mb-1">
              MÓDULO DE DESTINO
            </label>
            <select
              value={selectedModule}
              onChange={(e) => {
                const next = e.target.value as BulkModuleKey | 'AUTO_MULTI_SHEET';
                setSelectedModule(next);
                if (next !== 'AUTO_MULTI_SHEET' && sheetNames.length > 0) {
                  const matched = sheetNames.find((n) => matchSheetNameToModule(n) === next);
                  setActiveSheetName(matched || sheetNames[0]);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-semibold"
            >
              <option value="AUTO_MULTI_SHEET">
                Detección Automática Multi-Hoja (Cargar varias actividades en un mismo Excel)
              </option>
              {BULK_MODULE_CONFIGS.map((cfg) => (
                <option key={cfg.key} value={cfg.key}>
                  {cfg.sheetName} — {cfg.label}
                </option>
              ))}
            </select>
            {activeConfig ? (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Campos obligatorios: <strong className="text-emerald-300">{activeConfig.requiredHint}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cada pestaña del libro Excel debe tener el nombre oficial (LINEAS, DEFICIENCIAS, TERMOGRAFIA, etc.).
              </span>
            )}
          </div>

          <div className="md:col-span-5 flex justify-end">
            <button
              type="button"
              onClick={() =>
                downloadBulkTemplate(selectedModule === 'AUTO_MULTI_SHEET' ? 'ALL_MODULES' : selectedModule)
              }
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-700/60 font-semibold transition cursor-pointer"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>
                {selectedModule === 'AUTO_MULTI_SHEET'
                  ? 'Descargar Plantilla 15 Módulos (.xlsx)'
                  : `Descargar Plantilla ${activeConfig?.sheetName}.xlsx`}
              </span>
            </button>
          </div>
        </div>

        {/* File Picker */}
        <div className="bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-xl p-5 text-center transition">
          <input
            id="bulk-excel-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="bulk-excel-file-input"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="p-3 rounded-full bg-emerald-950/70 border border-emerald-700 text-emerald-400">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-xs font-bold text-white">
              {fileName ? `Archivo cargado: ${fileName}` : 'Haz clic aquí para seleccionar tu archivo Excel (.xlsx, .xls, .csv)'}
            </div>
            <div className="text-[11px] text-slate-400">
              Puedes subir el mismo Excel exportado desde la web o desde Google Drive, o usar la plantilla descargable.
            </div>
          </label>
        </div>

        {/* Sheet Selector when single-module chosen on multi-sheet workbook */}
        {rawWorkbookData && selectedModule !== 'AUTO_MULTI_SHEET' && sheetNames.length > 1 && (
          <div className="flex items-center gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <Layers className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300 font-semibold">Hoja del Excel a importar:</span>
            <select
              value={activeSheetName}
              onChange={(e) => setActiveSheetName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-cyan-300 font-mono"
            >
              {sheetNames.map((s) => (
                <option key={s} value={s}>
                  {s} ({(rawWorkbookData[s] || []).length} filas)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Validation & Preview */}
        {rawWorkbookData && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>{totalValidCount} registros válidos listos para importar</span>
              </div>
              {totalSkippedCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>{totalSkippedCount} filas omitidas por falta de campos obligatorios</span>
                </div>
              )}
              {parsedResults.length > 0 && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {parsedResults.map((r) => (
                    <span
                      key={r.moduleKey}
                      className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[10px]"
                    >
                      {r.moduleKey}: {r.validRecords.length}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {allErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 text-[11px] space-y-1">
                {allErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-3 py-2 text-[11px] font-bold text-slate-400 uppercase">
                  Vista previa (primeros {previewRows.length} registros)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-800/80 text-slate-300">
                      <tr>
                        {previewCols.map((c) => (
                          <th key={c} className="px-2.5 py-1.5 font-mono uppercase">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-300">
                      {previewRows.map((row, idx) => (
                        <tr key={idx}>
                          {previewCols.map((c) => (
                            <td key={c} className="px-2.5 py-1.5 truncate max-w-[160px]">
                              {String(row[c] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sync to Google Drive Option */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/60 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={syncToDrive}
            onChange={(e) => setSyncToDrive(e.target.checked)}
            className="mt-0.5 rounded border-slate-600 text-cyan-500"
          />
          <div>
            <div className="font-bold text-cyan-200 flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-cyan-400" />
              <span>Sincronizar automáticamente con Google Drive y Google Sheets al finalizar</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {driveSession?.hasAccessToken && driveSession?.driveWriteConfirmed
                ? `Google Drive conectado (${driveSession.user?.email}). Se actualizarán las hojas en Drive de inmediato.`
                : 'Al guardar en la web se solicitará confirmar tu sesión de Google Drive para subir los registros cargados.'}
            </div>
          </div>
        </label>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isImporting || totalValidCount === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>
              {isImporting
                ? 'Importando y Sincronizando...'
                : syncToDrive
                ? `Importar ${totalValidCount} Registros a Web y Drive`
                : `Importar ${totalValidCount} Registros a Web`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
