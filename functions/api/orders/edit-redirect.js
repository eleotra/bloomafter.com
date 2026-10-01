import { json, getSessionUser } from '../../_lib.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  // Pastikan buyer sudah login
  const user = await getSessionUser(request, env);

  if (!user) {
    return new Response('Silakan login terlebih dahulu.', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  if (!orderId) {
    return new Response('order_id tidak ditemukan.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // Ambil order milik user yang sedang login
  const order = await env.DB.prepare(`
    SELECT
      o.id,
      o.user_id,
      o.product_id,
      o.edit_token,
      p.admin_url
    FROM orders o
    JOIN products p ON p.id = o.product_id
    WHERE o.id = ? AND o.user_id = ?
    LIMIT 1
  `).bind(orderId, user.id).first();

  if (!order) {
    return new Response('Order tidak ditemukan atau bukan milik akun ini.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  if (!order.edit_token) {
    return new Response('Token edit belum tersedia untuk order ini.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  if (!order.admin_url) {
    return new Response('URL template belum tersedia.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  /*
   * Buat URL:
   * https://template.com/?order=ORDER_ID&token=TOKEN#admin
   *
   * Query parameter HARUS diletakkan sebelum #admin.
   */
  const target = new URL(order.admin_url);

  target.searchParams.set('order', order.id);
  target.searchParams.set('token', order.edit_token);

  // Paksa masuk ke mode editor
  target.hash = 'admin';

  return Response.redirect(target.toString(), 302);
}
