// Query database khusus fitur auth.
//
// Kedua fungsi di sini mengembalikan password_hash, jadi hanya boleh dipanggil
// dari Server Action auth. Jangan pernah mengirim hasilnya ke komponen.
//
// Referensi: node_modules/next/dist/docs/01-app/02-guides/data-security.md
// (bagian "Data Access Layer")

import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { notDeleted } from "@/lib/db/soft-delete";

const credentialColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  passwordHash: users.passwordHash,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  sessionVersion: users.sessionVersion,
};

// User yang sudah dihapus (soft delete) tidak ditemukan, sehingga tidak bisa
// login. User nonaktif tetap ditemukan; status isActive dicek di Server Action
// setelah password terbukti benar.
export async function findUserForLogin(email: string) {
  const [user] = await db
    .select(credentialColumns)
    .from(users)
    .where(and(eq(users.email, email), notDeleted(users)))
    .limit(1);

  return user;
}

// Dipakai saat ganti password. Sengaja TIDAK lewat getCurrentUser() di DAL:
// hasil getCurrentUser() di-cache selama satu request, sehingga setelah
// password diganti, redirect di request yang sama masih membaca data lama
// (mustChangePassword: true) dan user terlempar balik ke /change-password.
export async function findUserCredentials(userId: string) {
  const [user] = await db
    .select(credentialColumns)
    .from(users)
    .where(and(eq(users.id, userId), notDeleted(users)))
    .limit(1);

  return user;
}
