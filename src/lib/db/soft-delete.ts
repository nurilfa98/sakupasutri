// Helper soft delete. Aturan lengkap ada di docs/CONVENTIONS.md (bagian "Soft delete").
//
// - Hapus  = isi deleted_at & deleted_by, baris TIDAK dibuang dari database.
// - Query  = SELALU tambahkan notDeleted(tabel) ke where, kecuali memang
//            sengaja menampilkan data terhapus (misal halaman "Terhapus").
// - Unique = constraint unik pada tabel soft delete dibuat PARTIAL
//            (`.where(sql`deleted_at IS NULL`)`) agar nilai yang sudah dihapus
//            (misal email) bisa dipakai lagi.
//
// Contoh:
//
//     const rows = await db.select().from(users).where(and(eq(users.role, "USER"), notDeleted(users)));
//     await db.update(users).set(softDeleteValues(actor.id)).where(eq(users.id, id));
//     await db.update(users).set(restoreValues()).where(eq(users.id, id));
//
// File ini tidak mengimpor `db`, jadi aman dipakai di mana saja.

import { isNull, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

// Syarat "belum dihapus" untuk tabel yang punya kolom deleted_at.
export function notDeleted(table: { deletedAt: PgColumn }): SQL {
  return isNull(table.deletedAt);
}

// Nilai untuk `.set(...)` saat menghapus. `deletedBy` = id user pelaku.
export function softDeleteValues(actorId: string) {
  return { deletedAt: new Date(), deletedBy: actorId };
}

// Nilai untuk `.set(...)` saat memulihkan data terhapus.
export function restoreValues() {
  return { deletedAt: null, deletedBy: null };
}
