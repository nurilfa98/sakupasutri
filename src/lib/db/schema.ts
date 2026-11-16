// Schema Drizzle = sumber kebenaran struktur database. Dari file ini
// drizzle-kit membuat file migration di database/migrations (pnpm db:generate),
// dan Drizzle memberi tipe otomatis untuk setiap query.
//
// Aturan penamaan tabel, kolom, index, dan soft delete: docs/CONVENTIONS.md.
// Ringkasnya:
// - Tabel snake_case jamak; kolom snake_case di DB, camelCase di Drizzle.
// - Foreign key = <nama_tabel_tunggal>_id (user_id). Kolom pelaku standar
//   created_by / updated_by / deleted_by (tanpa _id) berisi id user.
// - Index idx_<tabel>_<kolom>, unique uq_<tabel>_<kolom>, check ck_<tabel>_<nama>.
// - Tabel bisnis memakai auditColumns() (termasuk soft delete deleted_at).
//
// Catatan: file ini dibaca drizzle-kit di luar Next.js, jadi JANGAN memakai
// alias "@/" di sini (pakai import relatif).
//
// Referensi:
// - https://orm.drizzle.team/docs/sql-schema-declaration
// - https://orm.drizzle.team/docs/indexes-constraints

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { ROLES } from "../auth/roles";

// ---------------------------------------------------------------------------
// Helper kolom
// ---------------------------------------------------------------------------

// Kolom id bertipe VARCHAR(36) berisi UUID. UUID dibuat di sisi aplikasi
// dengan crypto.randomUUID() yang sudah tersedia di Node.js.
const id = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// Semua waktu memakai "timestamp with time zone". TIMESTAMP biasa tidak
// menyimpan zona waktu, sehingga jam 09:00 WIB dan 09:00 WITA terbaca sama.
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

const createdAt = () => timestamptz("created_at").notNull().defaultNow();

// Referensi ke users.id. Memakai AnyPgColumn agar tabel users boleh merujuk
// dirinya sendiri (created_by dst) tanpa error tipe sirkular.
const userRef = (name: string) => varchar(name, { length: 36 }).references((): AnyPgColumn => users.id);

// Kolom standar SEMUA tabel bisnis (docs/CONVENTIONS.md, bagian "Kolom standar").
// Tabel log/sesi/notifikasi tidak memakainya (lihat "Tabel tanpa soft delete").
const auditColumns = () => ({
  createdAt: createdAt(),
  // DEFAULT di SQL hanya terisi saat INSERT. $onUpdate membuat Drizzle
  // mengisi ulang kolom ini di setiap UPDATE.
  updatedAt: timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdBy: userRef("created_by"),
  updatedBy: userRef("updated_by"),
  // Soft delete: NULL = data aktif. Helper query ada di lib/db/soft-delete.ts.
  deletedAt: timestamptz("deleted_at"),
  deletedBy: userRef("deleted_by"),
});

// ---------------------------------------------------------------------------
// Pengguna & sesi
// ---------------------------------------------------------------------------

// Satu user = satu role (kolom role, tanpa tabel roles). Daftar role ada di
// lib/auth/roles.ts; CHECK constraint di bawah dibuat dari daftar yang sama.
export const users = pgTable(
  "users",
  {
    id: id(),
    fullName: varchar("full_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("USER"),
    // false = dinonaktifkan sementara (tidak bisa login, data tetap tampil).
    // BEDA dengan deleted_at (dihapus). Jangan dicampur.
    isActive: boolean("is_active").notNull().default(true),
    // true = password masih sementara (baru dibuat/di-reset admin), user wajib
    // menggantinya sebelum bisa memakai aplikasi.
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    // Disimpan juga di cookie session. Setiap password diganti/di-reset, angka
    // ini dinaikkan sehingga semua session lama (di HP/laptop lain) tidak
    // berlaku lagi. Lihat lib/auth/dal.ts.
    sessionVersion: integer("session_version").notNull().default(0),
    ...auditColumns(),
  },
  (t) => [
    // Partial unique: email milik user yang sudah dihapus boleh dipakai lagi.
    uniqueIndex("uq_users_email")
      .on(t.email)
      .where(sql`${t.deletedAt} IS NULL`),
    // Hanya boleh ada SATU akun Developer aktif. Dijaga di database (bukan hanya
    // di skrip) supaya tidak bisa terbentuk dua akun lewat jalur mana pun.
    uniqueIndex("uq_users_role_developer")
      .on(t.role)
      .where(sql`${t.role} = 'DEVELOPER' AND ${t.deletedAt} IS NULL`),
    check("ck_users_role", sql.raw(`"role" IN (${ROLES.map((role) => `'${role}'`).join(", ")})`)),
  ],
);

// Perangkat yang sedang login: SATU baris per login. `id` disimpan di cookie
// sesi; cookie hanya berlaku bila barisnya ada dan belum dicabut
// (lib/auth/dal.ts), sehingga satu perangkat bisa dikeluarkan tanpa menyentuh
// perangkat lain (session_version hanya untuk "semua perangkat", misal setelah
// ganti/reset password). Ditulis hanya saat login, logout, dan pencabutan,
// tidak di setiap request.
//
// device_id = ID acak browser (cookie tahan lama): login ulang dari browser
// yang sama bukan "perangkat baru". Baris kedaluwarsa dibersihkan berkala
// (hard delete, tanpa soft delete).
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 }).notNull(),
    // Hasil baca User-Agent, mis. "Chrome di Android".
    deviceLabel: varchar("device_label", { length: 120 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    // Perkiraan kota dari IP (header Vercel), mis. "Jakarta, Indonesia".
    location: varchar("location", { length: 100 }),
    createdAt: createdAt(),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
    // LOGOUT | REVOKED (dikeluarkan dari perangkat lain) | PASSWORD | REPLACED | LIMIT
    revokedReason: varchar("revoked_reason", { length: 20 }),
  },
  (t) => [
    index("idx_sessions_user_id_created_at").on(t.userId, t.createdAt),
    index("idx_sessions_expires_at").on(t.expiresAt),
  ],
);

// Catatan setiap percobaan login, dipakai untuk rate limiting. Dipisah dari
// audit_logs karena isinya banyak, bisa dari email yang tidak terdaftar, dan
// boleh dibersihkan berkala (misalnya data > 30 hari dihapus).
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    email: varchar("email", { length: 100 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  // Query rate limit selalu berbentuk "email/IP ini, sejak waktu X",
  // jadi index-nya gabungan (kolom pencarian, created_at).
  (t) => [
    index("idx_login_attempts_email_created_at").on(t.email, t.createdAt),
    index("idx_login_attempts_ip_address_created_at").on(t.ipAddress, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Log (append-only, tanpa soft delete)
// ---------------------------------------------------------------------------

// Jejak audit: siapa melakukan apa, terhadap data apa, kapan, dari mana.
// Baris di tabel ini tidak boleh diubah atau dihapus oleh aplikasi.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    // Pelaku. Null bila pelakunya belum login (misalnya percobaan login gagal).
    // Tanpa onDelete cascade: menghapus user tidak boleh ikut menghapus jejaknya.
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityName: varchar("entity_name", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }).notNull(),
    // jsonb (bukan json): disimpan biner sehingga bisa di-query dan di-index.
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: varchar("ip_address", { length: 45 }), // 45 = panjang maksimal IPv6
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_audit_logs_entity_name_entity_id").on(t.entityName, t.entityId),
    index("idx_audit_logs_user_id").on(t.userId),
    index("idx_audit_logs_created_at").on(t.createdAt),
  ],
);

// Catatan error aplikasi (server dan browser): apa yang gagal, di mana, siapa
// terdampak, dan versi aplikasinya. Satu baris = satu kejadian; kejadian sama
// dikelompokkan lewat `fingerprint`. Isinya tidak boleh memuat data sensitif
// (lib/error-log.ts membersihkannya).
//
// user_id sengaja TANPA foreign key: menghapus pengguna tidak boleh
// terhambat (atau menghapus) catatan error.
export const errorLogs = pgTable(
  "error_logs",
  {
    id: id(),
    createdAt: createdAt(),
    // Kode error Next.js (sama dengan yang tampil di halaman error).
    // Null untuk error yang tidak punya kode.
    digest: varchar("digest", { length: 100 }),
    // Hash nama + pesan (angka/UUID diseragamkan) + baris stack pertama.
    fingerprint: varchar("fingerprint", { length: 40 }).notNull(),
    // SERVER_ACTION | PAGE | ROUTE | CRON | CLIENT | EXTERNAL
    source: varchar("source", { length: 20 }).notNull(),
    errorName: varchar("error_name", { length: 100 }),
    message: varchar("message", { length: 1000 }).notNull(),
    stack: text("stack"),
    // Nama fungsi/route/cron yang gagal, misal "createUser".
    actionName: varchar("action_name", { length: 150 }),
    path: varchar("path", { length: 500 }), // tanpa query string
    method: varchar("method", { length: 10 }),
    appVersion: varchar("app_version", { length: 40 }), // hash commit deploy
    userId: varchar("user_id", { length: 36 }),
    role: varchar("role", { length: 20 }),
    userAgent: varchar("user_agent", { length: 200 }),
    // Info tambahan yang aman (id data, status HTTP, kode database).
    context: jsonb("context"),
    // NEW | RESOLVED | IGNORED, diatur admin per fingerprint.
    status: varchar("status", { length: 10 }).notNull().default("NEW"),
    resolvedAt: timestamptz("resolved_at"),
    // Admin yang menandai selesai/abaikan. Tanpa FK, sama alasannya dengan user_id.
    resolverUserId: varchar("resolver_user_id", { length: 36 }),
    note: varchar("note", { length: 500 }),
  },
  (t) => [
    check("ck_error_logs_status", sql`${t.status} IN ('NEW', 'RESOLVED', 'IGNORED')`),
    check("ck_error_logs_source", sql`${t.source} IN ('SERVER_ACTION', 'PAGE', 'ROUTE', 'CRON', 'CLIENT', 'EXTERNAL')`),
    index("idx_error_logs_created_at").on(t.createdAt),
    index("idx_error_logs_fingerprint_created_at").on(t.fingerprint, t.createdAt),
    index("idx_error_logs_digest").on(t.digest),
  ],
);

// ---------------------------------------------------------------------------
// Notifikasi
// ---------------------------------------------------------------------------

// Pemberitahuan di lonceng (features/notifications): kabar sekali lewat untuk
// satu pengguna. Hilang dari lonceng setelah dibuka (read_at diisi); baris
// lama dibersihkan berkala (hard delete, tanpa soft delete).
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Jenis kabar, nilai KAPITAL bebas per fitur, mis. USER_CREATED.
    kind: varchar("kind", { length: 30 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    body: varchar("body", { length: 300 }),
    // Halaman tujuan di dalam aplikasi, misal "/users/<id>".
    href: varchar("href", { length: 200 }).notNull(),
    createdAt: createdAt(),
    readAt: timestamptz("read_at"),
  },
  (t) => [index("idx_notifications_user_id_read_at_created_at").on(t.userId, t.readAt, t.createdAt)],
);
