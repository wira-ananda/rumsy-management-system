# RMS Rumsy

Frontend **SvelteKit + Svelte 5 + TypeScript + Vite**, backend **Hono + TypeScript di Cloudflare Workers/Pages**. Struktur `web/` dan `api/` mengikuti pola proyek SAFAR. Data dan alur bisnis tetap memakai D1/R2 yang sama. API internal sekarang wajib memakai **Bearer access token**, dengan cookie HttpOnly khusus untuk pemulihan sesi.

## Struktur

```text
rms-rumsy/
├── api/
│   ├── src/
│   │   ├── index.ts            # Entry Cloudflare: API atau static assets
│   │   ├── app.ts              # Registrasi router Hono
│   │   ├── modules/            # auth, user, directory, state, file,
│   │   │                      # client, notification, health, pipeline
│   │   │                      # *.route.ts, *.service.ts, *.schema.ts
│   │   └── shared/            # db/d1, env, middlewares, constants, types, utils
│   └── build/_worker.js       # Bundle otomatis; bukan tempat mengedit kode
├── web/
│   ├── src/routes/             # Entry internal dan /client.html
│   ├── src/lib/
│   │   ├── components/
│   │   │   ├── sales/          # Lead, pipeline, kanban, activity, laporan
│   │   │   ├── projects/tabs/  # 14 tab Project 360
│   │   │   ├── clients/        # Database dan detail klien
│   │   │   ├── finance/        # Verifikasi, jadwal, ledger, outstanding
│   │   │   ├── qc/             # Inspeksi, temuan, corrective, verification
│   │   │   ├── workflow/       # Task, approval, support
│   │   │   ├── management/     # Dashboard, reports, guide, audit, search
│   │   │   ├── system/         # Settings, user, access, email, akun
│   │   │   ├── admin/          # Arsip surat
│   │   │   ├── client/         # Portal publik
│   │   │   └── shared/         # Card, Badge, FormDialog, ChatThread, dll.
│   │   ├── features/           # Aksi bisnis TypeScript dan registry komponen
│   │   ├── domain/             # Model, formula keuangan, pipeline
│   │   ├── services/           # API, autentikasi, file, chat, form
│   │   ├── access/             # Aturan role dan kepemilikan
│   │   ├── stores/             # Runtime data dan dialog
│   │   ├── constants/          # Menu, role, stage, tab, permission
│   │   ├── types/
│   │   └── utils/
│   └── build/                  # Paket Cloudflare Pages
├── baseline/original/          # Salinan paket awal untuk pembanding
├── baseline/checksums.json
├── scripts/package-pages.mjs
└── tests/                      # Perbandingan backend lama/Hono dan tes browser
```

Contoh: panduan berada di `web/src/lib/components/management/GuidePage.svelte`; tampilan Project ada di `components/projects/tabs/`. File JS/TS digunakan untuk data, aturan bisnis dan transport. Template HTML-string dan controller DOM lama sudah dihapus dari `web/src`; tidak ada `innerHTML`, `{@html}`, atau `FeatureView` pada frontend aktif. Form memakai binding dan event Svelte melalui `FormDialog.svelte` atau komponen khusus.

Contoh backend: endpoint login ada di `api/src/modules/auth/auth.route.ts`, logika dan query di `auth.service.ts`, parsing input di `auth.schema.ts`. Hono menangani routing dan middleware; tidak ada penerusan ke router Worker lama. Lihat `api/README.md` untuk daftar endpoint dan binding. Berbeda dari SAFAR, RMS tetap memakai D1/R2 dan token acak yang diperiksa di server; tidak beralih ke Prisma/PostgreSQL atau JWT.

## Akses API

Membuka `/api/directory/users`, `/api/state`, atau file internal langsung dari address bar akan menghasilkan `401 UNAUTHENTICATED`, termasuk ketika browser memiliki cookie login. API hanya menerima `Authorization: Bearer <accessToken>`; cookie dan token pada query URL tidak diterima sebagai autentikasi data internal.

Login mengembalikan `{user, accessToken, tokenType: "Bearer", expiresIn}`. Token akses berlaku maksimal 15 menit, disimpan hanya dalam memori tab, dan hash-nya disimpan di tabel `sessions` yang sudah ada. Cookie `rms_session` tetap HttpOnly/Secure/SameSite=Lax, tetapi hanya dipakai oleh `POST /api/auth/refresh` dengan header `X-RMS-Refresh: 1`. Frontend memulihkan token otomatis saat reload/expiry. Login/refresh dari origin browser lain ditolak. Logout mencabut sesi refresh dan seluruh token akses dalam sesi tersebut.

Foto dan dokumen internal diambil frontend dengan Bearer, kemudian ditampilkan melalui blob URL. Portal client tetap memakai token project tersendiri, dan `/api/health` tetap publik. Akun berizin tetap dapat melihat data respons melalui DevTools atau Postman dengan token yang valid; ini bukan upaya menyembunyikan data dari pemilik akses.

## Menjalankan lokal

Gunakan Bun dan Node.js 22 atau lebih baru:

```sh
bun install
bun dev
```

Buka `http://127.0.0.1:5173`. Vite meneruskan `/api/*` ke `RMS_API_ORIGIN` dari `web/.env`. Untuk menggunakan backend/data RMS asli:

```dotenv
RMS_API_ORIGIN=https://rms-rumsy-app.pages.dev
```

Frontend versi Bearer memerlukan backend versi baru. Upload frontend dan backend dalam paket yang sama terlebih dahulu jika ingin memakai URL produksi tersebut. Backend cookie-only lama tidak mengeluarkan access token; frontend akan menampilkan pesan agar backend diperbarui. Untuk mencoba kode baru sebelum deploy, gunakan backend lokal di bawah.

Restart Vite setelah mengubah environment. Gunakan akun RMS asli saat tersambung ke backend asli. Tambah/edit/hapus dari frontend lokal akan tersimpan ke sumber data yang dipilih tersebut. Hasil build menggunakan API pada origin yang sama.

Untuk pengujian terpisah dengan data tiruan, set `RMS_API_ORIGIN=http://127.0.0.1:8788`, lalu jalankan satu proses berikut di terminal lain:

```sh
bun run test:api
```

Akun tes: `super_admin@local.test`, password `local-test-password`. Perintah ini membangun **backend Hono lokal** lalu menjalankannya dengan SQLite/R2 **di memori**; data hilang saat proses dihentikan. `bun run dev:api` adalah alias untuk mode data tiruan yang sama. Jika muncul `EADDRINUSE:8788`, sudah ada proses yang memakai port itu; gunakan server tes yang sudah berjalan atau periksa prosesnya sebelum memulai lagi. Port lain dapat dipilih dengan `RMS_TEST_PORT=8789 bun run test:api`, lalu sesuaikan `RMS_API_ORIGIN`. Tanpa environment khusus, proxy memakai port 8788.

Frontend lokal yang diarahkan ke URL produksi tetap menjalankan backend yang sudah terdeploy di URL tersebut. Untuk mencoba perubahan kode Hono sebelum deploy, arahkan proxy ke server lokal di atas.

## Build dan deployment

```sh
bun run check
bun run test
bun run build
```

Build membundel `api/src/index.ts` beserta Hono ke `api/build/_worker.js`, kemudian menyertakannya ke `web/build/_worker.js` bersama frontend Svelte. Cloudflare tetap menerima satu file Worker hasil build; sumber backend sehari-hari berada di `api/src/`.

Upload **isi** `web/build/` atau ZIP `rms-rumsy-svelte-upload.zip` yang disiapkan dari hasil build terbaru ke project Cloudflare Pages RMS yang sama. ZIP di root adalah hasil kemasan saat migrasi; setelah mengedit kode, build dan kemas ulang sebelum unggah. URL `/#/...` dan `/client.html?token=...` tetap tersedia. Baseline, seed pengujian dan test server tidak disertakan dalam paket produksi.

Pertahankan binding `DB → rms-rumsy`, `FILES → rms-private` dan variable/secret email `RESEND_API_KEY`, `EMAIL_FROM`, `RMS_URL`. **Production dan Preview mempunyai konfigurasi terpisah.** Pilih environment yang sesuai saat upload dan periksa binding pada environment tersebut; Preview kosong tidak otomatis memakai konfigurasi Production. Binding D1 yang tidak tersedia menyebabkan error `reading 'prepare'`. Preview yang dihubungkan ke D1/R2 produksi juga dapat mengubah data produksi.

Migrasi ini tidak memerlukan migrasi SQL atau penggantian database/bucket. Perubahan Hono ini belum dideploy otomatis.

## Pengujian

```sh
bun run check
bun run test
bun run test:e2e
```

Tes membandingkan respons bisnis, status HTTP, header, audit dan state tersimpan backend lama dengan Hono, dengan autentikasi masing-masing versi. Perubahan autentikasi diuji terpisah: cookie-only ditolak, token di URL ditolak, refresh memerlukan header/origin yang sesuai, token kedaluwarsa/akun nonaktif ditolak, dan logout mencabut keluarga sesi. Tes frontend memeriksa refresh bersama untuk request paralel dan penolakan hasil refresh yang datang setelah logout. Pengiriman email dicegat oleh stub.

Tes frontend juga membandingkan normalisasi, formula, scope role, pipeline dan payload/version save dengan kode awal, serta memeriksa checksum arsip backend/CSS dan struktur template native. Tes browser membangun paket produksi melalui Hono dengan DB/R2 tiruan pada port 4175, ditambah Vite/proxy pada 4176; environment backend development tidak dipakai oleh tes ini.

Browser menguji 36 menu, 14 tab, sesi/mobile, lead/milestone/chat, upload/payment verification, dokumen/progress photos, task lintas akun, QC, portal, pembatasan menu, CRM/laporan harian, project/jadwal, adendum/tagihan, arsip surat, user/access serta gerbang mulai/completion. Tes tidak diberi credential Cloudflare atau Resend. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` dapat menunjuk binary Chromium yang sudah terpasang.

Aturan dan keterbatasan backend awal tetap berlaku. Lihat [MIGRATION.md](./MIGRATION.md) untuk cakupan perubahan dan [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) untuk audit versi awal.
