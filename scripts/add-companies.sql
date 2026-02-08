-- Migration: Add companies table and link parts to companies
-- Run this migration on existing databases

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add company_id column to parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- 3. Replace UNIQUE(code) with UNIQUE(code, company_id) to allow same part code in different companies
-- Drop old unique constraint/index on code
DROP INDEX IF EXISTS idx_parts_code;
ALTER TABLE parts DROP CONSTRAINT IF EXISTS parts_code_key;

-- Create partial unique indexes:
-- For parts WITH a company: unique on (code, company_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_code_company ON parts(code, company_id) WHERE company_id IS NOT NULL;
-- For parts WITHOUT a company (legacy records): unique on (code) alone
CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_code_null_company ON parts(code) WHERE company_id IS NULL;
