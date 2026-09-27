import { json, getSessionUser, isOwner, genCode } from '../../_lib.js';

// POST /api/owner/generate-code  Body: { order_id }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const orderId = body.order_id;
  if (!orderId) return json({ error: 'order_id kosong' }, 400);

  const code = genCode();
  await env.DB.prepare(
    "UPDATE orders SET code = ?, code_used = 0, status = 'kode_terkirim', code_sent_at = datetime('now') WHERE id = ?"
  ).bind(code, orderId).run();

  return json(
 { orders: results || [] },
 200,
 { 'Cache-Control': 'no-store' }
);
}
