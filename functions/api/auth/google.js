import { json, createSession, setSessionCookie } from '../../_lib.js';

// POST /api/auth/google  Body: { credential }
// "credential" adalah ID token JWT dari tombol Google Sign-In di frontend.
// Kita verifikasi ke endpoint resmi Google (tokeninfo), lalu buat/perbarui user + session.
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Body tidak valid' }, 400); }
  const credential = body.credential;
  if (!credential) return json({ error: 'credential kosong' }, 400);

  if (!env.GOOGLE_CLIENT_ID) {
    return json({ error: 'Login Google belum dikonfigurasi di server (GOOGLE_CLIENT_ID kosong)' }, 500);
  }
  if (!env.DB) {
    return json({ error: 'Database belum terhubung (binding DB kosong)' }, 500);
  }

  let payload;
  try {
    const verifyRes = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential)
    );
    if (!verifyRes.ok) return json({ error: 'Token Google tidak valid / kedaluwarsa' }, 401);
    payload = await verifyRes.json();
  } catch (e) {
    return json({ error: 'Gagal menghubungi server verifikasi Google' }, 502);
  }

  if (payload.aud !== env.GOOGLE_CLIENT_ID) {
    return json({ error: 'Client ID Google tidak cocok dengan server' }, 401);
  }
  if (!payload.email || payload.email_verified !== 'true') {
    return json({ error: 'Email Google belum terverifikasi' }, 401);
  }

  const email = String(payload.email).toLowerCase();
  const googleId = payload.sub || null;
  const name = payload.name || email.split('@')[0];
  const avatarUrl = payload.picture || null;

  try {
    let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!user) {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, googleId, email, name, avatarUrl).run();
      user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    } else {
      await env.DB.prepare(
        'UPDATE users SET google_id = ?, name = ?, avatar_url = ? WHERE id = ?'
      ).bind(googleId, name, avatarUrl, user.id).run();
      user.name = name;
      user.avatar_url = avatarUrl;
    }

    const token = await createSession(env, user.id);

    return json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          telegram_username: user.telegram_username
        }
      },
      200,
      { 'Set-Cookie': setSessionCookie(token) }
    );
  } catch (e) {
    return json({ error: 'Gagal login: ' + (e && e.message ? e.message : 'error tidak diketahui') }, 500);
  }
}
