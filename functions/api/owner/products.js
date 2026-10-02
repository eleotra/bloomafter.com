import { json, getSessionUser } from '../../_lib.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const rows = await env.DB.prepare(`
    SELECT *
    FROM products
    ORDER BY sort_order ASC, created_at DESC
  `).all();

  return json(rows.results || []);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const body = await request.json();

  const name = String(body.name || '').trim();
  const price = Number(body.price || 0);
  const description = String(body.description || '');
  const demo_url = String(body.demo_url || '').trim();
  const thumbnail_url = String(body.thumbnail_url || '').trim();
  const status = String(body.status || 'Tersedia').trim();
  const admin_url = String(body.admin_url || '').trim();

  if (!name) {
    return json({ error: 'Nama produk wajib diisi.' }, 400);
  }

  const id = crypto.randomUUID();

  const maxSort = await env.DB.prepare(`
    SELECT COALESCE(MAX(sort_order), 0) AS max_sort
    FROM products
  `).first();

  const sortOrder = Number(maxSort?.max_sort || 0) + 1;

  await env.DB.prepare(`
    INSERT INTO products (
      id,
      name,
      price,
      description,
      demo_url,
      thumbnail_url,
      status,
      admin_url,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    name,
    price,
    description,
    demo_url,
    thumbnail_url,
    status,
    admin_url,
    sortOrder
  ).run();

  const product = await env.DB.prepare(`
    SELECT *
    FROM products
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();

  return json({
    ok: true,
    product
  }, 201);
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return json({ error: 'ID produk tidak ditemukan.' }, 400);
  }

  const body = await request.json();

  const fields = [
    'name',
    'description',
    'price',
    'demo_url',
    'thumbnail_url',
    'status',
    'admin_url',
    'sort_order'
  ];

  const updates = [];
  const values = [];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (!updates.length) {
    return json({ error: 'Tidak ada data yang diubah.' }, 400);
  }

  updates.push(`updated_at = datetime('now')`);

  values.push(id);

  await env.DB.prepare(`
    UPDATE products
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...values).run();

  const product = await env.DB.prepare(`
    SELECT *
    FROM products
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();

  return json({
    ok: true,
    product
  });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return json({ error: 'ID produk tidak ditemukan.' }, 400);
  }

  await env.DB.prepare(`
    DELETE FROM products
    WHERE id = ?
  `).bind(id).run();

  return json({ ok: true });
}
