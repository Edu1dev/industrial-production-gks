-- Migration: Add real_time_minutes to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS real_time_minutes DECIMAL(10,2);
