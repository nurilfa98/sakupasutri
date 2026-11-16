// Server Action kelola pengguna. Fitur ini sekaligus CONTOH pola Server Action
// untuk fitur lain; urutannya selalu:
//
//   1. validasi input (zod)      → "Periksa kembali isian Anda."
//   2. autentikasi + otorisasi   → verifySession() + can(user, permission)
//   3. cek data target           → ada, belum dihapus, aturan bisnis
//   4. simpan + audit            → dalam satu transaksi (db.transaction)
//   5. revalidatePath            → daftar & detail dibaca ulang
//   6. kembalikan ActionResult   → sukses/gagal seragam untuk form di client
//
// Setiap action mengecek permission sendiri, walaupun halamannya sudah
// dilindungi requirePermission(): Server Action bisa dipanggil langsung lewat
// POST tanpa membuka halamannya.
//
// Aturan penting:
// - Menghapus = soft delete (deleted_at/deleted_by) dan bisa dipulihkan;
//   riwayat (audit log) tetap utuh. Menghapus juga mencabut semua sesi user.
// - Administrator tidak bisa menghapus/menonaktifkan akunnya sendiri, dan
//   aplikasi tidak boleh kehilangan administrator aktif terakhir.
// - createdBy/updatedBy/deletedBy diisi dari sesi login, bukan dari input browser.
//
// Referensi:
// - node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md
// - node_modules/next/dist/docs/01-app/02-guides/data-security.md
//   (bagian "Authentication and authorization")
// - node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md

"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { maskEmail } from "@/features/auth/device-info";
import { emailChangedEmail } from "@/features/auth/emails";
import { revokeOtherSessionsOf } from "@/features/auth/sessions";
import { logAudit } from "@/lib/audit";
import { verifySession } from "@/lib/auth/dal";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { can } from "@/lib/auth/permissions";
import { db, isUniqueViolation } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { notDeleted, restoreValues, softDeleteValues } from "@/lib/db/soft-delete";
import { sendEmail } from "@/lib/email";
import { getClientIp } from "@/lib/request";
import type { ActionResult } from "@/types/action-result";
import { credentialsEmail } from "./emails";
import { getOwnProfile, getUserDetail } from "./queries";
import { createUserSchema, profileSchema, updateUserSchema, userIdSchema } from "./schemas";
import { hasOtherActiveAdmin } from "./service";

const FORBIDDEN = { success: false, message: "Anda tidak memiliki akses." } as const;
const NOT_FOUND = { success: false, message: "Pengguna tidak ditemukan." } as const;
const LAST_ADMIN = {
  success: false,
  message: "Aplikasi harus memiliki minimal satu administrator aktif.",
} as const;
const EMAIL_TAKEN = {
  success: false as const,
  message: "Periksa kembali isian Anda.",
  fieldErrors: { email: ["Email sudah dipakai pengguna lain"] },
};

// ---------------------------------------------------------------------------
// Tambah pengguna
// ---------------------------------------------------------------------------

export type CreateUserResult = { id: string; email: string; emailSent: boolean };

// Admin cukup mengisi nama, email, dan role. Password sementara dibuat sistem
// dan HANYA dikirim ke email user.
export async function createUser(
  _prevState: ActionResult<CreateUserResult> | undefined,
  formData: FormData,
): Promise<ActionResult<CreateUserResult>> {
  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    role: formData.get("role"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const actor = await getUserManager();
  if (!actor) return FORBIDDEN;

  const data = parsed.data;
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const ip = await getClientIp();

  let userId: string;
  try {
    // Transaksi: user dan audit tersimpan bersamaan atau tidak sama sekali.
    userId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ ...data, passwordHash, mustChangePassword: true, createdBy: actor.id, updatedBy: actor.id })
        .returning({ id: users.id });

      await logAudit(
        {
          userId: actor.id,
          action: "USER_CREATED",
          entityName: "users",
          entityId: created.id,
          newValues: data,
          ipAddress: ip,
        },
        tx,
      );
      return created.id;
    });
  } catch (error) {
    // Email ganda ditolak oleh UNIQUE constraint di database, bukan dengan
    // "cek dulu baru insert", agar tetap aman walau dua orang submit bersamaan.
    if (isUniqueViolation(error)) return EMAIL_TAKEN;
    throw error;
  }

  // Email dikirim SETELAH transaksi berhasil. Kalau gagal, user tetap
  // tersimpan; admin bisa mengirim ulang lewat "Reset password".
  const emailSent = await sendEmail(credentialsEmail({ ...data, temporaryPassword, kind: "created" }));

  revalidateUsers();
  return { success: true, data: { id: userId, email: data.email, emailSent } };
}

// ---------------------------------------------------------------------------
// Ubah data & role
// ---------------------------------------------------------------------------

export async function updateUser(_prevState: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const userId = userIdSchema.safeParse(formData.get("userId"));
  if (!userId.success) return NOT_FOUND;

  const parsed = updateUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    role: formData.get("role"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const actor = await getUserManager();
  if (!actor) return FORBIDDEN;

  const before = await getUserDetail(userId.data);
  if (!before) return NOT_FOUND;
  // Akun sendiri diubah lewat menu Profil: role sendiri tidak boleh diturunkan.
  if (before.id === actor.id) {
    return { success: false, message: "Ubah data Anda sendiri lewat menu Profil." };
  }

  const data = parsed.data;
  const { oldValues, newValues } = diffValues(before, data);
  // Tidak ada yang berubah: tidak perlu menulis ke database maupun audit log.
  if (Object.keys(newValues).length === 0) return { success: true, data: undefined };

  const demotingAdmin = before.role === "ADMIN" && data.role !== "ADMIN";
  const ip = await getClientIp();
  let result: "OK" | "LAST_ADMIN" | "NOT_FOUND";
  try {
    result = await db.transaction(async (tx) => {
      if (demotingAdmin && !(await hasOtherActiveAdmin(tx, before.id))) return "LAST_ADMIN" as const;

      const [row] = await tx
        .update(users)
        .set({ ...data, updatedBy: actor.id })
        .where(and(eq(users.id, before.id), notDeleted(users)))
        .returning({ id: users.id });
      if (!row) return "NOT_FOUND" as const;

      // Email berubah: identitas akun berubah, semua perangkat dikeluarkan.
      if (data.email !== before.email) await revokeOtherSessionsOf(before.id, null, "REVOKED", tx);

      await logAudit(
        {
          userId: actor.id,
          action: "USER_UPDATED",
          entityName: "users",
          entityId: before.id,
          oldValues,
          newValues,
          ipAddress: ip,
        },
        tx,
      );
      return "OK" as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return EMAIL_TAKEN;
    throw error;
  }
  if (result === "LAST_ADMIN") return LAST_ADMIN;
  if (result === "NOT_FOUND") return NOT_FOUND;

  // Pemilik akun diberi tahu lewat email LAMA (inbox yang mungkin tidak
  // dikuasai pihak lain).
  if (data.email !== before.email) {
    after(() =>
      sendEmail(
        emailChangedEmail({
          to: before.email,
          fullName: before.fullName,
          oldEmail: before.email,
          newEmailMasked: maskEmail(data.email),
          // Akun Developer tidak boleh terlihat oleh pengguna lain, termasuk namanya di email.
          byName: actor.role === "DEVELOPER" ? "Administrator" : actor.fullName,
          when: new Date(),
        }),
      ),
    );
  }

  revalidateUsers();
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Profil sendiri (menu Profil)
// ---------------------------------------------------------------------------

// Pengguna mengubah datanya sendiri: nama dan nomor HP. Tidak butuh
// user:manage, dan hanya mengubah akun yang sedang login. Email dan role
// sengaja tidak bisa diubah di sini.
export async function updateOwnProfile(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phoneNumber: formData.get("phoneNumber") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);

  const actor = await verifySession();
  const before = await getOwnProfile(actor.id);
  if (!before) return NOT_FOUND;

  const profile = parsed.data;
  const { oldValues, newValues } = diffValues(before, profile);
  if (Object.keys(newValues).length === 0) return { success: true, data: undefined };

  const ip = await getClientIp();
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ ...profile, updatedBy: actor.id })
      .where(and(eq(users.id, actor.id), notDeleted(users)));
    await logAudit(
      {
        userId: actor.id,
        action: "USER_UPDATED",
        entityName: "users",
        entityId: actor.id,
        oldValues,
        newValues,
        ipAddress: ip,
      },
      tx,
    );
  });

  // Nama di header ikut berubah, jadi seluruh layout (app) dimuat ulang.
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Aktifkan / nonaktifkan
// ---------------------------------------------------------------------------

// Dipanggil dari event handler (bukan form), jadi argumennya bisa dikirim
// siapa saja dengan nilai apa saja. Keduanya divalidasi ulang dengan zod.
export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const input = z.object({ userId: userIdSchema, active: z.boolean() }).safeParse({ userId, active });
  if (!input.success) return NOT_FOUND;

  const actor = await getUserManager();
  if (!actor) return FORBIDDEN;

  if (input.data.userId === actor.id) {
    return { success: false, message: "Anda tidak bisa menonaktifkan akun sendiri." };
  }
  const target = await getUserDetail(input.data.userId);
  if (!target) return NOT_FOUND;

  // Cookie session user yang dinonaktifkan masih tersimpan di browsernya,
  // tapi getCurrentUser() di DAL mengecek is_active, jadi aksesnya berhenti
  // di request berikutnya. Sesinya juga dicabut agar daftar perangkat bersih.
  const { active: activate } = input.data;
  const ip = await getClientIp();
  const result = await db.transaction(async (tx) => {
    if (!activate && target.role === "ADMIN" && !(await hasOtherActiveAdmin(tx, target.id))) {
      return "LAST_ADMIN" as const;
    }
    const [row] = await tx
      .update(users)
      .set({ isActive: activate, updatedBy: actor.id })
      .where(and(eq(users.id, target.id), notDeleted(users)))
      .returning({ id: users.id });
    if (!row) return "NOT_FOUND" as const;

    if (!activate) await revokeOtherSessionsOf(target.id, null, "REVOKED", tx);

    await logAudit(
      {
        userId: actor.id,
        action: activate ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityName: "users",
        entityId: row.id,
        ipAddress: ip,
      },
      tx,
    );
    return "OK" as const;
  });
  if (result === "LAST_ADMIN") return LAST_ADMIN;
  if (result === "NOT_FOUND") return NOT_FOUND;

  revalidateUsers();
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Hapus (soft delete) & pulihkan
// ---------------------------------------------------------------------------

// Pengguna tidak dibuang dari database: deleted_at/deleted_by diisi, dan semua
// sesinya dicabut. Email-nya boleh dipakai lagi (unique index partial).
export async function deleteUser(userId: string): Promise<ActionResult> {
  const id = userIdSchema.safeParse(userId);
  if (!id.success) return NOT_FOUND;

  const actor = await getUserManager();
  if (!actor) return FORBIDDEN;

  if (id.data === actor.id) {
    return { success: false, message: "Anda tidak bisa menghapus akun sendiri." };
  }
  const target = await getUserDetail(id.data);
  if (!target) return NOT_FOUND;

  const ip = await getClientIp();
  const result = await db.transaction(async (tx) => {
    if (target.role === "ADMIN" && !(await hasOtherActiveAdmin(tx, target.id))) return "LAST_ADMIN" as const;

    const [row] = await tx
      .update(users)
      .set({ ...softDeleteValues(actor.id), updatedBy: actor.id })
      .where(and(eq(users.id, target.id), notDeleted(users)))
      .returning({ id: users.id });
    if (!row) return "NOT_FOUND" as const;

    await revokeOtherSessionsOf(target.id, null, "REVOKED", tx);
    await logAudit(
      {
        userId: actor.id,
        action: "USER_DELETED",
        entityName: "users",
        entityId: row.id,
        oldValues: { fullName: target.fullName, email: target.email, role: target.role },
        ipAddress: ip,
      },
      tx,
    );
    return "OK" as const;
  });
  if (result === "LAST_ADMIN") return LAST_ADMIN;
  if (result === "NOT_FOUND") return NOT_FOUND;

  revalidateUsers();
  return { success: true, data: undefined };
}

export async function restoreUser(userId: string): Promise<ActionResult> {
  const id = userIdSchema.safeParse(userId);
  if (!id.success) return NOT_FOUND;

  const actor = await getUserManager();
  if (!actor) return FORBIDDEN;

  const target = await getUserDetail(id.data, { deleted: true });
  if (!target) return NOT_FOUND;

  const ip = await getClientIp();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ ...restoreValues(), updatedBy: actor.id })
        .where(eq(users.id, target.id));
      await logAudit(
        {
          userId: actor.id,
          action: "USER_RESTORED",
          entityName: "users",
          entityId: target.id,
          newValues: { fullName: target.fullName, email: target.email, role: target.role },
          ipAddress: ip,
        },
        tx,
      );
    });
  } catch (error) {
    // Email-nya sudah dipakai pengguna lain sejak akun ini dihapus.
    if (isUniqueViolation(error)) {
      return { success: false, message: "Email akun ini sudah dipakai pengguna lain, tidak bisa dipulihkan." };
    }
    throw error;
  }

  revalidateUsers();
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

// Membuat password sementara baru, mengirimnya ke email user, dan
// mengeluarkan user dari semua perangkat (sessionVersion + 1).
export async function resetUserPassword(userId: string): Promise<ActionResult> {
  const id = userIdSchema.safeParse(userId);
  if (!id.success) return NOT_FOUND;

  const actor = await getUserManager();
  if (!actor) return FORBIDDEN;

  if (id.data === actor.id) {
    return { success: false, message: "Untuk akun sendiri, gunakan menu Ganti password." };
  }
  const target = await getUserDetail(id.data);
  if (!target) return NOT_FOUND;
  if (!target.isActive) {
    return { success: false, message: "Aktifkan akun ini terlebih dahulu sebelum me-reset password." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const ip = await getClientIp();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true,
        // Dinaikkan langsung di database (bukan dibaca lalu ditulis) agar
        // tetap benar bila ada dua reset bersamaan.
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedBy: actor.id,
      })
      .where(and(eq(users.id, target.id), notDeleted(users)));
    // Daftar "perangkat yang sedang login" ikut dibersihkan.
    await revokeOtherSessionsOf(target.id, null, "PASSWORD", tx);
    await logAudit(
      {
        userId: actor.id,
        action: "USER_PASSWORD_RESET",
        entityName: "users",
        entityId: target.id,
        ipAddress: ip,
      },
      tx,
    );
  });

  const emailSent = await sendEmail(
    credentialsEmail({
      fullName: target.fullName,
      email: target.email,
      temporaryPassword,
      kind: "reset",
    }),
  );

  revalidateUsers();
  if (!emailSent) {
    return { success: false, message: "Password di-reset, tetapi email gagal dikirim. Coba reset lagi." };
  }
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Helper (tanpa export → bukan Server Action, tidak bisa dipanggil dari browser)
// ---------------------------------------------------------------------------

async function getUserManager() {
  const user = await verifySession();
  return can(user, "user:manage") ? user : null;
}

// Audit hanya mencatat field yang benar-benar berubah.
function diffValues<T extends Record<string, unknown>>(before: Record<string, unknown>, next: T) {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    if (before[key] !== next[key]) {
      oldValues[key] = before[key];
      newValues[key] = next[key];
    }
  }
  return { oldValues, newValues };
}

function invalid(error: z.ZodError) {
  return {
    success: false as const,
    message: "Periksa kembali isian Anda.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

// Daftar & detail pengguna dibaca ulang dari database. "layout" mencakup
// /users, /users/new, dan /users/[id].
function revalidateUsers() {
  revalidatePath("/users", "layout");
}
