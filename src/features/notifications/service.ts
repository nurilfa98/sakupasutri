// Layanan notifikasi in-app: membuat, menandai dibaca, dan membersihkan baris
// di tabel `notifications`.
//
// PENTING: notifikasi di sini HANYA in-app (tampil di lonceng header dan
// halaman /notifications). Fitur ini TIDAK mengirim email atau WhatsApp.
// Kalau sebuah peristiwa juga perlu dikabarkan lewat email/WhatsApp, fitur
// pemanggil memanggil lib/email.ts / lib/whatsapp.ts SECARA TERPISAH, di
// samping createNotification().
//
// Contoh pemakaian dari Server Action fitur lain:
//
//     await createNotification({
//       userId: targetUser.id,
//       kind: "USER_CREATED",
//       title: "Akun Anda dibuat",
//       body: "Silakan ganti password sementara Anda.",
//       href: "/profile",
//     });

import "server-only";
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { logError } from "@/lib/error-log";

// Tipe `tx` di dalam db.transaction(async (tx) => ...)
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NewNotification = {
  // Penerima kabar.
  userId: string;
  // Jenis kabar, nilai KAPITAL bebas per fitur (maks. 30 karakter), misal
  // "USER_CREATED". Menentukan ikon di UI (lihat notification-visuals.tsx);
  // jenis yang belum terdaftar memakai ikon lonceng biasa.
  kind: string;
  title: string;
  body?: string | null;
  // Halaman tujuan di dalam aplikasi saat kabar diklik, misal "/users/<id>".
  href: string;
};

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

// Menyimpan satu notifikasi. Teks yang kepanjangan dipotong agar muat di kolom.
//
// - Tanpa `tx`: kegagalan menyimpan kabar TIDAK dilempar (hanya dicatat ke
//   Error Log), karena kabar yang gagal tidak boleh menggagalkan aksi utamanya.
// - Dengan `tx`: kabar ikut transaksi pemanggil, jadi kegagalannya dilempar
//   supaya seluruh transaksi di-rollback (transaksi PostgreSQL yang sudah
//   error memang tidak bisa dilanjutkan).
export async function createNotification(item: NewNotification, tx?: typeof db | Transaction) {
  const values = {
    userId: item.userId,
    kind: item.kind,
    title: cut(item.title, 120),
    body: item.body ? cut(item.body, 300) : null,
    href: item.href,
  };

  if (tx) {
    await tx.insert(notifications).values(values);
    return;
  }

  try {
    await db.insert(notifications).values(values);
  } catch (error) {
    await logError(error, { source: "SERVER_ACTION", action: "simpan notifikasi" });
  }
}

// Menandai satu notifikasi milik `userId` sebagai sudah dibaca. Syarat userId
// mencegah user menandai kabar milik orang lain.
export async function markRead(userId: string, id: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

// Menghapus (hard delete) semua notifikasi milik `userId` yang sudah dibaca.
export async function deleteReadNotifications(userId: string) {
  await db.delete(notifications).where(and(eq(notifications.userId, userId), isNotNull(notifications.readAt)));
}

// Retensi: yang sudah dibaca disimpan 14 hari, yang tidak pernah dibaca 60
// hari. Dipanggil cron harian app/api/cron/cleanup/route.ts.
const READ_RETENTION_DAYS = 14;
const UNREAD_RETENTION_DAYS = 60;

export async function purgeOldNotifications(now = new Date()) {
  const day = 24 * 60 * 60 * 1000;
  const read = await db
    .delete(notifications)
    .where(
      and(
        isNotNull(notifications.readAt),
        lt(notifications.readAt, new Date(now.getTime() - READ_RETENTION_DAYS * day)),
      ),
    )
    .returning({ id: notifications.id });
  const stale = await db
    .delete(notifications)
    .where(lt(notifications.createdAt, new Date(now.getTime() - UNREAD_RETENTION_DAYS * day)))
    .returning({ id: notifications.id });
  return { read: read.length, stale: stale.length };
}
