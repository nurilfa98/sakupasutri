// SATU-SATUNYA tempat untuk mengatur "role apa boleh melakukan apa" (RBAC).
//
// Kode di halaman dan Server Action TIDAK mengecek role secara langsung
// (`user.role === "ADMIN"`), melainkan mengecek permission:
//
//     await requirePermission("user:manage");   // di server (lib/auth/dal.ts)
//     can(user, "audit:view")                    // untuk menampilkan/menyembunyikan UI
//
// Jadi kalau suatu hari USER boleh melihat audit log, cukup ubah
// ROLE_PERMISSIONS di bawah, tanpa mencari-cari pengecekan di seluruh kode.
//
// File ini tidak memakai `server-only` karena Client Component juga memakainya
// (misalnya kotak menu menyembunyikan menu). Menyembunyikan menu hanya soal
// tampilan; pengaman sebenarnya tetap requirePermission() di server.
//
// Referensi:
// - node_modules/next/dist/docs/01-app/02-guides/authentication.md (bagian "Authorization")
// - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

import type { Role } from "./roles";

// Format penamaan: "<sumber-daya>:<aksi>".
export const PERMISSIONS = [
  "user:view", // melihat daftar & detail pengguna
  "user:manage", // tambah, ubah, nonaktifkan, hapus (soft delete), pulihkan, reset password
  "audit:view", // melihat audit log
  "error-log:view", // melihat error log aplikasi
  "error-log:manage", // ubah status error log (selesai / abaikan)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// `satisfies` memastikan setiap role terdaftar dan setiap permission valid.
// DEVELOPER punya semua hak, termasuk error log. ADMIN tidak punya error-log:*,
// sehingga menu Log Error hanya muncul untuk Developer.
const ROLE_PERMISSIONS = {
  DEVELOPER: PERMISSIONS,
  ADMIN: ["user:view", "user:manage", "audit:view"],
  USER: [],
} satisfies Record<Role, readonly Permission[]>;

export type PermissionSubject = { role: Role };

export function can(user: PermissionSubject, permission: Permission) {
  return (ROLE_PERMISSIONS[user.role] as readonly Permission[]).includes(permission);
}
