import { getSessionUser } from '../../_lib.js';

// GET /api/orders/edit-redirect?order_id=xxx
// Dipanggil langsung lewat <a href> (bukan fetch), diautentikasi pakai cookie session.
// Server yang bangun & resolve URL editor asli + token -- URL itu TIDAK PERNAH lewat
// response JSON /api/orders/mine, jadi nggak nongol di halaman Riwayat / Network tab
// sebelum tombolnya benar-benar diklik.
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  const user = await getSessionUser(request, env);
  if (!user) return textResponse('Belum login. Silakan login dulu di halaman utama, lalu coba lagi.', 401);
  if (!orderId) return textResponse('order_id kosong.', 400);

  const order = await env.DB.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).bind(orderId, user.id).first();

  if (!order) return textResponse('Pesanan tidak ditemukan, atau bukan milik akun ini.', 404);
  if (!['editing', 'diproses', 'done'].includes(order.status)) {
    return textResponse('Pesanan ini belum bisa diedit. Verifikasi kode dulu ya.', 403);
  }
  if (!order.edit_token) {
    return textResponse('Akses edit belum tersedia untuk pesanan ini. Hubungi kami ya.', 404);
  }

  const product = await env.DB.prepare('SELECT admin_url FROM products WHERE id = ?').bind(order.product_id).first();
  if (!product || !product.admin_url) {
    return textResponse('Editor untuk produk ini belum diset admin. Hubungi kami ya.', 404);
  }

  const target = buildEditUrl(product.admin_url, order.id, order.edit_token);

  return new Response(null, {
    status: 302,
    headers: { Location: target, 'Cache-Control': 'no-store' }
  });
}

// Nyisipin ?order=..&token=.. SEBELUM hash fragment (#admin), bukan setelahnya --
// karena URLSearchParams(location.search) di browser cuma baca bagian antara "?" dan "#".
// Kalau query ditaruh setelah "#", JS di template nggak akan pernah nemu parameternya.
//
// Contoh:
//   "https://foo.netlify.app/#admin"        -> "https://foo.netlify.app/?order=X&token=Y#admin"
//   "https://foo.netlify.app/admin"         -> "https://foo.netlify.app/admin?order=X&token=Y"
//   "https://foo.netlify.app/?x=1#admin"    -> "https://foo.netlify.app/?x=1&order=X&token=Y#admin"
function buildEditUrl(baseUrl, orderId, token) {
  const hashIndex = baseUrl.indexOf('#');
  const urlPart = hashIndex === -1 ? baseUrl : baseUrl.slice(0, hashIndex);
  const hashPart = hashIndex === -1 ? '' : baseUrl.slice(hashIndex); // termasuk karakter '#'-nya
  const sep = urlPart.includes('?') ? '&' : '?';
  return urlPart + sep + 'order=' + encodeURIComponent(orderId) + '&token=' + encodeURIComponent(token) + hashPart;
}

function textResponse(msg, status) {
  return new Response(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
