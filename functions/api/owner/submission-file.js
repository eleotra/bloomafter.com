import { getSessionUser, isOwner } from '../../_lib.js';

// GET /api/owner/submission-file?order_id=xxx
// HANYA owner yang bisa akses. Key file R2 SELALU diambil dari database
// berdasarkan order_id -- endpoint ini TIDAK PERNAH menerima key R2 langsung
// dari client, jadi tidak ada cara menebak/mengarang path ke file order lain.
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return new Response('Bukan akun owner', { status: 403 });
  if (!orderId) return new Response('order_id kosong', { status: 400 });
  if (!env.FILES) return new Response('Storage (R2) belum di-bind', { status: 500 });

  const order = await env.DB.prepare(
    'SELECT submission_r2_key, submission_file_name FROM orders WHERE id = ?'
  ).bind(orderId).first();

  if (!order || !order.submission_r2_key) return new Response('Belum ada file untuk pesanan ini', { status: 404 });

  const obj = await env.FILES.get(order.submission_r2_key);
  if (!obj) return new Response('File tidak ditemukan di storage', { status: 404 });

  // Tandai sudah dilihat owner -- ini yang bikin badge "baru" di dashboard hilang.
  await env.DB.prepare('UPDATE orders SET submission_seen = 1 WHERE id = ?').bind(orderId).run();

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${(order.submission_file_name || 'website-final').replace(/"/g, '')}"`);
  headers.set('Cache-Control', 'no-store');
  return new Response(obj.body, { headers });
}
