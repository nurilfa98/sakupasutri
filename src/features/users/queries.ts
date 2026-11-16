// Query database untuk halaman Pengguna. Hasilnya berupa DTO tanpa
// password_hash, aman dikirim ke komponen.
//
// Pemanggil WAJIB sudah mengecek permission (requirePermission("user:view"))
// sebelum memakai fungsi di sini.
//
// Soft delete: SEMUA query ke users memakai notDeleted(users) (lib/db/soft-delete.ts).
// Satu-satunya pengecualian adalah daftar/detail "Terhapus" (opsi `deleted`),
// yang sengaja hanya membaca baris yang sudah dihapus.
//
// Kenapa setiap fungsi diawali `await io()`?
// Driver postgres.js memanggil Math.random() saat membuka koneksi. Saat
// prerender (dev & prefetch), hasil getCurrentUser() bisa sudah ada di cache
// sehingga query di sini ikut berjalan, lalu Next.js menolak Math.random()
// ("encountered the unstable value Math.random()"). io() menandai bahwa
// setelah baris ini ada operasi I/O: saat prerender ia berhenti (fallback
// <Suspense> yang tampil), saat request biasa langsung lanjut.
//
// Referensi:
// - https://orm.drizzle.team/docs/operators (eq, and, isNotNull)
// - node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md
// - node_modules/next/dist/docs/01-app/02-guides/data-security.md

import "server-only";
import { and, asc, desc, eq, isNotNull, ne, not, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { io } from "next/cache";
import { isRole, type Role } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { notDeleted } from "@/lib/db/soft-delete";
import type { UserStatus } from "./constants";
import type { UserFilters } from "./schemas";

export type UserListItem = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  // Hanya terisi untuk pengguna yang sudah dihapus (tab "Terhapus").
  deletedAt: Date | null;
  deletedByName: string | null;
};

export type UserDetail = UserListItem & {
  createdAt: Date;
};

// Pelaku penghapusan, untuk kolom "Dihapus oleh". Alias karena tabel users
// di-join ke dirinya sendiri.
const deleter = alias(users, "deleter");

const listColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  phoneNumber: users.phoneNumber,
  role: users.role,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  deletedAt: users.deletedAt,
  deletedByName: deleter.fullName,
  deletedByRole: deleter.role,
};

// Akun DEVELOPER bersifat privat: TIDAK ikut daftar maupun detail pengguna, untuk
// siapa pun (termasuk developer sendiri). Profil pribadi developer tetap bisa
// dibuka lewat getOwnProfile(). Nama penghapus yang developer juga disamarkan.
const hideDevelopers = ne(users.role, "DEVELOPER");

// Filter role, status, dan tab "Terhapus" dari URL (halaman /users). Pencarian
// nama/email berjalan di browser (components/data-table), jadi tidak di sini.
export async function listUsers(filters: UserFilters): Promise<UserListItem[]> {
  await io();

  const rows = await db
    .select(listColumns)
    .from(users)
    .leftJoin(deleter, eq(users.deletedBy, deleter.id))
    .where(
      and(
        filters.deleted ? isNotNull(users.deletedAt) : notDeleted(users),
        hideDevelopers,
        filters.role ? eq(users.role, filters.role) : undefined,
        // Status akun tidak bermakna untuk pengguna yang sudah dihapus.
        filters.status && !filters.deleted ? statusCondition(filters.status) : undefined,
      ),
    )
    .orderBy(filters.deleted ? desc(users.deletedAt) : asc(users.fullName));

  return rows.flatMap(toListItem);
}

// Satu pengguna. `deleted: true` mencari di antara pengguna yang sudah dihapus
// (dipakai halaman detail untuk menawarkan "Pulihkan").
export async function getUserDetail(id: string, options: { deleted?: boolean } = {}): Promise<UserDetail | null> {
  return findUserDetail(
    and(eq(users.id, id), hideDevelopers, options.deleted ? isNotNull(users.deletedAt) : notDeleted(users)),
  );
}

// Akun milik sendiri (halaman & action Profil). Boleh juga untuk akun developer.
export async function getOwnProfile(userId: string): Promise<UserDetail | null> {
  return findUserDetail(and(eq(users.id, userId), notDeleted(users)));
}

async function findUserDetail(where: SQL | undefined): Promise<UserDetail | null> {
  await io();
  const [row] = await db
    .select({ ...listColumns, createdAt: users.createdAt })
    .from(users)
    .leftJoin(deleter, eq(users.deletedBy, deleter.id))
    .where(where)
    .limit(1);

  const [item] = row ? toListItem(row) : [];
  return item && row ? { ...item, createdAt: row.createdAt } : null;
}

type ListRow = Omit<UserListItem, "role" | "deletedByName"> & {
  role: string;
  deletedByName: string | null;
  deletedByRole: string | null;
};

// Baris dengan role yang tidak dikenal (data rusak) dilewati, bukan error:
// CHECK constraint di database seharusnya mencegahnya. Nama penghapus yang
// berrole DEVELOPER disamarkan karena akun itu privat.
function toListItem(row: ListRow): UserListItem[] {
  if (!isRole(row.role)) return [];
  const hideDeleter = row.deletedByRole === "DEVELOPER";
  return [
    {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      phoneNumber: row.phoneNumber,
      role: row.role,
      isActive: row.isActive,
      mustChangePassword: row.mustChangePassword,
      deletedAt: row.deletedAt,
      deletedByName: hideDeleter ? null : row.deletedByName,
    },
  ];
}

// Sama dengan urutan StatusBadge (user-badges.tsx): nonaktif menang atas
// "menunggu login".
function statusCondition(status: UserStatus) {
  switch (status) {
    case "INACTIVE":
      return not(users.isActive);
    case "PENDING_LOGIN":
      return and(eq(users.isActive, true), eq(users.mustChangePassword, true));
    case "ACTIVE":
      return and(eq(users.isActive, true), eq(users.mustChangePassword, false));
  }
}
