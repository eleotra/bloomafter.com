import { json, getSessionUser } from '../../_lib.js';

// POST /api/orders/create
// Body: { product_id }
//
// Buyer yang sudah diblokir tidak boleh membuat pesanan baru.

export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await getSessionUser(request, env);

  if (!user) {
    return json({ error: 'Belum login' }, 401);
  }

  /*
    Cek apakah akun buyer sedang diblokir.
    blocked = 1  -> diblokir
    blocked = 0  -> normal
  */
  const buyer = await env.DB.prepare(
    `SELECT id, blocked
     FROM users
     WHERE id = ?`
  ).bind(user.id).first();

  if (!buyer) {
    return json({ error: 'Akun tidak ditemukan' }, 404);
  }

  if (Number(buyer.blocked) === 1) {
    return json({
      error: 'Akun kamu sedang diblokir dan tidak dapat membuat pesanan baru.'
    }, 403);
  }

  let body;

  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Body tidak valid' }, 400);
  }

  const productId = body.product_id;

  if (!productId) {
    return json({ error: 'product_id kosong' }, 400);
  }

  /*
    Pastikan produk masih ada.
  */
  const product = await env.DB.prepare(
    'SELECT * FROM products WHERE id = ?'
  ).bind(productId).first();

  if (!product) {
    return json({ error: 'Produk tidak ditemukan' }, 404);
  }

  /*
    Buat order seperti sebelumnya.
  */
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO orders
      (id, user_id, product_id, status)
     VALUES (?, ?, ?, ?)`
  ).bind(
    id,
    user.id,
    productId,
    'menunggu_pembayaran'
  ).run();

  return json({
    ok: true,
    order_id: id
  });
}
