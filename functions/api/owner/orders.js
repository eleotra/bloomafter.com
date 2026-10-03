import { json, getSessionUser, isOwner } from '../../_lib.js';

/*
  GET    /api/owner/orders
  POST   /api/owner/orders
         Body: { action: "block" | "unblock", order_id }
  DELETE /api/owner/orders
         Body: { order_id }

  Semua endpoint di sini hanya bisa dipakai oleh OWNER.
*/


/* =========================
   GET — LIST SEMUA PESANAN
   ========================= */
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


/* =========================
   POST — BLOCK / UNBLOCK
   ========================= */
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
  const orderId = body.order_id;

  if (!orderId) {
    return json({ error: 'order_id kosong' }, 400);
  }

  if (action !== 'block' && action !== 'unblock') {
    return json({ error: 'Action tidak valid' }, 400);
  }

  /*
    Cari user pemilik order.
  */
  const order = await env.DB.prepare(
    `SELECT id, user_id
     FROM orders
     WHERE id = ?`
  ).bind(orderId).first();

  if (!order) {
    return json({ error: 'Pesanan tidak ditemukan' }, 404);
  }

  /*
    Block / unblock berdasarkan user_id,
    bukan berdasarkan order saja.

    Jadi kalau buyer punya beberapa order,
    semuanya tetap terkait dengan akun buyer yang sama.
  */
  const blockedValue = action === 'block' ? 1 : 0;

  await env.DB.prepare(
    `UPDATE users
     SET blocked = ?
     WHERE id = ?`
  ).bind(blockedValue, order.user_id).run();

  return json({
    ok: true,
    blocked: blockedValue === 1
  });
}


/* =========================
   DELETE — HAPUS ORDER
   ========================= */
export async function onRequestDelete(context) {
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

  const orderId = body.order_id;

  if (!orderId) {
    return json({ error: 'order_id kosong' }, 400);
  }

  /*
    Ambil order dulu supaya kita tahu
    apakah ada file submission di R2.
  */
  const order = await env.DB.prepare(
    `SELECT id, submission_r2_key
     FROM orders
     WHERE id = ?`
  ).bind(orderId).first();

  if (!order) {
    return json({ error: 'Pesanan tidak ditemukan' }, 404);
  }

  /*
    Kalau order punya file final di R2,
    hapus file tersebut juga supaya tidak
    meninggalkan file sampah di bucket.
  */
  if (order.submission_r2_key && env.FILES) {
    try {
      await env.FILES.delete(order.submission_r2_key);
    } catch (e) {
      /*
        Kalau file R2 gagal dihapus, kita tetap
        lanjut menghapus order dari database.
      */
    }
  }

  /*
    Hapus order dari D1.
    Setelah ini order tersebut otomatis
    tidak muncul lagi di:
      - Owner → Pesanan
      - Buyer → Riwayat
  */
  await env.DB.prepare(
    `DELETE FROM orders
     WHERE id = ?`
  ).bind(orderId).run();

  return json({
    ok: true
  });
}
