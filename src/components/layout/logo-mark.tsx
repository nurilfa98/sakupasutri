// Logo placeholder netral: empat kotak membulat putih di atas latar indigo
// (kesan "kotak menu"). GANTI dengan logo proyek Anda. Gambar yang sama dengan
// ikon aplikasi di layar HP (src/app/icon.svg → public/icons/*.png); kalau
// logo diubah, ubah keduanya lalu jalankan `pnpm icons:generate`.
//
// Ukuran diatur lewat className (misal "size-8").
//
// ID gradien dibuat unik per logo (useId). Bila satu halaman punya dua logo
// dengan ID sama, browser memakai gradien milik logo pertama; kalau logo itu
// tersembunyi (display:none, misal panel kiri login di HP), gradiennya tidak
// digambar dan logo lain ikut kehilangan warna.

import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const bg = `${id}-bg`;
  const shine = `${id}-shine`;

  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
        <radialGradient id={shine} cx=".25" cy=".15" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${bg})`} />
      <rect width="512" height="512" rx="112" fill={`url(#${shine})`} />
      <rect x="140" y="140" width="112" height="112" rx="32" fill="#fff" />
      <rect x="260" y="140" width="112" height="112" rx="32" fill="#fff" fillOpacity=".55" />
      <rect x="140" y="260" width="112" height="112" rx="32" fill="#fff" fillOpacity=".55" />
      <rect x="260" y="260" width="112" height="112" rx="32" fill="#fff" />
    </svg>
  );
}
