// Form ubah data & role pengguna oleh pengelola (permission user:manage).
// Polanya sama dengan user-create-form.tsx (onSubmit + startTransition agar
// isian tidak hilang saat validasi gagal). Hasil simpan tampil sebagai toast.

"use client";

import { LoaderCircleIcon } from "lucide-react";
import { startTransition, useActionState, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { useActionResult } from "@/hooks/use-action-result";
import { notify } from "@/lib/notify";
import { updateUser } from "../actions";
import type { UserDetail } from "../queries";
import { RoleField } from "./role-field";
import { TextField } from "./text-field";

export function UserEditForm({ user }: { user: UserDetail }) {
  const [state, formAction, pending] = useActionState(updateUser, undefined);

  const error = state && !state.success ? state : undefined;
  const fieldError = (name: string) => error?.fieldErrors?.[name]?.[0];

  useActionResult(state, (result) => {
    if (result.success) notify.success("Perubahan disimpan.");
    else if (!result.fieldErrors) notify.error(result.message);
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={user.id} />
      <FieldGroup>
        <TextField
          name="fullName"
          label="Nama lengkap"
          defaultValue={user.fullName}
          autoComplete="off"
          required
          error={fieldError("fullName")}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          defaultValue={user.email}
          autoComplete="off"
          description="Mengubah email mengeluarkan pengguna dari semua perangkat, dan email lama diberi tahu."
          required
          error={fieldError("email")}
        />
        <PhoneInput
          name="phoneNumber"
          label="Nomor HP (opsional)"
          defaultValue={user.phoneNumber}
          error={fieldError("phoneNumber")}
        />
        <RoleField defaultValue={user.role} error={fieldError("role")} />

        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
