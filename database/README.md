# Database

Folder ini berisi **migration** PostgreSQL yang dibuat oleh drizzle-kit.
Sumber kebenaran struktur tabel adalah `src/lib/db/schema.ts`; file SQL di
sini adalah riwayat perubahannya, dijalankan berurutan ke setiap database.

```
database/
└── migrations/
    ├── 0000_init.sql … NNNN_….sql # perubahan struktur, urut dari yang paling lama
    └── meta/
        ├── _journal.json          # daftar & urutan migration (dibaca drizzle-kit)
        └── NNNN_snapshot.json     # potret schema setelah tiap migration
```

Lokasi folder diatur di `drizzle.config.ts` (`out: "./database/migrations"`).
Aturan penamaan tabel/kolom/index dan soft delete ada di
[docs/CONVENTIONS.md](../docs/CONVENTIONS.md) bagian 4.

## Cara mengubah struktur database

1. Ubah tabel/kolom di `src/lib/db/schema.ts`.
2. Buat migration baru:

   ```bash
   pnpm db:generate --name=nama_singkat_perubahan
   ```

3. **Periksa file SQL yang dihasilkan.** Bila perubahan butuh mengisi atau
   memindahkan data lama (misal kolom baru yang `NOT NULL`), sunting file
   tersebut dan tandai bagian tambahan dengan komentar
   `-- Ditambahkan manual: …` beserta alasannya.
4. Jalankan ke database:

   ```bash
   pnpm db:migrate
   ```

5. Commit file SQL **dan** perubahan di `meta/` bersama perubahan `schema.ts`.

## Aturan

- **Jangan mengubah, mengganti nama, atau menghapus migration yang sudah dijalankan** di database mana pun (terutama production). drizzle-kit mencatat migration yang sudah dijalankan di tabel `drizzle.__drizzle_migrations`; perubahan berikutnya selalu dibuat sebagai migration baru.
- Jangan menyunting `meta/` secara manual. File di sana dibuat dan dibaca drizzle-kit.
- Migration hanya membuat struktur tabel. Akun developer pertama dibuat lewat
  `pnpm db:create-developer` (lihat `scripts/create-developer.mjs`).

## Riwayat migration

| File | Isi |
| --- | --- |
| `0000_init` | Tabel bawaan starter: `users`, `sessions`, `login_attempts`, `audit_logs`, `error_logs`, `notifications`. Role `DEVELOPER`/`ADMIN`/`USER`, dan index unik yang memastikan hanya ada satu akun Developer aktif. |

### Database baru

```bash
pnpm db:migrate
pnpm db:create-developer dev@example.com passwordRahasia "Nama Developer"
```
