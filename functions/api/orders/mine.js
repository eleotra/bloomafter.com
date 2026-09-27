import { json, getSessionUser } from '../../_lib.js';

// GET /api/orders/mine
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Belum login' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT o.id, o.status, o.owner_note, o.final_url, o.created_at, o.done_at, o.code_used,
            p.name AS product_name, p.price AS product_price, p.admin_url, p.admin_password
     FROM orders o JOIN products p ON p.id = o.product_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`
  ).bind(user.id).all();

  // admin_url/admin_password cuma boleh kebaca kalau kode sudah pernah diverifikasi
  // (status editing/diproses/done) — bukan sekadar disembunyikan di tampilan.
  const safe = (results || []).map((o) => {
    if (o.status === 'menunggu_pembayaran' || o.status === 'kode_terkirim') {
      return { ...o, admin_url: null, admin_password: null };
    }
    return o;
  });

  return json({ orders: safe });
}
