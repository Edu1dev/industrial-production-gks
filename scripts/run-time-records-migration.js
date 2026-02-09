// Migration script to add time_records table
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
        console.log('Running migration: add-time-records...');

        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'add-time-records.sql'),
            'utf-8'
        );

        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await sql(statement);
        }

        console.log('✓ Migration completed successfully!');
        console.log('✓ Created time_records table and indexes');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
