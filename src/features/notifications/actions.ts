// Server Action notifikasi: tandai dibaca (satu / semua) dan hapus yang sudah
// dibaca. Angka lonceng terbaru diambil lewat GET /api/notifications/bell,
// bukan Server Action, agar tidak mengantre di belakang aksi user lain.
//
// Setiap action memanggil verifySession() sendiri: action adalah endpoint
// publik, jadi tidak boleh mengandalkan pengecekan di layout/page.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/lib/auth/dal";
import type { ActionResult } from "@/types/action-result";
import { deleteReadNotifications, markAllRead, markRead } from "./service";

const idSchema = z.string().trim().min(1).max(36);

// Dipanggil saat kabar diklik; tidak memicu revalidate agar tidak
// bertabrakan dengan perpindahan halaman yang sedang berjalan.
export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await verifySession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, message: "Notifikasi tidak valid." };
  await markRead(user.id, parsed.data);
  return { success: true, data: undefined };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await verifySession();
  await markAllRead(user.id);
  revalidatePath("/notifications");
  return { success: true, data: undefined };
}

export async function deleteReadNotificationsAction(): Promise<ActionResult> {
  const user = await verifySession();
  await deleteReadNotifications(user.id);
  revalidatePath("/notifications");
  return { success: true, data: undefined };
}
