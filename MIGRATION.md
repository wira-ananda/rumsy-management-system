# Migrasi RMS ke SvelteKit dan Hono

Frontend dimigrasikan pada 15 Oktober 2026; backend dimigrasikan ke Hono pada 16 Oktober 2026. Autentikasi API kemudian diubah menjadi Bearer sesuai permintaan untuk menolak akses URL data melalui cookie browser. Kontrak data bisnis dan sumber D1/R2 dipertahankan. Perubahan ini masih lokal dan belum dideploy ke Cloudflare.

## Implementasi

- Semua 36 menu dan 14 tab Project 360 memakai komponen `.svelte`, termasuk login, layout, modal, form dan portal klien.
- Halaman berada di `web/src/lib/components/{sales,projects,clients,finance,qc,workflow,admin,management,system,client}`.
- `features/registry.ts` memetakan route ke komponen Svelte. `components/projects/tabs/index.ts` memetakan 14 tab.
- `features/**/*.ts` mengelola aksi bisnis. Form memakai schema bertipe dan `FormDialog.svelte`, dengan `bind:value`, `bind:group`, event dan pesan validasi Svelte.
- Runtime JSON dipasangkan dengan state reaktif Svelte pada workspace. Perubahan entitas langsung memperbarui tampilan; snapshot save tetap berbentuk JSON yang sama.
- Controller JS, HTML-string renderer, helper DOM, modal lama dan script ekstraksi awal sudah dihapus dari kode aktif. Tidak ada `innerHTML`, `{@html}`, query selector atau pemasangan handler DOM manual di `web/src`.
- Kode awal tetap disimpan di `baseline/original/` sebagai pembanding.

## Implementasi backend Hono

- Sumber backend aktif berada di `api/src/`, mengikuti pola SAFAR: `app.ts`, `index.ts`, `modules/*/*.route.ts`, `*.service.ts`, `*.schema.ts`, dan `shared/`.
- Modul: auth, user, directory, state, file, client, notification, health dan pipeline. Modul tanpa input tidak membutuhkan schema; pipeline merupakan service internal.
- Route dan middleware benar-benar memakai Hono. Query D1, akses R2, email, serializer portal dan aturan state terpisah dari registrasi route. Tidak ada pemanggilan router Worker lama.
- Parsing input mempertahankan normalisasi dan pesan validasi sebelumnya. Snapshot JSON tetap terbuka terhadap field produksi tambahan; belum dirombak menjadi CRUD per entitas.
- `shared/env.ts` mendefinisikan binding Cloudflare, bukan environment Bun server. D1 dipertahankan melalui `shared/db/d1.ts`; tidak ditambahkan Prisma/PostgreSQL, Docker atau server `.listen()`.
- `scripts/build-api.mjs` membundel Hono dan TypeScript menjadi Worker ESM mandiri. Packaging frontend menyalin hasil tersebut ke `web/build/_worker.js`.
- `_worker.js` lama di root dihapus dari jalur aktif. Salinan utuh tetap berada di `baseline/original/_worker.js`, tidak masuk paket deployment.

## Kontrak backend

1. Backend sekarang berasal dari Hono, sehingga hasil `_worker.js` tidak lagi identik byte demi byte. Arsip Worker asli tetap diverifikasi checksum; perilaku API lama dibandingkan langsung dengan Hono dalam tes regresi.
2. CSS awal tetap identik; markup baru mempertahankan class yang dipakai stylesheet tersebut.
3. Endpoint bisnis, multipart upload, dan payload `{version, data}` tetap sama. API internal sekarang memerlukan Bearer header; cookie saja tidak diterima. Login menambahkan informasi token, dan endpoint `POST /api/auth/refresh` ditambahkan.
4. Normalisasi dan save mempertahankan field produksi yang tidak dikenal frontend.
5. Tidak ada database, bucket, seed produksi, localStorage atau migrasi SQL baru.
6. Portal tetap memakai `/client.html?token=...`; token dan link yang sudah tersimpan tetap kompatibel.
7. Development dapat memakai backend yang sudah terdeploy melalui `web/.env`; seluruh operasi browser mengikuti sumber tersebut. Untuk mencoba Hono lokal, gunakan `bun run test:api` dan proxy ke `127.0.0.1:8788`. Tes otomatis memakai binding di memori, tanpa credential produksi atau pengiriman email nyata.
8. Cookie `rms_session` dan sesi yang belum kedaluwarsa dipakai sebagai refresh, bukan autentikasi data. Hash password dan tabel D1 tetap kompatibel. Token akses acak maksimal 15 menit disimpan sebagai hash pada tabel sesi yang sama, dengan sesi induk diperiksa setiap request. Tidak beralih ke JWT. URL frontend dan API tetap bisa memakai origin Cloudflare Pages yang sama.

## Perubahan autentikasi

- Seluruh API internal memerlukan `Authorization: Bearer <accessToken>`, termasuk direktori user/sales, snapshot state dan file. Tidak ada fallback cookie atau token query URL.
- Login mengembalikan user, accessToken, tokenType dan expiresIn. Token akses disimpan di memori frontend; cookie HttpOnly/Secure/SameSite=Lax hanya digunakan endpoint refresh dengan header eksplisit `X-RMS-Refresh: 1`.
- Login/refresh browser lintas origin ditolak. Vite menerjemahkan Origin hanya pada request dari origin dev server sendiri, sehingga proxy lokal tetap bekerja tanpa membuka origin asing.
- Expiry sesi diperiksa sebagai tanggal UTC di SQLite, bukan perbandingan teks ISO terhadap datetime SQL. Token akses/refresh ditolak ketika sesi induk habis, dicabut atau akun dinonaktifkan. Logout mencabut satu keluarga sesi termasuk semua token aksesnya.
- Frontend memulihkan token saat reload/expiry dan menggabungkan refresh request paralel. Hasil refresh yang datang setelah sesi dibersihkan tidak menghidupkan token kembali. Request gagal karena koneksi tidak langsung diulang sebagai mutasi bisnis.
- File/foto internal dimuat melalui fetch dengan Bearer lalu blob URL. Portal publik tetap memakai token project. Health check tetap publik.
- Perubahan ini perlu frontend dan backend versi baru terpasang bersamaan. Proxy ke produksi lama tetap menjalankan autentikasi lama sampai paket baru diunggah.

## Penyesuaian tampilan

Rendering sekarang memakai lifecycle dan reaktivitas Svelte. Karena itu beberapa masalah tampilan lama tidak ikut dipertahankan: detail/chat lead baru bisa dibuka langsung setelah save, filter bulan tidak mereset dirinya saat menggambar ulang, hasil approval adendum tampil langsung, dan foto progress dirender sebagai atribut gambar yang valid. Aturan stage, perhitungan keuangan, status dan gerbang bisnis tetap mengikuti versi awal.

Pesan validasi form tampil di dalam dialog. Pemetaan tab Chat pada System Check memeriksa komponen Svelte; pemeriksaan berbasis string fungsi renderer lama diganti dengan tes arsitektur dan tes browser. Keterbatasan katalog role awal (14 role frontend, sementara pemeriksaan bawaan mengharapkan 15) masih dilaporkan.

## Batas perubahan

Temuan audit mengenai otorisasi/scope API, task REVISION, multi-PIC backend, hak hapus task, handover Head BU, User Access overrides, tanggal tetap, QC return dan penanganan kegagalan save tetap perlu pekerjaan terpisah. Migrasi framework mempertahankan aturan bisnis yang lama.

Snapshot `/api/state` masih luas untuk user yang memiliki Bearer valid, akses file internal belum memiliki scope per project, dan belum ditambahkan rate limit. Login/refresh kini memiliki pemeriksaan origin dan header refresh eksplisit; API data tidak lagi memakai autentikasi cookie otomatis. Respons error internal masih mengikuti kontrak lama. Penguatan autentikasi ini belum merupakan perbaikan otorisasi atau audit keamanan menyeluruh.

## Verifikasi

`bun run check`: **0 error, 0 warning**. `bun run test`: **26 kelompok lulus**, mencakup perbandingan kontrak bisnis backend asli/Hono, regresi frontend dan tes keamanan/transport Bearer. `bun run test:e2e`: **15 skenario lulus**, mencakup 36 menu, 14 tab, penolakan URL langsung meski sudah login, pemulihan sesi, blob preview/download, serta proxy Vite. Build dan packaging Cloudflare Pages berhasil; tidak ada tes mutasi ke produksi.

Pengujian tersebut tidak membuktikan seluruh konfigurasi binding/secret deployment Cloudflare. Health backend asli dan koneksi proxy development telah diperiksa secara read-only; tidak ada pengujian tambah/edit/hapus yang dijalankan ke data produksi.

Production dan Preview harus memiliki binding/secret masing-masing. Preview yang kosong tidak otomatis mewarisi D1/R2 Production. Paket Hono tidak membuat atau mengubah binding akun Cloudflare.

## Pembanding dan rollback

`baseline/original/` menyimpan 10 file sebelum migrasi, dengan hash di `baseline/checksums.json`. Paket frontend lama dapat dipulihkan dari folder tersebut. Mengganti frontend tidak memerlukan reset D1/R2.

## Referensi framework

- [SvelteKit: Single-page apps](https://svelte.dev/docs/kit/single-page-apps)
- [SvelteKit: adapter-static](https://svelte.dev/docs/kit/adapter-static)
- [Hono: Application API](https://hono.dev/docs/api/hono)
- [Hono: Cloudflare Pages](https://hono.dev/docs/getting-started/cloudflare-pages)
