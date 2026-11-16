// GET /api/notifications/bell: data lonceng terbaru ({ count, items }) untuk
// user yang sedang login: jumlah notifikasi belum dibaca plus 3 teratas untuk
// pratinjau. Dipanggil lonceng di browser (interval dan saat pratinjau dibuka).
//
// Sengaja GET biasa, bukan Server Action: Server Action dari satu browser
// dijalankan antre satu per satu, sehingga polling lonceng bisa menunda klik
// tombol pengguna (Simpan, dst.). Hanya membaca; tidak mengubah data.
//
// Proxy (src/proxy.ts) hanya memeriksa ada-tidaknya cookie; pengecekan
// sebenarnya (user masih aktif, sesi belum dicabut) dilakukan di sini.

import { NextResponse } from "next/server";
import { getBellState } from "@/features/notifications/queries";
import { getCurrentUser } from "@/lib/auth/dal";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  const user = await getCurrentUser();
  // Belum selesai ganti password sementara: halaman lain pun belum bisa dibuka.
  if (!user || user.mustChangePassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }
  const state = await getBellState(user.id);
  return NextResponse.json(state, { headers: PRIVATE_HEADERS });
}
