// Pilihan jam (TimeColumns) untuk TimePicker: dua kolom yang bisa digulir, jam 00-23 dan menit
// 00-59 (kelipatan `minuteStep`). Nilai teks "HH:MM" (24 jam), sama dengan <input type="time">.
// Memilih jam mengisi menit "00" bila belum ada; memilih menit menyelesaikan pilihan.

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));

function Column({
  label,
  items,
  selected,
  onPick,
}: {
  label: string;
  items: string[];
  selected: string | null;
  onPick: (item: string) => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Item terpilih digulir ke tengah saat kolom tampil.
  React.useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (list && item) list.scrollTop = item.offsetTop - (list.clientHeight - item.clientHeight) / 2;
  }, []);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-center text-xs text-muted-foreground">{label}</span>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        className="relative flex max-h-52 flex-col gap-0.5 overflow-y-auto"
      >
        {items.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === selected}
            onClick={() => onPick(item)}
            className={cn(
              "h-8 shrink-0 rounded-md text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item === selected ? "bg-brand text-brand-foreground" : "hover:bg-muted",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimeColumns({
  value,
  onChange,
  onDone,
  minuteStep = 1,
  className,
}: {
  value: string | null; // "08:30"
  onChange: (time: string) => void;
  onDone: () => void; // menit dipilih
  minuteStep?: number;
  className?: string;
}) {
  const [hour, minute] = value ? value.split(":") : [null, null];
  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, index) => String(index * minuteStep).padStart(2, "0")),
    [minuteStep],
  );

  return (
    <div className={cn("flex gap-2", className)}>
      <Column label="Jam" items={HOURS} selected={hour} onPick={(next) => onChange(`${next}:${minute ?? "00"}`)} />
      <Column
        label="Menit"
        items={minutes}
        selected={minute}
        onPick={(next) => {
          onChange(`${hour ?? "00"}:${next}`);
          onDone();
        }}
      />
    </div>
  );
}
