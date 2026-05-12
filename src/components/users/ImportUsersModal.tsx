import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserService } from '@/services/user.service';
import type { ImportError, ImportResult, ParsedRow, UserImportRow } from '@/types/user-import.types';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Header mapping (case-insensitive, Spanish aliases) ───────────────────

const HEADER_MAP: Record<string, keyof UserImportRow> = {
  first_name: 'first_name',
  firstname: 'first_name',
  nombre: 'first_name',
  nombres: 'first_name',
  last_name: 'last_name',
  lastname: 'last_name',
  apellido: 'last_name',
  apellidos: 'last_name',
  email: 'email',
  correo: 'email',
  'correo electronico': 'email',
  'correo electrónico': 'email',
  'e-mail': 'email',
  phone: 'phone',
  telefono: 'phone',
  teléfono: 'phone',
  celular: 'phone',
  address: 'address',
  direccion: 'address',
  dirección: 'address',
  id_number: 'id_number',
  cedula: 'id_number',
  cédula: 'id_number',
  dni: 'id_number',
  role: 'role',
  rol: 'role',
  birth_date: 'birth_date',
  fecha_nacimiento: 'birth_date',
  'f. nac.': 'birth_date',
  'f.nac': 'birth_date',
  whatsapp: 'whatsapp',
  whatapp: 'whatsapp',
  wsp: 'whatsapp',
};

// ─── Reason labels ─────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  missing_required: 'Campos requeridos faltantes',
  invalid_email: 'Email inválido',
  duplicate_in_batch: 'Email duplicado en el archivo',
  email_exists: 'Email ya registrado',
  role_above_caller: 'Rol no permitido',
  invalid_role: 'Rol inválido',
  db_error: 'Error de base de datos',
};

// ─── Row validation ────────────────────────────────────────────────────────

function normalizeRow(raw: Record<string, unknown>): Partial<UserImportRow> {
  const normalized: Partial<UserImportRow> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mappedKey = HEADER_MAP[key.toLowerCase().trim()];
    if (!mappedKey) continue;

    if (mappedKey === 'whatsapp') {
      const v = String(value).toLowerCase().trim();
      normalized.whatsapp = v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes';
    } else if (mappedKey === 'birth_date' && value instanceof Date) {
      // SheetJS cellDates:true gives us a real Date object
      const d = value as Date;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      normalized.birth_date = `${yyyy}-${mm}-${dd}`;
    } else {
      (normalized as Record<string, unknown>)[mappedKey] = String(value ?? '').trim();
    }
  }
  return normalized;
}

function validateRows(rawRows: Record<string, unknown>[]): ParsedRow[] {
  return rawRows.map((raw, i) => {
    const normalized = normalizeRow(raw);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!normalized.first_name) errors.push('Nombre requerido');
    if (!normalized.last_name) errors.push('Apellido requerido');
    if (!normalized.email) {
      errors.push('Email requerido');
    } else {
      const emailLower = normalized.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
        errors.push('Email inválido');
      }
      normalized.email = emailLower;
    }

    if (!normalized.role) {
      warnings.push('Rol no especificado, se asignará "server"');
    }

    return {
      first_name: normalized.first_name ?? '',
      last_name: normalized.last_name ?? '',
      email: normalized.email ?? '',
      phone: normalized.phone,
      address: normalized.address,
      id_number: normalized.id_number,
      role: normalized.role as UserImportRow['role'],
      birth_date: normalized.birth_date,
      whatsapp: normalized.whatsapp,
      _rowIndex: i + 1,
      _errors: errors,
      _warnings: warnings,
      _valid: errors.length === 0,
    };
  });
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface ImportUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

type Phase = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

export function ImportUsersModal({ open, onOpenChange, onComplete }: ImportUsersModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setPhase('idle');
    setRows([]);
    setResult(null);
    setErrMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

  const handleFile = useCallback(async (file: File) => {
    setPhase('parsing');
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (raw.length === 0) {
        setErrMsg('El archivo no contiene filas de datos.');
        setPhase('error');
        return;
      }
      const parsed = validateRows(raw);
      setRows(parsed);
      setPhase('preview');
    } catch {
      setErrMsg('No se pudo leer el archivo. Verificá que sea .xlsx o .csv válido.');
      setPhase('error');
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = useCallback(async () => {
    const validRows = rows.filter(r => r._valid);
    if (validRows.length === 0) return;

    setPhase('importing');
    try {
      const payload: UserImportRow[] = validRows.map(r => ({
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        id_number: r.id_number,
        role: r.role,
        birth_date: r.birth_date,
        whatsapp: r.whatsapp,
      }));

      const res = await UserService.bulkImportUsers(payload);
      setResult(res);
      setPhase('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al importar usuarios';
      toast.error(msg);
      setErrMsg(msg);
      setPhase('error');
    }
  }, [rows]);

  const handleClose = useCallback(() => {
    if (phase === 'done') {
      onComplete();
    }
    handleOpenChange(false);
  }, [phase, onComplete, handleOpenChange]);

  const validCount = rows.filter(r => r._valid).length;
  const invalidCount = rows.length - validCount;
  const previewRows = rows.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar usuarios desde Excel / CSV
          </DialogTitle>
          <DialogDescription>
            Importá múltiples usuarios desde un archivo .xlsx o .csv
          </DialogDescription>
        </DialogHeader>

        {/* ── IDLE: file picker ──────────────────────────────────────────── */}
        {phase === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Seleccioná un archivo .xlsx o .csv con las columnas:{' '}
                <span className="font-medium text-foreground">
                  first_name, last_name, email
                </span>{' '}
                (requeridas) y phone, role, id_number, birth_date (opcionales).
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Elegir archivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Columnas aceptadas en español: Nombre, Apellido, Correo, Teléfono, Rol, Cédula, Fecha_Nacimiento, WhatsApp
            </p>
          </div>
        )}

        {/* ── PARSING: spinner ───────────────────────────────────────────── */}
        {phase === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Procesando archivo...</p>
          </div>
        )}

        {/* ── PREVIEW: table ─────────────────────────────────────────────── */}
        {phase === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {rows.length} filas detectadas —{' '}
                <span className="text-green-600 font-medium">{validCount} válidas</span>
                {invalidCount > 0 && (
                  <span className="text-destructive font-medium">, {invalidCount} con errores</span>
                )}
              </span>
              {previewRows.length < rows.length && (
                <span className="text-xs text-muted-foreground">
                  (mostrando primeras {previewRows.length})
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">Apellido</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                    <th className="px-3 py-2 text-left font-medium">Rol</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(row => (
                    <tr
                      key={row._rowIndex}
                      className={row._valid ? 'border-b' : 'border-b bg-destructive/10'}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row._rowIndex}</td>
                      <td className="px-3 py-2">{row.first_name || <span className="text-destructive">—</span>}</td>
                      <td className="px-3 py-2">{row.last_name || <span className="text-destructive">—</span>}</td>
                      <td className="px-3 py-2">{row.email || <span className="text-destructive">—</span>}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.phone ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.role ?? 'server'}</td>
                      <td className="px-3 py-2">
                        {row._valid ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-destructive"
                            title={row._errors.join(', ')}
                          >
                            <AlertCircle className="h-3 w-3" />
                            {row._errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={() => resetState()}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={validCount === 0}
              >
                Importar {validCount} usuario{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* ── IMPORTING: spinner ─────────────────────────────────────────── */}
        {phase === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Importando usuarios...</p>
          </div>
        )}

        {/* ── DONE: result summary ───────────────────────────────────────── */}
        {phase === 'done' && result && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-medium">
                  {result.imported} importado{result.imported !== 1 ? 's' : ''}
                  {result.skipped > 0 && `, ${result.skipped} omitido${result.skipped !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Los usuarios importados fueron registrados como contactos y podrán ser invitados al sistema desde su perfil.
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <details className="rounded-md border">
                <summary className="px-4 py-2 cursor-pointer text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Ver filas omitidas ({result.errors.length})
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-t">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-3 py-2 text-left font-medium">Fila</th>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err: ImportError, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">{err.row}</td>
                          <td className="px-3 py-2">{err.email ?? '—'}</td>
                          <td className="px-3 py-2 text-amber-600">
                            {REASON_LABELS[err.reason] ?? err.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}

        {/* ── ERROR: retry ───────────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
              <p className="text-sm">{errMsg ?? 'Ocurrió un error inesperado.'}</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={resetState}>Intentar de nuevo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
