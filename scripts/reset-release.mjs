// Mengembalikan versi & riwayat rilis ke awal. Dipakai SEKALI saat memulai
// proyek baru dari starter ini (atau bila ingin mengulang penomoran versi):
//
//   pnpm release:reset            → versi 0.1.0
//   pnpm release:reset 0.0.1      → versi tertentu
//
// Yang diubah: version di package.json, .release-please-manifest.json, dan
// CHANGELOG.md (dikosongkan). Tag git dan GitHub Release lama TIDAK dihapus
// otomatis; hapus manual bila ada:
//   git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
//
// Langkah lengkap: docs/CONVENTIONS.md, bagian "Commit & rilis".

import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2] ?? "0.1.0";
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Versi "${version}" tidak valid. Contoh: 0.1.0`);
  process.exit(1);
}

const packageUrl = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(packageUrl, "utf8"));
pkg.version = version;
writeFileSync(packageUrl, `${JSON.stringify(pkg, null, 2)}\n`);

writeFileSync(
  new URL("../.release-please-manifest.json", import.meta.url),
  `${JSON.stringify({ ".": version }, null, 2)}\n`,
);
writeFileSync(new URL("../CHANGELOG.md", import.meta.url), "# Changelog\n");

console.log(`Versi direset ke ${version}.`);
console.log("Ingat: hapus tag/GitHub Release lama bila ada (lihat komentar di scripts/reset-release.mjs).");
