# Apple of My Eye Store

Web e-commerce Node.js untuk Apple of My Eye, lengkap dengan katalog, keranjang, checkout, CMS produk, dashboard penjualan, pengelolaan transaksi, dan manajemen pengguna berbasis role.

## Menjalankan di PowerShell

```powershell
cd "E:\xampp\htdocs\appleofmyeye"
npm install
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="gunakan-password-panjang-dan-unik"
$env:SESSION_SECRET="gunakan-random-secret-minimal-32-karakter"
npm start
```

Buka `http://localhost:3000` untuk toko dan `http://localhost:3000/admin` untuk CMS. Untuk pengembangan dengan restart otomatis gunakan `npm run dev`; untuk pengujian gunakan `npm test`.

## Reset password CMS

Jika lupa password CMS lokal, jalankan PowerShell berikut. Password baru akan diminta di terminal dan tidak ditampilkan saat diketik:

```powershell
cd "E:\xampp\htdocs\appleofmyeye"
$env:CMS_RESET_USERNAME="admin"
npm run cms:reset-password
```

Untuk mereset akun yang sudah ada, ganti `CMS_RESET_USERNAME` dengan username akun tersebut, misalnya `krispati`. Perintah ini akan membuat akun `owner` baru bila username belum ada, atau memperbarui password akun lama bila username sudah ada.

Jika terminal tidak bisa meminta password interaktif, tetapkan sementara `$env:CMS_RESET_PASSWORD`, jalankan perintah reset, lalu hapus dengan `Remove-Item Env:CMS_RESET_PASSWORD`.

Di Vercel, cara tercepat untuk akses darurat adalah mengganti `ADMIN_PASSWORD` dan `SESSION_SECRET` di Environment Variables lalu redeploy. Setelah berhasil masuk sebagai owner, ubah password pengguna permanen dari menu User Management.

## Fitur CMS

- Dashboard omzet, jumlah transaksi, transaksi menunggu, rata-rata pesanan, grafik tujuh hari, dan stok menipis.
- Daftar transaksi, detail pelanggan/item, riwayat status, dan perubahan status pesanan.
- Tambah, ubah, hapus produk serta upload PNG/JPG/WebP maksimal 2 MB.
- Manajemen pengguna dengan role `owner`, `admin`, atau `editor`; password disimpan sebagai hash scrypt.
- Cookie sesi bertanda tangan, HttpOnly, SameSite, dan proteksi CSRF untuk perubahan data.

## Penyimpanan

Tanpa `DATABASE_URL`, aplikasi memakai file JSON lokal untuk pengembangan atau deployment VPS satu instance. Bila `DATABASE_URL` tersedia, produk, transaksi, dan pengguna otomatis disimpan ke PostgreSQL/Neon; data produk awal diimpor sekali dari `data/products.json`.

Upload gambar memakai folder `images/uploads/` secara lokal. Bila `BLOB_READ_WRITE_TOKEN` tersedia, CMS otomatis menyimpan gambar ke Vercel Blob.

File penting:

- `data/products.json` — data awal produk.
- `data/store.json` — profil toko, ongkir, dan metode pembayaran.
- `deploy/schema.sql` — skema opsional untuk inspeksi/manual setup PostgreSQL.
- `.env.example` — daftar environment variable tanpa nilai rahasia.

## Deploy Vercel dari GitHub

1. Import repository `antokrispati/appleofmyeye` di Vercel dan pilih branch produksi `main`.
2. Tambahkan integrasi Neon/Postgres dan Vercel Blob melalui Marketplace/Storage Vercel.
3. Isi environment variable untuk Production dan Preview:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `DATABASE_URL` (biasanya dibuat otomatis oleh integrasi database)
   - `BLOB_READ_WRITE_TOKEN` (dibuat otomatis setelah Blob terhubung)
   - `STORE_WHATSAPP`
4. Deploy. Setiap push berikutnya ke `main` akan memicu production deployment; branch/PR lain mendapat preview deployment.
5. Setelah URL aktif, uji login CMS, buat satu pengguna, upload gambar, lakukan checkout percobaan, dan ubah status transaksi.

Vercel mendeteksi `server.js` sebagai Node.js server, mengubahnya menjadi satu Function, dan menjalankannya di region Singapore (`sin1`) agar dekat dengan pengguna Indonesia. Jangan memakai file JSON sebagai penyimpanan produksi Vercel karena filesystem function tidak persisten.

## API utama

- `GET /api/health` — health check dan mode storage.
- `GET /api/store` — konfigurasi publik dan katalog.
- `GET /api/products` — katalog dan filter.
- `POST /api/orders` — validasi checkout dan pembuatan transaksi.
- `GET /api/admin/dashboard` — ringkasan penjualan.
- `GET/PATCH /api/admin/orders` — pengelolaan transaksi.
- `/api/admin/products` — CRUD produk.
- `/api/admin/users` — manajemen pengguna owner/admin.

Harga dari browser tidak dipercaya; total checkout dihitung ulang di server. Sebelum go-live, verifikasi identitas usaha, kontak, harga, stok, kebijakan privasi, retur/pengiriman, serta metode pembayaran resmi.
