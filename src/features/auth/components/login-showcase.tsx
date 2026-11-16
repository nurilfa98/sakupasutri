// Bagian halaman login versi PC (mulai layar lg, ≥1024px). Di HP keduanya
// disembunyikan, jadi yang terlihat hanya form login.
// - LoginBackdrop: hiasan latar seluruh layar (pola grid + cahaya) dan copyright di bawah.
// - LoginShowcase: logo besar, nama produk, tagline, dan deskripsi di kiri kartu form.
//
// Latar indigo-nya dipasang di halaman (page.tsx). Warnanya mengikuti latar logo
// (logo-mark.tsx); sesuaikan bila logo diganti.

import { LogoMark } from "@/components/layout/logo-mark";
import { COMPANY_NAME, COPYRIGHT_YEAR, PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { APP_VERSION_LABEL } from "@/lib/version";

export function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.07)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)] bg-size-[48px_48px]"
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 size-[32rem] rounded-full bg-indigo-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 -bottom-32 size-[32rem] rounded-full bg-amber-400/20 blur-3xl"
      />

      <p className="absolute inset-x-0 bottom-6 mx-auto max-w-6xl px-12 text-xs text-indigo-200/70">
        © {COPYRIGHT_YEAR} {COMPANY_NAME}. {APP_VERSION_LABEL}
      </p>
    </div>
  );
}

export function LoginShowcase() {
  return (
    <section className="hidden max-w-lg flex-col gap-8 text-white lg:flex">
      <div>
        <LogoMark className="size-16 rounded-[22%] shadow-2xl ring-1 shadow-indigo-950/50 ring-white/20 xl:size-20" />
        <h1 className="mt-6 text-5xl font-bold tracking-tight xl:text-6xl">{PRODUCT_NAME}</h1>
        <p className="mt-3 text-lg font-medium text-amber-200">{PRODUCT_TAGLINE}</p>
      </div>

      <p className="text-base leading-relaxed text-indigo-100/80">{PRODUCT_DESCRIPTION}</p>
    </section>
  );
}
