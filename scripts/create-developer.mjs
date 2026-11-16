// Membuat akun DEVELOPER, karena belum ada halaman register. Role ini
// tersembunyi: akunnya tidak tampil ke pengguna lain dan tindakannya tidak
// dicatat di audit log. Akun Developer juga tidak bisa dibuat atau diubah dari
// UI, jadi script ini satu-satunya jalan untuk membuatnya. Hanya boleh ada SATU
// akun Developer; script menolak membuat yang kedua.
//
// Cara pakai (jalankan setelah pnpm db:migrate):
//   pnpm db:create-developer dev@contoh.com passwordRahasia "Nama Developer"
//
// Akun yang dibuat script ini langsung bisa dipakai login (password tidak
// ditandai sementara).
//
// Catatan: password yang diketik di terminal tersimpan di riwayat shell.
// Setelah login, ganti password lewat menu user → "Ganti password".

import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const [email, password, fullName = "Developer"] = process.argv.slice(2);

if (!email || !password) {
  console.error('Cara pakai: pnpm db:create-developer <email> <password> ["Nama Lengkap"]');
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password minimal 8 karakter.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

try {
  const normalizedEmail = email.trim().toLowerCase();

  // Hanya boleh ada satu akun Developer (dijaga juga oleh uq_users_role_developer).
  const [developer] = await sql`
    select id from users where role = 'DEVELOPER' and deleted_at is null limit 1`;

  // Email milik user yang sudah dihapus (deleted_at terisi) boleh dipakai lagi.
  const [existing] = await sql`
    select id from users where email = ${normalizedEmail} and deleted_at is null limit 1`;
  if (developer) {
    console.error("Akun Developer sudah ada. Hanya satu akun Developer yang diizinkan.");
    process.exitCode = 1;
  } else if (existing) {
    console.error(`Email ${normalizedEmail} sudah terdaftar.`);
    process.exitCode = 1;
  } else {
    // Cost 12, sama dengan src/lib/auth/password.ts
    const passwordHash = await bcrypt.hash(password, 12);

    await sql`
      insert into users (id, full_name, email, password_hash, role)
      values (${crypto.randomUUID()}, ${fullName}, ${normalizedEmail}, ${passwordHash}, 'DEVELOPER')`;

    console.log(`✓ Akun DEVELOPER dibuat: ${normalizedEmail}`);
  }
} finally {
  await sql.end();
}
