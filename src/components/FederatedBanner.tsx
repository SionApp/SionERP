import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/** Formatea el tiempo restante como "Nm Ss" (o "Expirada" si ya venció). */
function formatRemaining(expiresAt: Date, now: Date): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 'Expirada';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Banner persistente, no descartable, para sesiones de acceso federado
 * (BonDev, modo sólo lectura) — R5 del SDD: nunca debe sentirse como un
 * login normal. Se monta en DashboardLayout, siempre visible arriba de
 * todo mientras `isFederatedReadOnly` sea true.
 */
export function FederatedBanner() {
  const { isFederatedReadOnly, federatedInfo } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isFederatedReadOnly) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isFederatedReadOnly]);

  if (!isFederatedReadOnly || !federatedInfo) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-cyan-500/30 bg-cyan-500/15 px-4 py-1.5 text-center text-xs text-cyan-700 dark:text-cyan-400 sm:text-sm"
    >
      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Estás viendo esto en <strong>modo lectura</strong> — sesión de soporte de{' '}
        {federatedInfo.operatorName} (BonDev). Expira en{' '}
        {formatRemaining(federatedInfo.expiresAt, now)}.
      </span>
    </div>
  );
}
