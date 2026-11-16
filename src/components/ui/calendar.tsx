// Kalender tanggal (Calendar) dan pemilih bulan (MonthCalendar) untuk DatePicker / MonthPicker.
// Tanpa pustaka tambahan. Tanggal selalu teks "YYYY-MM-DD", bulan "YYYY-MM" (sama dengan
// <input type="date"/"month"> dan kolom date PostgreSQL), sehingga bisa dibandingkan sebagai teks.
// Hari pertama pekan: Senin. Batas min/max (teks yang sama) membuat hari/bulan di luarnya nonaktif.
//
// Papan tombol: panah kiri/kanan/atas/bawah, Home/End, PageUp/PageDown pindah bulan.

"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const pad = (value: number) => String(value).padStart(2, "0");
export const toIsoDate = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
export const toIsoMonth = (year: number, month: number) => `${year}-${pad(month)}`;

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));
const daysInMonth = (year: number, month: number) => utc(year, month + 1, 0).getUTCDate();
// 0 = Senin ... 6 = Minggu
const weekdayOf = (year: number, month: number, day: number) => (utc(year, month, day).getUTCDay() + 6) % 7;

function addDays(value: string, days: number) {
  const { year, month, day } = parseDate(value);
  const next = utc(year, month, day + days);
  return toIsoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function addMonths(year: number, month: number, months: number) {
  const next = utc(year, month + months, 1);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

// "7 Nov 2026" dan "November 2026" (format tampil di tombol pemilih).
export function formatPickedDate(value: string) {
  const { year, month, day } = parseDate(value);
  return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
}
export function formatPickedMonth(value: string) {
  const { year, month } = parseDate(`${value}-01`);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Tanggal hari ini menurut jam perangkat; hanya dipanggil saat kalender dibuka (di browser).
function browserToday() {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const navButtonClass = "size-7";

// ---------------------------------------------------------------------------
// Pemilih bulan: 12 bulan dalam satu tahun, panah untuk pindah tahun
// ---------------------------------------------------------------------------

export function MonthCalendar({
  value,
  onSelect,
  min,
  max,
  initialYear,
  className,
}: {
  value: string | null; // "2026-11"
  onSelect: (month: string) => void;
  min?: string; // "2026-01"
  max?: string;
  initialYear?: number;
  className?: string;
}) {
  const [today] = React.useState(() => browserToday().slice(0, 7));
  const [year, setYear] = React.useState(() => initialYear ?? Number((value ?? today).slice(0, 4)));
  const minYear = min ? Number(min.slice(0, 4)) : null;
  const maxYear = max ? Number(max.slice(0, 4)) : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={navButtonClass}
          aria-label="Tahun sebelumnya"
          disabled={minYear !== null && year <= minYear}
          onClick={() => setYear(year - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="text-sm font-medium tabular-nums">{year}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={navButtonClass}
          aria-label="Tahun berikutnya"
          disabled={maxYear !== null && year >= maxYear}
          onClick={() => setYear(year + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_SHORT.map((label, index) => {
          const iso = toIsoMonth(year, index + 1);
          const disabled = (min !== undefined && iso < min) || (max !== undefined && iso > max);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${MONTH_NAMES[index]} ${year}`}
              onClick={() => onSelect(iso)}
              className={cn(
                "h-9 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
                selected
                  ? "bg-brand text-brand-foreground"
                  : "hover:bg-muted " + (iso === today ? "font-semibold text-brand" : ""),
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kalender hari. Klik judul bulan membuka pemilih bulan/tahun.
// ---------------------------------------------------------------------------

export function Calendar({
  value,
  onSelect,
  min,
  max,
  className,
}: {
  value: string | null; // "2026-11-07"
  onSelect: (date: string) => void;
  min?: string; // "2026-11-01"
  max?: string;
  className?: string;
}) {
  const [today] = React.useState(browserToday);
  const start = React.useMemo(() => {
    // Mulai di bulan tanggal terpilih; bila belum ada, bulan ini yang ditarik masuk ke min/max.
    let base = value ?? today;
    if (!value && min && base < min) base = min;
    if (!value && max && base > max) base = max;
    return parseDate(base);
  }, [value, today, min, max]);
  const [view, setView] = React.useState({ year: start.year, month: start.month });
  const [picking, setPicking] = React.useState(false);
  const [focusIso, setFocusIso] = React.useState<string | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const moveFocus = React.useRef(false);

  // Fokus pindah ke hari yang dituju papan tombol setelah bulannya tampil.
  React.useEffect(() => {
    if (!moveFocus.current || !focusIso) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-iso="${focusIso}"]`)?.focus();
  }, [focusIso, view]);

  const { year, month } = view;
  const blanks = weekdayOf(year, month, 1);
  const total = daysInMonth(year, month);
  const monthStart = toIsoDate(year, month, 1);
  const monthEnd = toIsoDate(year, month, total);
  const prevDisabled = min !== undefined && monthStart <= min;
  const nextDisabled = max !== undefined && monthEnd >= max;
  const isOut = (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max);
  // Hari yang bisa difokus dengan Tab: terpilih, atau hari ini, atau tanggal 1 bulan itu.
  const tabIso =
    focusIso && focusIso.startsWith(toIsoMonth(year, month))
      ? focusIso
      : value && value.startsWith(toIsoMonth(year, month))
        ? value
        : today.startsWith(toIsoMonth(year, month))
          ? today
          : monthStart;

  function go(delta: number) {
    setView(addMonths(year, month, delta));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = (event.target as HTMLElement).dataset.iso;
    if (!current) return;
    let next: string | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(current, -1);
        break;
      case "ArrowRight":
        next = addDays(current, 1);
        break;
      case "ArrowUp":
        next = addDays(current, -7);
        break;
      case "ArrowDown":
        next = addDays(current, 7);
        break;
      case "Home":
        next = toIsoDate(parseDate(current).year, parseDate(current).month, 1);
        break;
      case "End":
        next = toIsoDate(
          parseDate(current).year,
          parseDate(current).month,
          daysInMonth(parseDate(current).year, parseDate(current).month),
        );
        break;
      case "PageUp":
      case "PageDown": {
        const { year: y, month: m, day: d } = parseDate(current);
        const target = addMonths(y, m, event.key === "PageUp" ? -1 : 1);
        next = toIsoDate(target.year, target.month, Math.min(d, daysInMonth(target.year, target.month)));
        break;
      }
      default:
        return;
    }
    event.preventDefault();
    if (isOut(next)) return;
    moveFocus.current = true;
    const parsed = parseDate(next);
    setView({ year: parsed.year, month: parsed.month });
    setFocusIso(next);
  }

  if (picking) {
    return (
      <MonthCalendar
        className={className}
        value={toIsoMonth(year, month)}
        initialYear={year}
        min={min?.slice(0, 7)}
        max={max?.slice(0, 7)}
        onSelect={(picked) => {
          const [y, m] = picked.split("-").map(Number);
          setView({ year: y, month: m });
          setPicking(false);
        }}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={navButtonClass}
          aria-label="Bulan sebelumnya"
          disabled={prevDisabled}
          onClick={() => go(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Pilih bulan dan tahun"
          className="rounded-md px-2 py-1 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {MONTH_NAMES[month - 1]} {year}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={navButtonClass}
          aria-label="Bulan berikutnya"
          disabled={nextDisabled}
          onClick={() => go(1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div ref={gridRef} role="grid" onKeyDown={onKeyDown} className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: blanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: total }, (_, index) => {
          const day = index + 1;
          const iso = toIsoDate(year, month, day);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              disabled={isOut(iso)}
              tabIndex={iso === tabIso ? 0 : -1}
              aria-pressed={selected}
              aria-label={formatPickedDate(iso)}
              aria-current={iso === today ? "date" : undefined}
              onClick={() => onSelect(iso)}
              className={cn(
                "mx-auto flex size-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35",
                selected
                  ? "bg-brand text-brand-foreground"
                  : "hover:bg-muted " + (iso === today ? "font-semibold text-brand ring-1 ring-brand/40" : ""),
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
