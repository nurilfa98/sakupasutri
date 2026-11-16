# Konvensi Pengembangan

Standar penulisan kode, database, UI, dan commit untuk proyek yang dibuat dari
starter ini. **Wajib dibaca sebelum menulis kode** (oleh developer maupun
Claude; `CLAUDE.md` di root mengarahkan ke file ini). Bila ada yang bertentangan
dengan kebiasaan lama, dokumen inilah yang berlaku. Struktur folder dan alur
data ada di [ARCHITECTURE.md](./ARCHITECTURE.md).

Daftar isi:

1. [Bahasa](#1-bahasa)
2. [Format kode](#2-format-kode)
3. [Penamaan di kode](#3-penamaan-di-kode)
4. [Database](#4-database)
5. [Komponen reusable](#5-komponen-reusable)
6. [Layout & PWA](#6-layout--pwa)
7. [Checklist menambah fitur](#7-checklist-menambah-fitur)
8. [Commit & rilis](#8-commit--rilis)
9. [Definition of done](#9-definition-of-done)

---

## 1. Bahasa

| Bagian | Bahasa |
| --- | --- |
| Komentar kode, dokumentasi, pesan commit (deskripsi) | Indonesia |
| Teks yang tampil di UI (label, pesan error, toast) | Indonesia |
| Identifier: nama tabel, kolom, fungsi, variabel, file, folder | Inggris |
| Tipe commit (`feat`, `fix`, ...) dan nilai konstanta (`ADMIN`, `NEW`) | Inggris |

Komentar menjelaskan **kenapa**, bukan mengulang **apa** yang sudah jelas dari kode.

## 2. Format kode

| Aturan | Nilai | Dipaksa oleh |
| --- | --- | --- |
| Indentasi | **2 spasi** (bukan tab), di SEMUA jenis file | `.editorconfig`, `.prettierrc`, `.vscode/settings.json` |
| Akhir baris | **LF** | `.gitattributes`, `.editorconfig`, `.prettierrc` |
| Lebar baris | 120 karakter | `.prettierrc` |
| Encoding | UTF-8, baris kosong di akhir file | `.editorconfig` |
| Urutan class Tailwind | otomatis | `prettier-plugin-tailwindcss` |

- Jalankan `pnpm exec prettier --write <file>` pada file yang Anda ubah.
- File hasil generate (`database/migrations/*`, `pnpm-lock.yaml`) tidak diformat manual.
- Impor memakai alias `@/` (= `src/`), bukan path relatif naik-turun (`../../`).
  Pengecualian: `src/lib/db/schema.ts` memakai impor relatif karena dibaca drizzle-kit.

## 3. Penamaan di kode

| Jenis | Gaya | Contoh |
| --- | --- | --- |
| Fungsi | `camelCase`, diawali kata kerja | `createUser`, `getUserById`, `formatDate` |
| Variabel & parameter | `camelCase` | `fullName`, `isActive` |
| Class | `PascalCase` | `RateLimitError` |
| Type, interface, enum TypeScript | `PascalCase` | `CurrentUser`, `ActionResult<T>` |
| Komponen React | `PascalCase` (aturan React, walau berupa fungsi) | `UsersTable`, `PageHeader` |
| Hook | `camelCase` berawalan `use` | `useActionResult` |
| **Konstanta** | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE`, `ROLES`, `PUBLIC_ROUTES` |
| Skema zod | `camelCase` berakhiran `Schema` | `createUserSchema` |
| Server Action | kata kerja + objek | `createUser`, `deleteUser`, `restoreUser` |
| Variabel boolean | awalan `is` / `has` / `can` / `should` | `isActive`, `hasError`, `canEdit` |
| File & folder | `kebab-case` | `user-create-form.tsx`, `error-logs/` |
| Environment variable | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Nilai enum/status di DB dan kode | `UPPER_SNAKE_CASE` string | `"NEW"`, `"RESOLVED"`, `"ADMIN"` |

Yang dihitung **konstanta** (`UPPER_SNAKE_CASE`): nilai tetap di level modul yang
tidak berubah selama aplikasi berjalan (angka batas, daftar nilai, objek peta
label, regex). Variabel biasa di dalam fungsi tetap `camelCase` walau memakai
`const`.

Nama file mengikuti isinya: `actions.ts`, `queries.ts`, `schemas.ts`,
`service.ts`, `constants.ts` di dalam folder fitur (lihat ARCHITECTURE.md).

## 4. Database

Sumber kebenaran struktur tabel: `src/lib/db/schema.ts`. Perubahan struktur
**selalu** lewat migration (`pnpm db:generate`, `pnpm db:migrate`); lihat
[database/README.md](../database/README.md).

### 4.1 Penamaan

| Objek | Aturan | Contoh |
| --- | --- | --- |
| Tabel | `snake_case`, **jamak** | `users`, `audit_logs` |
| Kolom di database | `snake_case` | `full_name`, `created_at` |
| Properti di Drizzle | `camelCase` (pemetaan otomatis dari kolom) | `fullName`, `createdAt` |
| Primary key | `id`, `varchar(36)` berisi UUID dari aplikasi | `id` |
| **Foreign key** | `<nama_tabel_tunggal>_id` | `user_id`, `project_id` |
| Kolom pelaku standar | `created_by`, `updated_by`, `deleted_by` (**tanpa** `_id`), berisi id user | |
| Lebih dari satu FK ke tabel yang sama | `<peran>_<tabel_tunggal>_id` | `approver_user_id`, `recipient_user_id` |
| Boolean | awalan `is_` / `has_` | `is_active`, `must_change_password` |
| Waktu | akhiran `_at`, tipe `timestamptz` | `created_at`, `deleted_at` |
| Tanggal saja | akhiran `_date`, tipe `date` | `birth_date` |
| Index biasa | `idx_<tabel>_<kolom>` | `idx_sessions_user_id_created_at` |
| Unique index | `uq_<tabel>_<kolom>` | `uq_users_email` |
| Check constraint | `ck_<tabel>_<nama>` | `ck_users_role` |
| Nilai status/role/tipe | `UPPER_SNAKE_CASE` + CHECK constraint | `'NEW'`, `'ADMIN'` |

FK ditulis sebagai `<tabel_tunggal>_id` **sekali** saja. Jangan membuat nama
seperti `created_by_id`, `user_id_idx`, atau `idx_users_id_id`: awalan `idx_`
menggantikan akhiran `_idx`, dan kolom pelaku memakai `_by` tanpa `_id`.

### 4.2 Kolom standar

Setiap **tabel bisnis** memakai helper `auditColumns()` di `schema.ts`, sehingga
punya kolom berikut:

| Kolom | Tipe | Isi |
| --- | --- | --- |
| `id` | `varchar(36)` PK | UUID |
| `created_at` | `timestamptz` not null, default now | kapan dibuat |
| `updated_at` | `timestamptz` not null, otomatis tiap UPDATE | kapan terakhir diubah |
| `created_by` | `varchar(36)` FK → `users.id` | siapa membuat |
| `updated_by` | `varchar(36)` FK → `users.id` | siapa terakhir mengubah |
| `deleted_at` | `timestamptz` null | kapan dihapus (soft delete); `NULL` = aktif |
| `deleted_by` | `varchar(36)` FK → `users.id` | siapa menghapus |

Isi `created_by` / `updated_by` dari user yang login (`user.id` dari DAL), **bukan**
dari input browser. Tabel baru dibuat dengan pola:

```ts
export const projects = pgTable(
  "projects",
  {
    id: id(),
    name: varchar("name", { length: 100 }).notNull(),
    ownerUserId: varchar("owner_user_id", { length: 36 }).notNull().references(() => users.id),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_projects_name").on(t.name).where(sql`${t.deletedAt} IS NULL`),
    index("idx_projects_owner_user_id").on(t.ownerUserId),
  ],
);
```

### 4.3 Tabel bawaan starter

| Tabel | Isi | Soft delete |
| --- | --- | --- |
| `users` | akun: `full_name`, `email`, `phone_number`, `password_hash`, **`role`** (satu user = satu role, tanpa tabel `roles`), `is_active`, `must_change_password`, `session_version` + kolom standar | ya |
| `sessions` | satu baris per perangkat yang login: `user_id`, `device_id`, `device_label`, `ip_address`, `location`, `created_at`, `expires_at`, `revoked_at`, `revoked_reason` | tidak (hard delete saat dibersihkan) |
| `login_attempts` | `email`, `ip_address`, `success`, `created_at` (rate limit login) | tidak |
| `audit_logs` | `user_id` (pelaku), `action`, `entity_name`, `entity_id`, `old_values`, `new_values`, `ip_address`, `created_at` | tidak (append-only) |
| `error_logs` | error server/browser dikelompokkan lewat `fingerprint`, `status`, `resolved_at`, `resolver_user_id`, dst | tidak |
| `notifications` | `user_id`, `kind`, `title`, `body`, `href`, `created_at`, `read_at` | tidak (dibersihkan berkala) |

### 4.4 Soft delete

- **Tabel bisnis tidak pernah dihapus permanen oleh aplikasi.** Menghapus =
  mengisi `deleted_at` dan `deleted_by`. Helper ada di `src/lib/db/soft-delete.ts`:

  ```ts
  // baca: SELALU sertakan notDeleted() kecuali sengaja menampilkan data terhapus
  const rows = await db.select().from(users).where(and(eq(users.role, "USER"), notDeleted(users)));
  // hapus
  await db.update(users).set(softDeleteValues(actor.id)).where(eq(users.id, id));
  // pulihkan
  await db.update(users).set(restoreValues()).where(eq(users.id, id));
  ```

- **Setiap query** ke tabel soft delete wajib menyaring `notDeleted(tabel)`,
  termasuk query di DAL (`getCurrentUser`) dan join. Lupa menyaring = data yang
  sudah dihapus muncul lagi.
- **Unique constraint** pada tabel soft delete dibuat *partial*
  (``.where(sql`${t.deletedAt} IS NULL`)``) agar nilai milik data yang sudah
  dihapus (misal email) bisa dipakai lagi.
- Hapus dan pulihkan **dicatat di audit log** (`USER_DELETED`, `USER_RESTORED`, ...).
- Menghapus user juga mencabut semua sesinya.
- `is_active = false` berarti **dinonaktifkan sementara** (data tetap tampil,
  tidak bisa login). `deleted_at` berarti **dihapus**. Keduanya berbeda; jangan
  dipakai bergantian.
- Tabel log/sesi/notifikasi (lihat 4.3) tidak memakai soft delete: isinya
  append-only atau dibersihkan berkala.
- Foreign key ke tabel soft delete **tanpa** `onDelete: "cascade"` untuk data
  bisnis; cascade hanya untuk data turunan teknis (`sessions`, `notifications`).

### 4.5 Aturan lain

- Jangan mengubah, mengganti nama, atau menghapus migration yang sudah dijalankan.
- Uang disimpan sebagai `bigint` bilangan bulat dalam satuan terkecil yang
  dipakai bisnis (rupiah bulat), bukan `float`/`decimal`. `SUM()` PostgreSQL
  dikembalikan sebagai string; petakan dengan `.mapWith(Number)`. Tampilan
  memakai `formatRupiah()` bila ditambahkan ke `lib/format.ts`.
- Semua waktu `timestamptz`. Hari kalender dihitung dengan zona waktu
  `APP_TIMEZONE` (`lib/dates.ts`), bukan zona server.
- Kolom password hanya berisi hash (bcrypt), tidak pernah teks asli.

## 5. Komponen reusable

**Aturan: selalu pakai komponen global bila ada.** Sebelum menulis UI baru,
cek `src/components/` dulu. Jangan membuat `<input>`, tabel, atau pemilih
tanggal sendiri di dalam fitur bila komponen globalnya sudah tersedia.

| Kebutuhan | Pakai | Lokasi |
| --- | --- | --- |
| Tabel data (urut, filter, paginasi) | `DataTable` (+ `data-table-filters`) | `components/data-table/` |
| Input teks | `Input`, `Textarea`, `Field` | `components/ui/` |
| Input angka | `NumberInput` | `components/number-input.tsx` |
| Input tanggal | `DatePicker` | `components/date-picker.tsx` |
| Input password | `PasswordInput` | `components/password-input.tsx` |
| Input telepon | `PhoneInput` | `components/phone-input.tsx` |
| Pilihan dari daftar | `OptionSelect`, `Select`, `Combobox` | `components/option-select.tsx`, `components/ui/` |
| Tombol, kartu, dialog, tab, badge, toast | `Button`, `Card`, `AlertDialog`, `Tabs`, `Badge`, `notify` | `components/ui/`, `lib/notify.ts` |
| Judul halaman & breadcrumb | `PageHeader`, `PageBreadcrumb` | `components/layout/` |
| Tombol salin | `CopyButton` | `components/copy-button.tsx` |
| Dialog konfirmasi aksi (dengan alasan opsional) | `ActionDialog` | `components/action-dialog.tsx` |
| Badge status berwarna | `ToneBadge` (petakan status fitur ke tone) | `components/tone-badge.tsx` |

Kapan membuat komponen **global** vs **per fitur**:

- **Per fitur** (`features/<fitur>/components/`): komponen yang hanya dibutuhkan
  fitur itu (form khusus, tabel khusus domain, badge status domain). Jangan
  dipaksakan menjadi global atau generik.
- **Global** (`components/`): komponen yang tidak membawa pengetahuan domain
  dan dipakai (atau jelas akan dipakai) oleh **dua fitur atau lebih**. Bila
  komponen per fitur ternyata dibutuhkan fitur lain, pindahkan ke `components/`
  dan perbarui impornya, jangan menyalinnya.
- Komponen global tidak boleh mengimpor dari `features/`.
- Komponen shadcn baru ditambahkan lewat CLI shadcn ke `components/ui/` (gaya
  `base-nova`, lihat `components.json`).

## 6. Layout & PWA

Aplikasi ini adalah **PWA yang dipakai di HP dan PC**, sehingga navigasinya
sengaja **tanpa sidebar**:

```
+-----------------------------------------------------+
| Header: logo | breadcrumb       lonceng  tema  user  |  <- AppHeader (sticky)
+-----------------------------------------------------+
| Halaman "/"   : kotak ikon menu + pencarian         |  <- MenuLauncher
| Halaman lain  : konten fitur                        |
|                                               [ # ] |  <- MenuFab: kembali ke "/"
+-----------------------------------------------------+
```

- **Wajib** memakai `AppHeader` + `MenuLauncher` (kotak ikon di `/`) + `MenuFab`.
  **Dilarang** menambah sidebar atau navigasi permanen lain.
- Menu baru **hanya** ditambahkan lewat `components/layout/nav-config.ts`
  (judul, deskripsi, ikon, `href`, `permission`). Menu otomatis tersaring sesuai
  hak akses user dan bisa dicari di kotak pencarian.
- Mobile-first: target sentuh minimal 44px, hormati `safe-area-inset`, form
  nyaman diisi dengan satu tangan, kolom tabel lebar harus bisa di-scroll.
- Komponen yang membaca cookie (data user login) dibungkus `<Suspense>`
  (`cacheComponents: true`), lihat ARCHITECTURE.md.
- Identitas aplikasi (nama, tagline, logo, warna) diganti di `lib/brand.ts`,
  `components/layout/logo-mark.tsx`, `app/icon.svg`, dan `app/globals.css`;
  lalu `pnpm icons:generate`.

## 7. Checklist menambah fitur

1. Tambah tabel di `src/lib/db/schema.ts` mengikuti bagian 4 (kolom standar,
   soft delete, penamaan). `pnpm db:generate --name=nama_singkat`, periksa SQL,
   `pnpm db:migrate`.
2. Tambah permission di `lib/auth/permissions.ts` dan atur per role.
3. Buat folder `features/<fitur>/` (`constants.ts`, `schemas.ts`, `service.ts`,
   `queries.ts`, `actions.ts`, `components/`), pola sama dengan `features/users`.
4. Tambah aksi audit baru di `lib/audit.ts` (`AuditAction`) dan labelnya di
   `features/audit/constants.ts`; panggil `logAudit` di setiap aksi yang mengubah data.
5. Buat halaman di `src/app/(app)/<fitur>/` (hanya routing, tipis).
6. Tambah menu di `components/layout/nav-config.ts` dan label breadcrumb di
   `components/layout/page-breadcrumb.tsx`.
7. Pakai komponen global (bagian 5). Server Action: ikuti 7 langkah di
   ARCHITECTURE.md bagian 3.

## 8. Commit & rilis

### 8.1 Format commit (Conventional Commits)

```
<tipe>(<scope>): <deskripsi singkat bahasa Indonesia>

[isi opsional: kenapa perubahan ini dibuat]

[BREAKING CHANGE: penjelasan, bila ada]
```

| Tipe | Dipakai untuk | Efek versi |
| --- | --- | --- |
| `feat` | fitur baru | minor |
| `fix` | perbaikan bug | patch |
| `perf` | peningkatan performa | tampil di changelog, tidak menaikkan versi sendiri |
| `refactor` | perapihan kode tanpa ubah perilaku | tampil di changelog, tidak menaikkan versi sendiri |
| `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert` | selain di atas | tidak tampil, tidak menaikkan versi |
| tipe apa pun diakhiri `!` atau ada `BREAKING CHANGE:` | perubahan yang merusak | major |

- **Scope** = nama fitur/area dalam huruf kecil: `users`, `auth`, `data-table`, `db`.
- Contoh: `feat(users): tambah filter role`, `fix(auth): logout mencabut sesi perangkat`,
  `feat(users)!: nomor telepon wajib diisi`.
- Hook Husky (`.husky/commit-msg`) menjalankan commitlint dan **menolak** commit
  yang formatnya salah. Aturannya di `commitlint.config.mjs`.
- Selama versi masih di bawah 1.0, `feat` menaikkan minor dan breaking change
  juga hanya menaikkan minor (`bump-minor-pre-major`). Naik ke 1.0.0 dilakukan
  sengaja: commit kosong dengan footer `Release-As: 1.0.0`.

### 8.2 Changelog & versi otomatis (release-please)

- Setiap push ke `main`, GitHub Action `release-please` membuat/memperbarui satu
  **Release PR** berisi kenaikan versi di `package.json` dan entri `CHANGELOG.md`
  yang disusun dari commit.
- **Commit dan push yang sering TIDAK menaikkan versi.** Versi baru naik hanya
  saat Release PR di-merge; commit yang menumpuk masuk ke satu rilis.
- Saat Release PR di-merge: tag `vX.Y.Z` dan GitHub Release dibuat otomatis.
- Versi tampil di aplikasi (footer halaman login dan menu user) lewat
  `lib/version.ts`. Di build non-production ditambah 7 karakter commit.
- Syarat sekali saja di GitHub: Settings → Actions → General →
  **Allow GitHub Actions to create and approve pull requests**.

### 8.3 Memulai proyek baru dari starter

Setelah clone starter untuk proyek baru:

1. Ganti `name` di `package.json`, lalu `pnpm release:reset` (versi → `0.1.0`,
   `CHANGELOG.md` dikosongkan, manifest release-please direset).
2. Hapus tag/GitHub Release milik starter bila ikut ter-clone
   (`git tag -d vX.Y.Z`).
3. Ganti identitas di `lib/brand.ts` (nama produk, awalan cookie) dan logo.
4. `pnpm install`, isi `.env` dari `.env.example`, `pnpm db:migrate`,
   `pnpm db:create-developer email password "Nama"`.

Mengulang penomoran di tengah proyek: jalankan `pnpm release:reset [versi]`,
hapus tag lama, lalu commit.

## 9. Definition of done

Sebuah perubahan dianggap selesai bila:

- [ ] `pnpm typecheck` dan `pnpm lint` lolos tanpa error.
- [ ] Penamaan mengikuti bagian 3 dan 4; indentasi 2 spasi, LF.
- [ ] Memakai komponen global bila ada (bagian 5).
- [ ] Setiap query ke tabel soft delete menyaring `notDeleted()`.
- [ ] Server Action: validasi zod → verifySession/permission → simpan + audit →
      revalidate → `ActionResult`.
- [ ] Perubahan struktur database lewat migration baru, tidak menyunting yang lama.
- [ ] Diuji di lebar layar HP dan PC.
- [ ] Commit mengikuti Conventional Commits.
