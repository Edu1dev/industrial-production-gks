-- Migration: Add projects table and pause_logs table
-- Run this migration on existing databases

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  part_code VARCHAR(100) NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  estimated_time_hours DECIMAL(10,2),
  charged_value_per_piece DECIMAL(12,2) NOT NULL DEFAULT 0,
  material_cost DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','EM_PRODUCAO','FINALIZADO')),
  created_by INTEGER REFERENCES operators(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Unique active project code (non-finalized)
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_active_code
  ON projects(UPPER(part_code)) WHERE status != 'FINALIZADO';

-- 2. Create pause_logs table
CREATE TABLE IF NOT EXISTS pause_logs (
  id SERIAL PRIMARY KEY,
  production_record_id INTEGER NOT NULL REFERENCES production_records(id),
  reason TEXT NOT NULL,
  paused_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resumed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Add project_id column to production_records
ALTER TABLE production_records ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_production_records_project_id ON production_records(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pause_logs_record_id ON pause_logs(production_record_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
