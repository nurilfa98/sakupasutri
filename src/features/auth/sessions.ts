// Perangkat yang sedang login: satu baris sessions per login. Dipakai Server
// Action login/logout/ganti password, menu Profil (daftar & keluarkan
// perangkat), dan pembersih berkala (purgeOldSessions).
//
// Tidak ada pembatasan satu perangkat: pengguna boleh login di HP dan laptop
// sekaligus. Yang dijaga: pengguna melihat semua perangkatnya dan bisa
// mengeluarkan yang tidak dikenal; login dari perangkat baru memicu email.
//
// Ditulis hanya saat login, logout, dan pencabutan (bukan di setiap request)
// agar ringan di database.

import "server-only";
import { and, desc, eq, gt, inArray, isNull, lt, ne } from "drizzle-orm";
import { io } from "next/cache";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

// LOGOUT = keluar sendiri; REVOKED = dikeluarkan dari perangkat lain;
// PASSWORD = password diganti/di-reset; REPLACED = login ulang di browser yang
// sama; LIMIT = melewati batas perangkat aktif.
export type SessionRevokeReason = "LOGOUT" | "REVOKED" | "PASSWORD" | "REPLACED" | "LIMIT";

// Batas perangkat aktif per akun; yang paling lama otomatis dikeluarkan.
// Mencegah tabel membengkak dan membatasi akun yang dibagikan ke banyak orang.
export const MAX_ACTIVE_SESSIONS = 10;
const RETENTION_DAYS = 90;

export type OpenSessionInput = {
  userId: string;
  deviceId: string;
  deviceLabel: string;
  ipAddress: string | null;
  location: string | null;
  expiresAt: Date;
};

// Mencatat login baru. `isNewDevice` = akun ini sudah pernah login dari
// perangkat lain, tetapi belum dari browser ini → kirim email peringatan.
// Login pertama kali (belum ada riwayat) bukan "perangkat baru".
export async function openSession(input: OpenSessionInput) {
  const sessionId = crypto.randomUUID();
  const now = new Date();

  const isNewDevice = await db.transaction(async (tx) => {
    const known = await tx
      .selectDistinct({ deviceId: sessions.deviceId })
      .from(sessions)
      .where(eq(sessions.userId, input.userId));
    const isNew = known.length > 0 && !known.some((row) => row.deviceId === input.deviceId);

    // Login ulang dari browser yang sama menggantikan sesi lamanya (cookie
    // lama sudah tertimpa, barisnya tidak boleh jadi "hantu" di daftar).
    await tx
      .update(sessions)
      .set({ revokedAt: now, revokedReason: "REPLACED" })
      .where(and(eq(sessions.userId, input.userId), eq(sessions.deviceId, input.deviceId), isNull(sessions.revokedAt)));

    await tx.insert(sessions).values({ id: sessionId, ...input });

    const active = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, input.userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
      .orderBy(desc(sessions.createdAt));
    const surplus = active.slice(MAX_ACTIVE_SESSIONS).map((row) => row.id);
    if (surplus.length > 0) {
      await tx.update(sessions).set({ revokedAt: now, revokedReason: "LIMIT" }).where(inArray(sessions.id, surplus));
    }
    return isNew;
  });

  return { sessionId, isNewDevice };
}

// Mencabut satu sesi milik `userId` (bukan sesi orang lain). Mengembalikan
// label perangkatnya, atau null bila tidak ada / sudah dicabut.
export async function revokeSessionOf(
  userId: string,
  sessionId: string,
  reason: SessionRevokeReason,
  executor: Executor = db,
) {
  const [row] = await executor
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ deviceLabel: sessions.deviceLabel });
  return row?.deviceLabel ?? null;
}

// Sesi ini masih berlaku (ada, belum dicabut, belum kedaluwarsa)? Dipakai
// aksi yang tidak lewat DAL, mis. ganti password.
export async function isSessionActive(userId: string, sessionId: string) {
  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return !!row;
}

// Batas waktu baru untuk sesi yang cookie-nya dibuat ulang (ganti password).
export async function extendSession(sessionId: string, expiresAt: Date, executor: Executor = db) {
  await executor.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
}

// Semua sesi aktif `userId` selain `keepSessionId` (kosongkan = semua).
export async function revokeOtherSessionsOf(
  userId: string,
  keepSessionId: string | null,
  reason: SessionRevokeReason,
  executor: Executor = db,
) {
  const rows = await executor
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        keepSessionId ? ne(sessions.id, keepSessionId) : undefined,
      ),
    )
    .returning({ id: sessions.id });
  return rows.length;
}

// Perangkat aktif milik satu akun, terbaru dulu.
export async function listActiveSessions(userId: string) {
  await io();
  return db
    .select({
      id: sessions.id,
      deviceLabel: sessions.deviceLabel,
      ipAddress: sessions.ipAddress,
      location: sessions.location,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.createdAt));
}

// Dipanggil cron harian app/api/cron/cleanup/route.ts: sesi yang sudah kedaluwarsa lebih dari 90 hari
// dihapus (selama itu barisnya dipakai mengenali "perangkat yang sudah dikenal").
export async function purgeOldSessions(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.delete(sessions).where(lt(sessions.expiresAt, cutoff)).returning({ id: sessions.id });
  return rows.length;
}
