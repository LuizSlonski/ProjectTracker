-- =============================================
-- QualityTracker - New Quality Fields Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Add Root Cause field (Ishikawa 6M)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS root_cause TEXT;

-- Add Corrective Action field
ALTER TABLE issues ADD COLUMN IF NOT EXISTS corrective_action TEXT;
