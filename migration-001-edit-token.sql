-- migration-001-edit-token.sql
-- Jalankan ini SEKALI ke database D1 yang sudah live (schema.sql lama nggak akan
-- otomatis nambahin kolom baru ke tabel yang sudah ada).
--
-- Cara jalanin:
--   npx wrangler d1 execute rumah_bucin_db --remote --file=./migration-001-edit-token.sql

ALTER TABLE orders ADD COLUMN edit_token TEXT;
ALTER TABLE orders ADD COLUMN edit_password TEXT;
