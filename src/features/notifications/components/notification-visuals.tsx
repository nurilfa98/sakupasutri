// Ikon notifikasi per `kind`, dipakai halaman /notifications dan pratinjau
// lonceng di header agar keduanya selalu tampil sama. Aman dipakai di Server
// maupun Client Component.
//
// Jenis (`kind`) yang belum terdaftar di KIND_VISUALS memakai ikon lonceng
// biasa, jadi fitur baru bebas membuat `kind` sendiri tanpa mengubah file ini.
// Daftarkan di sini hanya bila ingin ikon/warna khusus.

import { BellIcon, CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Visual = { icon: LucideIcon; tone: string };

const TONES = {
  brand: "bg-brand/10 text-brand",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const FALLBACK_VISUAL: Visual = { icon: BellIcon, tone: TONES.brand };

const KIND_VISUALS: Record<string, Visual> = {
  INFO: { icon: InfoIcon, tone: TONES.brand },
  SUCCESS: { icon: CircleCheckIcon, tone: TONES.success },
  WARNING: { icon: TriangleAlertIcon, tone: TONES.warning },
  ERROR: { icon: CircleAlertIcon, tone: TONES.danger },
};

export function NotificationIcon({ kind, className }: { kind: string; className?: string }) {
  const { icon: Icon, tone } = KIND_VISUALS[kind] ?? FALLBACK_VISUAL;
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone, className)}>
      <Icon className="size-5" />
    </span>
  );
}
