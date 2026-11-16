// Dropdown pilihan (OptionSelect): satu komponen bersama untuk semua dropdown di aplikasi,
// menggantikan <select> bawaan browser. Dibangun di atas shadcn Select (ui/select.tsx).
//
//   <OptionSelect id="loc" name="locationId" options={[{ value: "a", label: "Kantor" }]} required />
//
// - Nilai dikirim lewat `name` (FormData / Server Action tidak berubah).
// - Tak terkendali (defaultValue) atau terkendali (value + onValueChange).
// - Tanpa defaultValue/value, dropdown kosong dan menampilkan `placeholder`.
// - Ikut kembali ke defaultValue saat form di-reset.

"use client";

import { useCallback, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormReset } from "@/hooks/use-form-reset";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export function OptionSelect({
  options,
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Pilih",
  required,
  disabled,
  className,
  "aria-invalid": invalid,
}: {
  options: SelectOption[];
  id?: string;
  name?: string;
  value?: string; // terkendali
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = value ?? inner;

  const reset = useCallback(() => setInner(defaultValue), [defaultValue]);
  useFormReset(wrapRef, reset);

  return (
    <div ref={wrapRef} className="w-full">
      <Select
        name={name}
        items={options}
        value={current || null}
        required={required}
        disabled={disabled}
        onValueChange={(next) => {
          const text = (next as string | null) ?? "";
          setInner(text);
          onValueChange?.(text);
        }}
      >
        <SelectTrigger id={id} aria-invalid={invalid} className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
