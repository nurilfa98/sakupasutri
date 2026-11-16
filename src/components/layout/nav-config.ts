// Daftar menu aplikasi. Ditampilkan sebagai kotak ikon di halaman / (tepat
// setelah login) dan labelnya dipakai breadcrumb di header. Aplikasi ini TIDAK
// punya sidebar: menu baru HANYA ditambahkan di sini.
//
// Cara menambah menu: (1) tambahkan satu objek di MENU_ITEMS, (2) tambahkan
// label segmen URL-nya di SEGMENT_LABELS agar breadcrumb tampil benar.
//
// `permission` (opsional) menentukan siapa yang melihat menu tersebut. Bila
// berupa daftar, cukup punya SALAH SATU permission (lihat canSeeMenu).
// Ini hanya soal tampilan: halamannya sendiri tetap wajib memanggil
// requirePermission() dari lib/auth/dal.ts.

import { BellIcon, BugIcon, FileClockIcon, UserRoundIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { can, type Permission, type PermissionSubject } from "@/lib/auth/permissions";

export type MenuItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  // Kata lain yang ikut dicocokkan oleh kolom pencarian menu.
  keywords?: string[];
  permission?: Permission | Permission[];
};

// Hanya butuh `role`, jadi bisa dipanggil dengan CurrentUser maupun objek
// `{ role }` yang dikirim server ke Client Component.
export function canSeeMenu(user: PermissionSubject, item: MenuItem) {
  if (!item.permission) return true;
  const permissions = Array.isArray(item.permission) ? item.permission : [item.permission];
  return permissions.some((permission) => can(user, permission));
}

export const MENU_ITEMS: MenuItem[] = [
  {
    title: "Pengguna",
    description: "Akun pengguna & role",
    href: "/users",
    icon: UsersIcon,
    keywords: ["user", "akun", "role", "admin"],
    permission: "user:view",
  },
  {
    title: "Audit Log",
    description: "Riwayat perubahan data",
    href: "/audit",
    icon: FileClockIcon,
    keywords: ["riwayat", "log", "jejak"],
    permission: "audit:view",
  },
  {
    title: "Error Log",
    description: "Error server & browser",
    href: "/error-logs",
    icon: BugIcon,
    keywords: ["error", "bug", "masalah", "kesalahan"],
    permission: "error-log:view",
  },
];

// Label tiap segmen URL untuk breadcrumb (page-breadcrumb.tsx). Segmen yang
// tidak terdaftar di sini (id atau kode dinamis seperti /users/<id>) tampil
// sebagai "Detail".
export const SEGMENT_LABELS: Record<string, string> = {
  users: "Pengguna",
  new: "Tambah",
  audit: "Audit Log",
  "error-logs": "Error Log",
  notifications: "Notifikasi",
  profile: "Profil",
};

export const DYNAMIC_SEGMENT_LABEL = "Detail";
