// Data table daftar pengguna (Client Component, memakai components/data-table).
//
// - Filter Role & Status ada di panel "Filter" dan diterapkan server lewat URL
//   (/users?role=ADMIN&status=ACTIVE); pencarian nama/email berjalan di
//   browser atas data yang sudah dimuat.
// - Tab "Terhapus" (/users?deleted=1) memakai tabel yang sama dengan kolom
//   "Dihapus" sebagai pengganti kolom status.
// - Seluruh baris bisa diklik lewat link di kolom Nama.
// - Layar lebar: tabel (kolom No. HP & Role disembunyikan di layar sempit).
//   HP (< md): kartu, 10 dulu lalu +10 saat di-scroll.

"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { createDataTableColumns, DataTable } from "@/components/data-table/data-table";
import {
  DataTableFilters,
  DataTableFilterSelect,
  FILTER_ALL,
  useUrlFilters,
  type FilterOption,
} from "@/components/data-table/data-table-filters";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { formatPhone } from "@/lib/phone";
import { USER_STATUS, USER_STATUS_LABELS } from "../constants";
import type { UserListItem } from "../queries";
import type { UserFilters } from "../schemas";
import { RoleBadge, StatusBadge } from "./user-badges";

// Tanggal sudah diformat di server (lib/dates.ts hanya untuk server).
export type UserRow = Omit<UserListItem, "deletedAt"> & { deletedAtLabel: string | null };

const column = createDataTableColumns<UserRow>();

const nameColumn = column.accessor("fullName", {
  header: "Nama",
  sortFn: "text",
  cell: ({ row }) => (
    <div className="max-w-48 sm:max-w-none">
      <Link href={`/users/${row.original.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
        {row.original.fullName}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
      <div className="mt-1 sm:hidden">
        <RoleBadge role={row.original.role} />
      </div>
    </div>
  ),
});

// Hanya untuk pencarian (nama ATAU email); tampilannya sudah di kolom Nama.
const emailColumn = column.accessor("email", {
  header: "Email",
  enableSorting: false,
  meta: { className: "hidden" },
});

const phoneColumn = column.accessor("phoneNumber", {
  header: "No. HP",
  enableSorting: false,
  meta: { className: "hidden whitespace-nowrap md:table-cell" },
  cell: ({ getValue }) => {
    const phone = getValue();
    return phone ? formatPhone(phone) : "-";
  },
});

const roleColumn = column.accessor("role", {
  header: "Role",
  enableSorting: false,
  meta: { className: "hidden sm:table-cell" },
  cell: ({ getValue }) => <RoleBadge role={getValue()} />,
});

const statusColumn = column.display({
  id: "status",
  header: "Status",
  meta: { className: "whitespace-nowrap" },
  cell: ({ row }) => <StatusBadge user={row.original} />,
});

const deletedColumn = column.display({
  id: "deleted",
  header: "Dihapus",
  meta: { className: "whitespace-nowrap" },
  cell: ({ row }) => (
    <>
      <span className="block">{row.original.deletedAtLabel ?? "-"}</span>
      {row.original.deletedByName && (
        <span className="block text-xs text-muted-foreground">oleh {row.original.deletedByName}</span>
      )}
    </>
  ),
});

const openColumn = column.display({
  id: "open",
  header: () => <span className="sr-only">Detail</span>,
  meta: { className: "w-10" },
  cell: () => <ChevronRightIcon className="size-4 text-muted-foreground" />,
});

// Dibuat sekali di luar komponen (wajib stabil untuk TanStack Table v9).
const COLUMNS = column.columns([nameColumn, emailColumn, phoneColumn, roleColumn, statusColumn, openColumn]);
const DELETED_COLUMNS = column.columns([nameColumn, emailColumn, phoneColumn, roleColumn, deletedColumn, openColumn]);
const SEARCHABLE = ["fullName", "email"] as const;

const ROLE_OPTIONS: FilterOption[] = [
  { value: FILTER_ALL, label: "Semua role" },
  ...ASSIGNABLE_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] })),
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: FILTER_ALL, label: "Semua status" },
  ...USER_STATUS.map((value) => ({ value, label: USER_STATUS_LABELS[value] })),
];

export function UsersTable({ users, filters }: { users: UserRow[]; filters: UserFilters }) {
  const { setFilters, pending } = useUrlFilters();
  // Status tidak berlaku untuk pengguna yang sudah dihapus.
  const activeFilterCount = [filters.role, filters.deleted ? undefined : filters.status].filter(Boolean).length;

  return (
    <DataTable
      columns={filters.deleted ? DELETED_COLUMNS : COLUMNS}
      data={users}
      searchableColumns={SEARCHABLE}
      searchPlaceholder="Cari nama atau email"
      emptyMessage={
        activeFilterCount > 0
          ? "Tidak ada pengguna pada filter ini."
          : filters.deleted
            ? "Tidak ada pengguna yang dihapus."
            : "Belum ada pengguna."
      }
      activeFilterCount={activeFilterCount}
      pending={pending}
      renderCard={(user) => <UserCard user={user} deleted={filters.deleted} />}
      filters={
        <DataTableFilters
          canReset={activeFilterCount > 0}
          pending={pending}
          onReset={() => setFilters({ role: undefined, status: undefined })}
        >
          <DataTableFilterSelect
            label="Role"
            value={filters.role ?? FILTER_ALL}
            options={ROLE_OPTIONS}
            onValueChange={(role) => setFilters({ role })}
          />
          {!filters.deleted && (
            <DataTableFilterSelect
              label="Status"
              value={filters.status ?? FILTER_ALL}
              options={STATUS_OPTIONS}
              onValueChange={(status) => setFilters({ status })}
            />
          )}
        </DataTableFilters>
      }
    />
  );
}

// Kartu satu pengguna untuk HP. Seluruh kartu bisa diklik (link dibentangkan
// lewat ::after). Isinya sama dengan kolom tabel.
function UserCard({ user, deleted }: { user: UserRow; deleted: boolean }) {
  return (
    <div className="relative flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/users/${user.id}`}
            className="truncate font-medium after:absolute after:inset-0 hover:underline"
          >
            {user.fullName}
          </Link>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </div>
        {!deleted && <StatusBadge user={user} />}
      </div>
      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {deleted && user.deletedAtLabel
            ? `Dihapus ${user.deletedAtLabel}`
            : user.phoneNumber
              ? formatPhone(user.phoneNumber)
              : "No. HP belum diisi"}
        </span>
        <RoleBadge role={user.role} />
      </div>
    </div>
  );
}
