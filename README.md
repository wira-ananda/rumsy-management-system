# RMS Rumsy

Frontend **SvelteKit + Svelte 5 + TypeScript + Vite**, mengikuti susunan proyek SAFAR. Semua halaman, tab, tabel, dialog dan form dirender sebagai komponen `.svelte`. Backend tetap **Cloudflare Worker asli**, dengan API, D1 dan R2 yang sama.

## Struktur

```text
rms-rumsy/
├── _worker.js                  # Backend asli, diverifikasi checksum
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
└── tests/                      # Regresi bisnis dan browser dengan DB/R2 tiruan
```

Contoh: panduan berada di `web/src/lib/components/management/GuidePage.svelte`; tampilan Project ada di `components/projects/tabs/`. File JS/TS digunakan untuk data, aturan bisnis dan transport. Template HTML-string dan controller DOM lama sudah dihapus dari `web/src`; tidak ada `innerHTML`, `{@html}`, atau `FeatureView` pada frontend aktif. Form memakai binding dan event Svelte melalui `FormDialog.svelte` atau komponen khusus.

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

Restart Vite setelah mengubah environment. Gunakan akun RMS asli saat tersambung ke backend asli. Tambah/edit/hapus dari frontend lokal akan tersimpan ke sumber data yang dipilih tersebut. Hasil build menggunakan API pada origin yang sama.

Untuk pengujian terpisah dengan data tiruan, set `RMS_API_ORIGIN=http://127.0.0.1:8788`, lalu jalankan satu proses berikut di terminal lain:

```sh
bun run test:api
```

Akun tes: `super_admin@local.test`, password `local-test-password`. Server memakai Worker asli dengan SQLite/R2 **di memori**; data hilang saat proses dihentikan. Jika muncul `EADDRINUSE:8788`, sudah ada proses yang memakai port itu; gunakan server tes yang sudah berjalan atau periksa prosesnya sebelum memulai lagi. Tanpa environment khusus, proxy memakai port 8788.

## Build dan deployment

```sh
bun run check
bun run test
bun run build
```

Upload `web/build/` ke **project Cloudflare Pages RMS yang sama**. Packaging menyertakan Worker asli dengan pemeriksaan checksum. URL `/#/...` dan `/client.html?token=...` tetap tersedia. Baseline, seed pengujian dan test server tidak disertakan dalam paket produksi.

Pertahankan binding `DB → rms-rumsy`, `FILES → rms-private` dan variable/secret email `RESEND_API_KEY`, `EMAIL_FROM`, `RMS_URL`. Migrasi frontend tidak memerlukan migrasi SQL atau penggantian database/bucket. Perubahan ini belum dideploy otomatis.

## Pengujian

```sh
bun run check
bun run test
bun run test:e2e
```

Tes unit membandingkan normalisasi, formula, scope role, stage pipeline dan payload/version save dengan kode awal, serta memeriksa checksum backend/CSS dan struktur template native. Tes browser membangun paket produksi lalu menjalankannya melalui Worker asli dengan DB/R2 tiruan pada port 4175; environment backend development tidak dipakai oleh tes ini.

Browser menguji 36 menu, 14 tab, sesi/mobile, lead/milestone/chat, upload/payment verification, dokumen/progress photos, task lintas akun, QC, portal, pembatasan menu, CRM/laporan harian, project/jadwal, adendum/tagihan, arsip surat, user/access serta gerbang mulai/completion. Tes tidak diberi credential Cloudflare atau Resend. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` dapat menunjuk binary Chromium yang sudah terpasang.

Aturan dan keterbatasan backend awal tetap berlaku. Lihat [MIGRATION.md](./MIGRATION.md) untuk cakupan perubahan dan [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) untuk audit versi awal.
