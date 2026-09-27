-- Rumah Bucin ♡ — skema database (Cloudflare D1 / SQLite)
-- Jalankan sekali di awal:
--   npx wrangler d1 execute rumah_bucin_db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  telegram_username TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  demo_url TEXT,
  thumbnail_url TEXT,
  admin_url TEXT,
  admin_password TEXT,
  auto_login INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Tersedia',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  status TEXT NOT NULL DEFAULT 'menunggu_pembayaran',
  code TEXT,
  code_used INTEGER NOT NULL DEFAULT 0,
  code_sent_at TEXT,
  editing_started_at TEXT,
  processing_started_at TEXT,
  done_at TEXT,
  final_url TEXT,
  owner_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);

-- Seed katalog awal, disalin dari katalog lama kamu supaya order langsung berfungsi.
-- Ganti admin_url / admin_password / thumbnail_url kapan pun lewat SQL atau D1 dashboard.
INSERT OR IGNORE INTO products (id, name, price, demo_url, status, sort_order) VALUES
 ('p1',  '1. Untuk Kamu ❤️',            10000, 'https://bloomafterrs.netlify.app/',   'Tersedia',    1),
 ('p2',  '2. Untuk Sayangku 💕',         10000, 'https://bloomafter02.netlify.app/',   'Tersedia',    2),
 ('p3',  '3. Kita',                      16000, 'https://bloomafter03.netlify.app/',   'Tersedia',    3),
 ('p4',  '4. A Little Gift For You',     13000, 'https://birthday1-pied.vercel.app/',  'Tersedia',    4),
 ('p5',  '5. Untuk Sayang — Love Story', 16000, 'https://bloomafter4.vercel.app/',     'Tersedia',    5),
 ('p6',  '6. For Kamu — Confess Studio', 20000, 'https://bloomafterf.vercel.app/',     'Tersedia',    6),
 ('p7',  '7. BucinFlix — Our Story',     20000, 'https://bloomafter7.vercel.app/',     'Tersedia',    7),
 ('p8',  '8. Our Little Universe',       20000, 'https://bloomafter08.vercel.app/',    'Tersedia',    8),
 ('p9',  '9. Our Little Universe ♡',     20000, 'https://bloomafter9.vercel.app/',     'Tersedia',    9),
 ('p10', '10. Jeje — Little Universe',   20000, 'https://eysshies.vercel.app/',        'Perlu Update', 10),
 ('p11', '11. Starlight Anniversary',    10000, 'https://eyshiess.vercel.app/',        'Perlu Update', 11);
