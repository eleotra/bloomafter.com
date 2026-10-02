import { json, getSessionUser, isOwner } from '../../_lib.js';

// GET /api/owner/featured
// POST /api/owner/featured

async function ensureSettingsTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const user = await getSessionUser(request, env);

  if (!isOwner(user, env)) {
    return json({ error: 'Bukan akun owner' }, 403);
  }

  if (!env.DB) {
    return json(
      { error: 'Database (D1) belum di-bind.' },
      500
    );
  }

  try {
    await ensureSettingsTable(env);

    const row = await env.DB.prepare(
      `SELECT value FROM site_settings
       WHERE key = ?
       LIMIT 1`
    )
      .bind('home_featured_ids')
      .first();

    let ids = null;

    if (row) {
      try {
        ids = JSON.parse(row.value);

        if (!Array.isArray(ids)) {
          ids = [];
        }

        ids = ids.slice(0, 4).map(String);

      } catch (e) {
        ids = [];
      }
    }

    return json({
      ok: true,
      ids
    });

  } catch (e) {
    return json(
      { error: 'Gagal mengambil Produk Favorit.' },
      500
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await getSessionUser(request, env);

  if (!isOwner(user, env)) {
    return json({ error: 'Bukan akun owner' }, 403);
  }

  if (!env.DB) {
    return json(
      { error: 'Database (D1) belum di-bind.' },
      500
    );
  }

  let body;

  try {
    body = await request.json();
  } catch (e) {
    return json(
      { error: 'Body harus JSON.' },
      400
    );
  }

  let ids = Array.isArray(body?.ids)
    ? body.ids
        .map(x => String(x).trim())
        .filter(Boolean)
    : [];

  ids = [...new Set(ids)].slice(0, 4);

  try {
    await ensureSettingsTable(env);

    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');

      const rows = await env.DB.prepare(
        `SELECT id FROM products
         WHERE id IN (${placeholders})`
      )
        .bind(...ids)
        .all();

      const valid = new Set(
        (rows.results || []).map(r => String(r.id))
      );

      ids = ids.filter(id =>
        valid.has(String(id))
      );
    }

    await env.DB.prepare(`
      INSERT INTO site_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
    `)
      .bind(
        'home_featured_ids',
        JSON.stringify(ids)
      )
      .run();

    return json({
      ok: true,
      ids
    });

  } catch (e) {
    return json(
      { error: 'Gagal menyimpan Produk Favorit.' },
      500
    );
  }
      }
