// Halaman /notifications (lonceng di header): daftar notifikasi in-app milik
// user yang login, terbaru dulu. Yang belum dibaca diberi titik biru. Tiap
// baris bisa diklik: ditandai dibaca lalu membuka halaman tujuannya.
//
// Notifikasi hanya in-app (lihat features/notifications/service.ts); email dan
// WhatsApp dikirim terpisah oleh fitur pemanggil.
//
// Polanya sama dengan halaman lain: judul statis di luar <Suspense>, data
// (yang membaca sesi) di dalamnya.

import { ChevronRightIcon, CircleCheckBigIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DeleteReadButton,
  MarkAllReadButton,
  NotificationLink,
} from "@/features/notifications/components/notification-link";
import { NotificationIcon } from "@/features/notifications/components/notification-visuals";
import { listNotifications } from "@/features/notifications/queries";
import { verifySession } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifikasi" description="Kabar terbaru untuk Anda di dalam aplikasi." />
      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsContent />
      </Suspense>
    </>
  );
}

async function NotificationsContent() {
  const user = await verifySession();
  const items = await listNotifications(user.id);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card p-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CircleCheckBigIcon className="size-5" />
        </span>
        <p className="font-medium">Belum ada notifikasi</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Kabar terbaru akan muncul di sini, dan jumlah yang belum dibaca tampil di ikon lonceng di atas.
        </p>
      </div>
    );
  }

  const unreadCount = items.filter((item) => !item.isRead).length;
  const hasRead = items.length > unreadCount;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {unreadCount > 0 && <MarkAllReadButton />}
          {hasRead && <DeleteReadButton />}
        </div>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <NotificationLink
              id={item.id}
              href={item.href}
              isRead={item.isRead}
              className={cn(
                "flex h-full min-h-11 items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/50",
                item.isRead && "opacity-70",
              )}
            >
              <NotificationIcon kind={item.kind} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.body && <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
              </div>
              {!item.isRead && (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Belum dibaca" />
              )}
              <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </NotificationLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  );
}
