// Versi aplikasi untuk ditampilkan di UI (footer login, menu user).
//
// - APP_VERSION: dari `version` di package.json, diisi next.config.ts sebagai
//   NEXT_PUBLIC_APP_VERSION. Versi hanya naik saat Release PR release-please
//   di-merge (lihat docs/CONVENTIONS.md, bagian "Commit & rilis").
// - APP_COMMIT: 7 karakter pertama commit deploy (VERCEL_GIT_COMMIT_SHA),
//   ditampilkan hanya di build non-production agar mudah melacak build mana
//   yang sedang dibuka saat uji.
//
// File ini aman dipakai Server maupun Client Component: nilai NEXT_PUBLIC_*
// ditanam ke bundle saat build.

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";

// "v0.3.1" di production, "v0.3.1 (a1b2c3d)" di build lain bila SHA tersedia.
export const APP_VERSION_LABEL = APP_COMMIT ? `v${APP_VERSION} (${APP_COMMIT})` : `v${APP_VERSION}`;
