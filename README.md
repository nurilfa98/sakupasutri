# Next.js 16 Starter

Template awal web app (PWA) berbasis Next.js 16, siap dipakai untuk proyek baru:
login & sesi perangkat, RBAC satu-role, CRUD pengguna dengan soft delete,
audit log, error log, notifikasi in-app, dan layout PWA tanpa sidebar
(header + kotak ikon menu).

Cukup clone repo ini, ganti identitas, lalu mulai membuat fitur.

## Teknologi

- Next.js 16 (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui (Base UI)
- PostgreSQL + Drizzle ORM
- iron-session (login berbasis cookie), zod (validasi)
- Resend (email), Fonnte (WhatsApp), Cloudflare R2 (file): semuanya opsional
- Husky + commitlint (Conventional Commits), release-please (changelog & versi otomatis)

## Memulai proyek baru dari starter

Prasyarat: Node.js 22 (lihat `.nvmrc`), pnpm 9, dan database PostgreSQL.

1. Clone repo, lalu ganti `name` di `package.json` dan jalankan:

   ```bash
   pnpm install
   pnpm release:reset        # versi → 0.1.0, CHANGELOG dikosongkan
   ```

2. Ganti identitas di `src/lib/brand.ts` (nama produk, tagline, awalan cookie),
   logo di `src/components/layout/logo-mark.tsx` dan `src/app/icon.svg`, lalu:

   ```bash
   pnpm icons:generate
   ```

3. Salin `.env.example` menjadi `.env`, isi minimal `DATABASE_URL` dan
   `SESSION_SECRET` (cara generate ada di file tersebut).

4. Buat tabel dan akun developer pertama:

   ```bash
   pnpm db:migrate
   pnpm db:create-developer dev@example.com passwordRahasia "Nama Developer"
   ```

5. Jalankan aplikasi, lalu buka [http://localhost:3000](http://localhost:3000):

   ```bash
   pnpm dev
   ```

Saat development, layanan luar boleh dikosongkan:

| Bila kosong | Yang terjadi |
| --- | --- |
| `RESEND_API_KEY` / `EMAIL_FROM` | Isi email (termasuk password sementara) dicetak di terminal `pnpm dev`. |
| `FONNTE_TOKEN` | Pesan WhatsApp dicetak di terminal dengan awalan `[whatsapp:dev]`. |
| `R2_*` | File disimpan di folder `.storage/` (tidak ikut git). |
| `CRON_SECRET` | Endpoint pembersihan harian menolak semua request. Isi bila ingin menguji. |

Uji pembersihan harian (hapus notifikasi, error log, dan riwayat perangkat lama) secara manual:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/cleanup
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Server development |
| `pnpm build` / `pnpm start` | Build & jalankan versi production |
| `pnpm typecheck` | Cek tipe TypeScript |
| `pnpm lint` | Cek kode dengan ESLint |
| `pnpm db:generate` | Buat file migration baru setelah mengubah `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Jalankan migration ke database |
| `pnpm db:create-developer` | Buat akun Developer (tersembunyi) |
| `pnpm icons:generate` | Buat ulang ikon PWA dari `src/app/icon.svg` |
| `pnpm release:reset` | Kembalikan versi & changelog ke awal |

## Dokumentasi

- [docs/CONVENTIONS.md](docs/CONVENTIONS.md): standar penamaan, database & soft delete, komponen reusable, layout PWA, commit & rilis.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): struktur folder, alur data, dan keamanan.
- [database/README.md](database/README.md): cara mengubah struktur database dan riwayat migration.
- [CLAUDE.md](CLAUDE.md): ringkasan aturan untuk Claude Code.

Proyek ini memakai Next.js 16 yang punya perubahan besar dibanding versi
sebelumnya. Rujukan utama adalah dokumentasi versi terpasang di
`node_modules/next/dist/docs/` (lihat `AGENTS.md`).

## Commit, versi, dan changelog

Commit memakai Conventional Commits (`feat(users): tambah filter role`);
hook Husky menolak format yang salah. Versi dan `CHANGELOG.md` dibuat otomatis
oleh release-please lewat Release PR di GitHub, jadi commit/push yang sering
tidak menaikkan versi. Detail di
[docs/CONVENTIONS.md](docs/CONVENTIONS.md#8-commit--rilis).

## Deploy

Config `vercel.json` memakai region `sin1` (Singapura) dan menjadwalkan
`/api/cron/cleanup` setiap hari pukul 02.00 WIB; ubah sesuai kebutuhan. Hosting
lain memanggil URL itu dengan crontab (contoh di `.env.example`). Isi semua environment variable dari `.env.example` di hosting, jalankan
`pnpm db:migrate` ke database production, lalu `pnpm db:create-developer`.
