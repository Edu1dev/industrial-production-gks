-- Migration: Add base_cost_per_hour to operations table
-- The system now requires users to input the base cost per hour,
-- and machine_cost_per_hour is auto-calculated as base_cost_per_hour * 1.667

ALTER TABLE operations
ADD COLUMN IF NOT EXISTS base_cost_per_hour DECIMAL(12,2) DEFAULT 0;

-- Backfill existing records: derive base_cost from current machine_cost
UPDATE operations
SET base_cost_per_hour = ROUND(machine_cost_per_hour / 1.667, 2)
WHERE base_cost_per_hour = 0 AND machine_cost_per_hour > 0;
