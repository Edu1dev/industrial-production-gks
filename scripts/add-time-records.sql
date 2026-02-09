-- Time Records table for tracking operator clock in/out
CREATE TABLE IF NOT EXISTS time_records (
  id SERIAL PRIMARY KEY,
  operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  reason VARCHAR(100),             -- Motivo da saída (Almoço, Fim do turno, etc.)
  reason_notes TEXT,               -- Detalhes adicionais se motivo = "Outro"
  part_code VARCHAR(100),          -- Peça em produção no momento
  production_record_id INTEGER REFERENCES production_records(id),
  worked_minutes INTEGER,          -- Calculado automaticamente ao fechar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queries by operator and date
CREATE INDEX IF NOT EXISTS idx_time_records_operator_date ON time_records(operator_id, record_date);
CREATE INDEX IF NOT EXISTS idx_time_records_production ON time_records(production_record_id);
