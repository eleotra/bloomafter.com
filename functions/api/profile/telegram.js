import { json, getSessionUser } from '../../_lib.js';

// POST /api/profile/telegram  Body: { telegram_username }
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  let tg = (body.telegram_username || '').trim();
  if (tg && !tg.startsWith('@')) tg = '@' + tg;

  await env.DB.prepare('UPDATE users SET telegram_username = ? WHERE id = ?').bind(tg, user.id).run();
  return json({ ok: true, telegram_username: tg });
}
