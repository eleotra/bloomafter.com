import { json, getSessionUser, isOwner } from '../../../_lib.js';

// POST /api/owner/delete-submission
// Menghapus file final customer dari R2 dan membersihkan metadata submission di D1.
export async function onRequestPost(context) {
  const { request, env } = context;

  // Cek login owner
  const user = await getSessionUser(request, env);

  if (!isOwner(user, env)) {
    return json({ error: 'Bukan akun owner' }, 403);
  }

  // Cek binding R2
  if (!env.FILES) {
    return json(
      { error: 'Storage (R2) belum di-bind. Tambahkan binding FILES.' },
      500
    );
  }

  // Cek binding D1
  if (!env.DB) {
    return json(
      { error: 'Database (D1) belum di-bind.' },
      500
    );
  }

  // Baca body JSON
  let body;

  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Body harus JSON.' }, 400);
  }

  const orderId = String(body?.order_id || '').trim();

  if (!orderId) {
    return json({ error: 'order_id wajib diisi.' }, 400);
  }

  // Cari order
  const order = await env.DB.prepare(
    `SELECT id, submission_r2_key, submission_file_name
     FROM orders
     WHERE id = ?
     LIMIT 1`
  )
    .bind(orderId)
    .first();

  if (!order) {
    return json({ error: 'Order tidak ditemukan.' }, 404);
  }

  const key = order.submission_r2_key;

  // Kalau file memang sudah tidak ada
  if (!key) {
    return json({
      ok: true,
      deleted: false,
      message: 'File sudah tidak ada di storage.'
    });
  }

  // Hapus file dari R2
  try {
    await env.FILES.delete(key);
  } catch (e) {
    return json(
      { error: 'Gagal menghapus file dari R2.' },
      502
    );
  }

  // Bersihkan metadata submission dari D1
  try {
    await env.DB.prepare(
      `UPDATE orders
       SET submission_r2_key = NULL,
           submission_file_name = NULL,
           submission_size = NULL,
           submission_at = NULL,
           submission_seen = 1
       WHERE id = ?`
    )
      .bind(orderId)
      .run();
  } catch (e) {
    return json(
      {
        ok: false,
        error:
          'File sudah terhapus dari R2, tetapi metadata D1 gagal dibersihkan. Coba refresh dashboard.'
      },
      500
    );
  }

  return json({
    ok: true,
    deleted: true,
    file_name: order.submission_file_name || null
  });
}
