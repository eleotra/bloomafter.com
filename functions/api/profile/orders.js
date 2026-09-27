import { json, getSessionUser, isOwner } from '../../_lib.js';

// GET /api/owner/orders  -> hanya bisa diakses akun owner (dicek dari email)
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  const { results } = await env.DB.prepare(
    `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email, u.telegram_username AS buyer_telegram,
            p.name AS product_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN products p ON p.id = o.product_id
     ORDER BY o.created_at DESC`
  ).all();

  return json({ orders: results || [] });
}
