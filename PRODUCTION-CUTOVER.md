# Rencana aktivasi Prisma di produksi

**Status 17 Oktober 2026: perpindahan sudah dijalankan atas permintaan pengguna.** Produksi memakai Prisma pada D1/R2 produksi semula; versi sebelum Prisma dipasang di staging dengan salinannya sendiri. Lihat [CUTOVER-RESULT.md](./CUTOVER-RESULT.md) untuk bukti, deployment, backup, dan batas rollback. Urutan di bawah adalah rencana historis yang dipakai sebagai acuan, bukan perintah untuk menjalankan ulang importer di produksi aktif.

Pemeriksaan Cloudflare pada 16 Oktober 2026 dilakukan secara read-only:

- Project: `rms-rumsy-app`, domain `rms-rumsy-app.pages.dev`.
- D1 `rms-rumsy`: state versi **920**, `updated_at` **2026-10-15 03:24:01**, 54 project, 41 client.
- Belum ditemukan tabel `rms_*` untuk Prisma.
- Query melaporkan `rows_written: 0` dan `changed_db: false`.
- Versi state sama dengan backup pengujian. Ini tidak membuktikan seluruh tabel sesi/user/file sama atau menjamin produksi tidak berubah setelah pemeriksaan; tetap ambil backup terbaru saat jeda penulisan.

## Urutan eksekusi

1. **Persetujuan masa jeda login/penyimpanan.** Pengguna menyelesaikan perubahan yang belum disimpan terlebih dahulu. Periksa semua jalur penulisan ke D1/R2, termasuk Worker `rms-api`, deployment preview lama, cron/integrasi, dan akses admin langsung. Jangan menganggap flag pada deployment Pages utama mengunci Worker/deployment lain.
2. **Staging terpisah.** Buat D1 staging dan deployment preview yang tidak terhubung ke D1 produksi. Impor salinan baru, terapkan schema, migrasikan record, lalu bandingkan data lengkap, totals, user/file, dan portal. Verifikasi perilaku batch/constraint pada D1 Cloudflare. Nilai `RESEND_API_KEY` tidak dipasang pada staging agar email tidak terkirim. Tentukan R2 staging/berkas uji terpisah untuk pengujian mutasi file.
3. **Mulai jeda pada semua jalur penulisan yang sudah diidentifikasi.** Pada paket Hono baru tersedia `RMS_MAINTENANCE=1`: middleware menolak semua request API selain GET/HEAD/OPTIONS sebelum autentikasi atau akses file. Login, refresh, penyimpanan, upload/delete, user/password dan pengiriman email ditolak HTTP 503. Request baca tetap mengikuti autentikasi yang berlaku. Flag hanya bekerja pada kode/deployment yang memuat middleware tersebut; belum aktif pada produksi saat ini.
4. **Backup final.** Ekspor D1 terbaru setelah jeda terkonfirmasi dan sinkronkan backup R2. Ekspor D1 dapat menghentikan query sementara. Jalankan migrasi lokal dan pembandingan ulang terhadap backup final. Hentikan proses bila version/hash, jumlah/nilai data, metadata file, atau pemeriksaan integritas berbeda dari sumber final yang dimaksud.
5. **Terapkan produksi tanpa menghapus tabel lama.** Pertahankan D1 `rms-rumsy`, R2 `rms-private`, binding `DB`/`FILES`, dan secret email yang berlaku. Tabel baru dibuat secara tambahan; data hanya diimpor sekali ke tabel kosong. Arsip `app_state`, users, sessions, files, dan server_audit tidak diganti dengan salinan lama. Jangan menjalankan file `normalized-data.sql` dari backup versi lama hanya karena sudah pernah lolos tes.
6. **Verifikasi sebelum dibuka kembali.** Bandingkan isi lengkap tabel normalized dengan sumber final, validasi identitas dan jumlah record, angka pembayaran/kontrak, user/file, foreign key, dan akses dua jenis API. Baru pilih `RMS_STORAGE=normalized` saat marker/data siap. Pastikan kode/schema cocok pada environment yang benar. Uji login/refresh, file, project, payment, tugas/QC dan portal pada target yang sesuai sebelum membuka penulisan umum kembali.
7. **Buka kembali penulisan.** Nonaktifkan maintenance hanya setelah pemeriksaan lulus. Pastikan aplikasi lama tidak menulis lagi ke `app_state` yang kini menjadi arsip. Catat waktu/versi cutover dan pantau error/conflict sesudahnya.

Jika aktivasi gagal sebelum ada perubahan baru pada normalized, storage lama masih tersedia. Setelah ada perubahan baru di normalized, mengganti flag ke legacy saja akan membuka arsip yang tertinggal; rekonsiliasi data terbaru diperlukan sebelum rollback. Tidak ada klaim rollback sekali klik tanpa kehilangan perubahan baru.

## Paket yang bisa diperiksa

`bun run build` menyiapkan `web/build/`. `bun run release:prepare` menyalinnya ke `api/migration-artifacts/release-.../pages/` dan membuat manifest SHA-256. Folder release diabaikan Git. Hanya isi `pages/` yang menjadi target deploy; folder schema-migrations dan manifest bukan aset website. Backup SQL/SQLite/R2 tidak disertakan.

Paket berisi direktori `_worker.js/` beserta WASM Prisma dan harus diproses lewat Wrangler Pages. ZIP upload lama bukan paket ini. Deployment kode sendiri tidak menjalankan migrasi, tidak menghapus D1/R2, dan default storage tetap `legacy`.

Detail schema ada di [DATABASE-MIGRATION.md](./DATABASE-MIGRATION.md), hasil eksekusi di [CUTOVER-RESULT.md](./CUTOVER-RESULT.md). Migrasi ulang atau pemulihan dari backup tetap memerlukan rencana untuk mempertahankan perubahan baru sesudah cutover.
