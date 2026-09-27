import { json, getSessionUser, isOwner } from '../../_lib.js';

// POST /api/owner/mark-done  Body: { order_id, final_url, owner_note }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const { order_id, final_url, owner_note } = body;
  if (!order_id || !final_url) return json({ error: 'order_id / final_url kosong' }, 400);

  await env.DB.prepare(
    "UPDATE orders SET status = 'done', final_url = ?, owner_note = ?, done_at = datetime('now') WHERE id = ?"
  ).bind(final_url, owner_note || '', order_id).run();

  return json({ ok: true });
}
