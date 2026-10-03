import { json, getSessionUser, isOwner } from '../../_lib.js';

// GET /api/owner/orders
// Menampilkan semua order untuk owner
export async function onRequestGet(context) {
  const { request, env } = context;

  const user = await getSessionUser(request, env);

  if (!isOwner(user, env)) {
    return json({ error: 'Bukan akun owner' }, 403);
  }

  const { results } = await env.DB.prepare(
    `SELECT
       o.*,
       u.name AS buyer_name,
       u.email AS buyer_email,
       u.telegram_username AS buyer_telegram,
       u.blocked AS buyer_blocked,
       p.name AS product_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN products p ON p.id = o.product_id
     ORDER BY o.created_at DESC`
  ).all();

  return json({
    orders: results || []
  });
}


// POST /api/owner/orders
// Body:
// { action: "block", user_id: "..." }
// atau
// { action: "unblock", user_id: "..." }
export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await getSessionUser(request, env);

  if (!isOwner(user, env)) {
    return json({ error: 'Bukan akun owner' }, 403);
  }

  let body;

  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Body tidak valid' }, 400);
  }

  const action = body.action;
  const userId = body.user_id;

  if (!userId) {
    return json({ error: 'user_id kosong' }, 400);
  }

  if (action !== 'block' && action !== 'unblock') {
    return json({ error: 'Action tidak valid' }, 400);
  }

  const targetUser = await env.DB
    .prepare('SELECT id, email, blocked FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!targetUser) {
    return json({ error: 'User tidak ditemukan' }, 404);
  }

  const blocked = action === 'block' ? 1 : 0;

  await env.DB
    .prepare('UPDATE users SET blocked = ? WHERE id = ?')
    .bind(blocked, userId)
    .run();

  return json({
    ok: true,
    blocked: blocked === 1
  });
}


// DELETE /api/owner/orders?id=ORDER_ID
// Menghapus order dan file submission customer jika ada
export async function onRequestDelete(context) {
  const { request, env } = context;

  const user = await getSessionUser(request, env);

  if (!isOwner(user, env)) {
    return json({ error: 'Bukan akun owner' }, 403);
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get('id');

  if (!orderId) {
    return json({ error: 'Order ID kosong' }, 400);
  }

  const order = await env.DB
    .prepare(
      `SELECT id, submission_r2_key
       FROM orders
       WHERE id = ?
       LIMIT 1`
    )
    .bind(orderId)
    .first();

  if (!order) {
    return json({ error: 'Order tidak ditemukan' }, 404);
  }

  // Hapus file customer dari R2 jika ada
  if (order.submission_r2_key && env.FILES) {
    try {
      await env.FILES.delete(order.submission_r2_key);
    } catch (e) {
      console.error('Gagal menghapus file R2:', e);
    }
  }

  // Hapus order dari database
  await env.DB
    .prepare('DELETE FROM orders WHERE id = ?')
    .bind(orderId)
    .run();

  return json({
    ok: true,
    message: 'Order berhasil dihapus'
  });
}
