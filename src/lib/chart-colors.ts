/**
 * Colores de series para charts (Recharts necesita hex/rgb literal en stroke/fill/
 * stopColor — no resuelve custom properties de forma confiable ahí), centralizados
 * para que el mismo estado semántico (éxito, alerta, peligro, info) use siempre
 * el mismo tono en toda la app, en vez de 3-4 verdes/azules distintos por archivo.
 */
export const CHART_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
} as const;
