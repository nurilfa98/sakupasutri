// Pemilih tanggal (DatePicker), bulan (MonthPicker), dan jam (TimePicker): satu komponen bersama
// untuk semua isian tanggal/jam di aplikasi, menggantikan <input type="date"/"month"/"time"> bawaan browser (tampilannya
// beda-beda tiap browser/HP). Dipakai seperti Input:
//
//   <DatePicker id="x" name="date" defaultValue="2026-11-07" min="2026-11-01" required />
//   <MonthPicker name="period" defaultValue="2026-11" max="2026-12" />
//   <TimePicker name="start" defaultValue="09:00" required />
//
// - Nilai teks "YYYY-MM-DD" / "YYYY-MM" / "HH:MM" (sama dengan input bawaan), dikirim lewat isian
//   tersembunyi bernama `name`, jadi FormData dan Server Action tidak berubah.
// - Tak terkendali (defaultValue) atau terkendali (value + onValueChange).
// - Ikut kembali ke defaultValue saat form di-reset.
// - `clearable` (bawaan: bila tidak required) menampilkan tombol hapus untuk tanggal opsional.

"use client";

import { CalendarDaysIcon, ClockIcon, XIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Calendar, MonthCalendar, formatPickedDate, formatPickedMonth } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeColumns } from "@/components/ui/time-columns";
import { useFormReset } from "@/hooks/use-form-reset";
import { cn } from "@/lib/utils";

type PickerProps = {
  id?: string;
  name?: string;
  value?: string; // terkendali
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  minuteStep?: number; // hanya TimePicker; bawaan 1 menit
  className?: string;
  "aria-invalid"?: boolean;
};

const triggerClass =
  "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card pr-2.5 pl-2.5 text-left text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const PLACEHOLDERS = { date: "Pilih tanggal", month: "Pilih bulan", time: "Pilih jam" } as const;

function Picker({
  kind,
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  min,
  max,
  placeholder,
  required,
  disabled,
  clearable,
  minuteStep,
  className,
  "aria-invalid": invalid,
}: PickerProps & { kind: "date" | "month" | "time" }) {
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = value ?? inner;
  const canClear = (clearable ?? !required) && !!current && !disabled;

  const change = useCallback(
    (next: string) => {
      setInner(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  const reset = useCallback(() => setInner(defaultValue), [defaultValue]);
  useFormReset(wrapRef, reset);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(triggerClass, canClear && "pr-8")}
        >
          {kind === "time" ? (
            <ClockIcon className="size-4 text-muted-foreground" />
          ) : (
            <CalendarDaysIcon className="size-4 text-muted-foreground" />
          )}
          <span className={cn("flex-1 truncate", !current && "text-muted-foreground")}>
            {current
              ? kind === "date"
                ? formatPickedDate(current)
                : kind === "month"
                  ? formatPickedMonth(current)
                  : current
              : (placeholder ?? PLACEHOLDERS[kind])}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className={kind === "date" ? "w-72" : kind === "month" ? "w-60" : "w-48"}>
          {kind === "time" ? (
            <TimeColumns
              value={current || null}
              minuteStep={minuteStep}
              onChange={change}
              onDone={() => setOpen(false)}
            />
          ) : kind === "date" ? (
            <Calendar
              value={current || null}
              min={min}
              max={max}
              onSelect={(next) => {
                change(next);
                setOpen(false);
              }}
            />
          ) : (
            <MonthCalendar
              value={current || null}
              min={min}
              max={max}
              onSelect={(next) => {
                change(next);
                setOpen(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
      {canClear && (
        <button
          type="button"
          aria-label="Hapus pilihan"
          onClick={() => change("")}
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
      {/* Nilai yang dikirim form. Isian dibuat "ada" (bukan type=hidden) agar `required` memunculkan
          peringatan bawaan browser bila kosong; tidak terlihat dan tidak bisa diklik/difokus. */}
      {name && !disabled && (
        <input
          type="text"
          name={name}
          value={current}
          onChange={() => {}}
          autoComplete="off"
          required={required}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}
    </div>
  );
}

export function DatePicker(props: PickerProps) {
  return <Picker kind="date" {...props} />;
}

export function MonthPicker(props: PickerProps) {
  return <Picker kind="month" {...props} />;
}

export function TimePicker(props: PickerProps) {
  return <Picker kind="time" {...props} />;
}
