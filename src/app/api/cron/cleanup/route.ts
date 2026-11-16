// GET /api/cron/cleanup: pembersihan data lama setiap hari, dipanggil
// penjadwal (bukan oleh user):
// - hapus notifikasi lonceng yang lewat masa simpan (features/notifications/service.ts)
// - hapus catatan error (error_logs) yang lewat masa simpan (features/error-logs/queries.ts)
// - hapus riwayat perangkat login yang sudah kedaluwarsa > 90 hari (features/auth/sessions.ts)
//
// Tugas baru proyek (hapus file lama, pengingat, dst.) ditambahkan ke daftar
// `tasks` di bawah. Satu tugas gagal tidak boleh menggagalkan tugas lain:
// error dicatat ke error_logs (sumber CRON) dan hasilnya `null`.
//
// Keamanan: wajib header `Authorization: Bearer <CRON_SECRET>`. Vercel Cron
// mengirim header ini otomatis bila env CRON_SECRET diisi (jadwal di
// vercel.json). Di hosting lain, pakai penjadwal apa pun (crontab,
// cron-job.org, dll) yang memanggil URL ini dengan header tersebut.
//
// Route ini dikecualikan dari cek login di proxy.ts (tidak ada cookie).
//
// Referensi:
// - https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
// - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeOldSessions } from "@/features/auth/sessions";
import { purgeOldErrorLogs } from "@/features/error-logs/queries";
import { purgeOldNotifications } from "@/features/notifications/service";
import { env } from "@/lib/env";
import { logError } from "@/lib/error-log";

// Nama tugas (muncul di error log bila gagal) dan fungsinya.
const TASKS = {
  "hapus notifikasi lama": purgeOldNotifications,
  "hapus catatan error lama": purgeOldErrorLogs,
  "hapus riwayat perangkat login": purgeOldSessions,
} as const;

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET belum diatur" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  for (const [action, task] of Object.entries(TASKS)) {
    results[action] = await task().catch(async (error: unknown) => {
      await logError(error, { source: "CRON", action });
      return null;
    });
  }

  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
}

// Perbandingan waktu-konstan agar secret tidak bisa ditebak dari lama respons.
function isAuthorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
