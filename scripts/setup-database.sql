-- Operators table
CREATE TABLE IF NOT EXISTS operators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  login VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parts table
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  material_cost DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operations table (dynamic operation types)
CREATE TABLE IF NOT EXISTS operations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  machine_cost_per_hour DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production records (apontamentos)
CREATE TABLE IF NOT EXISTS production_records (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'EM_PRODUCAO' CHECK (status IN ('EM_PRODUCAO', 'PAUSADO', 'FINALIZADO')),
  quantity INTEGER NOT NULL DEFAULT 1,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_pause_ms BIGINT DEFAULT 0,
  last_pause_start TIMESTAMP WITH TIME ZONE,
  expected_time_minutes DECIMAL(10,2),
  charged_value DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default operations
INSERT INTO operations (name, machine_cost_per_hour) VALUES
  ('Fresa', 80.00),
  ('Torno', 70.00),
  ('Solda', 60.00)
ON CONFLICT (name) DO NOTHING;

-- Seed a demo operator (password: admin123)
-- SHA-256 hash of "admin123" = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO operators (name, login, password_hash) VALUES
  ('Administrador', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9')
ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_records_part_id ON production_records(part_id);
CREATE INDEX IF NOT EXISTS idx_production_records_operator_id ON production_records(operator_id);
CREATE INDEX IF NOT EXISTS idx_production_records_status ON production_records(status);
CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);
