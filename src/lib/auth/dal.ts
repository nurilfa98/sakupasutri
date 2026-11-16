// DAL (Data Access Layer) untuk autentikasi & otorisasi.
//
// Ini SATU-SATUNYA tempat yang memutuskan "siapa user yang sedang login dan
// apa haknya". Semua page, query, dan Server Action yang butuh user wajib
// lewat sini, bukan membaca cookie sendiri-sendiri.
//
// - Autentikasi = memastikan siapa Anda       → verifySession()
// - Otorisasi   = memastikan Anda boleh apa   → requirePermission()
//   (daftar "role apa boleh apa" ada di lib/auth/permissions.ts)
//
// Referensi:
// - node_modules/next/dist/docs/01-app/02-guides/authentication.md
//   (bagian "Creating a Data Access Layer (DAL)" & "Using Data Transfer Objects (DTO)")
// - node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md
//   (bagian "Step 1: Read the current user")

import "server-only";
import { and, eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { notDeleted } from "@/lib/db/soft-delete";
import { can, type Permission } from "./permissions";
import { isRole, type Role } from "./roles";
import { getSession } from "./session";

// DTO (Data Transfer Object): hanya field yang aman & dibutuhkan UI.
// password_hash dan kolom internal lain TIDAK ikut.
export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};

// 'use cache: private' = cache khusus data milik satu user (membaca cookie).
//
// 1. Dalam satu request, layout, page, dan komponen lain yang memanggil
//    getCurrentUser() memakai hasil yang sama: query database cukup sekali.
// 2. Hasil render yang bergantung pada user ini boleh ikut di-PREFETCH dan
//    disimpan di memori browser user itu sendiri. Hasilnya, saat menu
//    diklik, konten halaman langsung tampil tanpa menunggu server.
//
// Hasilnya TIDAK disimpan di cache server (tidak bisa bocor ke user lain).
//
// cacheLife("minutes") → stale 5 menit: browser boleh memakai hasil prefetch
// paling lama 5 menit. Konsekuensinya, user yang dinonaktifkan masih bisa
// MELIHAT halaman yang sudah ter-prefetch paling lama 5 menit, tetapi tidak
// bisa mengubah data, karena setiap Server Action mengecek ulang ke server.
//
// Referensi:
// - node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md
// - node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md
// - node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md
export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";
  cacheLife("minutes");

  const { userId, sessionVersion, sessionId } = await getSession();
  if (!userId || !sessionId) return null;

  // Cookie session tetap valid sampai kedaluwarsa walau user sudah
  // dinonaktifkan atau dihapus. Karena itu status user selalu dicek ulang ke
  // database (is_active, deleted_at, session_version, dan baris sesi).
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      sessionVersion: users.sessionVersion,
      // Baris perangkat ini (tabel sessions); lewat join yang sama, jadi
      // tidak ada query tambahan.
      sessionRowId: sessions.id,
      sessionRevokedAt: sessions.revokedAt,
    })
    .from(users)
    .leftJoin(sessions, and(eq(sessions.id, sessionId), eq(sessions.userId, users.id)))
    .where(and(eq(users.id, userId), notDeleted(users)))
    .limit(1);

  if (!user || !user.isActive) return null;
  // Password sudah diganti/di-reset setelah cookie ini dibuat → login ulang.
  if (user.sessionVersion !== sessionVersion) return null;
  // Perangkat ini dikeluarkan (dari menu Profil / logout) atau barisnya hilang.
  if (!user.sessionRowId || user.sessionRevokedAt) return null;
  if (!isRole(user.role)) return null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

// Cookie masih ada tetapi sesinya tidak berlaku lagi (dikeluarkan dari
// perangkat lain, password diubah, akun dinonaktifkan): login ulang dengan
// pesan penjelasan. Tanpa cookie sama sekali: /login biasa.
async function loginUrl() {
  const { userId } = await getSession();
  return userId ? "/login?reason=ended" : "/login";
}

// Untuk halaman/aksi yang WAJIB login. redirect() bertipe `never`, jadi
// setelah baris itu TypeScript tahu `user` pasti ada.
//
// User yang masih memakai password sementara diarahkan ke /change-password.
// Karena semua page, layout, dan Server Action lewat fungsi ini, user tidak
// bisa membuka/menjalankan apa pun sebelum mengganti password. Halaman
// /change-password sendiri memakai getCurrentUser() agar tidak redirect loop.
export async function verifySession() {
  const user = await getCurrentUser();
  if (!user) redirect(await loginUrl());
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

// Untuk halaman yang hanya boleh dibuka user dengan permission tertentu.
// Contoh: await requirePermission("user:manage") di halaman tambah pengguna.
//
// Next.js punya forbidden() untuk menampilkan halaman 403, tapi masih
// eksperimental (butuh experimental.authInterrupts), jadi untuk sekarang
// user dikembalikan ke beranda.
//
// Di Server Action, sering lebih enak memakai can() lalu mengembalikan pesan
// error (ActionResult) daripada redirect:
//
//     const user = await verifySession();
//     if (!can(user, "user:manage")) return { success: false, message: "Akses ditolak." };
export async function requirePermission(permission: Permission) {
  const user = await verifySession();
  if (!can(user, permission)) redirect("/");
  return user;
}
