-- Migration: Drop legacy discipleship_metrics table
-- Date: 2026-05-01
-- Reason: All analytics now read from discipleship_reports.report_data (JSONB).
-- The old discipleship_metrics table with subjective spiritual_temperature is no longer used.

-- Check for any remaining dependencies before dropping
-- Note: This migration assumes all backend handlers have been migrated to use
-- discipleship_reports instead of discipleship_metrics.

-- Drop the legacy table (CASCADE to handle any dependent views/indexes)
DROP TABLE IF EXISTS discipleship_metrics CASCADE;

-- Verify it's gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'discipleship_metrics'
  ) THEN
    RAISE EXCEPTION 'Failed to drop discipleship_metrics table';
  ELSE
    RAISE NOTICE 'discipleship_metrics table dropped successfully';
  END IF;
END $$;
