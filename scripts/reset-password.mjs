/**
 * Development helper: sets a new application password for one account.
 *
 * Usage (from the project root, PowerShell: use single quotes around the password)
 *   node scripts/reset-password.mjs admin@library.com 'MyNewPassword1!'
 *
 * The first argument can be the account email or its username.
 * Database settings are read from .env. Passwords are hashed with bcrypt, exactly like the app does.
 */
import { readFileSync } from 'node:fs';
import bcrypt from 'bcrypt';
import pg from 'pg';

const [login, newPassword] = process.argv.slice(2);
if (!login || !newPassword) {
  console.error("Usage: node scripts/reset-password.mjs <email-or-username> '<new password>'");
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error('Choose a password of at least 8 characters (same rule as the app).');
  process.exit(1);
}

// minimal .env reader (KEY=value lines)
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]),
);

const client = new pg.Client({
  host: env.DB_HOST ?? 'localhost',
  port: Number(env.DB_PORT ?? 5432),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

try {
  await client.connect();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);
  const res = await client.query(
    'UPDATE users SET password = $1, salt = $2 WHERE LOWER(email) = LOWER($3) OR username = $3 RETURNING id, email, username, role',
    [hash, salt, login],
  );
  if (res.rowCount === 0) {
    console.error(`No account found for "${login}". Check the spelling.`);
    process.exitCode = 1;
  } else {
    const u = res.rows[0];
    console.log(`Password updated for ${u.username} <${u.email}> (role: ${u.role}).`);
  }
} catch (err) {
  console.error('Could not update the password:', err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
