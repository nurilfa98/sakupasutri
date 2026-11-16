// Tombol "Reset password", "Nonaktifkan/Aktifkan", dan "Hapus" di halaman
// detail pengguna. Semuanya berdampak besar, jadi selalu meminta konfirmasi
// lewat ActionDialog (components/action-dialog.tsx); hasilnya tampil sebagai
// toast. Hanya ditampilkan untuk pengelola (user:manage) dan bukan untuk akun
// sendiri.
//
// Referensi:
// - https://ui.shadcn.com/docs/components/alert-dialog
// - node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md
//   (bagian "Event Handlers")

"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ActionDialog } from "@/components/action-dialog";
import { deleteUser, resetUserPassword, restoreUser, setUserActive } from "../actions";
import type { UserDetail } from "../queries";

export function UserAccountActions({ user }: { user: UserDetail }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <ActionRow
        title="Reset password"
        description={
          user.isActive
            ? "Kirim password sementara baru ke email pengguna. Pengguna akan keluar dari semua perangkat."
            : "Aktifkan akun terlebih dahulu untuk me-reset password."
        }
      >
        <ActionDialog
          label="Reset password"
          variant="outline"
          disabled={!user.isActive}
          title={`Reset password ${user.fullName}?`}
          description={`Password lama tidak berlaku lagi. Password sementara dikirim ke ${user.email}.`}
          confirmLabel="Reset password"
          successMessage={`Password sementara baru sudah dikirim ke ${user.email}.`}
          onConfirm={() => resetUserPassword(user.id)}
        />
      </ActionRow>

      <ActionRow
        title={user.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
        description={
          user.isActive
            ? "Pengguna tidak bisa login, dan sesi yang sedang berjalan langsung berhenti. Data & riwayatnya tetap tersimpan."
            : "Pengguna bisa login kembali dengan password terakhirnya."
        }
      >
        <ActionDialog
          label={user.isActive ? "Nonaktifkan" : "Aktifkan"}
          variant={user.isActive ? "destructive" : "outline"}
          title={user.isActive ? `Nonaktifkan ${user.fullName}?` : `Aktifkan ${user.fullName}?`}
          description={
            user.isActive
              ? "Pengguna langsung tidak bisa memakai aplikasi. Anda bisa mengaktifkannya kembali kapan saja."
              : "Pengguna bisa login kembali."
          }
          confirmLabel={user.isActive ? "Nonaktifkan" : "Aktifkan"}
          successMessage={user.isActive ? "Akun dinonaktifkan." : "Akun diaktifkan kembali."}
          onConfirm={() => setUserActive(user.id, !user.isActive)}
        />
      </ActionRow>

      <ActionRow
        title="Hapus akun"
        description="Pengguna dikeluarkan dari semua perangkat dan hilang dari daftar. Data & riwayatnya tetap tersimpan dan akun bisa dipulihkan dari tab Terhapus."
      >
        <ActionDialog
          label="Hapus"
          variant="destructive"
          title={`Hapus ${user.fullName}?`}
          description="Pengguna langsung tidak bisa memakai aplikasi. Anda bisa memulihkannya dari tab Terhapus."
          confirmLabel="Hapus"
          successMessage="Pengguna dihapus."
          onConfirm={() => deleteUser(user.id)}
          onSuccess={() => router.push("/users")}
        />
      </ActionRow>
    </div>
  );
}

// Dipakai halaman detail untuk pengguna yang sudah dihapus.
export function UserRestoreAction({ user }: { user: UserDetail }) {
  return (
    <ActionRow title="Pulihkan akun" description="Pengguna muncul kembali di daftar dan bisa login lagi.">
      <ActionDialog
        label="Pulihkan"
        variant="outline"
        title={`Pulihkan ${user.fullName}?`}
        description="Akun kembali aktif seperti sebelum dihapus."
        confirmLabel="Pulihkan"
        successMessage="Pengguna dipulihkan."
        onConfirm={() => restoreUser(user.id)}
      />
    </ActionRow>
  );
}

function ActionRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
