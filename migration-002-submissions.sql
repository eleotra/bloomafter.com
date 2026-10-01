-- migration-002-submissions.sql
-- Jalankan ini SEKALI ke database D1 yang sudah live:
--   npx wrangler d1 execute rumah_bucin_db --remote --file=./migration-002-submissions.sql

ALTER TABLE orders ADD COLUMN submission_r2_key TEXT;
ALTER TABLE orders ADD COLUMN submission_file_name TEXT;
ALTER TABLE orders ADD COLUMN submission_size INTEGER;
ALTER TABLE orders ADD COLUMN submission_at TEXT;
ALTER TABLE orders ADD COLUMN submission_seen INTEGER NOT NULL DEFAULT 0;
