// Aturan format commit (Conventional Commits). Dicek otomatis oleh hook
// Husky `.husky/commit-msg`. Panduan lengkap: docs/CONVENTIONS.md, bagian
// "Commit & rilis".
//
//   <tipe>(<scope>): <deskripsi>
//   feat(users): tambah filter role
//   fix(auth): logout tidak menghapus cookie perangkat
//   feat(users)!: ganti format nomor telepon      ← breaking change (versi major)

const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Tipe tetap bahasa Inggris (dibaca release-please), deskripsi bahasa Indonesia.
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "perf", "refactor", "docs", "style", "test", "build", "ci", "chore", "revert"],
    ],
    // Scope = nama fitur/area, huruf kecil (boleh kebab-case): users, auth, data-table.
    "scope-case": [2, "always", "kebab-case"],
    // Deskripsi bahasa Indonesia: jangan paksa pola huruf besar/kecil tertentu.
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
};

export default config;
