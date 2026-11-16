// Form profil sendiri (menu Profil): ubah nama dan nomor HP. Email dan role
// tidak ada di sini; email tampil baca saja karena hanya administrator yang
// boleh mengubahnya (email adalah jangkar kepemilikan akun).
// Polanya sama dengan user-edit-form.tsx (onSubmit + startTransition agar
// isian tidak hilang saat validasi gagal). Hasil simpan tampil sebagai toast.

"use client";

import { LoaderCircleIcon } from "lucide-react";
import { startTransition, useActionState, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useActionResult } from "@/hooks/use-action-result";
import { notify } from "@/lib/notify";
import { updateOwnProfile } from "../actions";
import type { UserDetail } from "../queries";
import { TextField } from "./text-field";

export function ProfileForm({ user }: { user: UserDetail }) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, undefined);

  const error = state && !state.success ? state : undefined;
  const fieldError = (name: string) => error?.fieldErrors?.[name]?.[0];

  useActionResult(state, (result) => {
    if (result.success) notify.success("Profil disimpan.");
    else if (!result.fieldErrors) notify.error(result.message);
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <TextField
          name="fullName"
          label="Nama lengkap"
          defaultValue={user.fullName}
          autoComplete="off"
          required
          error={fieldError("fullName")}
        />
        <Field>
          <FieldLabel>Email</FieldLabel>
          <p className="text-sm">{user.email}</p>
          <FieldDescription>
            Dipakai untuk login dan menerima password sementara. Email hanya bisa diubah oleh administrator.
          </FieldDescription>
        </Field>
        <PhoneInput
          name="phoneNumber"
          label="Nomor HP (opsional)"
          defaultValue={user.phoneNumber}
          error={fieldError("phoneNumber")}
        />

        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? "Menyimpan..." : "Simpan profil"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
