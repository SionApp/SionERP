/**
 * JETRO es el PRODUCTO (la plataforma que se vende a las iglesias) — no es
 * configurable por iglesia. El nombre y el logo que SÍ se configuran por
 * iglesia (church_info.name / logo_url) son la marca del TENANT: se muestran
 * junto a JETRO, nunca en su lugar.
 */
export const PLATFORM_NAME = 'JETRO';

/** "JETRO · Sion" — usar donde haya lugar para mostrar ambas marcas juntas. */
export function coBrand(tenantName?: string | null): string {
  return tenantName ? `${PLATFORM_NAME} · ${tenantName}` : PLATFORM_NAME;
}
