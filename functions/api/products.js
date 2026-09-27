import { json } from '../_lib.js';

// GET /api/products -> { products: [...] }
// Publik, siapa aja boleh akses (buat nampilin katalog di tab Katalog & Beranda).
export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ products: [] });
  const { results } = await env.DB.prepare(
    `SELECT id, name, price, description, demo_url, thumbnail_url, status, sort_order
     FROM products
     ORDER BY sort_order ASC, created_at ASC`
  ).all();
  return json({ products: results || [] });
}
