# Form lead — 26 Oktober 2026

Form tambah/edit lead memakai komponen `web/src/lib/components/sales/LeadForm.svelte`.

- WhatsApp ditambahkan ke pilihan sumber tanpa menghapus sumber yang sudah ada.
- Kebutuhan mempunyai empat pilihan: Rumah, Bisnis, Sekolah, Other. Other menampilkan kolom keterangan opsional dan boleh disimpan tanpa keterangan.
- Kebutuhan lama di luar kategori, misalnya Ruko 2 Lantai, ditampilkan sebagai Other dengan teks semula di keterangan. Ini pemetaan tampilan/form: membuka atau membatalkan form tidak menulis ulang data. Saat disimpan, teks lama dipertahankan di `needDetail`.
- Urutan komersial: Est. RAB → Margin → DP (%) → DP (Rp). Margin tetap 8%; dua input DP saling mengikuti. Mengubah RAB mempertahankan persentase dan menghitung ulang nominal. Rupiah dibulatkan ke bilangan utuh, DP valid 15–100% dengan default lead baru 15%, dan nominal DP baru bisa diisi setelah RAB lebih dari nol. Lead awal dengan RAB nol tetap bisa dibuat. Batas form, pesan bantuan, dan validasi backend memakai konstanta minimum yang sama.
- DP historis ditampilkan apa adanya saat membuka form, tanpa dinaikkan otomatis ke batas baru. Membuka atau membatalkan form tidak menyimpan perubahan. Aturan minimum berlaku saat menyimpan perubahan komersial melalui form; tidak ada pembaruan massal data lama atau sinkronisasi otomatis ke kontrak, transaksi, maupun cicilan project yang sudah terbentuk.
- Tenor memakai slider 1–15 tahun dan input angka dengan langkah satu tahun. Default lead baru 3 tahun, mengikuti default kontrak sebelumnya 36 bulan. Angka bulan juga ditampilkan. Saat membuat project baru dari lead, tenor dikalikan 12; kontrak project yang sudah ada tidak otomatis diubah.
- Jaminan memilih SHM atau Non-SHM. Nilai Est. Gambar lama tidak ditimpa; tersedia sebagai arsip pada detail/history ketika ada nilainya.
- Backend memvalidasi syarat komersial baru. Lead lama yang hanya menerima chat, milestone atau perubahan nonkomersial tetap dapat disimpan tanpa memaksa perubahan nilai historis.
- Kegagalan simpan menahan form agar input dapat dicoba lagi; antrean save tidak ikut macet setelah error.

Sales Kanban kini memiliki toolbar ringkas: info read-only di kiri, filter bulan masuk/tahun, jumlah lead dan tombol Semua bulan di kanan (menumpuk pada mobile). Filter hanya menyaring tanggal masuk dari lead yang berhak dilihat pengguna. Isi kartu dan jumlah header memakai hasil filter yang sama. Ketujuh kolom termasuk DP Gambar tetap tersedia, termasuk saat jumlahnya nol; filter tidak mengubah stage, alur pembayaran, atau data tersimpan. Pengujian mencakup bulan berbeda, tahun berbeda, reset, tampilan mobile dan scope Sales.

Filter periode di CRM & Leads, Pipeline, Sales Dashboard, dan Kanban memakai `PeriodFilter.svelte`, dengan pemilih bulan dan tanggal dari komponen Svelte bersama `CalendarPicker.svelte`. Kontrol ini menggantikan `input[type=month]` yang dapat tampil sebagai teks di Safari. Popup mendukung navigasi tahun/bulan, keyboard, Escape, klik di luar, serta tombol Semua bulan/Bulan ini dan Semua tanggal/Hari ini. Nilai bulan tetap `YYYY-MM`, sedangkan tanggal `YYYY-MM-DD`; keduanya menyaring `lead.dateIn`. Memilih tanggal menyesuaikan bulan, mengganti bulan menghapus tanggal yang tidak lagi cocok, dan tombol Reset kecil mengosongkan keduanya sekaligus. Kolom Tgl Masuk ditampilkan setelah Client dan sebelum Kebutuhan di CRM. Ringkasan Pipeline, KPI/forecast Sales Dashboard, dan jumlah kartu Kanban memakai hasil filter yang sama. Semua kontrol hanya menyaring tampilan, tanpa menulis data atau mengubah scope role. Pengujian mencakup Chromium, WebKit, dan Firefox untuk Super Admin, Sales, keyboard, reset, dan mobile. Perubahan filter periode ini belum dideploy ke Cloudflare.

## Schema dan deploy

Empat kolom nullable ditambahkan ke `Lead`: `dpAmount`, `tenorYears`, `collateral`, `needDetail`. File SQL:

`api/prisma/migrations/20261026020527_lead_qualification/migration.sql`

Migrasi hanya berisi empat `ALTER TABLE ... ADD COLUMN`; tidak ada penghapusan atau pengubahan isi record lama. Prisma Client/metadata dibuat ulang oleh build. Pengujian memakai database SQLite/D1 tiruan, tidak mengakses Cloudflare.

**Migrasi dan kode ini sudah diterapkan ke produksi pada 26 Oktober 2026.** Target: `rms-rumsy-app.pages.dev`, deployment `80a81f87-94ae-410e-a6dd-a411c391d5a0`, tetap memakai D1 `rms-rumsy` dan R2 `rms-private`. Backup SQL sebelum migrasi tersimpan di `~/Downloads/rms-backup-2026-10-26-lead-qualification/rms-rumsy-before.sql` dan lolos pemeriksaan integritas SQLite. Perbandingan 40 tabel sebelum migrasi dan setelah deploy menunjukkan nilai data lama tidak berubah; versi data tetap 936, dengan 133 lead, 55 project, 55 kontrak, 24 pembayaran, dan 72 metadata file. Empat kolom nullable dan satu catatan riwayat migrasi ditambahkan. Health D1/R2, proteksi API tanpa token (401), dan kesesuaian aset produksi dengan build sudah diperiksa. Bukti pemeriksaan tersimpan secara privat di `api/.local/releases/2026-10-26-lead-qualification/`.

Untuk deploy berikutnya, `bun run deploy:production` tetap memeriksa keberadaan keempat kolom sebelum mengunggah kode dan akan berhenti jika schema belum siap. Deploy kode tidak menjalankan migrasi remote otomatis. Jangan menjalankan ulang importer atau SQL backup awal untuk menambahkan kolom ini.

Untuk database development lokal yang sudah disiapkan, `bun run db:apply-local` menerapkan migrasi dengan backup lokal terlebih dahulu. `bun run check`, `bun run test`, dan `bun run test:e2e` memeriksa kode, aturan backend, penyimpanan Prisma, dan alur browser.
