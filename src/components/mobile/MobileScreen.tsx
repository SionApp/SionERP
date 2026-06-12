import { ChevronLeft } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setMobileNavHidden } from './mobile-nav-state';
import { cn } from '@/lib/utils';

interface MobileScreenProps {
  title?: string;
  subtitle?: string;
  /** true → navigate(-1); string → navega a esa ruta. Activa el patrón pushed-detail (oculta bottom nav). */
  back?: boolean | string;
  /** Botón/acción a la derecha del header */
  action?: ReactNode;
  /** "light" (default, fondo transparente, texto oscuro) | "brand" (fondo primary, texto blanco) */
  variant?: 'light' | 'brand';
  /** Reemplaza completamente el header. Útil para hero headers como el Dashboard. */
  header?: ReactNode;
  children: ReactNode;
}

/**
 * Shell de cada pantalla mobile.
 * Header sticky + contenido scrolleable con espacio para el bottom nav.
 *
 * variant="brand": header con bg-primary, texto blanco — para home/hero screens.
 * Prop `header`: reemplaza completamente el header por contenido custom.
 */
export function MobileScreen({
  title,
  subtitle,
  back,
  action,
  variant = 'light',
  header,
  children,
}: MobileScreenProps) {
  const navigate = useNavigate();
  const isDetail = back !== undefined && back !== false;
  const isBrand = variant === 'brand';

  useEffect(() => {
    if (!isDetail) return;
    setMobileNavHidden(true);
    return () => setMobileNavHidden(false);
  }, [isDetail]);

  const handleBack = () => {
    if (typeof back === 'string') navigate(back);
    else navigate(-1);
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {header ?? (
        <header
          className={cn(
            'sticky top-0 z-40',
            isBrand ? 'bg-primary' : 'bg-background/95 backdrop-blur-lg border-b border-border/40'
          )}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-2 h-14 px-3">
            {isDetail && (
              <button
                onClick={handleBack}
                aria-label="Volver"
                className={cn(
                  'p-2 -ml-1 rounded-xl transition-colors cursor-pointer',
                  isBrand ? 'text-white active:bg-white/15' : 'hover:bg-accent/60 active:bg-accent'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className={cn('flex-1 min-w-0', !isDetail && 'px-1')}>
              <h1
                className={cn(
                  'text-base font-bold leading-tight truncate',
                  isBrand && 'text-white'
                )}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className={cn(
                    'text-xs leading-tight truncate',
                    isBrand ? 'text-white/70' : 'text-muted-foreground'
                  )}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </header>
      )}

      <div className={`flex-1 ${isDetail ? 'pb-6' : 'pb-24'}`}>{children}</div>
    </div>
  );
}
