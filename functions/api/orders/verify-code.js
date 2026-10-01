import { json, getSessionUser, randomToken } from '../../_lib.js';

// POST /api/orders/verify-code  Body: { order_id, code }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const { order_id, code } = body;
  if (!order_id || !code) return json({ error: 'Data tidak lengkap' }, 400);

  const order = await env.DB.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).bind(order_id, user.id).first();
  if (!order) return json({ error: 'Pesanan tidak ditemukan' }, 404);

  if (order.status !== 'kode_terkirim') {
    return json({ error: 'Pesanan ini belum siap / kode sudah pernah dipakai' }, 400);
  }
  if (order.code_used) {
    return json({ error: 'Kode ini sudah pernah dipakai' }, 400);
  }
  if (String(code).trim() !== String(order.code).trim()) {
    return json({ error: 'Kode salah, coba cek lagi ya' }, 400);
  }

  // Token unik (dipakai buat validasi ke template lewat /api/orders/validate-edit-token).
  // Nggak ada lagi "password" yang dikirim ke frontend -- template yang validasi token ini
  // langsung ke server, jadi customer nggak pernah lihat URL asli atau password apa pun.
  const editToken = randomToken().slice(0, 24);

  await env.DB.prepare(
    `UPDATE orders
     SET status = 'editing', code_used = 1, editing_started_at = datetime('now'),
         edit_token = ?
     WHERE id = ?`
  ).bind(editToken, order_id).run();

  return json({ ok: true });
}

