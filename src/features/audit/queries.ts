// Query halaman Audit Log (permission audit:view).
//
// Setiap baris audit_logs menunjuk data yang terdampak lewat
// entity_name + entity_id. Query ini menyambungkannya ke tabel aslinya agar
// halaman bisa menampilkan nama pengguna, bukan UUID. Fitur baru yang
// mencatat audit menambahkan join-nya sendiri di sini (satu leftJoin per
// entity_name, lalu masuk ke coalesce entityLabel).
//
// Soft delete: join ke users untuk MENAMPILKAN nama pelaku/data sengaja tidak
// memakai notDeleted(users), karena log tetap harus terbaca setelah pengguna
// dihapus ("Dihapus oleh Budi" tidak boleh berubah jadi kosong).

import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { io } from "next/cache";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { AUDIT_PAGE_LIMIT, auditActionsOf } from "./constants";
import type { AuditFilters } from "./schemas";

const tz = env.APP_TIMEZONE;
const actor = alias(users, "actor");
const targetUser = alias(users, "target_user");

export type AuditLogRow = {
  id: string;
  action: string;
  createdAt: Date;
  ipAddress: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  entityName: string;
  entityId: string;
  entityLabel: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
};

// Awal tahun/bulan menurut zona waktu aplikasi, sebagai timestamptz.
function zonedStart(year: number, month: number, offset: SQL) {
  return sql`((make_timestamp(${year}, ${month}, 1, 0, 0, 0) + ${offset}) at time zone ${tz})`;
}

export async function listAuditLogs(filter: AuditFilters): Promise<AuditLogRow[]> {
  await io();
  const period = filter.year
    ? filter.month
      ? and(
          gte(auditLogs.createdAt, zonedStart(filter.year, filter.month, sql`interval '0'`)),
          lt(auditLogs.createdAt, zonedStart(filter.year, filter.month, sql`interval '1 month'`)),
        )
      : and(
          gte(auditLogs.createdAt, zonedStart(filter.year, 1, sql`interval '0'`)),
          lt(auditLogs.createdAt, zonedStart(filter.year, 1, sql`interval '1 year'`)),
        )
    : undefined;

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
      ipAddress: auditLogs.ipAddress,
      actorId: auditLogs.userId,
      actorName: actor.fullName,
      actorEmail: actor.email,
      entityName: auditLogs.entityName,
      entityId: auditLogs.entityId,
      // Entity baru: bungkus dengan sql`coalesce(${targetUser.fullName}, ${tabelBaru.name})`.
      entityLabel: targetUser.fullName,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
    })
    .from(auditLogs)
    .leftJoin(actor, eq(auditLogs.userId, actor.id))
    .leftJoin(targetUser, and(eq(auditLogs.entityName, "users"), eq(targetUser.id, auditLogs.entityId)))
    .where(
      and(
        period,
        filter.category ? inArray(auditLogs.action, auditActionsOf(filter.category)) : undefined,
        filter.actorId ? eq(auditLogs.userId, filter.actorId) : undefined,
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(AUDIT_PAGE_LIMIT);

  return rows.map((row) => ({
    ...row,
    oldValues: asRecord(row.oldValues),
    newValues: asRecord(row.newValues),
  }));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

// Rentang tahun yang punya catatan, untuk pilihan filter. Memakai min/max
// (dibantu index created_at) agar tidak memindai seluruh tabel.
export async function listAuditYears(): Promise<number[]> {
  await io();
  const [row] = await db
    .select({
      first: sql<number | null>`extract(year from min(${auditLogs.createdAt}) at time zone ${tz})::int`,
      last: sql<number | null>`extract(year from max(${auditLogs.createdAt}) at time zone ${tz})::int`,
    })
    .from(auditLogs);
  if (!row?.first || !row.last) return [];
  return Array.from({ length: row.last - row.first + 1 }, (_, index) => row.last! - index);
}

// Pengguna yang pernah tercatat sebagai pelaku, untuk filter "Pelaku". Hanya
// pelaku yang punya log (bukan semua pengguna) dan termasuk yang sudah dihapus,
// supaya aktivitas mereka tetap bisa disaring (lihat catatan soft delete di atas).
export async function listAuditActors(): Promise<{ id: string; fullName: string }[]> {
  await io();
  return db
    .selectDistinct({ id: users.id, fullName: users.fullName })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(asc(users.fullName));
}
