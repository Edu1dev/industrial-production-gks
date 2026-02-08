// Migration script to add production groups support
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set in .env file');
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        console.log('Running migration: production-groups...');

        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migration-production-groups.sql'),
            'utf-8'
        );

        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

        for (const statement of statements) {
            if (statement.length > 0) {
                await sql([statement]);
            }
        }

        // Execute COMMENT statements separately
        const comments = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.startsWith('COMMENT'));

        for (const comment of comments) {
            if (comment.length > 0) {
                try {
                    await sql([comment]);
                } catch (e) {
                    // Comments might fail, but that's okay
                    console.log('Note: Comment skipped');
                }
            }
        }

        console.log('✓ Migration completed successfully!');
        console.log('✓ Created production_groups table');
        console.log('✓ Added group_id and operation_sequence columns');
        console.log('✓ Created indexes');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();

