// Simple migration runner - Run this with: node scripts/migrate-db.mjs

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_8lcFpjQ5kodE@ep-fancy-flower-ac8to1nr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

async function runMigration() {
    console.log('🔄 Iniciando migração do banco de dados...\n');

    const sql = neon(DATABASE_URL);

    try {
        // Create production_groups table
        console.log('📦 Criando tabela production_groups...');
        await sql`
      CREATE TABLE IF NOT EXISTS production_groups (
        id SERIAL PRIMARY KEY,
        part_code VARCHAR(100) NOT NULL,
        part_description TEXT,
        quantity INTEGER NOT NULL,
        company_id INTEGER REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT
      )
    `;
        console.log('✅ Tabela production_groups criada!\n');

        // Add columns to production_records
        console.log('📝 Adicionando colunas em production_records...');
        try {
            await sql`ALTER TABLE production_records ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES production_groups(id) ON DELETE CASCADE`;
            console.log('✅ Coluna group_id adicionada!');
        } catch (e) {
            console.log('ℹ️  Coluna group_id já existe');
        }

        try {
            await sql`ALTER TABLE production_records ADD COLUMN IF NOT EXISTS operation_sequence INTEGER DEFAULT 1`;
            console.log('✅ Coluna operation_sequence adicionada!\n');
        } catch (e) {
            console.log('ℹ️  Coluna operation_sequence já existe\n');
        }

        // Create indexes
        console.log('🔍 Criando índices...');
        await sql`CREATE INDEX IF NOT EXISTS idx_production_groups_part_code ON production_groups(part_code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_groups_company_id ON production_groups(company_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_group_id ON production_records(group_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_group_sequence ON production_records(group_id, operation_sequence)`;
        console.log('✅ Índices criados!\n');

        console.log('🎉 Migração concluída com sucesso!');
        console.log('\n✨ Agora você pode usar o sistema multi-operação!\n');

    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

runMigration();
