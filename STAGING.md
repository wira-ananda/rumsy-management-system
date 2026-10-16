# RMS staging

Sejak 17 Oktober 2026, **https://rms-rumsy-staging.pages.dev** menyimpan versi sebelum Prisma yang sebelumnya tayang pada alamat app. Produksi **https://rms-rumsy-app.pages.dev** sudah memakai Svelte + Hono + Prisma. Kedua lingkungan mempunyai D1/R2 sendiri; data tidak disinkronkan otomatis. Lihat [CUTOVER-RESULT.md](./CUTOVER-RESULT.md).

| Komponen | Staging |
| --- | --- |
| Pages (Svelte + Hono) | `rms-rumsy-staging` |
| D1 | `rms-rumsy-staging` |
| UUID D1 | `b1cb3744-7d94-453c-8b3c-e23bc407abdf` |
| R2 private | `rms-private-staging` |
| Mode storage | `legacy` — JSON `app_state` |
| Pengiriman email | Dinonaktifkan; secret Resend tidak dipasang |

Gunakan akun dan password RMS yang berlaku pada backup 16 Oktober 2026. Semua 13 akun disalin dengan hash/password dan role tetap; sesi lama tidak disalin untuk digunakan, sehingga perlu login tersendiri di staging. Akun pengujian sementara telah dihapus.

Data awal disalin dari backup SQL versi 920 dan backup R2 lokal. Verifikasi cloud membandingkan seluruh data bisnis, bukan hanya jumlahnya: 1.779 record pada 30 model, 54 project, 41 client, 124 lead, 24 pembayaran, beserta data lain, sama dengan sumber. Seluruh 71 file (79.908.825 byte) diunggah ke R2 staging, diunduh ulang, dan cocok SHA-256 dengan sumber lokal. Bucket produksi tidak menjadi target upload/delete.

Pengujian awal 16 Oktober dilakukan ketika staging masih normalized: login/refresh/logout, Bearer, batch simpan atomik, perubahan dan pengembalian satu client, konflik versi, upload/download/delete berkas sementara, dan dua portal. Setelah penempatan versi lama pada 17 Oktober, login/refresh/logout, pembacaan seluruh JSON yang sama dengan sumber final produksi, file, portal, reload, 36 menu, dan desktop/mobile diuji ulang. Akun uji sudah dibersihkan. Tabel normalized bekas pengujian tetap disimpan di D1 staging, tetapi backend staging aktif membaca `app_state`; tidak ada tabel yang dihapus untuk perpindahan ini.

Pada saat cutover, isi bisnis kedua versi cocok persis: 54 project, 41 client, 124 lead dan seluruh data lainnya. Versi JSON staging tetap 920. Produksi normalized naik ke 921 karena tes simpan tanpa perubahan isi.

## Memperbarui staging

Konfigurasi ada di **`api/deploy/staging/wrangler.jsonc`**. Binding wajib `DB` dan `FILES`; jangan menggantinya dengan nama binding saran otomatis CLI. Target UUID/bucket/project diperiksa oleh helper sebelum tindakan cloud. Konfigurasi tidak dipasang sebagai default `api/wrangler.jsonc`, sehingga perintah produksi tidak mengambil binding staging secara tidak sengaja.

Dari root project:

```sh
bun run deploy:staging
```

Perintah menjalankan check, build kode saat ini, lalu deploy hanya ke staging dengan mode legacy dan konfigurasi folder tersebut. Menjalankannya akan mengganti paket versi lama yang sekarang tayang dengan build kode terbaru; database tetap staging. Backup, `.local`, source credentials, baseline dan alat tes tidak ikut menjadi aset website.

Jangan menjalankan ulang importer terhadap staging yang sudah digunakan. Tool migrasi staging lama sekarang menolak konfigurasi legacy untuk mencegah pemakaian snapshot lama secara tidak sengaja. File SQL/manifest di `.local` tidak untuk diunggah sebagai aset website.

Untuk mencoba frontend lokal dengan backend staging:

```sh
RMS_API_ORIGIN=https://rms-rumsy-staging.pages.dev bun dev
```

Perubahan dari aplikasi lokal dengan proxy ini masuk ke **staging**. `bun dev` tanpa override masih mengikuti `web/.env`; pastikan sumber yang dipilih sesuai. Data yang diedit di staging tidak otomatis disinkronkan kembali ke produksi.

## Laporan pemeriksaan

Laporan lokal di `api/.local/staging/`:

- `database-verification.json`: pembandingan seluruh data bisnis dan tabel user/file/audit terhadap backup.
- `file-verification.json`: checksum seluruh objek R2 staging.
- `http-verification.json`: hasil pengujian HTTPS dan browser.
- `deployment-result.json`: deployment staging dan URL.
- `production-readonly-after.json`: metadata hasil SELECT ke produksi setelah pengujian.
- `dashboard-desktop.png`, `dashboard-mobile.png`: hasil tangkapan layar pengujian.

Laporan terbaru dan backup cutover berada di `api/.local/cutover-2026-10-17/`. Produksi dimigrasikan dari backup final produksinya sendiri, bukan dengan menimpa database produksi menggunakan salinan staging. Jangan impor backup atau data staging ke produksi aktif.
