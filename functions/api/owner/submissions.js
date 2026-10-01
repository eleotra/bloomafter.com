import { json, getSessionUser, isOwner } from '../../_lib.js';

// GET /api/owner/submissions
// Daftar order yang sudah punya file final terkirim dari customer, buat
// section "File Customer / Submission" di Dashboard Owner.
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  const { results } = await env.DB.prepare(
    `SELECT o.id, o.status, o.submission_file_name, o.submission_size, o.submission_at,
            o.submission_seen, o.final_url,
            u.name AS buyer_name, u.email AS buyer_email,
            p.name AS product_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN products p ON p.id = o.product_id
     WHERE o.submission_r2_key IS NOT NULL
     ORDER BY o.submission_at DESC`
  ).all();

  return json({ submissions: results || [] }, 200, { 'Cache-Control': 'no-store' });
}
