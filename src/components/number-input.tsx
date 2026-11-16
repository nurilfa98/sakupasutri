// Input angka global: satu komponen untuk semua isian angka di aplikasi (jumlah,
// harga, persen, dan sebagainya), menggantikan <input type="number"> bawaan
// browser yang tampilannya berbeda-beda dan tidak bisa menampilkan titik ribuan.
// Dipakai seperti Input:
//
//   <NumberInput name="quantity" defaultValue={1} min={1} max={99} required />
//   <NumberInput name="price" defaultValue={1500000} thousandSeparator min={0} />
//   <NumberInput name="discount" allowDecimal step={0.5} min={0} max={100} />
//   <NumberInput value={amount} onChange={setAmount} thousandSeparator />
//
// Cara kerjanya:
// - Yang tampak adalah <input type="text" inputMode="numeric|decimal"> (papan
//   angka di HP). Teksnya mengikuti format id-ID: titik sebagai pemisah ribuan
//   ("1.500.000") dan koma sebagai desimal ("12,5"). Pemisah ribuan hanya
//   tampil bila `thousandSeparator` aktif; bila tidak, titik yang diketik
//   dianggap koma desimal.
// - Nilai yang dikirim ke server lewat FormData/Server Action selalu angka
//   polos tanpa titik ribuan dan memakai titik sebagai desimal ("1500000",
//   "12.5"), dikirim lewat isian tersembunyi bernama `name`. Server tetap
//   memvalidasi ulang (zod), jadi min/max di sini hanya kemudahan untuk user.
// - `min`/`max` dipaksakan saat isian ditinggalkan (blur), bukan saat mengetik,
//   supaya user bisa mengetik "15" meski min-nya 10. Panah atas/bawah
//   menambah/mengurangi nilai sebesar `step` (bawaan 1).
// - Bilangan negatif hanya diizinkan bila `min` kosong atau di bawah 0.
// - `allowDecimal` (bawaan: mati) mengizinkan angka pecahan; tanpa itu hanya
//   bilangan bulat.
// - Tak terkendali (defaultValue) atau terkendali (value + onChange). onChange
//   menerima angka, atau null bila isian kosong.
// - Ikut kembali ke defaultValue saat form di-reset (useFormReset), seperti
//   DatePicker.
// - `required` dipasang di isian yang terlihat, sehingga peringatan bawaan
//   browser muncul tepat di kolom yang kosong.

"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { useFormReset } from "@/hooks/use-form-reset";
import { cn } from "@/lib/utils";

type NumberInputProps = {
  id?: string;
  // Nama isian yang dikirim form. Tanpa name, tidak ada yang dikirim.
  name?: string;
  // Terkendali: angka (atau teks angka polos seperti "1500000.5"); null/"" = kosong.
  value?: number | string | null;
  defaultValue?: number | string | null;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  thousandSeparator?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

// "Bentuk polos" (raw): "", "-", "123", "-123", "12.5", "12." (titik di akhir =
// user baru mengetik koma). Inilah yang disimpan di state dan dikirim ke server.

// Mengubah value/defaultValue dari pemanggil menjadi bentuk polos.
function rawOf(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value.trim();
  return /^-?\d+(\.\d*)?$/.test(text) ? text : "";
}

// Bentuk polos → angka; null bila belum membentuk angka ("", "-").
function numberOf(raw: string): number | null {
  if (raw === "" || raw === "-") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

// Teks yang diketik user (format id-ID atau campuran) → bentuk polos.
function toRaw(text: string, options: { allowDecimal: boolean; thousandSeparator: boolean; allowNegative: boolean }) {
  const negative = options.allowNegative && text.trim().startsWith("-");
  const body = text.replace(/[^\d.,]/g, "");

  let integer = body;
  let fraction: string | null = null;
  if (options.allowDecimal) {
    // Dengan pemisah ribuan, hanya koma yang berarti desimal (titik = ribuan).
    const marker = options.thousandSeparator ? body.indexOf(",") : body.search(/[.,]/);
    if (marker >= 0) {
      integer = body.slice(0, marker);
      fraction = body.slice(marker + 1).replace(/\D/g, "");
    }
  }

  integer = integer.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (fraction !== null && integer === "") integer = "0";
  if (integer === "" && fraction === null) return negative ? "-" : "";
  return `${negative ? "-" : ""}${integer}${fraction !== null ? `.${fraction}` : ""}`;
}

// Bentuk polos → teks tampilan id-ID.
function toDisplay(raw: string, thousandSeparator: boolean) {
  if (raw === "") return "";
  const negative = raw.startsWith("-");
  const [integer = "", fraction] = (negative ? raw.slice(1) : raw).split(".");
  const grouped = thousandSeparator ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : integer;
  return `${negative ? "-" : ""}${grouped}${fraction !== undefined ? `,${fraction}` : ""}`;
}

// Karakter "bermakna" di teks tampilan (angka, koma, minus); titik ribuan tidak.
const SIGNIFICANT = /[\d,-]/g;

// Posisi kursor di `display` setelah `count` karakter bermakna.
function caretAfter(display: string, count: number) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < display.length; index++) {
    if (/[\d,-]/.test(display[index])) seen++;
    if (seen === count) return index + 1;
  }
  return display.length;
}

export function NumberInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  step = 1,
  allowDecimal = false,
  thousandSeparator = false,
  placeholder,
  required,
  disabled,
  className,
  "aria-invalid": invalid,
}: NumberInputProps) {
  const [inner, setInner] = useState(() => rawOf(defaultValue));
  const inputRef = useRef<HTMLInputElement>(null);
  // Posisi kursor yang harus dipulihkan setelah teks diformat ulang.
  const caretRef = useRef<number | null>(null);

  // Terkendali: ikuti `value` dari pemanggil, tetapi pertahankan teks setengah
  // jadi seperti "12," selama angkanya masih sama dengan value.
  const controlled = value === undefined ? undefined : rawOf(value);
  const raw = controlled !== undefined && numberOf(controlled) !== numberOf(inner) ? controlled : inner;

  const allowNegative = min === undefined || min < 0;
  const display = toDisplay(raw, thousandSeparator);

  const commit = useCallback(
    (next: string) => {
      setInner(next);
      onChange?.(numberOf(next));
    },
    [onChange],
  );

  const reset = useCallback(() => setInner(rawOf(defaultValue)), [defaultValue]);
  useFormReset(inputRef, reset);

  // Setelah teks berubah karena pemformatan (titik ribuan bertambah/berkurang),
  // kursor dikembalikan ke tempat user mengetik, bukan loncat ke akhir.
  useLayoutEffect(() => {
    if (caretRef.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });

  function clamp(amount: number) {
    let result = amount;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    const caret = event.target.selectionStart ?? text.length;
    const next = toRaw(text, { allowDecimal, thousandSeparator, allowNegative });
    if (caret < text.length) {
      // Titik yang diketik dihitung sebagai koma hanya bila itu berfungsi sebagai desimal.
      const before = text
        .slice(0, caret)
        .replace(/\./g, allowDecimal && !thousandSeparator ? "," : "")
        .replace(/,/g, allowDecimal ? "," : "");
      const significantBefore = (before.match(SIGNIFICANT) ?? []).length;
      caretRef.current = caretAfter(toDisplay(next, thousandSeparator), significantBefore);
    }
    commit(next);
  }

  // Saat isian ditinggalkan: batasi ke min/max dan rapikan ("12," → "12").
  function handleBlur() {
    const current = numberOf(raw);
    if (current === null) {
      if (raw !== "") commit("");
      return;
    }
    const clamped = clamp(current);
    const next = clamped === current ? raw.replace(/\.$/, "") : String(clamped);
    if (next !== raw) commit(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? 1 : -1;
    const base = numberOf(raw) ?? clamp(0);
    // toFixed membuang sisa pecahan biner (0.1 + 0.2 = 0.30000000000000004).
    commit(String(clamp(Number((base + direction * step).toFixed(10)))));
  }

  // Nilai yang dikirim server: angka polos, tanpa titik ribuan.
  const submitValue = numberOf(raw) === null ? "" : raw.replace(/\.$/, "");

  return (
    <>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={invalid}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("tabular-nums", className)}
      />
      {name && !disabled && <input type="hidden" name={name} value={submitValue} />}
    </>
  );
}
