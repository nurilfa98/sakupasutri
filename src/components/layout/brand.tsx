// Logo + nama aplikasi. Dipakai di halaman login dan header. Gambar logonya
// ada di logo-mark.tsx (sama dengan ikon aplikasi di layar HP).
//
// `compact`: di HP hanya logo yang tampil (header sempit), teks muncul mulai
// layar tablet.

import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";

// `shortTagline`: tampilkan tagline hanya sampai koma pertama (misal di navbar
// agar breadcrumb tidak terdorong ke tengah). Tagline tanpa koma tampil utuh.
export function Brand({
  className,
  compact,
  shortTagline,
}: {
  className?: string;
  compact?: boolean;
  shortTagline?: boolean;
}) {
  const tagline = shortTagline ? PRODUCT_TAGLINE.split(",")[0] : PRODUCT_TAGLINE;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark className="size-8" />
      <div className={cn("grid leading-tight", compact && "hidden sm:grid")}>
        <span className="font-semibold">{PRODUCT_NAME}</span>
        <span className="text-xs whitespace-nowrap text-muted-foreground">{tagline}</span>
      </div>
    </div>
  );
}
