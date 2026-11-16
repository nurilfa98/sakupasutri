// Tampilan tombol lonceng (ikon + angka), tanpa data: dipakai bagian klien yang
// menjadi pemicu pratinjau notifikasi, dan tampilan sementara (skeleton)
// selagi angka awal dihitung.
//
// Menerima props tombol biasa (onClick, aria-*, ref) supaya bisa dipakai
// sebagai pemicu Popover. Ukuran tombol (size-9 pada size "icon") ditambah
// area sentuh minimal 44px di layar HP.

import { BellIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BellButtonProps = Omit<ComponentProps<typeof Button>, "children"> & { count: number };

export function BellButton({ count, className, ...props }: BellButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative max-sm:size-11", className)}
      aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"}
      title="Notifikasi"
      {...props}
    >
      <BellIcon />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-none font-semibold text-brand-foreground tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
