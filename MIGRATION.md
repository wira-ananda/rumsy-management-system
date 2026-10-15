# Migrasi frontend RMS ke SvelteKit

Migrasi lokal pada 15 Oktober 2026. Cakupan: frontend dan struktur kode. Backend dan sumber data tetap sama; belum dipublikasikan ke Cloudflare produksi.

## Implementasi

- Semua 36 menu dan 14 tab Project 360 memakai komponen `.svelte`, termasuk login, layout, modal, form dan portal klien.
- Halaman berada di `web/src/lib/components/{sales,projects,clients,finance,qc,workflow,admin,management,system,client}`.
- `features/registry.ts` memetakan route ke komponen Svelte. `components/projects/tabs/index.ts` memetakan 14 tab.
- `features/**/*.ts` mengelola aksi bisnis. Form memakai schema bertipe dan `FormDialog.svelte`, dengan `bind:value`, `bind:group`, event dan pesan validasi Svelte.
- Runtime JSON dipasangkan dengan state reaktif Svelte pada workspace. Perubahan entitas langsung memperbarui tampilan; snapshot save tetap berbentuk JSON yang sama.
- Controller JS, HTML-string renderer, helper DOM, modal lama dan script ekstraksi awal sudah dihapus dari kode aktif. Tidak ada `innerHTML`, `{@html}`, query selector atau pemasangan handler DOM manual di `web/src`.
- Kode awal tetap disimpan di `baseline/original/` sebagai pembanding.

## Kontrak backend

1. `_worker.js` tetap identik byte demi byte dengan paket awal, termasuk salinan pada hasil build.
2. CSS awal tetap identik; markup baru mempertahankan class yang dipakai stylesheet tersebut.
3. Endpoint, cookie `credentials: same-origin`, multipart upload, dan payload `{version, data}` tetap sama.
4. Normalisasi dan save mempertahankan field produksi yang tidak dikenal frontend.
5. Tidak ada database, bucket, seed produksi, localStorage atau migrasi SQL baru.
6. Portal tetap memakai `/client.html?token=...`; token dan link yang sudah tersimpan tetap kompatibel.
7. Development dapat memakai backend asli melalui `web/.env`; seluruh operasi browser mengikuti sumber tersebut. Tes otomatis memakai Worker asli dengan binding tiruan di memori, tanpa secret email.

## Penyesuaian tampilan

Rendering sekarang memakai lifecycle dan reaktivitas Svelte. Karena itu beberapa masalah tampilan lama tidak ikut dipertahankan: detail/chat lead baru bisa dibuka langsung setelah save, filter bulan tidak mereset dirinya saat menggambar ulang, hasil approval adendum tampil langsung, dan foto progress dirender sebagai atribut gambar yang valid. Aturan stage, perhitungan keuangan, status dan gerbang bisnis tetap mengikuti versi awal.

Pesan validasi form tampil di dalam dialog. Pemetaan tab Chat pada System Check memeriksa komponen Svelte; pemeriksaan berbasis string fungsi renderer lama diganti dengan tes arsitektur dan tes browser. Keterbatasan katalog role awal (14 role frontend, sementara pemeriksaan bawaan mengharapkan 15) masih dilaporkan.

## Batas perubahan

Temuan audit mengenai otorisasi/scope API, task REVISION, multi-PIC backend, hak hapus task, handover Head BU, User Access overrides, tanggal tetap, QC return dan penanganan kegagalan save tetap perlu pekerjaan terpisah. Migrasi frontend tidak mengubah kode Worker untuk memperbaiki hal-hal tersebut.

## Verifikasi

`bun run check`: **0 error, 0 warning**. `bun run test`: **8 kelompok lulus**. `bun run test:e2e`: **13 skenario lulus**, termasuk 36 menu dan 14 tab Project. Build dan packaging Cloudflare Pages berhasil. Tes regresi membandingkan aturan data dengan kode awal dan mendeteksi kembalinya renderer HTML-string. Tes browser mencakup seluruh menu/tab dan alur penyimpanan lintas modul pada paket build produksi.

Pengujian tersebut tidak membuktikan seluruh konfigurasi binding/secret deployment Cloudflare. Health backend asli dan koneksi proxy development telah diperiksa secara read-only; tidak ada pengujian tambah/edit/hapus yang dijalankan ke data produksi.

## Pembanding dan rollback

`baseline/original/` menyimpan 10 file sebelum migrasi, dengan hash di `baseline/checksums.json`. Paket frontend lama dapat dipulihkan dari folder tersebut. Mengganti frontend tidak memerlukan reset D1/R2.

## Referensi framework

- [SvelteKit: Single-page apps](https://svelte.dev/docs/kit/single-page-apps)
- [SvelteKit: adapter-static](https://svelte.dev/docs/kit/adapter-static)
