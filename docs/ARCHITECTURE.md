# Arsitektur

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Base UI) ·
PostgreSQL + Drizzle · iron-session · Cache Components aktif.

Aturan penamaan, database, komponen, dan commit ada di [CONVENTIONS.md](./CONVENTIONS.md).

## 1. Struktur folder

```
├── database/migrations/       # migration SQL hasil drizzle-kit (lihat database/README.md)
├── docs/                      # dokumentasi seperti file ini
├── public/                    # file statis (ikon PWA)
├── scripts/                   # script CLI: create-developer, generate-app-icons, reset-release
├── src/
│   ├── app/                   # ROUTING SAJA — tipis, tidak ada logika bisnis
│   │   ├── (login)/login/page.tsx          # login: info + form di PC, form saja di HP
│   │   ├── (auth)/                         # tampilan tengah tanpa header (ganti password)
│   │   ├── (app)/layout.tsx                # header + tombol menu untuk semua halaman setelah login
│   │   ├── (app)/page.tsx                  # beranda (/) = kotak ikon menu
│   │   ├── (app)/users/…                   # contoh CRUD
│   │   ├── (app)/profile, notifications, audit, error-logs
│   │   ├── api/                            # webhook / client eksternal / polling / cron (api/cron/cleanup)
│   │   ├── layout.tsx, globals.css, manifest.ts, icon.svg
│   │   └── error.tsx, global-error.tsx, not-found.tsx
│   ├── features/              # LOGIKA PER DOMAIN
│   │   ├── auth/              # login, sesi perangkat, ganti password
│   │   ├── users/             # CONTOH CRUD lengkap (pola template fitur baru)
│   │   ├── audit/             # halaman audit log
│   │   ├── error-logs/        # halaman error log + pelapor error browser
│   │   ├── notifications/     # lonceng & daftar notifikasi in-app
│   │   └── pwa/               # tombol & dialog "Pasang aplikasi"
│   ├── components/            # UI yang dipakai lintas fitur
│   │   ├── ui/                # Button, Input, Dialog, ... (shadcn/ui)
│   │   ├── layout/            # AppHeader, MenuLauncher, MenuFab, nav-config.ts
│   │   ├── data-table/        # DataTable global
│   │   ├── theme/, status-page/
│   │   └── date-picker, number-input, password-input, phone-input, option-select, ...
│   ├── hooks/                 # React hooks bersama (use-action-result, use-form-reset, use-mobile)
│   ├── lib/                   # infrastruktur (bukan logika bisnis)
│   │   ├── db/                # koneksi, schema, soft-delete helper
│   │   ├── auth/              # password, session, dal, roles, permissions (RBAC)
│   │   ├── audit.ts           # logAudit(), dipakai semua fitur
│   │   ├── error-log.ts       # logError(), dipakai instrumentation & catch block
│   │   ├── brand.ts           # nama produk, tagline, awalan cookie
│   │   ├── version.ts         # versi aplikasi untuk UI
│   │   ├── env.ts             # validasi environment variable
│   │   ├── email.ts, whatsapp.ts, storage.ts   # layanan luar (opsional, fallback ke terminal/.storage)
│   │   └── dates.ts, format.ts, phone.ts, request.ts, notify.ts (toast), utils.ts
│   ├── types/                 # tipe global (ActionResult)
│   ├── instrumentation.ts     # mencatat error server tak tertangani ke error_logs
│   └── proxy.ts               # (Next 16: pengganti middleware.ts) redirect cepat ke /login
```

Kenapa `src/`? Memisahkan kode aplikasi dari file konfigurasi di root.

Kenapa **feature-based** dan bukan `services/`, `controllers/`, `models/` global?
Karena semua yang berkaitan dengan satu domain ada di satu tempat. Saat aplikasi
membesar, Anda tidak perlu loncat ke 5 folder berbeda untuk satu fitur.

## 2. Isi satu folder fitur

```
features/users/
├── components/        # UserCreateForm.tsx, UsersTable.tsx ("use client" bila perlu)
├── constants.ts       # status, enum, label
├── schemas.ts         # zod: validasi input form (dipakai client & server)
├── service.ts         # aturan bisnis MURNI (tanpa DB, tanpa Next) → mudah dites (opsional)
├── queries.ts         # baca data (server-only): cek session → query DB → DTO
└── actions.ts         # "use server": validasi → otorisasi → simpan + audit → revalidate
```

`features/users` adalah **contoh acuan**: fitur baru disalin polanya dari sana.

### Arah dependensi (aturan paling penting)

```
app/  ──►  features/  ──►  lib/
```

- `app/` boleh import dari `features/` dan `components/`.
- `features/` boleh import dari `lib/`, `components/`, `types/`, `hooks/`.
- `lib/` dan `components/` tidak boleh import dari `features/` atau `app/`.
- Satu fitur sebaiknya tidak import isi internal fitur lain. Kalau perlu, pindahkan
  bagian yang dipakai bersama ke `lib/` (atau `components/` untuk UI).
- Hindari barrel file (`index.ts` yang re-export semua) — sering mencampur kode
  server dan client sehingga kode server ikut terbundel ke browser.

## 3. Alur data

### Membaca data (Server Component)

```
page.tsx (Server Component)
   └─► features/users/queries.ts   import "server-only"
          ├─ requirePermission()    ← lib/auth/dal.ts
          ├─ query DB (notDeleted)  ← lib/db
          └─ return DTO             ← hanya field yang dibutuhkan UI
```

```ts
// features/users/queries.ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { notDeleted } from "@/lib/db/soft-delete";

export async function listUsers() {
  await requirePermission("user:view");
  const rows = await db.select().from(users).where(notDeleted(users));
  // DTO: jangan kirim kolom sensitif (password_hash) ke client
  return rows.map((r) => ({ id: r.id, fullName: r.fullName, email: r.email, role: r.role }));
}
```

### Mengubah data (Server Action)

```
<form action={createUser}>  (Client Component, useActionState)
   └─► features/users/actions.ts   "use server"
          1. validasi input (zod)         ← JANGAN percaya data dari client
          2. verifySession + cek izin     ← autentikasi + otorisasi (can / requirePermission)
          3. cek kepemilikan/keberadaan   ← data ini boleh diubah user ini? belum dihapus?
          4. service (aturan bisnis)      ← bila ada
          5. simpan DB + logAudit         ← dalam satu transaksi; isi created_by/updated_by
          6. revalidate / redirect
          7. return ActionResult
```

Server Action adalah endpoint publik: siapa pun bisa memanggilnya dengan data
apa pun. Karena itu langkah 1–3 **wajib** di setiap action. Hasil action
ditangani di client dengan `useActionResult` + `notify` (toast).

### Kapan pakai `app/api/.../route.ts`?

Hanya untuk: webhook dari pihak ketiga, endpoint yang dipanggil aplikasi lain
(mobile app), cron job, atau polling ringan dari client (lonceng notifikasi).
Untuk form di aplikasi sendiri, pakai Server Action.

## 4. Keamanan berlapis

| Lapisan | Tugas |
| --- | --- |
| `proxy.ts` | Cek cepat "ada cookie session?" → redirect ke /login |
| `lib/auth/dal.ts` | Verifikasi session sungguhan: user aktif, belum dihapus, sesi perangkat belum dicabut, role (sumber kebenaran) |
| `queries` / `actions` | Selalu panggil DAL, cek permission, cek kepemilikan data, saring `notDeleted()` |
| DTO | Hanya kirim field yang perlu ke client |

`proxy.ts` saja **tidak cukup** — semua pengecekan penting harus dekat ke data.

Hak akses (RBAC) diatur di satu tempat: `lib/auth/permissions.ts`. Kode mengecek
**permission** (`can(user, "user:manage")`), bukan role langsung. Satu user
memiliki satu role (`users.role`).

Dengan `cacheComponents: true`, komponen yang membaca `cookies()` (mis. data user
login) harus dibungkus `<Suspense>`, kalau tidak build akan error.

## 5. Layanan luar (semuanya opsional)

| Layanan | File | Bila env kosong (development) |
| --- | --- | --- |
| Email (Resend) | `lib/email.ts` | isi email dicetak di terminal `pnpm dev` |
| WhatsApp (Fonnte) | `lib/whatsapp.ts` | pesan dicetak di terminal dengan awalan `[whatsapp:dev]` |
| Penyimpanan file (Cloudflare R2) | `lib/storage.ts` | file disimpan di folder `.storage/` (tidak ikut git) |

Pembersihan data lama (notifikasi, error log, riwayat perangkat) dijalankan
cron harian `app/api/cron/cleanup`, dijaga `CRON_SECRET`. Tugas harian baru
ditambahkan ke daftar `TASKS` di route itu.

Notifikasi in-app (lonceng) ada di `features/notifications`; pengiriman
email/WhatsApp dipanggil terpisah oleh fitur yang membutuhkannya.

## 6. Referensi

Dokumentasi Next.js versi yang terpasang ada di `node_modules/next/dist/docs/`:

- `01-app/01-getting-started/02-project-structure.md`
- `01-app/02-guides/authentication.md` dan `authentication-with-cache-components.md`
- `01-app/02-guides/data-security.md`
- `01-app/02-guides/forms.md`
- `01-app/01-getting-started/16-proxy.md`
