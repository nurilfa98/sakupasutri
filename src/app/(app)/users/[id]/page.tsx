// Halaman /users/[id]: detail, ubah, reset password, aktif/nonaktif, hapus,
// dan pulihkan pengguna.
//
// - Tanpa permission user:manage, atau untuk akun sendiri: tampilan baca saja
//   (akun sendiri diubah lewat menu Profil).
// - Pengguna yang sudah dihapus (soft delete) hanya menampilkan data dan
//   tombol Pulihkan.
//
// [id] adalah dynamic segment. Dengan cacheComponents, nilai params baru
// diketahui saat request, jadi aksesnya wajib di dalam <Suspense>.
//
// Referensi:
// - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
//   (bagian "With Cache Components" → "Without generateStaticParams")
// - node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ToneBadge } from "@/components/tone-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAccountActions, UserRestoreAction } from "@/features/users/components/user-account-actions";
import { RoleBadge, StatusBadge } from "@/features/users/components/user-badges";
import { UserEditForm } from "@/features/users/components/user-edit-form";
import { getUserDetail } from "@/features/users/queries";
import { requirePermission } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Detail Pengguna",
};

export default function UserDetailPage({ params }: PageProps<"/users/[id]">) {
  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      {params.then(({ id }) => (
        <UserDetailContent id={id} />
      ))}
    </Suspense>
  );
}

async function UserDetailContent({ id }: { id: string }) {
  const actor = await requirePermission("user:view");
  const canManage = can(actor, "user:manage");

  const user = await getUserDetail(id);
  if (!user) {
    // Bukan pengguna aktif: mungkin sudah dihapus (hanya terlihat oleh pengelola).
    const deletedUser = canManage ? await getUserDetail(id, { deleted: true }) : null;
    if (!deletedUser) notFound();

    return (
      <>
        <PageHeader
          title={deletedUser.fullName}
          description={deletedUser.email}
          action={<ToneBadge tone="danger">Dihapus</ToneBadge>}
        />
        <Card>
          <CardHeader>
            <CardTitle>Pengguna dihapus</CardTitle>
            <CardDescription>
              Dihapus {deletedUser.deletedAt ? formatDateTime(deletedUser.deletedAt) : "-"}
              {deletedUser.deletedByName ? ` oleh ${deletedUser.deletedByName}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserRestoreAction user={deletedUser} />
          </CardContent>
        </Card>
      </>
    );
  }

  const header = <PageHeader title={user.fullName} description={user.email} action={<StatusBadge user={user} />} />;

  if (!canManage || user.id === actor.id) {
    return (
      <>
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Data pengguna</CardTitle>
            <CardDescription>
              {user.id === actor.id
                ? "Ubah data Anda sendiri lewat menu Profil."
                : "Anda hanya memiliki akses untuk melihat data pengguna."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid max-w-xl gap-x-6 gap-y-4 sm:grid-cols-2">
              <Item label="Nomor HP">{user.phoneNumber ? formatPhone(user.phoneNumber) : "-"}</Item>
              <Item label="Role">
                <RoleBadge role={user.role} />
              </Item>
              <Item label="Dibuat">{formatDateTime(user.createdAt)}</Item>
            </dl>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      <Card>
        <CardHeader>
          <CardTitle>Data pengguna</CardTitle>
          <CardDescription>Nama, email, nomor HP, dan role.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl">
          <UserEditForm user={user} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Akun</CardTitle>
          <CardDescription>Password, status akses, dan penghapusan akun.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserAccountActions user={user} />
        </CardContent>
      </Card>
    </>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-96 w-full" />
    </>
  );
}
