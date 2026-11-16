// Kotak menu di halaman / (tepat setelah login): kolom pencarian, lalu ikon
// menu yang boleh dibuka user.
//
// Client Component karena pencarian disaring langsung di browser saat
// mengetik. Komponen ini menerima `role` user dari server, bukan daftar menu,
// karena ikon lucide adalah fungsi yang tidak bisa dikirim dari Server
// Component ke Client Component. Menu yang tampil disaring dengan canSeeMenu()
// (nav-config.ts); kotak ikonnya setinggi minimal 44px agar mudah disentuh.
//
// Enter di kolom pencarian membuka menu pertama yang cocok.

"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import type { Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { canSeeMenu, MENU_ITEMS, type MenuItem } from "./nav-config";

function matches(item: MenuItem, query: string) {
  const text = [item.title, item.description, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

export function MenuLauncher({ role }: { role: Role }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Goyangan hanya saat halaman / baru dibuka. Begitu user mulai mencari, mati
  // dan tidak dinyalakan lagi sampai halaman ini dibuka ulang.
  const [shouldWiggle, setShouldWiggle] = useState(true);

  // Next.js menyembunyikan halaman yang ditinggalkan (Activity), bukan di-unmount,
  // sehingga state pencarian ikut tersimpan. Cleanup ini mengosongkan pencarian
  // saat halaman disembunyikan, jadi saat kembali ke / semua menu tampil lagi
  // dan goyangannya diputar ulang.
  useLayoutEffect(() => {
    return () => {
      setQuery("");
      setShouldWiggle(true);
    };
  }, []);

  const allowed = MENU_ITEMS.filter((item) => canSeeMenu({ role }, item));
  const visible = allowed.filter((item) => matches(item, query));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (visible[0]) router.push(visible[0].href);
  }

  return (
    <div className="flex flex-col gap-3">
      <form role="search" onSubmit={handleSubmit} className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Cari menu"
          placeholder="Cari menu, misalnya: pengguna"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShouldWiggle(false);
          }}
          className="h-11 pl-9 text-base md:text-sm"
        />
      </form>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Menu &quot;{query}&quot; tidak ditemukan.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {/* Jeda goyangan bertahap agar kartu terlihat berurutan saat halaman dibuka. */}
          {visible.map((item, index) => (
            <li key={item.href}>
              <Link
                href={item.href}
                style={{ animationDelay: `${index * 35}ms` }}
                className={cn(
                  shouldWiggle && "menu-wiggle",
                  "group flex h-full flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3 text-center transition-all duration-200 outline-none hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand/5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <item.icon className="size-5" />
                </span>
                <span className="text-xs leading-tight font-semibold break-words">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MenuLauncherSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-11 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-[88px] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
