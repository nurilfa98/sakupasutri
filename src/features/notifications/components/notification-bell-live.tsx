// Bagian klien dari lonceng: angka + pratinjau notifikasi. Klik lonceng membuka
// kotak kecil berisi 3 notifikasi belum dibaca teratas dan tautan "Lihat semua
// notifikasi" ke halaman /notifications.
//
// Angka dan isi pratinjau diperbarui tanpa memuat ulang halaman. Layout tidak
// dirender ulang saat pindah halaman, jadi tanpa ini angkanya akan basi.
//
// Server hanya ditanya lewat interval REFRESH_MS selama tab terlihat (sengaja
// dibuat jarang agar ringan saat pengguna banyak) dan SAAT kotak pratinjau
// dibuka (agar isinya segar). Pindah halaman, kembali ke menu, dan kembali ke
// tab TIDAK memanggil server.

"use client";

import { ChevronRightIcon, CircleCheckBigIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationRead } from "../actions";
import type { BellItem, BellState } from "../queries";
import { BellButton } from "./bell-button";
import { NotificationIcon } from "./notification-visuals";

const REFRESH_MS = 120_000;

// GET biasa (bukan Server Action) agar tidak ikut antrean aksi pengguna.
async function fetchBellState(): Promise<BellState> {
  const response = await fetch("/api/notifications/bell", { cache: "no-store" });
  if (!response.ok) throw new Error("Lonceng gagal dimuat.");
  const data = (await response.json()) as Partial<BellState> | null;
  if (!data || typeof data.count !== "number" || !Array.isArray(data.items)) {
    throw new Error("Jawaban lonceng tidak dikenal.");
  }
  return { count: data.count, items: data.items };
}

export function NotificationBellLive({ initial }: { initial: BellState }) {
  // Hasil terbaru dari browser, berlaku selama data awal dari server belum berubah.
  const [fetched, setFetched] = useState<{ base: string; state: BellState } | null>(null);
  const [open, setOpen] = useState(false);
  const initialKey = `${initial.count}:${initial.items.map((item) => item.id).join(",")}`;
  const baseRef = useRef(initialKey);
  useEffect(() => {
    baseRef.current = initialKey;
  }, [initialKey]);

  const refresh = useCallback(
    () =>
      fetchBellState()
        .then((state) => setFetched({ base: baseRef.current, state }))
        .catch(() => undefined),
    [],
  );

  // Tab/aplikasi yang tersembunyi tidak perlu bertanya ke server (hemat baterai & kuota).
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const shown = fetched && fetched.base === initialKey ? fetched.state : initial;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Isi pratinjau disegarkan setiap kali dibuka; yang lama tetap tampil selagi menunggu.
        if (next) void refresh();
      }}
    >
      <PopoverTrigger render={<BellButton count={shown.count} />} />
      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-medium">Notifikasi</p>
          {shown.count > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{shown.count} belum dibaca</span>
          )}
        </div>

        {shown.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CircleCheckBigIcon className="size-5" />
            </span>
            <p className="text-sm font-medium">Tidak ada notifikasi baru</p>
            <p className="text-xs text-muted-foreground">Kabar terbaru untuk Anda akan muncul di sini.</p>
          </div>
        ) : (
          <ul className="flex flex-col py-1">
            {shown.items.map((item) => (
              <li key={item.id}>
                <PreviewRow item={item} onNavigate={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center justify-center gap-1 border-t px-4 py-3 text-sm font-medium text-brand transition-colors hover:bg-muted/50"
        >
          Lihat semua notifikasi
          <ChevronRightIcon className="size-4" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function PreviewRow({ item, onNavigate }: { item: BellItem; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-11 items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
      onClick={() => {
        // Dianggap dibaca begitu dibuka (sama dengan daftar di /notifications).
        void markNotificationRead(item.id).catch(() => undefined);
        onNavigate();
      }}
    >
      <NotificationIcon kind={item.kind} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
        {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">{item.atLabel}</p>
      </div>
    </Link>
  );
}
