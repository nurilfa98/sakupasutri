// Halaman /users/new: tambah pengguna baru (permission user:manage).

import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCreateForm } from "@/features/users/components/user-create-form";
import { requirePermission } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Tambah Pengguna",
};

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="Tambah pengguna"
        description="Password sementara dikirim ke email pengguna, lalu pengguna diminta menggantinya saat pertama login."
      />
      <Card>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}>
            <NewUserContent />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewUserContent() {
  await requirePermission("user:manage");
  return <UserCreateForm />;
}
