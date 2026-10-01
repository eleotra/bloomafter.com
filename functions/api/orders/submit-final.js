import { corsHeaders, jsonCors } from '../../_lib.js';

// POST /api/orders/submit-final   (multipart/form-data)
// Field: order_id, token, file (Blob -- boleh .html ATAU .zip, apa pun yang
// dihasilkan editor template)
//
// Dipanggil CROSS-ORIGIN dari template customer (bloomafterrs.netlify.app, dst),
// makanya diautentikasi pakai pasangan order_id+token (SAMA seperti
// validate-edit-token.js), BUKAN cookie session -- template beda origin,
// tidak bisa baca cookie session Rumah Bucin.
//
// File disimpan di R2 dengan key yang menyertakan order_id sebagai prefix folder,
// jadi terisolasi per-order. Endpoint DOWNLOAD-nya (submission-file.js) cuma bisa
// diakses Owner dan selalu ambil key dari database berdasar order_id -- bukan dari
// input bebas manapun -- jadi customer lain nggak mungkin nebak/pakai key file ini.
//
// Customer TIDAK menerima link file ini balik. Sesuai spek: customer cukup lihat
// konfirmasi terkirim, file final cuma bisa diunduh Owner.

const MAX_SIZE = 20 * 1024 * 1024; // 20MB -- cukup buat HTML + beberapa foto + 1 MP3

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) return jsonCors({ ok: false, error: 'Database belum siap' }, 500);
  if (!env.FILES) return jsonCors({ ok: false, error: 'Storage (R2) belum di-bind. Tambahkan binding FILES di wrangler.toml / dashboard Pages.' }, 500);

  let form;
  try { form = await request.formData(); } catch (e) { return jsonCors({ ok: false, error: 'Body harus multipart/form-data' }, 400); }

  const orderId = form.get('order_id');
  const token = form.get('token');
  const file = form.get('file');

  if (!orderId || !token) return jsonCors({ ok: false, error: 'order_id / token kosong' }, 400);
  if (!file || typeof file === 'string') return jsonCors({ ok: false, error: 'File tidak ditemukan di form' }, 400);
  if (file.size > MAX_SIZE) return jsonCors({ ok: false, error: 'File terlalu besar (maksimal 20MB)' }, 400);

  const order = await env.DB.prepare('SELECT id, status, edit_token FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return jsonCors({ ok: false, error: 'Pesanan tidak ditemukan' }, 404);
  if (!order.edit_token || order.edit_token !== token) return jsonCors({ ok: false, error: 'Token tidak valid' }, 401);
  if (order.status !== 'editing') return jsonCors({ ok: false, error: 'Pesanan ini bukan lagi tahap editing' }, 400);

  const safeName = String(file.name || 'website-final').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const key = `submissions/${orderId}/${Date.now()}-${safeName}`;

  try {
    await env.FILES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });
  } catch (e) {
    return jsonCors({ ok: false, error: 'Gagal menyimpan file ke storage' }, 502);
  }

  await env.DB.prepare(
    `UPDATE orders
     SET status = 'diproses', processing_started_at = datetime('now'),
         submission_r2_key = ?, submission_file_name = ?, submission_size = ?,
         submission_at = datetime('now'), submission_seen = 0
     WHERE id = ?`
  ).bind(key, safeName, file.size, orderId).run();

  return jsonCors({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
