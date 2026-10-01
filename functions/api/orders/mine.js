import { json, getSessionUser } from '../../_lib.js';

// GET /api/orders/mine
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Belum login' }, 401);

  // PENTING: query ini SENGAJA tidak menyertakan p.admin_url, p.admin_password,
  // o.edit_token, ATAU o.edit_password sama sekali -- jadi data sensitif itu nggak
  // pernah ada di response ini, bukan cuma "disembunyikan" di JS setelahnya.
  const { results } = await env.DB.prepare(
    `SELECT o.id, o.status, o.owner_note, o.final_url, o.created_at, o.done_at, o.code_used,
            p.name AS product_name, p.price AS product_price
     FROM orders o JOIN products p ON p.id = o.product_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`
  ).bind(user.id).all();

  // Frontend cuma dapet flag boolean "can_edit". Kalau true, tombol "Edit Website"
  // di-arahkan ke /api/orders/edit-redirect?order_id=... (lihat file itu), yang baru
  // resolve link asli + token-nya di server, tepat pas diklik -- bukan disiapkan di sini.
  const safe = (results || []).map((o) => ({
    id: o.id,
    status: o.status,
    owner_note: o.owner_note,
    final_url: o.final_url,
    created_at: o.created_at,
    done_at: o.done_at,
    code_used: o.code_used,
    product_name: o.product_name,
    product_price: o.product_price,
    can_edit: o.status === 'editing' || o.status === 'diproses' || o.status === 'done'
  }));

  return json({ orders: safe }, 200, { 'Cache-Control': 'no-store' });
}



