// GET /api/featured
// Mengambil pilihan Produk Favorit yang disimpan owner.

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return Response.json(
      { ok: false, error: 'Database (D1) belum di-bind.' },
      { status: 500 }
    );
  }

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).run();

    const row = await env.DB.prepare(
      `SELECT value FROM site_settings
       WHERE key = ?
       LIMIT 1`
    )
      .bind('home_featured_ids')
      .first();

    if (!row) {
      return Response.json({
        ok: true,
        ids: null
      });
    }

    let ids = [];

    try {
      ids = JSON.parse(row.value);

      if (!Array.isArray(ids)) {
        ids = [];
      }
    } catch (e) {
      ids = [];
    }

    return Response.json({
      ok: true,
      ids: ids.slice(0, 4).map(String)
    });

  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: 'Gagal mengambil Produk Favorit.'
      },
      { status: 500 }
    );
  }
}
