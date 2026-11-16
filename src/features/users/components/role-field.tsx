// Pilihan role di form tambah & ubah pengguna (dropdown OptionSelect global).

import { OptionSelect } from "@/components/option-select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";

// Developer tidak ditawarkan di form (akunnya dibuat lewat terminal).
const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

export function RoleField({ defaultValue, error }: { defaultValue?: Role; error?: string }) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="role">Role</FieldLabel>
      <OptionSelect
        id="role"
        name="role"
        options={ROLE_OPTIONS}
        defaultValue={defaultValue}
        placeholder="Pilih role"
        required
        aria-invalid={!!error}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}
