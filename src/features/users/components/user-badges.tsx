// Badge role & status pengguna. Dipakai daftar pengguna (users-table.tsx) dan
// detail pengguna. Tanpa "use client" agar bisa dirender Server Component
// maupun Client Component.

import { ToneBadge } from "@/components/tone-badge";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { USER_STATUS_LABELS, type UserStatus } from "../constants";
import type { UserListItem } from "../queries";

// Warna role sengaja BUKAN warna status (tone-badge.tsx: hijau = Aktif,
// abu-abu = Nonaktif, kuning = Menunggu login), supaya tidak dikira status.
// Pengguna biasa tetap abu-abu netral (role paling umum).
const ROLE_COLORS: Partial<Record<Role, string>> = {
  DEVELOPER: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  ADMIN:
    "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
};

export function RoleBadge({ role }: { role: Role }) {
  const color = ROLE_COLORS[role];
  return (
    <Badge variant={color ? "outline" : "secondary"} className={color}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

// Urutan cek sama dengan filter status (queries.ts → statusCondition).
export function userStatus(user: Pick<UserListItem, "isActive" | "mustChangePassword">): UserStatus {
  if (!user.isActive) return "INACTIVE";
  // Belum pernah login / belum mengganti password sementara.
  if (user.mustChangePassword) return "PENDING_LOGIN";
  return "ACTIVE";
}

// Aktif = hijau (teks hijau tua), Menunggu login = kuning (perlu tindakan
// pengguna), Nonaktif = abu-abu (teks hitam).
export function StatusBadge({ user }: { user: Pick<UserListItem, "isActive" | "mustChangePassword"> }) {
  const status = userStatus(user);
  const label = USER_STATUS_LABELS[status];
  if (status === "INACTIVE") {
    return (
      <ToneBadge tone="pending" className="text-slate-900 dark:text-slate-100">
        {label}
      </ToneBadge>
    );
  }
  return <ToneBadge tone={status === "PENDING_LOGIN" ? "warning" : "success"}>{label}</ToneBadge>;
}
