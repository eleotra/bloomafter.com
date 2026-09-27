# Rumah Bucin ♡ — Website Jualan (Cloudflare Pages + Functions + D1)

Struktur project ini **sudah dalam bentuk final** yang siap di-push ke GitHub lalu disambungkan ke
Cloudflare Pages tanpa perlu build step apa pun.

```
index.html                     ← seluruh frontend (SPA, gaya Shopee/TikTok Shop: Beranda / Katalog / Riwayat / Akun)
functions/
  _lib.js                      ← helper bersama (WAJIB ada persis di sini, jangan dipindah)
  api/
    me.js                      → GET  /api/me
    logout.js                  → POST /api/logout
    products.js                → GET  /api/products
    auth/
      google.js                → POST /api/auth/google
    orders/
      create.js                → POST /api/orders/create
      mine.js                  → GET  /api/orders/mine
      verify-code.js           → POST /api/orders/verify-code
      mark-editing-done.js     → POST /api/orders/mark-editing-done
    owner/
      orders.js                → GET  /api/owner/orders
      generate-code.js         → POST /api/owner/generate-code
      mark-done.js             → POST /api/owner/mark-done
    profile/
      telegram.js              → POST /api/profile/telegram
schema.sql                     ← skema + seed data D1
wrangler.toml                  ← binding database (buat dev lokal / opsional)
```

⚠️ **Jangan ubah lokasi file di dalam `functions/`.** Setiap file mengimpor `_lib.js` pakai path relatif
(`../_lib.js` atau `../../_lib.js`) sesuai kedalaman foldernya. Kalau strukturnya diratakan/dipindah,
error `Could not resolve "../../_lib.js"` bakal muncul lagi — itu penyebab error yang kamu alami sebelumnya.

---

## 1. Bikin database D1

```bash
npx wrangler login
npx wrangler d1 create rumah_bucin_db
```

Salin `database_id` yang muncul, tempel ke `wrangler.toml` di bagian `database_id = "..."`.

Lalu jalankan skema + seed data katalog:

```bash
npx wrangler d1 execute rumah_bucin_db --remote --file=./schema.sql
```

## 2. Setup Google Login

1. Buka [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → buat **OAuth Client ID** tipe **Web application**.
2. Tambahkan domain Pages kamu (mis. `https://rumah-bucin.pages.dev`) ke **Authorized JavaScript origins**.
3. Salin **Client ID**-nya, lalu ganti di `index.html`:
   ```js
   window.GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // ganti ini
   ```

## 3. Push ke GitHub

```bash
git init
git add .
git commit -m "Rumah Bucin - versi final"
git branch -M main
git remote add origin <URL_REPO_GITHUB_KAMU>
git push -u origin main
```

## 4. Sambungkan ke Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pilih repo ini.
2. Build settings:
   - **Framework preset**: `None`
   - **Build command**: *(kosongkan)*
   - **Build output directory**: `/`
3. Setelah project dibuat, buka **Settings → Functions → D1 database bindings** → tambahkan binding:
   - Variable name: `DB`
   - D1 database: `rumah_bucin_db`
4. Buka **Settings → Environment variables**, tambahkan (untuk Production & Preview):
   - `OWNER_EMAIL` = email Google kamu sendiri (buat akses dashboard Owner)
   - `GOOGLE_CLIENT_ID` = Client ID yang sama dengan langkah 2
5. **Retry deployment** (atau push commit baru) supaya binding & env var kepakai.

Setelah itu situs langsung jalan di `https://<nama-project>.pages.dev` — order, login, riwayat, dan dashboard owner semua aktif.

## Update katalog produk

Katalog sekarang **sepenuhnya dari database** (tabel `products`), bukan hardcode di HTML lagi — jadi kalau
kamu ubah harga/link/status lewat SQL atau D1 dashboard, otomatis muncul di tab Katalog & Beranda tanpa
perlu edit/upload ulang file apa pun. Contoh update lewat CLI:

```bash
npx wrangler d1 execute rumah_bucin_db --remote --command "UPDATE products SET price = 15000 WHERE id = 'p1';"
```

## Fitur "Kelola" (tombol di footer Beranda)

Ini fitur terpisah dari sistem order — semacam editor teks/gambar cepat untuk halaman statis (ganti
kata-kata hero, ganti gambar produk, tambah kartu contoh), lalu tombol **"Simpan & Unduh File Final"**
mengunduh ulang `index.html` hasil editan buat kamu upload manual kalau perlu. Password default:
`nayla23_` (ganti langsung di `index.html`, cari `ADMIN_PASSWORD`, kalau mau lebih aman).

## Dev lokal (opsional)

```bash
npx wrangler pages dev . --d1=DB=rumah_bucin_db
```
