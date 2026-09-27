import { json, getSessionUser } from '../../_lib.js';

// POST /api/orders/create  Body: { product_id }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const productId = body.product_id;
  if (!productId) return json({ error: 'product_id kosong' }, 400);

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
  if (!product) return json({ error: 'Produk tidak ditemukan' }, 404);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO orders (id, user_id, product_id, status) VALUES (?, ?, ?, ?)'
  ).bind(id, user.id, productId, 'menunggu_pembayaran').run();

  return json({ ok: true, order_id: id });
}
