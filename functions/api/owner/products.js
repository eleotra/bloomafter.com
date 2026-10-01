import { json, getSessionUser, isOwner } from '../../_lib.js';

// POST   /api/owner/products   Body: {name, description, price, demo_url, thumbnail_url, status}
// PUT    /api/owner/products   Body: {id, ...field yang mau diubah}
// DELETE /api/owner/products   Body: {id}
//
// Katalog publik (GET /api/products) tetap file terpisah & tidak berubah --
// tiga method di sini semuanya wajib login sebagai owner.

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const name = (body.name || '').trim();
  if (!name) return json({ error: 'Nama produk wajib diisi' }, 400);

  const price = Number(body.price) || 0;
  const id = 'p_' + crypto.randomUUID().slice(0, 8);

  const row = await env.DB.prepare('SELECT MAX(sort_order) AS m FROM products').first();
  const sortOrder = (row && row.m ? row.m : 0) + 1;

  await env.DB.prepare(
    `INSERT INTO products (id, name, price, description, demo_url, thumbnail_url, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, name, price,
    body.description || '', body.demo_url || '', body.thumbnail_url || '',
    body.status || 'Tersedia', sortOrder
  ).run();

  return json({ ok: true, id });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const id = body.id;
  if (!id) return json({ error: 'id kosong' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Produk tidak ditemukan' }, 404);

  const fields = ['name', 'description', 'price', 'demo_url', 'thumbnail_url', 'status', 'admin_url', 'sort_order'];
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      sets.push(`${f} = ?`);
      vals.push(f === 'price' || f === 'sort_order' ? Number(body[f]) || 0 : String(body[f]));
    }
  }
  if (!sets.length) return json({ error: 'Tidak ada field yang diubah' }, 400);
  vals.push(id);

  await env.DB.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const id = body.id;
  if (!id) return json({ error: 'id kosong' }, 400);

  const orderCount = await env.DB.prepare('SELECT COUNT(*) AS c FROM orders WHERE product_id = ?').bind(id).first();
  if (orderCount && orderCount.c > 0) {
    return json({ error: `Produk ini punya ${orderCount.c} pesanan terkait, tidak bisa dihapus. Ubah status jadi "Tidak Tersedia" saja.` }, 400);
  }

  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
