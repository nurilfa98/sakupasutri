// Tab "Pengguna" / "Terhapus" di atas daftar pengguna. Berupa link biasa
// (/users dan /users?deleted=1), jadi tab aktif ikut tersimpan di URL dan
// bisa dibuka lewat bookmark. Tanpa "use client".

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/users", label: "Pengguna", deleted: false },
  { href: "/users?deleted=1", label: "Terhapus", deleted: true },
];

export function UsersViewTabs({ deleted }: { deleted: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tampilan daftar pengguna">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.deleted === deleted ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
            tab.deleted === deleted ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
