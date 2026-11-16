// Logika bisnis pengguna yang dipakai lebih dari satu Server Action, dipisah
// dari actions.ts agar actions tetap berisi alur: validasi → otorisasi →
// simpan + audit. File ini tidak mengecek permission; pemanggil yang wajib.

import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { notDeleted } from "@/lib/db/soft-delete";

// Tipe `tx` di dalam db.transaction(async (tx) => ...)
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Apakah setelah `targetId` dihapus/dinonaktifkan/diturunkan rolenya masih ada
// pengelola aktif lain (ADMIN atau DEVELOPER)? Baris pengelola dikunci (FOR
// UPDATE) sampai transaksi selesai, sehingga dua pengelola yang saling menghapus
// bersamaan tidak bisa sama-sama lolos dan meninggalkan aplikasi tanpa pengelola.
export async function hasOtherActiveAdmin(tx: Transaction, targetId: string) {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.role, ["DEVELOPER", "ADMIN"]), eq(users.isActive, true), notDeleted(users)))
    .for("update");
  return admins.some((admin) => admin.id !== targetId);
}
