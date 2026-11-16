// Skema validasi form pengguna (tambah, ubah, profil sendiri) dan filter daftar.
//
// Selain memvalidasi, skema juga MERAPIKAN data sebelum disimpan (trim, email
// huruf kecil, nomor HP ke format 62...), sehingga data di database selalu
// seragam.
//
// Referensi:
// - https://zod.dev/api#transforms
// - node_modules/next/dist/docs/01-app/02-guides/forms.md (bagian "Form validation")

import { z } from "zod";
import { ASSIGNABLE_ROLES, ROLES, type Role } from "@/lib/auth/roles";
import { normalizeIndonesianPhone } from "@/lib/phone";
import { USER_STATUS, type UserStatus } from "./constants";

const fullName = z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(100, "Email maksimal 100 karakter")
  .pipe(z.email("Format email tidak valid"));

// Kolom opsional: string kosong dari form disimpan sebagai NULL.
const phoneNumber = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const normalized = normalizeIndonesianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Nomor HP tidak valid. Contoh: 0812-3456-7890" });
      return z.NEVER;
    }
    return normalized;
  });

// DEVELOPER tidak termasuk: role itu hanya diberikan lewat terminal.
const role = z.enum(ASSIGNABLE_ROLES, "Pilih role");

// Tambah pengguna: password sementara dibuat sistem (tidak diisi di form).
export const createUserSchema = z.object({ fullName, email, phoneNumber, role });

// Ubah pengguna oleh pengelola (permission user:manage).
export const updateUserSchema = z.object({ fullName, email, phoneNumber, role });

// Profil sendiri: email & role TIDAK ikut, hanya pengelola yang boleh mengubahnya.
export const profileSchema = z.object({ fullName, phoneNumber });

// id user yang dikirim dari browser (event handler) juga wajib divalidasi.
export const userIdSchema = z.string().min(1).max(36);

// Filter daftar pengguna dari URL (/users?role=ADMIN&status=ACTIVE&deleted=1).
// Nilai yang tidak valid (diketik manual di URL) diabaikan, bukan error.
// deleted = true menampilkan pengguna yang sudah dihapus (soft delete).
export type UserFilters = { role?: Role; status?: UserStatus; deleted: boolean };

export function parseUserFilters(params: Record<string, string | string[] | undefined>): UserFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return {
    role: z.enum(ROLES).safeParse(first(params.role)).data,
    status: z.enum(USER_STATUS).safeParse(first(params.status)).data,
    deleted: first(params.deleted) === "1",
  };
}
