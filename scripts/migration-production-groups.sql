-- Migration: Add production groups for multi-operation workflow
-- This allows tracking a part through multiple operations/machines

-- Create production_groups table
CREATE TABLE IF NOT EXISTS production_groups (
  id SERIAL PRIMARY KEY,
  part_code VARCHAR(100) NOT NULL,
  part_description TEXT,
  quantity INTEGER NOT NULL,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Add columns to production_records
ALTER TABLE production_records 
  ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES production_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS operation_sequence INTEGER DEFAULT 1;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_groups_part_code ON production_groups(part_code);
CREATE INDEX IF NOT EXISTS idx_production_groups_company_id ON production_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_production_records_group_id ON production_records(group_id);
CREATE INDEX IF NOT EXISTS idx_production_records_group_sequence ON production_records(group_id, operation_sequence);

-- Add comment for documentation
COMMENT ON TABLE production_groups IS 'Groups multiple production_records for the same part across different operations';
COMMENT ON COLUMN production_records.group_id IS 'Links multiple operations for the same production batch';
COMMENT ON COLUMN production_records.operation_sequence IS 'Order of operations: 1 for first operation, 2 for second, etc.';
