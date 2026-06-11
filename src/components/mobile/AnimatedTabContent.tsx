import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

/**
 * Envuelve el contenido de un tab y aplica fade-in al cambiar de tab.
 * Usá `key={activeTab}` en la instancia para que React remonte y dispare la animación.
 */
export function AnimatedTabContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('animate-fade-in', className)}>{children}</div>;
}
