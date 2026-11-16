// Pengirim email lewat Resend (https://resend.com).
//
// Dipanggil langsung lewat REST API dengan fetch, tanpa library tambahan,
// karena kebutuhannya hanya satu endpoint: POST /emails.
//
// Saat development tanpa RESEND_API_KEY, email tidak dikirim melainkan
// ditampilkan di terminal `pnpm dev`, supaya fitur tetap bisa dicoba.
//
// Referensi:
// - https://resend.com/docs/api-reference/emails/send-email
// - node_modules/next/dist/docs/01-app/02-guides/environment-variables.md

import "server-only";
import { env } from "@/lib/env";
import { logError } from "@/lib/error-log";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string; // versi teks polos, untuk aplikasi email yang tidak menampilkan HTML
  html: string;
};

// Mengembalikan true bila email diterima oleh Resend. Gagal kirim TIDAK
// melempar error: pemanggil memutuskan sendiri apa yang ditampilkan ke user,
// karena data (misalnya user baru) biasanya sudah tersimpan.
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (env.NODE_ENV === "production") {
      await logError(new Error("RESEND_API_KEY / EMAIL_FROM belum diisi, email tidak terkirim"), {
        source: "EXTERNAL",
        action: "email",
      });
      return false;
    }
    // Hanya di development: isi email (termasuk password sementara) tampil di
    // terminal. Jangan pernah melakukan ini di production.
    console.info(`[email:dev] Kepada: ${message.to}\nSubjek: ${message.subject}\n\n${message.text}`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      // Jangan biarkan Server Action menggantung bila Resend lambat.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      await logError(new Error(`Resend menolak (${response.status}): ${(await response.text()).slice(0, 300)}`), {
        source: "EXTERNAL",
        action: "email",
        context: { status: response.status },
      });
      return false;
    }
    return true;
  } catch (error) {
    await logError(error, { source: "EXTERNAL", action: "email" });
    return false;
  }
}

// Banyak email sekaligus (impor pengguna): endpoint batch Resend, maksimal 100 email per permintaan,
// jadi tidak terkena batas jumlah permintaan per detik seperti pengiriman satu per satu. Hasilnya satu
// boolean per email, urutannya sama dengan `messages`. Sama seperti sendEmail: gagal kirim TIDAK
// melempar error. Satu permintaan yang ditolak membuat semua email di dalamnya dianggap gagal.
//
// Referensi: https://resend.com/docs/api-reference/emails/send-batch-emails
const BATCH_SIZE = 100;

export async function sendEmails(messages: EmailMessage[]): Promise<boolean[]> {
  if (messages.length === 0) return [];
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (env.NODE_ENV === "production") {
      await logError(new Error("RESEND_API_KEY / EMAIL_FROM belum diisi, email tidak terkirim"), {
        source: "EXTERNAL",
        action: "email",
      });
      return messages.map(() => false);
    }
    // Hanya di development: isi email tampil di terminal.
    for (const message of messages) {
      console.info(`[email:dev] Kepada: ${message.to}\nSubjek: ${message.subject}\n\n${message.text}`);
    }
    return messages.map(() => true);
  }

  const results: boolean[] = [];
  for (let start = 0; start < messages.length; start += BATCH_SIZE) {
    const chunk = messages.slice(start, start + BATCH_SIZE);
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((message) => ({
            from: env.EMAIL_FROM,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
          })),
        ),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        await logError(
          new Error(`Resend batch menolak (${response.status}): ${(await response.text()).slice(0, 300)}`),
          {
            source: "EXTERNAL",
            action: "email",
            context: { status: response.status, count: chunk.length },
          },
        );
      }
      results.push(...chunk.map(() => response.ok));
    } catch (error) {
      await logError(error, { source: "EXTERNAL", action: "email", context: { count: chunk.length } });
      results.push(...chunk.map(() => false));
    }
  }
  return results;
}

// Teks dari user (nama, dll) wajib di-escape sebelum dimasukkan ke HTML email,
// agar tidak bisa menyisipkan tag/link palsu.
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
