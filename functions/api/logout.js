import { json, getCookie, clearSessionCookie } from '../_lib.js';

// POST /api/logout
export async function onRequestPost(context) {
  const { request, env } = context;
  const token = getCookie(request, 'session');
  if (token && env.DB) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
