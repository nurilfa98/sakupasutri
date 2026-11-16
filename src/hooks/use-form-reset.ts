// Memanggil `onReset` saat form pemilik elemen di-reset (form.reset()), supaya isian buatan
// (pemilih tanggal / dropdown) ikut kembali ke nilai awal seperti isian bawaan browser.

import { useEffect, type RefObject } from "react";

export function useFormReset(ref: RefObject<Element | null>, onReset: () => void) {
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [ref, onReset]);
}
