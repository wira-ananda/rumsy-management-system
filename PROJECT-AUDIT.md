# Pemetaan dan pemeriksaan proyek RMS Rumsy

**Catatan migrasi:** frontend asli yang diperiksa dalam laporan ini sekarang disimpan di `baseline/original/`. Frontend aktif berada di `web/`; backend `_worker.js` tetap sama. Lihat `MIGRATION.md` untuk hasil migrasi.

Tanggal pemeriksaan: **15 Oktober 2026, WITA**. Pemeriksaan berdasarkan seluruh 10 file asli di folder proyek dan pengujian lokal yang dijelaskan di akhir laporan. Kode aplikasi tidak diubah.

**Gambaran utama:** RMS Rumsy merupakan sistem manajemen internal bisnis konstruksi, mencakup akuisisi lead, aktivitas sales, dossier proyek, pembayaran, operasional, QC, pekerjaan tim, dan layanan holding. Terdapat **36 menu utama**, **14 tab dalam setiap Project**, serta **portal progres klien** yang terpisah.

**Batas pemeriksaan:** isi database produksi, akun aktif, file R2 yang sebenarnya, deployment Cloudflare, dan konfigurasi Resend tidak tersedia di folder ini. Angka data contoh di bawah bukan jumlah data produksi. Pengujian menggunakan data contoh, DOM tiruan, dan DB/R2 tiruan dalam memori; belum merupakan pengujian klik seluruh halaman di browser atau pengujian integrasi Cloudflare.

## 1. Isi folder dan arsitektur

| File asli | Peran dan isi |
| --- | --- |
| `index.html` | Pintu masuk sistem internal: root tampilan, stylesheet, favicon, dan pemuatan `app.js`. Judul browser masih menyebut V5. |
| `app.js` | Aplikasi internal utama, sekitar 203 KB. Katalog role/menu, data contoh, login, router, dashboard, seluruh modul, formulir, perhitungan bisnis, dan pemanggilan API. |
| `_worker.js` | Backend Cloudflare, sekitar 26,6 KB. Autentikasi, sesi, akses D1, penyimpanan state, validasi sensitif, file R2, portal klien, user, dan email. |
| `client.html` | Pintu masuk portal klien dengan root dan pesan loading tersendiri. |
| `client.js` | Membaca token URL, meminta data proyek publik, menampilkan progres serta laporan harian/mingguan dan foto. |
| `styles.css` | Desain sistem internal dan portal klien, sekitar 32,2 KB: warna navy/biru, sidebar, tabel, kartu, modal, kanban, dan aturan responsif. Berisi lapisan penambahan dari beberapa versi. |
| `rms-mark.svg` | Logo/favicon aplikasi. |
| `VERSION.txt` | Menyebut **V14.4 FIX77**, baseline FIX76, perubahan terakhir penghapusan task pada Diberikan/Dikerjakan. |
| `DEPLOY-INFO.txt` | Petunjuk direct upload Cloudflare Pages, binding D1/R2, serta konfigurasi email. Masih menyebut V9. |
| `EMAIL-SETUP.txt` | Panduan Resend, domain pengirim, secret Cloudflare, tes email, dan event task. |

Folder ini berupa paket aplikasi yang dapat diunggah langsung. Tidak ditemukan `package.json`, lockfile, dependensi lokal, framework frontend, konfigurasi Wrangler, migrasi SQL, skema SQL, README, pipeline CI, atau suite test terpisah. Folder ini juga bukan checkout Git yang aktif.

Alur teknisnya:

```text
Browser internal → index.html + app.js → /api/* → Cloudflare Worker
                                                    ├─ D1: user, sesi, state, metadata file, audit server
                                                    ├─ R2: isi file privat
                                                    └─ Resend: email task dan email tes

Browser klien → client.html?token=... → API portal → laporan yang dipublikasikan
```

Frontend menggunakan JavaScript biasa dengan template HTML dan `innerHTML`. Navigasi internal memakai hash, misalnya `#/leads`, `#/projects/ID/contract`. Tidak ada proses build yang disertakan. Backend memakai API Worker, bukan server Express atau Next.js.

Sumber: [pintu masuk internal](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/index.html:1), [router dan shell](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:208), [entry Worker](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:185).

## 2. Seluruh menu dan fungsi yang tersedia

Katalog asli menu berada di [app.js:9](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:9). Akses setiap menu bergantung pada role; matriks lengkap ada di bagian terakhir.

| No. | Kelompok / menu | Route | Isi dan fungsi nyata |
| --- | --- | --- | --- |
| 1 | Dashboard | `#/dashboard` | Proyek aktif, kontrak berjalan, pembayaran terverifikasi, outstanding, distribusi pipeline, payment pending, QC overdue, dan follow-up due. Tambahan ringkasan khusus Finance dan QC. |
| 2 | Sales Dashboard | `#/sales-dashboard` | Nilai Warm/Hot/DP Gambar/DP Proyek/Pembangunan, matriks forecast per sales, komposisi aktivitas, pengingat laporan harian, filter bulan. |
| 3 | CRM & Leads | `#/leads` | Daftar lead, tambah/edit/hapus sesuai akses, pencarian, filter sales/status/bulan, dan halaman detail lead. |
| 4 | Pipeline | `#/pipeline` | Tabel komersial 14 kolom yang meniru struktur sheet Pipeline, rekap jumlah/nilai per stage, filter sumber/sales/status/bulan/pencarian. |
| 5 | Sales Kanban | `#/kanban` | Tujuh kolom termasuk Hold/Batal; kartu menjelaskan syarat tahap berikutnya. Visualisasi read-only, tanpa drag-and-drop. |
| 6 | Forecast | `#/forecast` | Nilai pipeline per sales dan stage, total, lead menurut sumber, rata-rata estimasi RAB, closing, dan Hold/Batal. |
| 7 | Activity / Backlog | `#/activity` | Pencatatan Chat, Telepon, Meeting Offline/Online; pilih lead, data kontak, kategori Baru/Lama, perihal, PIC, catatan, next follow-up. Daftar dan tambah tersedia; edit/hapus aktivitas belum disediakan. |
| 8 | Laporan Harian Sales | `#/sales-daily-report` | Buat/edit/hapus laporan per sales per tanggal, pencarian dan filter tanggal. Deskripsi kegiatan, hasil, kendala, rencana lanjut; angka lead/aktivitas dihitung otomatis. Mencegah duplikasi sales+tanggal di frontend. |
| 9 | Client Database | `#/clients` | Profil kontak dan kumpulan proyek per klien. Satu klien bisa memiliki banyak proyek. Tidak ada formulir CRUD klien mandiri pada menu ini. |
| 10 | Dashboard Project | `#/project-dashboard` | Total/aktif/selesai/hold/terlambat, progres rata-rata, kontrak/paid/outstanding, ringkasan QC/task, dan tabel monitoring proyek. |
| 11 | Semua Project | `#/projects` | Kartu dossier proyek, tambah proyek manual, masuk ke 14 tab detail proyek. |
| 12 | Project Aktif | `#/projects-active` | Proyek berstatus selain COMPLETED. Filter ini juga dapat memasukkan proyek hold. |
| 13 | Project Selesai | `#/projects-completed` | Arsip proyek berstatus COMPLETED. |
| 14 | Serah Terima Project | `#/handover` | Antrean kesiapan start: DP Proyek, kontrak, handover, project start; tautan ke serah terima dossier. |
| 15 | Payment Verification | `#/finance-verification` | Ringkasan pending/verified/rejected dan antrean bukti pembayaran untuk diperiksa. Keputusan dilakukan di tab pembayaran proyek. |
| 16 | Payment Schedule | `#/finance-schedule` | Jadwal cicilan lintas proyek, due date, jumlah tagihan, verified paid, saldo, dan status otomatis. |
| 17 | Transaction Ledger | `#/finance-ledger` | Semua catatan pembayaran: ID, proyek, klien, tanggal, jenis, nominal, nama bukti, status. |
| 18 | Outstanding | `#/finance-outstanding` | Rekap nilai kontrak, pembayaran terverifikasi, sisa pembayaran, dan jumlah cicilan overdue. |
| 19 | QC Dashboard | `#/qc` | Jumlah inspeksi, open finding, major/critical, overdue, waiting verification, dan register temuan. |
| 20 | Inspection | `#/qc-inspection` | Buat inspeksi Sipil/Interior; pilih proyek, area, pekerjaan, hasil PASS atau FINDING_CREATED. Hasil kedua otomatis membuat temuan. |
| 21 | Findings | `#/qc-findings` | Register temuan, pengajuan corrective action, verifikasi dan pengembalian hasil perbaikan. |
| 22 | Corrective Action | `#/qc-corrective` | Daftar temuan yang belum closed, termasuk OPEN/OVERDUE/ON_PROGRESS/WAITING_VERIFICATION. |
| 23 | QC Escalation | `#/qc-escalation` | Catatan confidential per proyek/temuan, submit eskalasi, dan tanda sudah ditinjau oleh Super Admin. |
| 24 | Arsip Surat | `#/correspondence` | Surat masuk/keluar, nomor, tanggal, pihak, perihal, proyek opsional, file dan catatan; tambah/edit/hapus, pencarian, filter jenis, statistik. |
| 25 | Tasks | `#/tasks` | Papan pekerjaan, multi-PIC, reviewer, prioritas, tanggal mulai/target, mulai kerja, submit, approve, revisi, edit, hapus sesuai akses. |
| 26 | Approval Queue | `#/approvals` | Daftar permintaan, pihak peminta/approver, status/tanggal, Approve/Return/Reject. Efek bisnis yang ditangani eksplisit: addendum dan handover. |
| 27 | Support Holding | `#/support` | Request ke Finance/Purchasing/HRD/Legal/Arda, proyek opsional, deskripsi, prioritas, due date, dan Advance Status. |
| 28 | Panduan Penggunaan | `#/guide` | Panduan role, pipeline, CRM, pembayaran, chat, Project 360, QC, dokumen dan troubleshooting. |
| 29 | Reports | `#/reports` | Enam tampilan: Sales, Project, Payment, QC, Document, Management. Ringkasan/tabel di layar, belum ada tombol ekspor laporan. |
| 30 | Notifications | `#/notifications` | Daftar notifikasi tersimpan dan tombol Tandai Dibaca. Belum dipisah per penerima. |
| 31 | Organization | `#/organization` | Bagan organisasi statis: Owner, Head BU, manager, admin/sales/QC, dan Shared Service Holding. |
| 32 | Audit Log | `#/audit` | Riwayat bisnis dari state: actor, entity, ID, action, waktu, detail. Berbeda dari tabel audit server. |
| 33 | User Access | `#/user-access` | Form checkbox tambahan akses per user. Nilai tersimpan, tetapi belum digunakan untuk menegakkan akses menu/aksi. |
| 34 | System Check | `#/system-check` | Menjalankan 28 pemeriksaan lokal bawaan untuk logika pipeline, keuangan, chat, katalog role, dan struktur data. |
| 35 | Email Notification | `#/email-notification` | Status konfigurasi Resend tanpa membuka API key, tes kirim email, daftar event task, dan petunjuk konfigurasi. |
| 36 | Settings | `#/settings` | Menampilkan sumber lead, rekening, dokumen wajib dan aturan pipeline. Super Admin juga dapat membuat/edit user. Master data ditampilkan read-only; editor master data belum tersedia. |

## 3. Detail CRM dan alur penjualan

**Field lead:** ID, tanggal masuk, nama klien, nomor WhatsApp, sumber, lokasi, kebutuhan, persentase DP/margin, estimasi gambar/RAB/ASST CR, catatan, Sales PIC, stage, next follow-up, last activity, milestone, chat, status Hold/Batal dan alasannya.

**Detail lead** menampilkan profil, estimasi komersial, jalur stage, daftar qualification, milestone, syarat tahap selanjutnya, chat internal dengan lampiran, pembayaran DP, dan tautan dossier. Sales PIC dipilih dari akun Sales aktif. Menambahkan milestone Survey/Proposal/Meeting memicu evaluasi otomatis stage.

**Pipeline bisnis:**

1. **WARM → HOT:** kebutuhan, lokasi, Est. RAB > 0, Sales PIC, next follow-up, serta minimal satu milestone Survey selesai / Proposal-RAB dikirim / Meeting penawaran selesai.
2. **HOT → DP GAMBAR:** bukti diunggah, lalu transaksi DP Gambar berstatus VERIFIED. Upload saja tetap pending.
3. **HOT atau DP GAMBAR → DP PROYEK:** transaksi DP Proyek VERIFIED. DP Gambar boleh dilewati.
4. **DP PROYEK → PEMBANGUNAN:** DP Proyek VERIFIED, kontrak SIGNED, handover ACCEPTED, project start disetujui.
5. **PEMBANGUNAN → SELESAI:** progres minimal 100%, semua QC CLOSED, BAST FINAL memiliki nama, completion disetujui.
6. **HOLD/BATAL:** jalur samping dengan alasan wajib; dapat diaktifkan kembali.

Saat upload DP pertama dari lead, sistem dapat membuat client dan dossier proyek otomatis. Nilai kontrak awal menggunakan estimasi RAB. Pencocokan klien otomatis memakai kesamaan nama atau nomor telepon, sehingga data kontak kosong/duplikat perlu diperhatikan.

Nilai forecast menggunakan **Est. ASST CR jika positif, selain itu Est. RAB**. Bukan forecast berbobot probabilitas. Persentase DP/margin tidak otomatis menjadi simulasi pembiayaan lengkap.

Laporan harian sales menyimpan snapshot metrik pada saat laporan disimpan: lead baru, chat, telepon, meeting offline/online, total aktivitas, follow-up jatuh tempo, nilai pipeline. Jika data aktivitas belakangan berubah, angka snapshot tidak otomatis diperbarui sampai laporan diedit/disimpan lagi.

Sumber: [logika pipeline](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:158), [lead dan formulir](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:220), [laporan sales](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:246).

## 4. Seluruh isi Project 360: 14 tab

| Tab | Isi dan tindakan |
| --- | --- |
| **Ringkasan** | Snapshot status/progres/jadwal/akad/handover, kelengkapan dokumen, paid/outstanding/pending, ringkasan QC. Aktifkan portal klien, salin link, ganti token link, nonaktifkan portal. |
| **Klien** | Nama, WhatsApp, email, alamat; asal lead, kebutuhan, sales, DP dan margin. Tampilan informasi. |
| **Riwayat Sales** | Stage, estimasi gambar/RAB/ASST CR, catatan, dan urutan milestone lead terkait. |
| **Chat** | Thread internal proyek, pesan teks, lampiran R2, actor/waktu; terpisah dari thread lead. |
| **Kontrak** | Nomor/tanggal akad, nilai awal, DP, margin, tenor, status, dokumen kontrak. Edit informasi dan tandai SIGNED. UI mensyaratkan nomor akad serta file Akad Final di R2 sebelum penandaan. Tidak ada tanda tangan elektronik. |
| **Pembayaran** | Upload bukti, lihat/download bukti, Verify, Reject, Reversal, actor dan waktu verifikasi. Jenis: DP Gambar, DP Proyek, Cicilan, Adendum, Pelunasan. |
| **Jadwal Cicilan** | Daftar tagihan, due date, nilai due, verified paid, balance, payment count dan status. Finance/Super Admin dapat menambah jadwal manual; satu cicilan menerima beberapa transfer. |
| **Adendum** | Draft plus file wajib, edit/hapus draft atau rejected sesuai akses, permintaan approval, approve, buat tagihan setelah approved/signed. Nilai perubahan boleh positif atau negatif. |
| **Dokumen** | Kartu Akad Final/RAB Final/Gambar Final/Timeline/BAST; upload dokumen lain, buka, edit/ganti, hapus. Upload versi baru menandai versi final lama SUPERSEDED. |
| **Operasional** | Tanggal mulai/target, PIC operasional/QC dari akun aktif, slider progres. Slider memberi status PREPARATION/RUNNING/FINISHING/HANDOVER berdasarkan persentase. |
| **Laporan Progress** | Harian dan mingguan, persentase aktual/target mingguan, pekerjaan, kendala, rencana, foto, edit/hapus dan publikasi ke klien. Pembuatan laporan baru mensyaratkan minimal tiga foto walau label form menyebut opsional. |
| **QC** | Ringkasan inspeksi dan temuan yang melekat pada proyek. Input/perubahan QC berada di menu QC terpisah. |
| **Serah Terima** | Checklist start dan completion. Submit/Accept/Return handover, Approve Project Start, Approve Completion. Completion mencatat actual finish dan status COMPLETED. |
| **Riwayat Aktivitas** | Timeline aktivitas proyek, actor dan waktu dari state aplikasi. |

Data utama proyek meliputi ID, relasi client/lead, nama/lokasi, PIC sales/operasional/QC beserta user ID, status/progres, nilai awal, jadwal, kontrak, handover, flag started/completionApproved, dan koleksi transaksi/cicilan/adendum/dokumen/inspeksi/finding/laporan/chat/aktivitas/token portal.

Proyek dapat dibuat manual oleh Head BU, Manager Operasional, Admin General, Super Admin. Penghapusan dibatasi Head BU/Super Admin dan ditolak jika sudah ada transaksi VERIFIED. Form edit proyek juga memperbarui nama/alamat pada client terkait; pada client dengan banyak proyek, profil bersama ini perlu dijaga konsistensinya.

Sumber: [katalog tab dan dossier](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:288), [dokumen dan progres](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:365), [start dan completion](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:373).

## 5. Keuangan dan perhitungan

- **Current Contract** = kontrak awal + jumlah nilai adendum APPROVED atau SIGNED.
- **Verified Paid** = jumlah nominal transaksi berstatus VERIFIED saja.
- **Outstanding** = Current Contract − Verified Paid.
- **Paid per cicilan** = jumlah transaksi VERIFIED dengan installment ID terkait.
- **Status cicilan:** PAID jika sudah terpenuhi; OVERDUE jika belum lunas dan tanggal lewat; PARTIAL jika sudah ada pembayaran tetapi belum jatuh tempo; DUE jika jatuh tempo hari ini dan belum terbayar; selebihnya UPCOMING.
- **Reversal:** mempertahankan record pembayaran dan mengubah status menjadi REVERSED, sehingga nominal tidak lagi masuk total paid. Bukan jurnal pembalik akuntansi double-entry.

Upload bukti memakai bank tujuan, pengirim, tanggal, referensi, alokasi cicilan dan catatan. Format yang disarankan form bukti: PDF/JPG/JPEG/PNG. Batas backend: **25 MB per file**. Backend belum membatasi tipe file berdasarkan fungsi unggah.

Belum ada buku besar double-entry, chart of accounts, laporan laba rugi/neraca, rekonsiliasi rekening otomatis, invoice PDF, payment gateway, atau jadwal amortisasi otomatis dalam kode ini. Menu Ledger merupakan register pembayaran proyek.

Sumber: [rumus keuangan](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:146), [aksi pembayaran](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:298), [jadwal](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:302).

## 6. QC, Tasks, Approval, Holding, notifikasi

**QC:** alur yang dimaksud adalah Inspection → Finding → Corrective Action → Waiting Verification → Closed. Inspeksi memuat kategori Sipil/Interior, area, work item, inspector, hasil. Finding memuat severity, deskripsi, PIC, target, status, foto before/after, dan corrective. Form pembuatan finding masih sederhana: temuan dari inspeksi diberi severity MINOR, deskripsi/PIC/target default. Foto after dapat diunggah saat corrective; dialog verifikasi menampilkan nama fotonya, belum menyediakan tautan lihat file after.

Eskalasi confidential hanya ditampilkan di menu Manager QC/Super Admin. Worker juga mengenali OWNER untuk akses eskalasi, tetapi role OWNER belum ada di katalog frontend.

**Tasks:** judul, deskripsi, proyek opsional, beberapa PIC, satu reviewer, tanggal mulai/target, prioritas, pembuat, status, waktu submit/completion, catatan review, revision count, email status. Reviewer disarankan mengikuti atasan role. Papan menampilkan Diberikan → Dikerjakan → Menunggu Review → Selesai, ditambah kolom Batal. Terdapat status CANCELLED/kolom Batal, tetapi tidak ada tombol pembatalan pada alur task saat ini.

Task baru dapat dibuat dari tombol yang tampil untuk seluruh role. Edit/hapus dibatasi di UI untuk role pengelola, dengan ketidaksesuaian backend yang dirinci di temuan. Task bukan checklist pekerjaan konstruksi berbobot atau Gantt chart.

**Approval Queue:** form aksi mendukung Approve/Return/Reject. Kode efek khusus hanya untuk ADDENDUM dan HANDOVER. Label menu menyebut Completion, Payment Correction, exceptional override, tetapi belum ada handler khusus untuk jenis itu. Submit handover dari dossier juga belum otomatis membuat record Approval Queue baru.

**Support Holding:** request FINANCE/PURCHASING/HRD/LEGAL/ARDA dengan status SUBMITTED → RECEIVED → ON_PROCESS → COMPLETED. Semua role mendapat menu ini dan tombol Advance Status tersedia tanpa pemeriksaan assignment penerima. Belum merupakan modul Purchasing/HRD/Legal/Arda yang lengkap.

**Notifikasi dalam aplikasi:** record global, bukan inbox per user. Tombol baca mengubah satu flag read bersama. Kode membuat notifikasi pembayaran saat upload; label halaman menyebut banyak jenis, tetapi tidak ditemukan scheduler yang secara rutin membuat reminder follow-up/QC/deadline. Chat dan dashboard tidak menggunakan WebSocket, SSE, atau polling otomatis.

**Email:** ASSIGNED ke PIC, SUBMITTED ke reviewer, APPROVED/REVISION ke PIC. Isi mencakup judul, proyek, deskripsi, tanggal, reviewer, catatan, dan tombol masuk RMS. Pemanggilan pengiriman berasal dari browser setelah aksi task; belum ada antrean/retry pengiriman atau pemicu transaksi backend yang menjamin email dikirim setelah penyimpanan berhasil. Email tes hanya Admin General/Super Admin.

Sumber: [QC](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:388), [task](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:396), [approval/holding](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:577), [email backend](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:132).

## 7. Portal klien

Portal terpisah di `client.html?token=...`, tanpa login user internal. Link mengandung token acak dua UUID tanpa tanda hubung. Token dapat dibuat ulang atau dinonaktifkan dari ringkasan proyek.

Yang ditampilkan: ID/nama/lokasi proyek, status, tanggal mulai/target, persentase aktual, jumlah laporan, laporan harian/mingguan, pekerjaan, kendala, rencana dan foto. Laporan disertakan jika `published !== false`; nilai yang kosong/tidak ada dianggap dipublikasikan.

API membentuk objek publik terpisah dan tidak menyertakan ledger keuangan atau chat internal. Akses file publik memeriksa token proyek dan apakah ID file termasuk laporan terpublikasi. Ini merupakan pemisahan data publik yang sudah ada. Namun token portal masih ikut berada di state yang dapat dibaca semua user internal terautentikasi.

Belum ada akun klien individual, tanggal kedaluwarsa link, komentar klien, approval klien, histori akses, atau pengiriman link otomatis melalui WhatsApp. Rotasi/nonaktifkan token menjadi cara pencabutan akses.

Sumber: [portal frontend](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/client.js:1), [data publik](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:38), [otorisasi token/file portal](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:112).

## 8. Database, file, login, dan deployment

**Tabel D1 yang digunakan**, diinferensikan dari query kode karena DDL/skema tidak disertakan:

| Tabel | Isi |
| --- | --- |
| `users` | ID, email, full name, role, scope name, password hash/salt/iterations, active, must-change-password, timestamps. |
| `sessions` | ID, user ID, hash token, expires_at. |
| `app_state` | Satu record `id=1`, version, JSON data, updated_at. Data bisnis tidak dipisahkan menjadi tabel proyek/transaksi/lead per record. |
| `files` | ID file, object key R2, nama asli, content type, size, entity type/ID, uploader. |
| `server_audit` | user ID, action, detail, IP; field waktu bergantung skema yang tidak tersedia. |

Koleksi state bisnis: leads, crm, clients, projects, tasks, approvals, support, escalations, notifications, correspondence, audit, settings, salesDailyReports, userAccessOverrides. Array tambahan dibuat di frontend melalui normalisasi saat render.

Setiap penyimpanan mengirim **seluruh snapshot JSON** ke `PUT /api/state`, bukan satu perubahan record. Server mengecek version dan update bersyarat; konflik menghasilkan HTTP 409. Frontend mengurutkan request melalui save chain, menampilkan alert dan memuat data terbaru saat konflik. Belum ada merge antarperubahan atau sinkronisasi real-time.

**Autentikasi yang tersedia:** akun dibuat Super Admin; login email/password; hash PBKDF2-SHA256, 100.000 iterasi untuk password baru; sesi token acak, hanya hash token disimpan di D1; cookie HttpOnly/Secure/SameSite=Lax dengan Max-Age 12 jam. Logout menghapus sesi. Ganti password memerlukan password lama dan minimal 10 karakter untuk yang baru.

**User Management:** buat user, edit nama/role/scope/status aktif. Belum ada reset password oleh admin, ubah email melalui UI, registrasi publik, lupa password, MFA, atau rate limiting login dalam Worker ini. Aturan Cloudflare di luar kode belum dapat dinilai. Flag wajib ganti password ditampilkan lewat modal yang dapat ditutup; backend belum membatasi akses sampai password diganti.

**Binding yang diperlukan:** `DB` ke D1 `rms-rumsy`, `FILES` ke bucket `rms-private`, dan `ASSETS` untuk file statis. Email memakai secret `RESEND_API_KEY`, variable `EMAIL_FROM`, `RMS_URL`. Tidak ditemukan secret email tertanam pada file yang diperiksa.

Data contoh `seed` di frontend berisi 9 lead, 7 aktivitas CRM, 4 klien, 3 proyek, 3 task, 2 approval, 2 support, 1 eskalasi, 4 notifikasi, 3 audit, dan master data. **`boot()` mengambil data dari D1; seed ini tidak otomatis menjadi database baru.** Tanpa tabel/record app_state yang sudah dibuat, paket ini belum cukup untuk provisioning sistem dari nol.

Sumber: [boot dan save](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:108), [login/sesi](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:43), [endpoint state/file/user](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:154), [deployment](/Users/wiraananda/Ngoding/maw/rms-rumsy/DEPLOY-INFO.txt:1).

## 9. Seluruh endpoint backend

| Method | Endpoint | Penggunaan / pembatasan saat ini |
| --- | --- | --- |
| GET | `/api/health` | Publik; cek koneksi query D1 dan keberadaan binding R2. Tidak membuktikan upload/download R2 benar-benar berhasil. |
| POST | `/api/auth/login` | Publik; autentikasi dan buat sesi. |
| GET | `/api/client/project?token=...` | Publik dengan token proyek aktif; ringkasan dan laporan terpublikasi. |
| GET | `/api/client/file/:id?token=...` | Token aktif dan file terkait laporan terpublikasi. |
| GET | `/api/auth/me` | Profil sesi. Handler kode tidak membatasi method secara eksplisit. |
| GET | `/api/directory/sales` | Semua user login; direktori Sales Executive aktif. |
| GET | `/api/directory/users` | Semua user login; direktori seluruh akun aktif beserta email/role/scope. |
| POST | `/api/auth/logout` | User login; hapus sesi dan cookie. |
| POST | `/api/auth/change-password` | User login; verifikasi password lama, simpan password baru. |
| POST | `/api/notify/task` | Semua user login; kirim email task ke user aktif yang dipilih. Belum mengecek assignment/keberadaan task di database. |
| GET | `/api/admin/email/status` | Admin General/Super Admin. |
| POST | `/api/admin/email/test` | Admin General/Super Admin. |
| GET | `/api/state` | Semua user login; seluruh state kecuali eskalasi untuk role di luar izin eskalasi. |
| PUT | `/api/state` | Semua user login; version check dan filter sebagian perubahan sensitif. |
| POST | `/api/files` | Semua user login; unggah R2 dan metadata D1, maksimum 25 MB. |
| GET | `/api/files/:id` | Semua user login; buka/download file berdasarkan ID. Belum mengecek akses entity/proyek. |
| DELETE | `/api/files/:id` | Head BU/Manager Operasional/Admin General/Super Admin; hapus file dan metadata. |
| GET | `/api/admin/users` | Super Admin; daftar akun. |
| POST | `/api/admin/users` | Super Admin; buat akun dan password awal. |
| PATCH | `/api/admin/users/:id` | Super Admin; nama, role, scope, active. |

## 10. Temuan yang paling berpengaruh

Status **terkonfirmasi lokal** berarti perilaku direproduksi pada fungsi asli atau endpoint Worker dengan data/layanan tiruan. Status **dari kode** berarti terbaca langsung dalam implementasi dan belum diuji pada deployment produksi.

### A. Akses dan integritas data

1. **Pembatasan baca belum mengikuti role/kepemilikan proyek — terkonfirmasi lokal.** `GET /api/state` hanya menyembunyikan eskalasi confidential. Akun Sales menerima seluruh proyek, klien, task, keuangan, audit, serta objek token portal. File privat juga hanya memeriksa login, tanpa izin atas proyek pemiliknya. Pengujian dengan Sales mengembalikan semua 3 proyek contoh, 4 klien, dan file tiruan milik entity lain. Filter `visibleLeads/visibleProjects` berada di frontend; global search, ledger, reports dan client database juga memakai koleksi luas. [Worker:154](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:154), [Worker:166](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:166), [app:144](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:144).

2. **State write menerima perubahan di luar wewenang UI — terkonfirmasi lokal.** Worker melindungi beberapa field, tetapi tidak memvalidasi seluruh perubahan berdasarkan role dan kepemilikan. Akun Sales dapat menyimpan perubahan nilai kontrak awal dan lead lain melalui API; modifikasi override akses juga lolos. Array audit dapat diubah selama panjangnya tidak berkurang. Ini membuat aturan pada tombol/menu belum menjadi batas keamanan yang cukup. [Worker:55](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:55), [Worker:157](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:157).

3. **Proyek baru melewati pemeriksaan sejumlah flag sensitif — terkonfirmasi lokal.** Cabang proyek baru hanya mengatur pembayaran menjadi pending, kemudian `continue`; kontrak SIGNED, handover ACCEPTED, started, completionApproved, dan adendum APPROVED pada objek baru tetap dapat diterima dari role Sales. Validasi perlu berlaku pada create maupun update. [Worker:63](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:63).

4. **Pemeriksaan reviewer task menggunakan assignment kiriman baru — terkonfirmasi lokal.** User dapat mengganti reviewer ID menjadi dirinya pada payload yang sama dengan perubahan status DONE, kemudian lolos karena otorisasi membandingkan `nt.reviewerUserId`. Penentuan izin seharusnya memakai assignment lama yang terpercaya dan aturan perubahan assignment terpisah. [Worker:90](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:90).

5. **User Access belum efektif — terkonfirmasi lokal.** Terdapat 55 label permission dan penyimpanan `userAccessOverrides`, tetapi `hasCustomPermission()` tidak dipanggil oleh pemeriksaan akses menu atau aksi. Menghapus CRM_VIEW pada override tidak menyembunyikan menu CRM. Form juga hanya menyunting array `add`; pengurangan role permission belum diterapkan. [app:129](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:129), [app:209](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:209), [app:491](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:491).

6. **Sebagian data input dimasukkan ke HTML tanpa escaping — dari kode.** Contoh: nama proyek pada header dossier, sejumlah field lead/pipeline, isi support, dan riwayat aktivitas. Karena data disimpan lalu dirender dengan `innerHTML`, ini membuka potensi stored XSS. Tidak dilakukan penyisipan payload ke produksi. [app:216](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:216), [app:290](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:290), [app:601](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:601).

### B. Workflow dan konsistensi antarlapis

7. **Task REVISION hilang dari papan — terkonfirmasi lokal.** Handler mengubah status ke REVISION, tetapi setiap kolom hanya menampilkan `t.status === c.key` dan tidak ada kolom REVISION. Tombol mulai untuk REVISION sebenarnya sudah ditulis, tetapi kartu tidak dirender. Status OVERDUE pada data lama juga tidak masuk kolom mana pun. [app:413](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:413).

8. **PIC kedua task tidak bisa menyimpan perubahan status — terkonfirmasi lokal.** UI mengenali `picUserIds`, backend hanya membandingkan `picUserId` tunggal. PIC kedua mendapat tombol dan state lokal berubah ON_PROGRESS, tetapi server mengembalikan status lama secara diam-diam. [app:401](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:401), [Worker:90](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:90).

9. **Izin hapus task berbeda UI dan backend — terkonfirmasi lokal.** UI memberi tombol ke Manager Operasional/Sales/QC dan Admin General; backend mempertahankan task yang dihapus semua role selain Head BU/Super Admin. Perubahan bisa terlihat berhasil sampai data dimuat ulang. [app:438](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:438), [Worker:90](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:90).

10. **QC yang dikembalikan tidak punya aksi lanjut — terkonfirmasi lokal.** Return memberi status ON_PROGRESS, sedangkan tombol Corrective hanya dibuat untuk OPEN/OVERDUE dan Verify untuk WAITING_VERIFICATION. Akibatnya temuan tidak dapat diajukan ulang melalui tombol yang tersedia. [app:389](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:389), [app:392](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:392).

11. **Head BU mendapat tombol Accept Handover tetapi backend menolaknya — terkonfirmasi lokal.** UI mengizinkan Head BU, set `HANDOVER_REVIEW` Worker hanya Manager Operasional/Super Admin. Pengujian mempertahankan status SUBMITTED. [app:373](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:373), [Worker:7](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:7).

12. **Keputusan Approval Queue belum menjaga approver/jenis dengan konsisten — dari kode.** UI memberi keputusan lintas approval ke Head BU/Manager Operasional/Manager Sales/Super Admin tanpa mengecek assignment approver. Worker memfilter sebagian status proyek/adendum tetapi record approval sendiri bisa tetap berubah, sehingga status antrean dan entity dapat berbeda. [app:577](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:577), [Worker:55](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:55).

13. **Approve dari tab Adendum tidak menyegarkan tab sesuai callback — terkonfirmasi lokal.** Handler mengirim callback sebagai argumen `v`, tetapi `decideApproval` memanggil `approvals(v)` dan menulis HTML ke properti function tersebut. Callback render tab tidak dipanggil; data dapat berubah sementara tampilan adendum tertinggal. [app:354](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:354), [app:578](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:578).

14. **Buat Tagihan Adendum dapat berulang dan tidak dibatasi Finance — dari kode.** Tombol tampil untuk seluruh pembaca tab saat status approved/signed; setiap klik menambah installment lagi tanpa pengecekan tagihan lama. Actor audit bahkan ditulis tetap sebagai Finance Holding. [app:355](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:355).

15. **Tanggal audit/aktivitas masih 10 Agustus 2026 — terkonfirmasi lokal.** `nowLabel()` dan `addAudit()` memakai tanggal konstan, hanya jam yang berjalan. Target finding baru juga tetap 13 Agustus dan due support default tetap 12 Agustus. Timestamp operasional menjadi menyesatkan. [app:122](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:122), [app:154](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:154), [app:390](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:390), [app:601](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:601).

16. **Filter bulan Sales Dashboard kehilangan pilihan — terkonfirmasi lokal.** Saat berubah, dashboard merender ulang input bulan tanpa `value` yang dipilih. Tampilan dapat terfilter sekali tetapi input kembali kosong; perubahan berikutnya bisa memakai keadaan yang tidak sesuai. Forecast juga mengacu input `#salesMonth` yang tidak disediakan pada halaman Forecast. [app:219](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:219), [app:225](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:225), [app:632](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:632).

### C. Laporan, file, penyimpanan, dan sesi

17. **Foto mingguan portal hanya membawa foto pertama — terkonfirmasi lokal.** Serializer harian menyertakan `photos`; serializer mingguan hanya `fileId/fileName`. Laporan mingguan berisi tiga foto di state kehilangan array foto pada API portal. [Worker:38](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:38).

18. **Klik thumbnail progres internal memiliki atribut HTML rusak — terkonfirmasi lokal pada HTML keluaran.** Atribut onclick memakai kutip ganda bersarang tanpa escaping, sehingga nilainya terpotong sebelum `_blank`. Tombol Buka Foto terpisah tetap tersedia. [app:370](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:370).

19. **Label foto opsional berbeda dengan validasi — dari kode.** Laporan baru ditolak jika kurang dari tiga foto, meskipun label menyebut opsional. Belum ada penjelasan minimum pada form. [app:369](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:369).

20. **Pembersihan file tidak lengkap dan belum atomik — dari kode.** Hapus/edit laporan umumnya hanya menghapus `fileId` pertama, bukan seluruh `photos`. Hapus proyek juga tidak mengumpulkan seluruh foto, file adendum, corrective QC, dan memakai properti chat `fileId` padahal attachment memakai `attachmentFileId`. Sebagian penghapusan file terjadi sebelum state berhasil disimpan; konflik/gagal simpan dapat meninggalkan referensi rusak atau file yatim. [app:258](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:258), [app:369](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:369), [app:370](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:370).

21. **Kegagalan save ditangkap tetapi tidak diteruskan ke pemanggil — terkonfirmasi lokal.** Simulasi HTTP 500 memunculkan alert/log, tetapi Promise `save()` tetap resolve. Pemanggil dapat menutup modal, menghapus file atau mengirim email meski state gagal disimpan. Respons berhasil juga hanya mengembalikan version, sehingga perubahan yang disaring server tidak dikembalikan ke data lokal. [app:110](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:110), [Worker:157](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:157).

22. **Format waktu sesi berbeda pada penulisan dan pembandingan — risiko dari kode, perbandingan SQLite direproduksi lokal.** Expiry ditulis ISO dengan `T/Z`, dibandingkan langsung dengan `datetime('now')` yang memakai spasi. Pada nilai TEXT, sesi yang sudah lewat jamnya pada hari UTC yang sama masih bisa lolos perbandingan leksikal. Cookie browser berumur 12 jam, tetapi validasi server tetap perlu menggunakan format konsisten. Skema produksi tidak tersedia untuk memastikan tipe kolom. [Worker:43](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:43), [Worker:109](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:109).

23. **Katalog role tidak konsisten — terkonfirmasi lokal.** Frontend memiliki 14 role, backend 15 termasuk OWNER. Bagan organisasi menyebut Owner, self-test meminta 15 role, tetapi user form tidak menyediakan OWNER dan akun OWNER tidak mendapat katalog menu normal. [app:4](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:4), [Worker:1](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:1).

24. **Aturan pipeline frontend/backend berbeda pada lead lama tanpa dossier — dari kode.** Frontend mempertahankan stage DP_GAMBAR/DP_PROYEK/PEMBANGUNAN/SELESAI untuk contoh lama tanpa proyek; backend menghitung ulang ke HOT/WARM. Sinkronisasi state dapat mengubah stage yang terlihat pada seed atau data lama sejenis. [app:173](/Users/wiraananda/Ngoding/maw/rms-rumsy/baseline/original/app.js:173), [Worker:51](/Users/wiraananda/Ngoding/maw/rms-rumsy/_worker.js:51).

**Urutan penanganan yang paling membantu:** otorisasi baca/tulis/file dan keamanan rendering terlebih dahulu; kemudian task/QC/handover/approval dan save error; berikutnya tanggal, portal/foto, pembersihan file, konsistensi data/version serta kelengkapan paket deployment. Belum dilakukan perubahan produk dalam pemeriksaan ini.

## 11. Hasil pengujian dan hal yang belum dibuktikan

| Pemeriksaan | Hasil / batas makna |
| --- | --- |
| Syntax `app.js`, `client.js`, `_worker.js` | Ketiganya lolos parser Node; Worker diperiksa sebagai module. |
| Render fungsi seluruh menu | 36/36 menghasilkan HTML tanpa exception sinkron dengan data contoh dan DOM tiruan. |
| Render tab Project | 14/14 menghasilkan HTML tanpa exception sinkron. |
| Render menu yang diizinkan pada 14 role frontend | Tidak ada exception sinkron pada data contoh. Tidak membuktikan otorisasi backend atau interaksi browser. |
| Self-test bawaan | **27/28 lulus** dengan direktori user tiruan yang dapat memetakan PIC seed. Gagal: katalog role mengharapkan 15, frontend berisi 14. |
| Pemeriksaan perilaku tambahan | Mengonfirmasi masalah state scope/write, file authorization, create-project guard, reviewer task, multi-PIC, revisi/hapus task, QC return, override akses, tanggal, handover, foto mingguan, thumbnail, filter bulan, callback adendum, dan kegagalan save. |
| Query waktu SQLite lokal | Memperlihatkan perbandingan ISO-versus-datetime dapat menerima nilai expired pada hari yang sama jika dibandingkan sebagai TEXT. |
| Database/R2/Resend produksi | Belum diuji; tidak ada koneksi/binding/kredensial produksi yang digunakan. |
| Browser/mobile visual dan klik nyata | Belum diuji; render smoke memakai DOM tiruan. Responsiveness tercantum di CSS, belum menjadi jaminan layout setiap viewport. |

Skrip pemeriksaan tersimpan sementara di [rms-project-audit.cjs](/private/tmp/rms-project-audit.cjs), hasil terstruktur di [rms-project-audit-results.json](/private/tmp/rms-project-audit-results.json). Pengujian tidak mengirim email atau mengubah data produksi.

Hal yang perlu akses environment nyata untuk dibuktikan: record dan skema D1, integritas relasi data yang sudah ada, keberadaan file R2 lama, configured secret/domain Resend, keberhasilan email end-to-end, perilaku sesi nyata, batas upload deployment, serta UI desktop/mobile.

## 12. Matriks akses menu berdasarkan kode frontend

Kode singkat: **HB** Head BU, **MO** Manager Operasional, **MS** Manager Sales, **MQ** Manager QC, **AG** Admin General, **SE** Sales Executive, **AC** Admin CRM, **QT** QC Teknis, **FI** Finance Holding, **PU** Purchasing Holding, **HR** HRD Holding, **LE** Legal Holding, **AR** Arda Holding, **SA** Super Admin. “Semua” berarti seluruh 14 role frontend. OWNER belum tercantum di frontend.

Tabel berikut menunjukkan izin tampilan menu, bukan jaminan pembatasan data/aksi pada backend.

<!-- Matriks dihasilkan dari katalog nav app.js. -->

| Menu | Role yang mendapat menu |
| --- | --- |
| Dashboard | Semua |
| Sales Dashboard | HB, MS, SE, SA |
| CRM & Leads | HB, MS, SE, AC, SA |
| Pipeline | HB, MS, SE, AC, SA |
| Sales Kanban | HB, MS, SE, AC, SA |
| Forecast | HB, MS, SE, SA |
| Activity / Backlog | HB, MS, SE, AC, SA |
| Laporan Harian Sales | HB, MS, SE, AC, SA |
| Client Database | HB, MO, MS, AG, SE, AC, FI, SA |
| Dashboard Project | HB, MO, MS, MQ, AG, SE, AC, QT, FI, PU, LE, AR, SA |
| Semua Project | HB, MO, MS, MQ, AG, SE, AC, QT, FI, PU, LE, AR, SA |
| Project Aktif | HB, MO, MS, MQ, AG, SE, AC, QT, FI, SA |
| Project Selesai | HB, MO, MS, MQ, AG, SE, FI, SA |
| Serah Terima Project | HB, MO, MS, AG, SE, SA |
| Payment Verification | HB, FI, SA |
| Payment Schedule | HB, MO, MS, AG, SE, AC, FI, SA |
| Transaction Ledger | HB, MO, MS, AG, SE, AC, FI, SA |
| Outstanding | HB, FI, SA |
| QC Dashboard | HB, MO, MQ, QT, SA |
| Inspection | HB, MO, MQ, QT, SA |
| Findings | HB, MO, MQ, QT, SA |
| Corrective Action | HB, MO, MQ, QT, SA |
| QC Escalation | MQ, SA |
| Arsip Surat | HB, AG, SA |
| Tasks | Semua |
| Approval Queue | HB, MO, MS, MQ, AG, SA |
| Support Holding | Semua |
| Panduan Penggunaan | Semua |
| Reports | HB, MO, MS, MQ, AG, SE, AC, FI, SA |
| Notifications | Semua |
| Organization | Semua |
| Audit Log | HB, SA |
| User Access | SA |
| System Check | HB, SA |
| Email Notification | AG, SA |
| Settings | AG, SA |
