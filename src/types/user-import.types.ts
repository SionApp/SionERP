export interface UserImportRow {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  id_number?: string;
  role?: 'pastor' | 'staff' | 'supervisor' | 'server';
  birth_date?: string; // ISO yyyy-mm-dd
  whatsapp?: boolean;
}

export interface ImportError {
  row: number;
  email?: string;
  reason:
    | 'missing_required'
    | 'invalid_email'
    | 'duplicate_in_batch'
    | 'email_exists'
    | 'role_above_caller'
    | 'invalid_role'
    | 'db_error';
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

// Preview-time augmented row (UI only — not sent to backend)
export interface ParsedRow extends UserImportRow {
  _rowIndex: number; // 1-based, matches what user sees in Excel
  _errors: string[]; // human-readable preview errors
  _warnings: string[]; // defaults applied, etc.
  _valid: boolean; // false → excluded from POST
}
