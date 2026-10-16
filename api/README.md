# RMS API — Hono

Backend Cloudflare dengan Hono dan TypeScript. Struktur mengikuti `safar-compro/api`: registrasi aplikasi, modul route/service/schema, serta helper bersama. Storage tetap D1 dan R2, dengan tabel dan data RMS yang sudah ada.

```text
src/
├── index.ts                 # Worker entry: /api/* ke Hono, lainnya ke ASSETS
├── app.ts                   # Middleware dan registrasi route
├── modules/
│   ├── auth/                # Login, sesi, logout, password
│   ├── user/                # Admin user
│   ├── directory/           # Direktori user dan sales
│   ├── state/               # Snapshot JSON, versi, izin perubahan
│   ├── pipeline/            # Service internal perhitungan stage
│   ├── file/                # Upload/download/delete D1 + R2
│   ├── client/              # Portal publik dengan token project
│   ├── notification/        # Task email dan konfigurasi/status email
│   └── health/              # Pemeriksaan DB dan R2
└── shared/
    ├── db/d1.ts             # Helper query D1, tanpa koneksi PostgreSQL
    ├── env.ts               # Tipe binding Cloudflare
    ├── middlewares/         # Sesi dan pengecekan role
    ├── constants/           # Role dan permission yang sudah ada
    ├── types/
    └── utils/               # JSON response, cookie, crypto, audit, email, file
```

`*.route.ts` memasang endpoint Hono dan membaca request/context. `*.service.ts` menjalankan query dan logika. `*.schema.ts` menangani parsing/normalisasi input dengan aturan lama. Route tanpa input tidak memiliki schema; pipeline adalah service internal. Field snapshot yang belum dikenal tetap dipertahankan agar data produksi tidak terpotong.

## Endpoint yang dipertahankan

| Method | Path | Akses |
| --- | --- | --- |
| GET | `/api/health` | Publik |
| POST | `/api/auth/login` | Publik |
| POST | `/api/auth/refresh` | Cookie refresh + `X-RMS-Refresh: 1`, dengan pemeriksaan origin |
| GET | `/api/auth/me` | Bearer; method lain juga tetap dilayani seperti versi lama |
| POST | `/api/auth/logout` | Bearer |
| POST | `/api/auth/change-password` | Bearer |
| GET | `/api/directory/sales`, `/api/directory/users` | Bearer |
| GET, POST | `/api/admin/users` | Super Admin |
| PATCH | `/api/admin/users/:id` | Super Admin |
| GET, PUT | `/api/state` | Bearer, dengan guard perubahan field |
| POST | `/api/files` | Bearer; multipart `file`, `entityType`, `entityId` |
| GET | `/api/files/:id` | Bearer; `?download=1` untuk attachment |
| DELETE | `/api/files/:id` | Role yang diizinkan aturan lama |
| GET | `/api/client/project?token=...` | Token portal project |
| GET | `/api/client/file/:id?token=...` | Token dan file laporan yang dipublikasikan |
| POST | `/api/notify/task` | Bearer |
| GET | `/api/admin/email/status` | Settings permission |
| POST | `/api/admin/email/test` | Settings permission |

Semua route internal, termasuk route yang memiliki pembatasan role, memerlukan `Authorization: Bearer <accessToken>`. Cookie `rms_session` saja tidak lagi diterima untuk mengambil/mengubah data. Token pada URL/query juga ditolak. Format respons bisnis tetap sama; respons login ditambah `accessToken`, `tokenType` dan `expiresIn`.

Token akses berupa nilai acak 256 bit (opaque), bukan JWT. Masa berlaku maksimal 15 menit, dibatasi juga oleh expiry sesi induknya. Hanya hash token yang disimpan pada tabel `sessions` yang sudah ada; ID baris akses diawali `access:<id-sesi-induk>:`. Setiap request memeriksa token, expiry, sesi induk dan user aktif di server. Baris sesi kedaluwarsa dibersihkan saat token diterbitkan. Tidak ada migrasi SQL atau secret JWT baru.

Cookie login `rms_session` (`HttpOnly; Secure; SameSite=Lax; Path=/`) mempertahankan masa berlaku 12 jam dan dipakai hanya sebagai sesi refresh. Nilainya tidak dikembalikan sebagai access token. Cookie/sesi lama yang belum kedaluwarsa dapat dipulihkan melalui `POST /api/auth/refresh`, tetapi tidak membuka endpoint data secara langsung. Refresh memerlukan header `X-RMS-Refresh: 1`; login dan refresh memeriksa Origin/Fetch Metadata untuk menolak request browser lintas situs. Tidak dibuka CORS lintas origin. Logout mencabut sesi induk serta seluruh token akses anaknya, sehingga token lama segera ditolak.

Frontend menyimpan token akses hanya dalam memori, memulihkannya saat reload, dan berbagi satu proses refresh untuk request paralel. Token tidak disimpan di localStorage/sessionStorage atau URL. Foto/dokumen internal diambil melalui fetch terautentikasi dan blob URL; HTML/SVG diunduh, bukan dibuka sebagai dokumen aktif pada origin aplikasi. Portal client masih menggunakan token project yang sudah ada.

### Postman

1. `POST /api/auth/login`, body JSON `{"email":"akunmu","password":"passwordmu"}`.
2. Salin `accessToken` dari respons. Pada request internal, pilih Authorization → Bearer Token dan tempel token itu.
3. Saat token habis, login ulang atau kirim `POST /api/auth/refresh` dengan cookie jar dari login dan header `X-RMS-Refresh: 1`. Gunakan access token baru dari respons.

Membuka URL data di address bar tetap menghasilkan `401`, karena navigasi tidak menambahkan Bearer header. Data yang diizinkan untuk akun tetap dapat dilihat melalui DevTools atau Postman dengan token valid. Bearer tidak menggantikan pengecekan role/scope.

## Binding Cloudflare

| Nama | Tipe | Sumber yang sudah ada |
| --- | --- | --- |
| `DB` | D1 database | `rms-rumsy` |
| `FILES` | R2 bucket | `rms-private` |
| `ASSETS` | Static assets | Disediakan Cloudflare Pages |
| `RESEND_API_KEY` | Secret, opsional | Konfigurasi email yang sudah ada |
| `EMAIL_FROM` | Variable, opsional | Pengirim email |
| `RMS_URL` | Variable, opsional | URL aplikasi untuk link email |

Tidak ada database URL, migrasi SQL, seed produksi atau credentials yang ditanam dalam bundle. Production dan Preview mempunyai binding/secret masing-masing. Koneksi ke binding produksi berarti perubahan API tersimpan ke data produksi.

## Lokal, build dan pengujian

Jalankan dari root repository:

```sh
bun install
bun run check
bun run test
bun run test:api
```

`test:api` membangun Hono lalu menjalankan adapter HTTP lokal di `127.0.0.1:8788` dengan D1/R2 tiruan di memori. Aliasnya `bun run dev:api`. Akun: `super_admin@local.test` / `local-test-password`. Ini mode uji; tidak memuat data Cloudflare. Perlu Node.js 22+ untuk SQLite adapter. Setelah mengedit backend, jalankan ulang perintah ini. Pilih port lain dengan `RMS_TEST_PORT=8789 bun run test:api` bila 8788 sudah dipakai.

Di terminal lain jalankan `bun dev`; untuk mencoba backend Hono lokal, set `RMS_API_ORIGIN=http://127.0.0.1:8788` di `web/.env`. Jika nilainya URL produksi, frontend lokal tetap memakai backend yang sudah terdeploy, bukan kode Hono lokal.

Backend versi baru dan frontend harus dipasang bersama. FE baru tidak kompatibel dengan backend produksi lama yang masih hanya mengembalikan cookie. Proxy Vite menerjemahkan Origin hanya jika request berasal dari origin dev server itu sendiri; origin asing tidak diterjemahkan dan tetap ditolak API.

```sh
bun run build:api  # Hanya API -> api/build/_worker.js
bun run build      # API + Svelte -> web/build/ siap untuk Pages
bun run test:e2e   # Paket build melalui Hono, memakai D1/R2 di memori
```

Hasil `_worker.js` merupakan bundle Hono mandiri; tidak perlu upload `node_modules` atau source TypeScript. Folder `baseline/original/` hanya arsip pembanding. Lihat `../DEPLOY-INFO.txt` untuk deployment Pages yang sama.

Migrasi ini mempertahankan perilaku backend awal, termasuk keterbatasan scope state/file dan guard bisnis yang tercatat dalam `../MIGRATION.md`. Penggantian framework tidak otomatis memperbaiki otorisasi lama.

Referensi: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
