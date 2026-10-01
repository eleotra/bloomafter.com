import { json, getSessionUser, isOwner } from '../../_lib.js';

// POST /api/owner/upload-image   (multipart/form-data, field: file)
// Upload foto katalog ke R2, balikin URL yang bisa langsung dipakai di <img src>.
// Ini beda dari file submission customer: foto produk memang PUBLIK (ditampilkan
// di katalog buat siapa aja), jadi disajikan lewat endpoint publik terpisah
// (/api/files/product-image), bukan endpoint owner-only.
const MAX_SIZE = 5 * 1024 * 1024; // 5MB cukup buat foto katalog
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!isOwner(user, env)) return json({ error: 'Bukan akun owner' }, 403);
  if (!env.FILES) return json({ error: 'Storage (R2) belum di-bind. Tambahkan binding FILES.' }, 500);

  let form;
  try { form = await request.formData(); } catch (e) { return json({ error: 'Body harus multipart/form-data' }, 400); }

  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'File tidak ditemukan' }, 400);
  if (file.size > MAX_SIZE) return json({ error: 'Foto terlalu besar (maksimal 5MB)' }, 400);
  if (!ALLOWED_TYPES.includes(file.type)) return json({ error: 'Format harus JPG, PNG, WEBP, atau GIF' }, 400);

  const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const key = `products/${crypto.randomUUID()}.${ext}`;

  try {
    await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  } catch (e) {
    return json({ error: 'Gagal upload ke storage' }, 502);
  }

  return json({ ok: true, url: `/api/files/product-image?key=${encodeURIComponent(key)}` });
}
