// Daftar role disimpan sebagai konstanta (bukan string bebas) supaya TypeScript
// menangkap typo seperti "ADMINS". File ini TIDAK memakai `server-only`
// karena Client Component juga boleh memakainya, misalnya untuk menyembunyikan
// tombol. Ingat: menyembunyikan tombol bukan pengaman, pengecekan sebenarnya
// tetap di server (lib/auth/dal.ts).
//
// Satu user = satu role, disimpan di kolom users.role (tidak ada tabel roles).
// Tambah role baru: (1) tambahkan ke ROLES dan ROLE_LABELS di bawah,
// (2) atur haknya di lib/auth/permissions.ts, (3) `pnpm db:generate` supaya
// CHECK constraint users.role ikut diperbarui.
//
// DEVELOPER = akun pribadi developer, hanya SATU (dijaga index database). TERSEMBUNYI:
// tidak tampil di daftar, detail, atau filter pengguna lain, dan aktivitasnya tidak
// dicatat di audit log. Dibuat hanya lewat terminal (pnpm db:create-developer).
// ADMIN     = pengelola pengguna: kelola akun & lihat audit log. Tidak melihat
// error log dan tidak melihat akun Developer.
// USER      = pengguna biasa: hanya mengelola akunnya sendiri (Profil).
export const ROLES = ["DEVELOPER", "ADMIN", "USER"] as const;

export type Role = (typeof ROLES)[number];

// Role yang boleh dipilih dari form di UI. DEVELOPER sengaja tidak termasuk.
export const ASSIGNABLE_ROLES = ["ADMIN", "USER"] as const satisfies readonly Role[];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

// Nama role yang tampil di UI. Kode tetap memakai nilai aslinya (ADMIN, dst).
export const ROLE_LABELS: Record<Role, string> = {
  DEVELOPER: "Developer",
  ADMIN: "Administrator",
  USER: "Pengguna",
};
