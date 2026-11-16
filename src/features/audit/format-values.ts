// Mengubah old_values / new_values audit log (JSON mentah) menjadi baris
// "Data | Sebelum | Sesudah" yang mudah dibaca admin, misalnya
// { role: "ADMIN" } → "Role: Administrator".
//
// Dijalankan di server; Client Component hanya menerima teks yang sudah jadi.
// Fitur baru yang mencatat audit menambahkan labelnya di FIELDS di bawah.

import "server-only";
import { isRole, ROLE_LABELS } from "@/lib/auth/roles";
import { formatPhone } from "@/lib/phone";

export type AuditChange = {
  field: string;
  before: string | null; // null = tidak ada nilai sebelumnya
  after: string | null; // null = dihapus / tidak ada nilai sesudahnya
};

type Formatter = (value: unknown) => string;

const label =
  (labels: Record<string, string>): Formatter =>
  (value) =>
    typeof value === "string" ? (labels[value] ?? value) : text(value);

const LOGIN_FAILED_REASONS: Record<string, string> = {
  WRONG_PASSWORD: "Password salah",
  INACTIVE: "Akun nonaktif",
};

// Urutan di sini = urutan tampil. Field yang tidak terdaftar tetap
// ditampilkan di akhir dengan nama aslinya.
const FIELDS: Record<string, { label: string; format?: Formatter }> = {
  fullName: { label: "Nama lengkap" },
  email: { label: "Email" },
  phoneNumber: { label: "No. HP", format: (value) => (typeof value === "string" ? formatPhone(value) : text(value)) },
  role: {
    label: "Role",
    format: (value) => (typeof value === "string" && isRole(value) ? ROLE_LABELS[value] : text(value)),
  },
  isActive: { label: "Aktif" },
  wasTemporary: { label: "Password sementara" },
  device: { label: "Perangkat" },
  location: { label: "Lokasi (perkiraan)" },
  devices: { label: "Jumlah perangkat" },
  reason: { label: "Alasan", format: label(LOGIN_FAILED_REASONS) },
};

const FIELD_ORDER = Object.keys(FIELDS);

export function formatAuditChanges(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): AuditChange[] {
  const keys = [...new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])].sort(
    (a, b) => order(a) - order(b),
  );

  return keys.map((key) => {
    const field = FIELDS[key];
    const format = field?.format ?? text;
    const show = (values: Record<string, unknown> | null) =>
      values && key in values ? (values[key] === null || values[key] === "" ? "-" : format(values[key])) : null;
    return { field: field?.label ?? key, before: show(oldValues), after: show(newValues) };
  });
}

function order(key: string) {
  const index = FIELD_ORDER.indexOf(key);
  return index === -1 ? FIELD_ORDER.length : index;
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(text).join(", ");
  return JSON.stringify(value);
}
