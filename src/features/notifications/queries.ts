// Query notifikasi in-app milik user yang sedang login. Pemanggil (page,
// layout, atau route handler) yang memastikan siapa user-nya lewat
// verifySession() / getCurrentUser(), lalu mengirim `userId` ke sini.
//
// Bentuk keluarannya DTO sederhana (waktu sudah berupa teks atau Date), aman
// dikirim ke Client Component maupun sebagai JSON.

import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { io } from "next/cache";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

// Jumlah notifikasi di halaman /notifications dan di pratinjau lonceng.
export const NOTIFICATION_PAGE_LIMIT = 50;
export const BELL_PREVIEW_LIMIT = 3;

export type NotificationDto = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string;
  createdAt: Date;
  isRead: boolean;
};

// Satu baris pratinjau di lonceng. `atLabel` = waktu yang sudah diformat di
// server (lib/dates.ts hanya boleh dipakai di server), dikirim sebagai JSON.
export type BellItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string;
  atLabel: string;
};

export type BellState = { count: number; items: BellItem[] };

// Daftar notifikasi (terbaru dulu), yang sudah dan belum dibaca.
export async function listNotifications(userId: string): Promise<NotificationDto[]> {
  // Cache Components: data ini dinamis.
  await io();
  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATION_PAGE_LIMIT);
  return rows.map(({ readAt, ...row }) => ({ ...row, isRead: readAt !== null }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  await io();
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.total ?? 0;
}

// Data lonceng: jumlah belum dibaca + 3 notifikasi belum dibaca terbaru.
// Dipakai Server Component lonceng (data awal) dan GET /api/notifications/bell
// (penyegaran di browser).
export async function getBellState(userId: string): Promise<BellState> {
  await io();
  const [unread, rows] = await Promise.all([
    countUnreadNotifications(userId),
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(BELL_PREVIEW_LIMIT),
  ]);
  return {
    count: unread,
    items: rows.map(({ createdAt, ...row }) => ({ ...row, atLabel: formatDateTime(createdAt) })),
  };
}
