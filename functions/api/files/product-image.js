export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.FILES) {
    return new Response('Storage R2 belum terhubung.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return new Response('Key gambar tidak ditemukan.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  if (!key.startsWith('products/')) {
    return new Response('Key tidak valid.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  try {
    const object = await env.FILES.get(key);

    if (!object) {
      return new Response('Gambar tidak ditemukan.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, {
      status: 200,
      headers
    });

  } catch (error) {
    return new Response('Gagal mengambil gambar.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
