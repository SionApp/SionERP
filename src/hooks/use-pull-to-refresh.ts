import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  /** Función que se llama al hacer refresh */
  onRefresh: () => Promise<void> | void;
  /** Scroll container ref (si no se pasa, escucha en window) */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Distancia mínima en px para activar el refresh (default: 60) */
  threshold?: number;
  /** Distancia máxima en px que se puede tirar (default: 120) */
  maxPull?: number;
}

type PullState = 'idle' | 'pulling' | 'reached' | 'refreshing';

/**
 * Hook de pull-to-refresh con indicador visual.
 * Funciona con touch events (mobile).
 */
export function usePullToRefresh({
  onRefresh,
  containerRef,
  threshold = 60,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const scrollTop = containerRef?.current ? containerRef.current.scrollTop : window.scrollY;

      // Solo activar si estamos en el tope del scroll
      if (scrollTop > 5) return;

      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [containerRef]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff <= 0) {
        // Scrolling hacia arriba — no hacer nada
        pulling.current = false;
        setPullDistance(0);
        setState('idle');
        return;
      }

      // Resistencia: reducir la distancia percibida
      const distance = Math.min(Math.pow(diff, 0.75), maxPull);
      setPullDistance(distance);

      if (distance >= threshold) {
        setState('reached');
      } else {
        setState('pulling');
      }
    },
    [threshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      setState('refreshing');
      try {
        await onRefresh();
      } finally {
        setState('idle');
        setPullDistance(0);
      }
    } else {
      setState('idle');
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef?.current ?? document;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    state,
    pullDistance,
    /** Progress 0..1 para el indicador visual */
    progress: Math.min(pullDistance / threshold, 1),
    isRefreshing: state === 'refreshing',
  };
}
