// Lonceng notifikasi di header: angka = jumlah notifikasi yang belum dibaca.
// Klik membuka pratinjau 3 notifikasi belum dibaca teratas dengan tautan ke
// halaman /notifications untuk melihat semuanya.
//
// Notifikasi di sini hanya in-app (lihat service.ts); email/WhatsApp tidak
// lewat komponen ini.
//
// - NotificationBell      : Server Component, menghitung angka awal. Membaca
//                           sesi (cookie), jadi layout membungkusnya <Suspense>
//                           dengan NotificationBellSkeleton sebagai fallback.
// - NotificationBellLive  : memperbarui angka di browser tiap 120 detik selama
//                           tab terlihat (GET /api/notifications/bell); layout
//                           tidak dirender ulang saat pindah halaman.
// - BellButton            : tampilan tombol saja (bell-button.tsx).

import { verifySession } from "@/lib/auth/dal";
import { getBellState } from "../queries";
import { BellButton } from "./bell-button";
import { NotificationBellLive } from "./notification-bell-live";

export async function NotificationBell() {
  const user = await verifySession();
  const initial = await getBellState(user.id);
  return <NotificationBellLive initial={initial} />;
}

// Tampilan sementara selagi angka dihitung.
export function NotificationBellSkeleton() {
  return <BellButton count={0} />;
}
