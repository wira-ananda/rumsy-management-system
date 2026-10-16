# Prisma dan tabel RMS

**Status 17 Oktober 2026: Prisma sudah aktif di produksi**, sesudah migrasi tambahan dan verifikasi cloud terhadap backup final. Database tetap **Cloudflare D1 `rms-rumsy`**, berkas tetap **R2 `rms-private`**. Tabel/data lama dan backup asli dipertahankan. Staging kini menyimpan versi sebelum Prisma dengan sumber dayanya sendiri. Hasil dan batas pemulihan ada di [CUTOVER-RESULT.md](./CUTOVER-RESULT.md). Bagian pemeriksaan backup 16 Oktober di bawah merupakan catatan pengujian lokal awal.

## Hasil pemeriksaan backup 16 Oktober 2026

- SQL sumber versi **920**, 620.923 byte, SHA-256 `611f25c4e595f491f1e99b5c7392ee64fae202c80137e05e917f2dd1a1c91f02`.
- **1.779 record** dipisahkan ke 30 model data, termasuk 54 project, 124 lead, 41 client, 24 pembayaran, 511 audit, serta chat/riwayat/laporan.
- Hasil pembacaan ulang dibandingkan **seluruh field dan nilainya**, termasuk tipe, `null`, field yang tidak ada, duplikat riwayat, urutan, angka uang, dan field tambahan. Hasil sama secara struktural; urutan key object JSON tidak menjadi kontrak.
- Seluruh baris dari **10 tabel lama** tetap sama. Tabel lama `projects` kosong; 54 project sebenarnya berada di JSON sumber, sehingga tidak diasumsikan sudah ada di tabel lama itu.
- **71 file R2 / 79.908.825 byte** ditemukan dan ukurannya cocok dengan metadata SQL. Ini pemeriksaan salinan lokal terhadap metadata; bukan pembandingan checksum dengan R2 remote.
- Pembacaan melalui Prisma, perubahan melalui Hono, penolakan versi kedaluwarsa, foreign key dan integrity check SQLite lulus. Dua portal aktif memiliki respons yang sama dengan backend lama.

Laporan yang dapat diperiksa berada di `api/.local/current.json` → `directory` → `verification.json`. File tersebut tidak berisi password/token. SQL, SQLite, dan berkas hasil migrasi berisi data internal dan hanya disimpan di folder lokal yang diabaikan Git.

`bun run check` lulus tanpa error/warning, 35 kelompok tes lulus, dan 15 skenario browser lulus dengan storage normalized. Dry-run Wrangler mengenali modul WASM (bundle gzip sekitar 1,3 MiB). Runtime Pages lokal melayani halaman/health dengan HTTP 200 dan menolak `/api/state` tanpa token dengan HTTP 401. Pemeriksaan ini bukan deployment atau pengujian binding produksi.

## Letak schema dan tabel

Edit **`api/prisma/schema.prisma`**. Model seperti `Project`, `Client`, `Lead`, `Payment`, `Task`, `ProjectDocument`, `DailyReport`, dan `ProjectChat` menjadi tabel `rms_*`. Prefix menghindari benturan dengan tabel lama ber-ID integer. Relasi detail ke induk menggunakan foreign key, dan kolom filter mempunyai index. `ProjectContract`, `ProjectHandover` dan `ProjectPortal` masing-masing satu baris per project.

Sepuluh model lama dipertahankan, termasuk `User`, `sessions`, `files`, `server_audit`, dan `app_state`. Query auth/file/audit lama tetap memakai D1 langsung untuk mempertahankan kontrak dan format data. Prisma Client dengan adapter D1 digunakan untuk membaca model bisnis baru. Simpan perubahan memakai batch D1 atomik dengan pengecekan versi; tidak memakai interactive transaction Prisma.

`legacyShape` hanya menyimpan informasi keberadaan field dan perbedaan tipe lama, `extra` menyimpan extension field yang belum dikenal. Nilai scalar dikenal disimpan di kolom masing-masing; child record disimpan di tabel detail. List konfigurasi seperti permission/milestone tetap boleh berupa JSON. `RootField` menyimpan settings dan extension tingkat akar, bukan seluruh snapshot bisnis.

Metadata pemetaan dibuat dari schema saat `db:generate`; jangan edit `api/src/generated/`. Kolom internal `storageKey`, `sortOrder`, `legacyShape` dan `extra` menjaga identitas, urutan serta kompatibilitas; saat mengubah nilai lewat Studio gunakan kolom bisnis seperti `name`, `notes`, atau `amount`.

## Mencoba data asli dari salinan lokal

Salinan sudah disiapkan. Terminal pertama:

```sh
bun run dev:data
```

Terminal kedua:

```sh
RMS_API_ORIGIN=http://127.0.0.1:8790 bun dev
```

Buka `http://127.0.0.1:5173`, gunakan akun/password RMS yang berlaku saat backup diambil. Backend membaca **salinan lokal hasil migrasi**, bukan Cloudflare. Upload/edit/delete hanya mengubah database development dan folder overlay lokal; file backup R2 asli hanya dibaca. Email tidak dikirim. Perubahan frontend biasa yang dijalankan dengan `bun dev` saja masih mengikuti `web/.env`, yang mungkin menunjuk produksi.

Untuk melihat atau mengedit tabel lokal:

```sh
bun run db:studio
```

Studio dan `dev:data` memakai file `development.sqlite` yang sama. `rms-normalized.sqlite` tetap menjadi hasil migrasi yang telah diverifikasi. Studio ini tidak terhubung ke produksi; edit data bisnis saat aplikasi tidak sedang menyimpan perubahan untuk menghindari benturan. Setelah melakukan edit langsung di Studio, muat ulang halaman aplikasi sebelum menyimpan.

Menyiapkan lagi dari backup lain menghasilkan direktori baru, tanpa menimpa direktori sebelumnya:

```sh
bun run db:prepare --sql /absolute/path/rms-rumsy.sql --files /absolute/path/rms-private
bun run db:verify
```

`current.json` menunjuk hasil terbaru. Verifikasi runtime memakai database sementara lalu menghapusnya, sehingga hasil migrasi yang diperiksa tetap utuh.

## Menambah field seperti workflow Prisma

Contoh tambahkan `taxId String?` di model `Client`, kemudian dari root:

```sh
bun run db:migration add_client_tax_id
# Periksa migration.sql yang dihasilkan di api/prisma/migrations/.
bun run db:apply-local
bun run db:generate
bun run check
```

Restart `dev:data` setelah build ulang. Perintah di atas hanya bekerja pada salinan development lokal. `db:apply-local` membuat salinan SQLite dengan `VACUUM INTO` sebelum menerapkan migrasi baru, mencatat checksum, dan menolak migrasi destruktif/tabel lama secara otomatis. `db:migration` menggunakan `prisma migrate diff`; `applied.prisma` adalah checkpoint schema untuk SQL yang telah dibuat, sedangkan `rms_migration_history` mencatat SQL yang benar-benar diterapkan lokal. Jangan mengedit checkpoint tersebut manual atau mengubah SQL yang sudah diterapkan.

Field nullable baru yang masuk schema ikut dikenali adapter snapshot. Jika perlu field wajib, tambahkan nullable dahulu, isi data lama, lalu rancang pengetatan constraint dan verifikasinya. Rename/drop/perubahan tipe dapat memerlukan rebuild tabel SQLite: generator meninggalkan SQL untuk diperiksa dan tidak meloloskannya sebagai migrasi otomatis. Model/fitur baru tetap memerlukan service/route/UI, sebagaimana proyek API biasa.

D1 tidak menggunakan `prisma migrate dev/deploy` ke server PostgreSQL. SQL yang direview diterapkan melalui mekanisme D1/Wrangler; Client tetap dibuat lewat `prisma generate`. Rujukan: [Prisma v7 + D1](https://www.prisma.io/docs/guides/v7/deployment/cloudflare-d1).

## Kompatibilitas dan batas pekerjaan ini

API `/api/state` masih mengirim/menerima snapshot agar 36 menu dan 14 tab tidak berubah flow. Dalam mode baru, penyimpanan sudah memakai tabel terpisah dan hanya baris yang berubah ditulis. Portal client mencari token dengan index dan memuat satu project. **Pengambilan data internal utama masih mengumpulkan snapshot seluruh tabel, dan konflik simpan masih memakai satu versi global.** Ini belum migrasi seluruh frontend ke CRUD per resource/pagination, sehingga jangan menganggap masalah payload besar atau konflik antar-pengguna sudah selesai. Tahap CRUD/pagination dapat dilakukan setelah cutover storage terverifikasi.

Permission dan batas otorisasi yang ada tetap berlaku. Bearer tetap diwajibkan pada API internal. Perubahan model data ini bukan audit keamanan menyeluruh; batas scope/file yang dicatat di MIGRATION.md belum dirancang ulang.

## Cutover Cloudflare — belum dijalankan

Jangan langsung mengimpor data SQL lama ini ke produksi yang terus berubah. Backup versi 920 adalah sumber pengujian, bukan jaminan bahwa kondisi produksi saat ini masih versi 920.

Urutan cutover perlu jendela tanpa penulisan, backup D1/R2 terbaru, migrasi lokal dan pembandingan ulang, penerapan SQL ke target staging yang terpisah, pemeriksaan auth/portal/file, lalu penerapan produksi dan verifikasi sebelum mengaktifkan `RMS_STORAGE=normalized`. Pastikan tidak ada aplikasi versi lama yang masih menulis ke `app_state` setelah cutover.

- `RMS_STORAGE` kosong atau `legacy`: backend tetap membaca/menulis `app_state` lama.
- `RMS_STORAGE=normalized`: wajib ada schema dan marker migrasi yang valid. Jika belum siap, request gagal; tidak fallback diam-diam ke JSON lama.
- `app_state` tetap disimpan sebagai arsip titik cutover, **tidak di-dual-write**. Setelah ada transaksi baru di tabel normalized, sekadar mengganti flag ke `legacy` akan membuka data arsip yang sudah tertinggal. Pemulihan setelah ada write membutuhkan rekonsiliasi/replay data terbaru; jangan menjanjikan toggle sebagai rollback tanpa kehilangan perubahan baru.

Build menghasilkan direktori modul `web/build/_worker.js/` berisi `index.js` dan WASM Prisma. Gunakan `bun run deploy:production` dari root untuk kode produksi atau `bun run deploy:staging` untuk staging; keduanya memilih folder konfigurasi target secara eksplisit. ZIP lama bukan paket Prisma. Deploy kode tidak menerapkan perubahan schema otomatis.

ZIP `rms-rumsy-svelte-upload.zip` lama **belum diperbarui menjadi paket migrasi Prisma**. Tidak ada backup SQL/SQLite atau credential yang dimasukkan ke hasil build frontend.

Rencana historis tersedia di [PRODUCTION-CUTOVER.md](./PRODUCTION-CUTOVER.md), hasil eksekusi di [CUTOVER-RESULT.md](./CUTOVER-RESULT.md). `RMS_MAINTENANCE=1` dipakai selama perpindahan dan kini dimatikan. Snapshot produksi `app_state` sengaja dikunci dengan trigger terhadap penulisan aplikasi lama.

Staging cloud terpisah kini telah disiapkan dan diuji, termasuk pembandingan data D1 dan checksum R2. Lihat [STAGING.md](./STAGING.md). Produksi tetap belum dimigrasikan.
