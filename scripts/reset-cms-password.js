'use strict';

const crypto = require('node:crypto');
const readline = require('node:readline');
const { createDataStore } = require('../lib/data-store');
const { hashPassword } = require('../lib/auth');

const USER_ROLES = new Set(['owner', 'admin', 'editor']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [rawKey, inlineValue] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined && value && !String(value).startsWith('--')) index += 1;
    args[key] = value === undefined || String(value).startsWith('--') ? true : value;
  }
  return args;
}

function printHelp() {
  console.log(`
Reset password CMS Apple of My Eye

PowerShell yang disarankan:
  $env:CMS_RESET_USERNAME="admin"
  npm run cms:reset-password

Jika terminal tidak bisa meminta password interaktif:
  $env:CMS_RESET_PASSWORD="password-baru-minimal-10-karakter"
  npm run cms:reset-password
  Remove-Item Env:CMS_RESET_PASSWORD

Opsi:
  --username <username>  Username CMS yang akan direset atau dibuat.
  --name <nama>          Nama tampilan bila akun baru dibuat.
  --role <role>          owner, admin, atau editor. Default: owner untuk akun baru.
`);
}

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeUsername(value) {
  return cleanText(value, 40).toLowerCase();
}

function promptHidden(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Tetapkan CMS_RESET_PASSWORD karena terminal ini tidak mendukung input password interaktif.');
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';

    function cleanup() {
      stdin.off('keypress', onKeypress);
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
    }

    function onKeypress(char, key = {}) {
      if (key.ctrl && key.name === 'c') {
        stdout.write('\n');
        cleanup();
        reject(new Error('Reset password dibatalkan.'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        stdout.write('\n');
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === 'backspace') {
        value = value.slice(0, -1);
        return;
      }
      if (key.name === 'tab' || key.name === 'escape') return;
      if (char) value += char;
    }

    readline.emitKeypressEvents(stdin);
    stdin.resume();
    stdin.setRawMode(true);
    stdout.write(question);
    stdin.on('keypress', onKeypress);
  });
}

async function getNewPassword(args) {
  const fromEnv = process.env.CMS_RESET_PASSWORD || process.env.RESET_CMS_PASSWORD;
  const password = args.password || fromEnv;
  if (password) return String(password);

  const first = await promptHidden('Password CMS baru: ');
  const second = await promptHidden('Ulangi password CMS baru: ');
  if (first !== second) throw new Error('Password yang dimasukkan tidak sama.');
  return first;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const username = normalizeUsername(args.username || process.env.CMS_RESET_USERNAME || process.env.ADMIN_USERNAME || 'admin');
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error('Username minimal 3 karakter dan hanya boleh memakai huruf kecil, angka, titik, garis bawah, atau strip.');
  }

  const password = await getNewPassword(args);
  if (password.length < 10) throw new Error('Password baru minimal 10 karakter.');

  const dataStore = createDataStore();
  await dataStore.init();

  const existing = await dataStore.findUserByUsername(username);
  const role = cleanText(args.role || process.env.CMS_RESET_ROLE || existing?.role || 'owner', 20).toLowerCase();
  if (!USER_ROLES.has(role)) throw new Error('Role harus owner, admin, atau editor.');

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  const user = existing ? {
    ...existing,
    name: cleanText(args.name || process.env.CMS_RESET_NAME || existing.name || username, 80),
    role,
    active: true,
    passwordHash,
    updatedAt: now
  } : {
    id: `USR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
    username,
    name: cleanText(args.name || process.env.CMS_RESET_NAME || (username === 'admin' ? 'Admin Owner' : username), 80),
    role,
    active: true,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  if (existing) await dataStore.updateUser(existing.id, user);
  else await dataStore.createUser(user);

  console.log(`Password CMS untuk username "${username}" berhasil ${existing ? 'direset' : 'dibuat'} di storage ${dataStore.mode}.`);
  console.log('Silakan login ulang di /admin memakai password baru. Password tidak ditampilkan dan hanya hash yang disimpan.');
}

main().catch((error) => {
  console.error(`Gagal reset password CMS: ${error.message}`);
  process.exitCode = 1;
});
