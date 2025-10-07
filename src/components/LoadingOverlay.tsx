import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  variant?: 'fetching' | 'submitting';
}

export const LoadingOverlay = ({ isLoading, variant = 'fetching' }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  const isFetching = variant === 'fetching';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-card shadow-[var(--shadow-card)] border border-border/50">
        {/* Animated Icon */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-primary/20 animate-spin"
            style={{
              borderTopColor: 'hsl(var(--primary))',
              animationDuration: '1.5s',
            }}
          />

          {/* Inner icon */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10">
            {isFetching ? (
              <Loader2 className="w-8 h-8 text-primary animate-pulse" />
            ) : (
              <Send className="w-8 h-8 text-primary animate-pulse" />
            )}
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {isFetching ? 'Cargando datos...' : 'Enviando información...'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isFetching
              ? 'Por favor espere mientras consultamos la información'
              : 'Procesando su solicitud'}
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full bg-primary animate-bounce',
                i === 1 && 'animation-delay-150',
                i === 2 && 'animation-delay-300'
              )}
              style={{
                animationDelay: `${i * 150}ms`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
