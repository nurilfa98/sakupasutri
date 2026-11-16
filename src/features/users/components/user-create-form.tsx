// Form tambah pengguna: cukup mengisi nama, email, nomor HP (opsional), dan
// role. Password sementara dibuat sistem dan dikirim ke email pengguna.
// Setelah berhasil, kembali ke daftar /users dan toast singkat memberi tahu
// apakah email password sementara terkirim (dengan tombol "Lihat detail").
//
// Kenapa memakai onSubmit, bukan <form action={formAction}>?
// Dengan `action`, React mengosongkan form setelah Server Action selesai,
// termasuk saat validasi GAGAL, sehingga admin harus mengetik ulang semuanya.
// Dengan onSubmit + startTransition, isian tetap ada saat ada error.
//
// Referensi:
// - https://react.dev/reference/react-dom/components/form (bagian "Handle form submission")
// - https://react.dev/reference/react/useActionState

"use client";

import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { useActionResult } from "@/hooks/use-action-result";
import { notify } from "@/lib/notify";
import { createUser, type CreateUserResult } from "../actions";
import { RoleField } from "./role-field";
import { TextField } from "./text-field";

export function UserCreateForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createUser, undefined);

  const error = state && !state.success ? state : undefined;
  const fieldError = (name: string) => error?.fieldErrors?.[name]?.[0];

  useActionResult(state, (result) => {
    if (!result.success) {
      if (!result.fieldErrors) notify.error(result.message);
      return;
    }
    showCreatedToast(result.data, () => router.push(`/users/${result.data.id}`));
    router.push("/users");
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <FieldGroup>
        <TextField name="fullName" label="Nama lengkap" autoComplete="off" required error={fieldError("fullName")} />
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
          description="Password sementara dikirim ke email ini."
          required
          error={fieldError("email")}
        />
        <PhoneInput name="phoneNumber" label="Nomor HP (opsional)" error={fieldError("phoneNumber")} />
        <RoleField defaultValue="USER" error={fieldError("role")} />

        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/users" />}>
            Batal
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

function showCreatedToast(result: CreateUserResult, openDetail: () => void) {
  const action = { label: "Lihat detail", onClick: openDetail };
  if (result.emailSent) {
    notify.success(`Password sementara dikirim ke ${result.email}.`, { title: "Pengguna berhasil dibuat", action });
  } else {
    notify.warning(`Password sementara gagal dikirim ke ${result.email}.`, {
      title: "Pengguna dibuat, tetapi email gagal dikirim",
      timeout: 10000,
      action,
    });
  }
}
