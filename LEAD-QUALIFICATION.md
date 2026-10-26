# Form lead — 26 Oktober 2026

Form tambah/edit lead memakai komponen `web/src/lib/components/sales/LeadForm.svelte`.

- WhatsApp ditambahkan ke pilihan sumber tanpa menghapus sumber yang sudah ada.
- Kebutuhan mempunyai empat pilihan: Rumah, Bisnis, Sekolah, Other. Other menampilkan kolom keterangan opsional dan boleh disimpan tanpa keterangan.
- Kebutuhan lama di luar kategori, misalnya Ruko 2 Lantai, ditampilkan sebagai Other dengan teks semula di keterangan. Ini pemetaan tampilan/form: membuka atau membatalkan form tidak menulis ulang data. Saat disimpan, teks lama dipertahankan di `needDetail`.
- Urutan komersial: Est. RAB → Margin → DP (%) → DP (Rp). Margin tetap 8%; dua input DP saling mengikuti. Mengubah RAB mempertahankan persentase dan menghitung ulang nominal. Rupiah dibulatkan ke bilangan utuh, DP valid 20–100%, dan nominal DP baru bisa diisi setelah RAB lebih dari nol. Lead awal dengan RAB nol tetap bisa dibuat.
- Tenor memakai slider 1–15 tahun dan input angka dengan langkah satu tahun. Default lead baru 3 tahun, mengikuti default kontrak sebelumnya 36 bulan. Angka bulan juga ditampilkan. Saat membuat project baru dari lead, tenor dikalikan 12; kontrak project yang sudah ada tidak otomatis diubah.
- Jaminan memilih SHM atau Non-SHM. Nilai Est. Gambar lama tidak ditimpa; tersedia sebagai arsip pada detail/history ketika ada nilainya.
- Backend memvalidasi syarat komersial baru. Lead lama yang hanya menerima chat, milestone atau perubahan nonkomersial tetap dapat disimpan tanpa memaksa perubahan nilai historis.
- Kegagalan simpan menahan form agar input dapat dicoba lagi; antrean save tidak ikut macet setelah error.

Sales Kanban kini memiliki toolbar ringkas: info read-only di kiri, filter bulan masuk/tahun, jumlah lead dan tombol Semua bulan di kanan (menumpuk pada mobile). Filter hanya menyaring tanggal masuk dari lead yang berhak dilihat pengguna. Isi kartu dan jumlah header memakai hasil filter yang sama. Ketujuh kolom termasuk DP Gambar tetap tersedia, termasuk saat jumlahnya nol; filter tidak mengubah stage, alur pembayaran, atau data tersimpan. Pengujian mencakup bulan berbeda, tahun berbeda, reset, tampilan mobile dan scope Sales.

## Schema dan deploy

Empat kolom nullable ditambahkan ke `Lead`: `dpAmount`, `tenorYears`, `collateral`, `needDetail`. File SQL:

`api/prisma/migrations/20261026020527_lead_qualification/migration.sql`

Migrasi hanya berisi empat `ALTER TABLE ... ADD COLUMN`; tidak ada penghapusan atau pengubahan isi record lama. Prisma Client/metadata dibuat ulang oleh build. Pengujian memakai database SQLite/D1 tiruan, tidak mengakses Cloudflare.

**Migrasi dan kode ini belum diterapkan ke produksi.** Sebelum deploy produksi, ambil backup D1 terbaru dan terapkan SQL tambahan tersebut ke database target melalui alur migrasi yang biasa. `bun run deploy:production` memeriksa keberadaan keempat kolom sebelum mengunggah kode dan akan berhenti jika schema belum siap. Deploy kode tidak menjalankan migrasi remote otomatis. Jangan menjalankan ulang importer atau SQL backup awal untuk menambahkan kolom ini.

Untuk database development lokal yang sudah disiapkan, `bun run db:apply-local` menerapkan migrasi dengan backup lokal terlebih dahulu. `bun run check`, `bun run test`, dan `bun run test:e2e` memeriksa kode, aturan backend, penyimpanan Prisma, dan alur browser.
