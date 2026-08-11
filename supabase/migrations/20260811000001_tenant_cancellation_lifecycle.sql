-- =============================================================================
-- Migration: 20260811000001_tenant_cancellation_lifecycle.sql
-- Ciclo de cancelación de tenant: distingue "suspendido" (temporal, ej. mora)
-- de "cancelado" (el cliente se va) y deja rastro de cuándo se borraron los
-- datos, para el borrado automático con período de gracia.
-- =============================================================================

ALTER TABLE public.churches
    ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
    ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;

COMMENT ON COLUMN public.churches.cancelled_at IS
    'Cuándo se marcó el tenant como cancelado (status=cancelled). El borrado automático de datos se dispara N días después de esta fecha — ver StartTenantPurgeScheduler.';
COMMENT ON COLUMN public.churches.deleted_at IS
    'Cuándo se ejecutó el borrado automático de los datos del tenant. NULL = todavía no se borró. Una vez seteado, el tenant queda como tombstone (solo id/name/status para trazabilidad, sin datos personales de sus usuarios).';
