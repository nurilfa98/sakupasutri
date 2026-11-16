// Halaman / (tepat setelah login): kartu sapaan (jam, tanggal, sapaan sesuai
// waktu) dan kotak menu dengan kolom pencarian. Menu yang tampil disaring sesuai
// role user (lihat nav-config.ts).
//
// Sapaan dan daftar menu butuh data user (cookie), jadi berada di dalam
// <Suspense>; judul "Menu" statis ikut diprerender.

import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuLauncher, MenuLauncherSkeleton } from "@/components/layout/menu-launcher";
import { WelcomeCard, WelcomeCardSkeleton } from "@/components/layout/welcome-card";
import { verifySession } from "@/lib/auth/dal";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Menu",
};

export default function MenuPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4 sm:pb-8">
      <Suspense fallback={<WelcomeCardSkeleton />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<MenuLauncherSkeleton />}>
        <Menu />
      </Suspense>
    </div>
  );
}

// Jam memakai zona waktu perusahaan (APP_TIMEZONE), bukan zona waktu perangkat.
async function Greeting() {
  const user = await verifySession();
  return <WelcomeCard name={user.fullName.split(" ")[0]} timeZone={env.APP_TIMEZONE} />;
}

async function Menu() {
  const user = await verifySession();
  return <MenuLauncher role={user.role} />;
}
