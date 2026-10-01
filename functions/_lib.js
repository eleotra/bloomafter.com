// functions/_lib.js
// Helper bersama yang dipakai semua Cloudflare Pages Functions di /functions/api/**
// PENTING: jangan pindahkan file ini. Semua import "../_lib.js" / "../../_lib.js" / "../../../_lib.js"
// di file lain dihitung relatif dari lokasi file itu terhadap file ini.

export function json(obj, status, extraHeaders) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) headers.append(k, v);
  }
  return new Response(JSON.stringify(obj), { status: status || 200, headers });
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Bikin string Set-Cookie buat session. Dipakai pas login berhasil.
export function setSessionCookie(token, maxAgeSeconds) {
  const age = maxAgeSeconds || 60 * 60 * 24 * 30; // default 30 hari
  return `session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;
}

// Dipakai pas logout, buat menghapus cookie session di browser.
export function clearSessionCookie() {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Bikin session baru di DB & balikin tokennya. Panggil ini pas user berhasil login.
export async function createSession(env, userId, maxAgeSeconds) {
  const token = randomToken();
  const age = maxAgeSeconds || 60 * 60 * 24 * 30;
  await env.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))"
  ).bind(token, userId, age).run();
  return token;
}

export async function getSessionUser(request, env) {
  const token = getCookie(request, 'session');
  if (!token) return null;
  const session = await env.DB.prepare(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return null;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first();
  return user || null;
}

export function isOwner(user, env) {
  return !!user && !!env.OWNER_EMAIL && user.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase();
}

export function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Dipakai endpoint yang dipanggil CROSS-ORIGIN dari template customer
// (validate-edit-token, submit-final) -- responsnya cuma data non-rahasia
// (boolean/konfirmasi), jadi aman diakses dari domain manapun.
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}
export function jsonCors(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders() }
  });
}
