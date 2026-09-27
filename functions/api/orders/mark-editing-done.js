import { json, getSessionUser } from '../../_lib.js';

// POST /api/orders/mark-editing-done  Body: { order_id }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const orderId = body.order_id;
  if (!orderId) return json({ error: 'order_id kosong' }, 400);

  const order = await env.DB.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).bind(orderId, user.id).first();
  if (!order) return json({ error: 'Pesanan tidak ditemukan' }, 404);
  if (order.status !== 'editing') return json({ error: 'Pesanan ini bukan lagi tahap editing' }, 400);

  await env.DB.prepare(
    "UPDATE orders SET status = 'diproses', processing_started_at = datetime('now') WHERE id = ?"
  ).bind(orderId).run();

  return json({ ok: true });
}
