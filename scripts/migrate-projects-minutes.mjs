// Migration script to change estimated_time_hours to estimated_time_minutes in projects table
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_8lcFpjQ5kodE@ep-fancy-flower-ac8to1nr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

async function runMigration() {
    console.log('Running migration: migrate-projects-minutes...');

    // Use query method if available, or fallback
    // Based on previous experience, we should try to use sql.query or similar if possible, 
    // but neon() returns a function that might not have .query in all versions.
    // However, the error message in previous steps explicitly said: `use sql.query(...)`.
    // So we will try to use that.

    const sql = neon(DATABASE_URL);

    try {
        console.log('Renaming column estimated_time_hours to estimated_time_minutes...');

        // Check if column exists first to avoid errors if re-running
        // But for simplicity, we'll just try to rename.

        const statements = [
            `ALTER TABLE projects RENAME COLUMN estimated_time_hours TO estimated_time_minutes`,
            `UPDATE projects SET estimated_time_minutes = estimated_time_minutes * 60 WHERE estimated_time_minutes IS NOT NULL`
        ];

        for (const statement of statements) {
            console.log(`Executing: ${statement}`);
            if (typeof sql.query === 'function') {
                await sql.query(statement, []);
            } else {
                await sql([statement]);
            }
        }

        console.log('✓ Migration completed successfully!');
        console.log('✓ Renamed column and converted hours to minutes');

    } catch (error) {
        if (error.code === '42703') { // Undefined column
            console.log('ℹ️ Column estimated_time_hours might not exist (already migrated?)');
        } else {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    }
}

runMigration();
