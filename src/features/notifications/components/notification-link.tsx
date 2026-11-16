// Bagian interaktif halaman /notifications:
// - NotificationLink  : baris notifikasi; diklik = menandai sudah dibaca
//                       sambil pindah ke halaman tujuannya.
// - MarkAllReadButton : tombol "Tandai semua dibaca".
// - DeleteReadButton  : tombol "Hapus yang sudah dibaca".

"use client";

import { CheckCheckIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { deleteReadNotificationsAction, markAllNotificationsRead, markNotificationRead } from "../actions";

export function NotificationLink({
  id,
  href,
  isRead,
  className,
  children,
}: {
  id: string;
  href: string;
  isRead: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (!isRead) void markNotificationRead(id).catch(() => undefined);
      }}
    >
      {children}
    </Link>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="max-sm:h-11"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
          router.refresh();
        })
      }
    >
      <CheckCheckIcon />
      Tandai semua dibaca
    </Button>
  );
}

export function DeleteReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="max-sm:h-11"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteReadNotificationsAction();
          router.refresh();
        })
      }
    >
      <Trash2Icon />
      Hapus yang sudah dibaca
    </Button>
  );
}
