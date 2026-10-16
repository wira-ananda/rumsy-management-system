# Hasil perpindahan RMS — 17 Oktober 2026

Versi Svelte + Hono + Prisma sudah aktif di [alamat utama](https://rms-rumsy-app.pages.dev). Versi sebelum Prisma yang sebelumnya tayang di alamat utama kini tersedia di [staging](https://rms-rumsy-staging.pages.dev). Cloudflare Pages tidak dihapus atau diganti namanya; paket deployment di kedua project yang diganti. Maintenance sudah dimatikan.

| Lingkungan | D1 | R2 | Storage | Deployment |
| --- | --- | --- | --- | --- |
| app / produksi | `rms-rumsy` | `rms-private` | Prisma normalized | `423aa684-ace5-462a-9e9c-20599825102f` |
| staging / versi sebelumnya | `rms-rumsy-staging` | `rms-private-staging` | JSON legacy | `60f12ccc-b873-4864-96e6-932d1f36f8db` |

Database dan bucket produksi tetap sumber daya semula. Migrasi menambahkan tabel `rms_*`; tabel lama tidak dihapus atau diganti memakai salinan staging. D1 staging tetap menyimpan tabel normalized bekas pengujian, tetapi aplikasi staging aktif membaca JSON legacy. Secret Resend produksi dipertahankan; pengiriman email staging tidak diaktifkan.

## Data yang dicocokkan

Seluruh isi bisnis hasil pembacaan ulang dari D1 produksi dibandingkan dengan backup final setelah jeda penyimpanan: **1.779 record pada 30 model cocok persis**, termasuk seluruh field/nilai, tipe, field tambahan, urutan, null, chat, catatan dan riwayat. Akun, metadata file dan audit lama juga dipertahankan.

- 54 project, 41 client, 124 lead, 24 transaksi pembayaran, 13 akun asli.
- 71 file, **79.908.825 byte**; seluruh file diunduh sebagai backup baru dan SHA-256 dibandingkan antara bucket produksi dan staging, semuanya cocok.
- Total kontrak asli `133720610995`, pembayaran `610953743`, pembayaran verified `219722221` tetap sama dengan sumber. Total kontrak asli berbeda dari current contract dashboard karena adendum.
- JSON `app_state` produksi tetap versi 920 sebagai arsip. State normalized menjadi versi 921 karena satu tes simpan tanpa mengubah isi. Perbedaan versi ini bukan perubahan data bisnis.
- Login membersihkan satu access session lama yang sudah kedaluwarsa. Sesi sumber yang belum kedaluwarsa, hash password, role dan data 13 akun tetap dipertahankan. Semua akun/sesi/audit pengujian sementara sudah dibersihkan.

Gerbang pembandingan sempat menemukan empat catatan normalized kehilangan baris kosong akibat pemrosesan impor per baris. Aktivasi diblokir, keempat nilai diperbaiki memakai parameter SQL dari backup final, lalu pembandingan seluruh dataset diulang dan lolos. Snapshot sumber dan backup tidak berubah. Pemisahan SQL kini memakai parser SQL; tes regresi mencakup baris kosong, kutip, semicolon dalam nilai dan Unicode.

## Pemeriksaan aplikasi

37 kelompok tes sebelumnya lulus, ditambah satu tes regresi impor SQL. Check Svelte/TypeScript menghasilkan nol error/warning, dan build produksi berhasil.

Deployment pemeriksaan menggunakan D1/R2 produksi diuji saat alamat utama masih maintenance. Login/refresh/logout, Bearer dan penolakan cookie-only/akses tanpa login, pembacaan seluruh data melalui Prisma, satu simpan tanpa perubahan, penolakan versi kedaluwarsa, file asli, dua portal client, serta login/reload desktop dan mobile dengan 36 menu lolos. Versi legacy staging diuji dengan cara serupa tanpa menyimpan perubahan bisnis. Setelah aktivasi, pemeriksaan login, data, file, portal dan browser di alamat utama diulang dan lolos. Tes tidak mengirim email dan tidak membuat transaksi bisnis baru.

## Backup dan bukti lokal

Folder privat, diabaikan Git: **`api/.local/cutover-2026-10-17/`**.

- `production-before.sql`: backup sebelum maintenance.
- `production-final.sql`: backup setelah snapshot lama dikunci; sumber migrasi final, SHA-256 `9ef9e11e80b9f367eb46884dae9ee82caa875db84572f4f6937065d1a147cba1`.
- `staging-before.sql`: seluruh D1 staging sebelum perpindahan deployment, termasuk hasil migrasi/pengujian sebelumnya.
- `r2-production/`: backup baru seluruh 71 file produksi, mempertahankan object key sebagai path.
- `old-pages/`: paket versi sebelumnya; seluruh 18 aset publik dibandingkan dengan deployment produksi sebelum perpindahan dan cocok byte demi byte. Deployment produksi sebelumnya `08c0a2bd-e575-4eb6-828f-0e9a90ef2867` tetap tersimpan pada riwayat Cloudflare.
- `production-normalized-verified.json`, `r2-verification.json`: pembandingan dataset dan checksum file.
- `production-canary-http-verified.json`, `staging-legacy-http-verified.json`, `production-live-http-verified.json`: hasil HTTPS/browser serta pembersihan akun tes.
- `completed.json`: konfigurasi akhir, deployment dan checksum backup.

Backup 16 Oktober di Downloads tetap tersimpan dan tidak ditimpa. Jangan unggah `.local`, SQL, SQLite, atau backup R2 sebagai aset website.

## Pemakaian berikutnya

Gunakan alamat utama untuk pekerjaan nyata dan refresh tab yang masih membuka versi lama. Kedua lingkungan cocok isi bisnisnya saat cutover; **perubahan berikutnya tidak otomatis disinkronkan**. Staging tidak mengubah produksi.

```sh
bun run deploy:production
bun run deploy:staging
```

Konfigurasi eksplisit ada di `api/deploy/production/wrangler.jsonc` dan `api/deploy/staging/wrangler.jsonc`. Target produksi memeriksa marker Prisma sebelum deploy. Deploy staging membangun kode terbaru dan akan mengganti paket lama yang sekarang tayang; mode datanya tetap legacy. Deployment kode tidak menjalankan perubahan schema secara otomatis. Tool impor staging lama dinonaktifkan untuk konfigurasi legacy, dan tool cutover sekali pakai menolak menjalankan deployment lagi setelah `completed.json` tersimpan.

Penulisan JSON produksi dikunci oleh tiga trigger `cutover_legacy_*` agar deployment lama yang berbagi D1 tidak menimpa snapshot arsip. Perubahan bisnis baru harus melalui Prisma di alamat utama. **Mengembalikan deployment atau flag ke legacy saja setelah ada perubahan baru tidak menjadi rollback data yang aman**: arsip JSON akan tertinggal dan guard akan menolak penyimpanannya. Pemulihan berikutnya memerlukan backup terbaru serta rekonsiliasi data normalized, bukan impor backup 920 langsung ke produksi aktif. Hasil verifikasi menjelaskan kondisi saat perpindahan, bukan jaminan terhadap perubahan atau penghapusan di masa mendatang.
