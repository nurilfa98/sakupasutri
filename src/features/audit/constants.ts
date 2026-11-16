// Label & pengelompokan aksi audit log untuk halaman /audit.
// Daftar aksinya sendiri (AuditAction) ada di lib/audit.ts; `satisfies`
// memastikan setiap aksi baru wajib diberi label & kategori di sini.

import type { Tone } from "@/components/tone-badge";
import type { AuditAction } from "@/lib/audit";

export const AUDIT_CATEGORIES = ["AUTH", "USER"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  AUTH: "Login & akun",
  USER: "Pengguna",
};

type ActionInfo = { label: string; category: AuditCategory; tone: Tone };

// tone mengikuti aturan warna components/tone-badge.tsx: success = berhasil,
// active = berjalan/berubah, pending = netral, warning = perlu perhatian,
// danger = ditolak/bermasalah.
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: { label: "Login", category: "AUTH", tone: "pending" },
  LOGIN_FAILED: { label: "Login gagal", category: "AUTH", tone: "danger" },
  LOGOUT: { label: "Logout", category: "AUTH", tone: "pending" },
  SESSION_REVOKED: { label: "Keluarkan perangkat", category: "AUTH", tone: "warning" },
  PASSWORD_CHANGED: { label: "Ganti password", category: "AUTH", tone: "active" },
  USER_CREATED: { label: "Tambah pengguna", category: "USER", tone: "success" },
  USER_UPDATED: { label: "Ubah pengguna", category: "USER", tone: "active" },
  USER_ACTIVATED: { label: "Aktifkan pengguna", category: "USER", tone: "success" },
  USER_DEACTIVATED: { label: "Nonaktifkan pengguna", category: "USER", tone: "danger" },
  USER_DELETED: { label: "Hapus pengguna", category: "USER", tone: "danger" },
  USER_RESTORED: { label: "Pulihkan pengguna", category: "USER", tone: "success" },
  USER_PASSWORD_RESET: { label: "Reset password", category: "USER", tone: "warning" },
} as const satisfies Record<AuditAction, ActionInfo>;

// Aksi lama yang tidak (lagi) dikenal tetap ditampilkan apa adanya.
export function auditActionInfo(action: string): ActionInfo {
  return (AUDIT_ACTIONS as Record<string, ActionInfo>)[action] ?? { label: action, category: "AUTH", tone: "pending" };
}

export function auditActionsOf(category: AuditCategory): AuditAction[] {
  return (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter((action) => AUDIT_ACTIONS[action].category === category);
}

// Batas baris yang dimuat sekaligus; data lebih lama dicari lewat filter.
export const AUDIT_PAGE_LIMIT = 500;
