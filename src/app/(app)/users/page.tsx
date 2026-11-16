// Halaman /users: daftar pengguna dengan pencarian, filter Role/Status, dan
// tab "Terhapus" (pola sama dengan semua halaman daftar, components/data-table).
//
// Polanya sama dengan halaman lain: judul statis di luar <Suspense> (langsung
// tampil saat menu diklik), sedangkan bagian yang membaca cookie, searchParams,
// dan database ada di dalamnya.
//
// searchParams adalah Promise. Promise-nya diteruskan ke komponen di dalam
// <Suspense> dan baru di-await di sana, agar kerangka halaman tetap statis.
//
// Referensi:
// - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md (searchParams)
// - node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md

import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTable } from "@/features/users/components/users-table";
import { UsersViewTabs } from "@/features/users/components/users-view-tabs";
import { listUsers } from "@/features/users/queries";
import { parseUserFilters } from "@/features/users/schemas";
import { requirePermission } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Pengguna",
};

export default function UsersPage({ searchParams }: PageProps<"/users">) {
  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Kelola akun, role, dan status aktif pengguna."
        action={
          <Button nativeButton={false} render={<Link href="/users/new" />}>
            <PlusIcon />
            Tambah pengguna
          </Button>
        }
      />
      <Suspense fallback={<UsersSkeleton />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UsersContent({ searchParams }: Pick<PageProps<"/users">, "searchParams">) {
  const actor = await requirePermission("user:view");

  // Filter: ?role=&status=&deleted=1 (nilai tidak valid diabaikan).
  const canManage = can(actor, "user:manage");
  const parsed = parseUserFilters(await searchParams);
  // Daftar "Terhapus" hanya untuk pengelola.
  const filters = { ...parsed, deleted: parsed.deleted && canManage };
  const users = await listUsers(filters);

  return (
    <div className="flex flex-col gap-4">
      {canManage && <UsersViewTabs deleted={filters.deleted} />}
      <UsersTable
        users={users.map(({ deletedAt, ...user }) => ({
          ...user,
          deletedAtLabel: deletedAt ? formatDateTime(deletedAt) : null,
        }))}
        filters={filters}
      />
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-full max-w-sm" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
