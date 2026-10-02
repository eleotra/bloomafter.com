// POST /api/orders/validate-edit-token   Body: { order_id, token }
// Endpoint ini PUBLIK (bukan buat app kita sendiri) -- dipanggil dari JAVASCRIPT DI TEMPLATE
// (bloomafterrs.netlify.app/#admin, dst) buat ngecek "order + token ini valid nggak buat
// masuk mode edit?" tanpa perlu tau/nyimpen password apa pun.
//
// Response cuma { ok: true/false } -- TIDAK PERNAH balikin password atau data sensitif lain,
// jadi aman dipanggil dari domain manapun.
//
// Kenapa CORS "*": response-nya nggak mengandung apa pun yang rahasia (cuma boolean),
// jadi nggak masalah domain mana pun boleh manggil -- yang penting order_id+token-nya valid.

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch (e) { return jsonCors({ ok: false, error: 'Body tidak valid' }, 400); }

  const orderId = body.order_id;
  const token = body.token;
  if (!orderId || !token) return jsonCors({ ok: false, error: 'order_id / token kosong' }, 400);

  if (!env.DB) return jsonCors({ ok: false, error: 'Server belum siap' }, 500);

  const order = await env.DB.prepare(
    "SELECT id, status, edit_token FROM orders WHERE id = ?"
  ).bind(orderId).first();

  const valid =
  !!order &&
  order.edit_token &&
  order.edit_token === token &&
  order.status === 'editing';

  return jsonCors({ ok: !!valid });
}

// Preflight request (browser ngirim OPTIONS dulu sebelum POST cross-origin dengan JSON body)
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}
function jsonCors(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders() }
  });
}
