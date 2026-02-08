// Migration to add admin role support

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_8lcFpjQ5kodE@ep-fancy-flower-ac8to1nr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

async function addAdminRole() {
    console.log('🔄 Adicionando suporte a roles de admin...\n');

    const sql = neon(DATABASE_URL);

    try {
        // Add is_admin column
        console.log('📝 Adicionando coluna is_admin...');
        try {
            await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`;
            console.log('✅ Coluna is_admin adicionada!\n');
        } catch (e) {
            console.log('ℹ️  Coluna is_admin já existe\n');
        }

        // Update existing admin user to be admin
        console.log('👤 Transformando usuário "admin" em administrador...');
        await sql`UPDATE operators SET is_admin = TRUE WHERE login = 'admin'`;
        console.log('✅ Usuário admin atualizado!\n');

        console.log('🎉 Migração de roles concluída com sucesso!\n');

    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

addAdminRole();
