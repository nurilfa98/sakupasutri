// Input password dengan tombol ikon mata untuk menampilkan/menyembunyikan isinya.
// Dipakai di semua field password (login, ganti password, konfirmasi password).
//
// Dibangun di atas InputGroup shadcn: tombol mata menempel di dalam border input,
// dan `aria-invalid` tetap membuat border merah karena InputGroup membacanya.
// Tombolnya type="button" supaya tidak ikut men-submit form.
//
// Warna latar: tombol mata TIDAK punya latar sendiri di keadaan apa pun (normal, hover, fokus, sesudah
// ditekan), hanya warna ikonnya yang berubah, jadi selalu sama dengan kolom input di sebelahnya.
// Saat browser mengisi password otomatis (autofill) dan mewarnai kolom input (biru muda / biru gelap),
// seluruh kotak ikut diwarnai sama supaya area tombol tidak terlihat berbeda.

"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

// Warna autofill bawaan Chrome/Safari (terang: rgb(232 240 254), gelap: rgb(70 90 126 / 0.4)) dipasang di
// seluruh kotak; warna autofill pada <input>-nya sendiri ditunda tanpa batas (trik transisi) agar tidak
// menumpuk dengan warna kotak.
const AUTOFILL_GROUP =
  "has-[input:-webkit-autofill]:bg-[#e8f0fe] has-[input:autofill]:bg-[#e8f0fe] dark:has-[input:-webkit-autofill]:bg-[rgb(70_90_126/0.4)] dark:has-[input:autofill]:bg-[rgb(70_90_126/0.4)]";
const AUTOFILL_INPUT = "[&:-webkit-autofill]:transition-[background-color] [&:-webkit-autofill]:duration-[99999s]";
// Tanpa latar di semua keadaan; hanya ikon yang berubah warna.
const EYE_BUTTON =
  "bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-pressed:text-foreground dark:hover:bg-transparent";

export function PasswordInput({ disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <InputGroup className={AUTOFILL_GROUP}>
      <InputGroupInput className={AUTOFILL_INPUT} type={visible ? "text" : "password"} disabled={disabled} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          disabled={disabled}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={visible}
          title={visible ? "Sembunyikan password" : "Tampilkan password"}
          className={EYE_BUTTON}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
