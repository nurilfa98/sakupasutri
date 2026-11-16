import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Versi aplikasi diambil dari package.json (diubah otomatis oleh release-please,
// lihat docs/CONVENTIONS.md bagian "Commit & rilis") dan ditanam ke bundle
// sebagai NEXT_PUBLIC_APP_VERSION supaya bisa ditampilkan di UI (lib/version.ts).
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// 7 karakter pertama commit deploy. Hanya diisi di build NON-production
// (preview/development) supaya mudah melacak build mana yang sedang diuji.
const commit = process.env.VERCEL_ENV === "production" ? "" : (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_COMMIT: commit,
  },
  experimental: {
    // Batas bawaan Server Action 1 MB. Naikkan bila form mengunggah file
    // (batasi juga ukuran file di schemas.ts fitur terkait).
    // Referensi: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md
    serverActions: { bodySizeLimit: "5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
