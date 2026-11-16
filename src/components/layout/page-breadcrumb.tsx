// Breadcrumb di header, disusun otomatis dari segmen URL yang sedang dibuka:
// "Menu > Pengguna > Tambah". Label tiap segmen ada di SEGMENT_LABELS
// (nav-config.ts); segmen dinamis seperti /users/<id> tampil sebagai "Detail".
//
// - "Menu" kembali ke kotak menu di /.
// - Setiap crumb selain yang terakhir adalah link ke tingkat di atasnya,
//   misalnya dari "Detail" kembali ke daftar "Pengguna".
// - Di halaman / breadcrumb tidak tampil.
//
// Referensi: https://ui.shadcn.com/docs/components/breadcrumb

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DYNAMIC_SEGMENT_LABEL, SEGMENT_LABELS } from "./nav-config";

type Crumb = { title: string; href: string };

function trailOf(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    title: SEGMENT_LABELS[segment] ?? DYNAMIC_SEGMENT_LABEL,
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

export function PageBreadcrumb() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  const trail = trailOf(pathname);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink render={<Link href="/" />}>Menu</BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((crumb, index) => (
          <CrumbItem
            key={crumb.href}
            crumb={crumb}
            // Crumb terakhir = halaman ini (bukan link).
            current={index === trail.length - 1}
            // Di HP "Menu" disembunyikan, jadi pemisah pertama ikut disembunyikan.
            first={index === 0}
          />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function CrumbItem({ crumb, current, first }: { crumb: Crumb; current: boolean; first: boolean }) {
  return (
    <>
      <BreadcrumbSeparator className={first ? "hidden sm:inline-flex" : undefined} />
      <BreadcrumbItem className="min-w-0">
        {current ? (
          <BreadcrumbPage className="truncate font-medium">{crumb.title}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink className="truncate" render={<Link href={crumb.href} />}>
            {crumb.title}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    </>
  );
}
