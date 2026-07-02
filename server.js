'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createDataStore } = require('./lib/data-store');
const { hashPassword, verifyPassword, signSession, verifySession } = require('./lib/auth');
const { saveImage } = require('./lib/image-store');

const ROOT = __dirname;
const STORE_FILE = path.join(ROOT, 'data', 'store.json');
const DEFAULT_UPLOAD_DIR = path.join(ROOT, 'images', 'uploads');
const MAX_BODY_SIZE = 48 * 1024;
const MAX_UPLOAD_BODY_SIZE = 3 * 1024 * 1024;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const ORDER_STATUSES = ['pending_confirmation', 'confirmed', 'paid', 'processing', 'shipped', 'completed', 'cancelled'];
const USER_ROLES = ['owner', 'admin', 'editor'];

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

const STATIC_FILES = new Map([
  ['/', 'index.html'], ['/index.html', 'index.html'], ['/css/store.css', 'css/store.css'], ['/js/store.js', 'js/store.js'],
  ['/admin', 'admin.html'], ['/admin/', 'admin.html'], ['/admin.html', 'admin.html'], ['/css/admin.css', 'css/admin.css'], ['/js/admin.js', 'js/admin.js']
]);

function securityHeaders(contentType = 'application/json; charset=utf-8') {
  return {
    'Content-Type': contentType,
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://*.public.blob.vercel-storage.com; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin'
  };
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { ...securityHeaders(), 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body), ...extraHeaders });
  res.end(body);
}

function normalizeText(value, maxLength) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''; }
function slugify(value) { return normalizeText(value, 120).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function constantTimeEqual(left, right) { const a = crypto.createHash('sha256').update(String(left)).digest(); const b = crypto.createHash('sha256').update(String(right)).digest(); return crypto.timingSafeEqual(a, b); }
function parseCookies(req) { const cookies = {}; for (const pair of (req.headers.cookie || '').split(';')) { const index = pair.indexOf('='); if (index > 0) cookies[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim()); } return cookies; }
function isSameOrigin(req) { const origin = req.headers.origin; if (!origin) return true; try { return new URL(origin).host === req.headers.host; } catch { return false; } }
async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }

async function readBody(req, limit = MAX_BODY_SIZE) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) { const error = new Error('Payload terlalu besar.'); error.statusCode = 413; throw error; } chunks.push(chunk); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { const error = new Error('Format JSON tidak valid.'); error.statusCode = 400; throw error; }
}

function validateOrder(payload, products, store) {
  const input = payload && typeof payload.customer === 'object' ? payload.customer : {};
  const customer = { name: normalizeText(input.name, 80), whatsapp: normalizeText(input.whatsapp, 24), email: normalizeText(input.email, 120).toLowerCase(), address: normalizeText(input.address, 300), city: normalizeText(input.city, 80), postalCode: normalizeText(input.postalCode, 10), notes: normalizeText(input.notes, 300) };
  const errors = [];
  if (customer.name.length < 2) errors.push('Nama minimal 2 karakter.');
  if (!/^[+0-9][0-9\s()-]{7,22}$/.test(customer.whatsapp)) errors.push('Nomor WhatsApp tidak valid.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push('Alamat email tidak valid.');
  if (customer.address.length < 10) errors.push('Alamat pengiriman minimal 10 karakter.');
  if (customer.city.length < 2) errors.push('Kota/kabupaten wajib diisi.');
  if (customer.postalCode && !/^\d{5}$/.test(customer.postalCode)) errors.push('Kode pos harus terdiri dari 5 angka.');
  const shipping = store.shipping.find((item) => item.id === payload.shippingId); if (!shipping) errors.push('Metode pengiriman tidak valid.');
  const payment = store.payments.find((item) => item.id === payload.paymentId); if (!payment) errors.push('Metode pembayaran tidak valid.');
  const requestedItems = Array.isArray(payload.items) ? payload.items : []; if (!requestedItems.length || requestedItems.length > 20) errors.push('Keranjang harus berisi 1 sampai 20 produk.');
  const productMap = new Map(products.map((product) => [product.id, product])); const items = [];
  for (const requested of requestedItems.slice(0, 20)) {
    const product = productMap.get(normalizeText(requested.productId, 32)); const quantity = Number(requested.quantity); const size = normalizeText(requested.size, 20);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) { errors.push('Ada produk atau jumlah produk yang tidak valid.'); continue; }
    if (quantity > product.stock) { errors.push(`Stok ${product.nameId} tidak mencukupi.`); continue; }
    if (product.sizes.length && !product.sizes.includes(size)) { errors.push(`Ukuran ${product.nameId} tidak valid.`); continue; }
    items.push({ productId: product.id, slug: product.slug, name: product.nameId, image: product.image, size, quantity, unitPrice: product.price, lineTotal: product.price * quantity });
  }
  if (errors.length) return { errors };
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { value: { customer, items, shipping: { id: shipping.id, name: shipping.name, fee: shipping.fee }, payment: { id: payment.id, name: payment.nameId }, subtotal, total: subtotal + shipping.fee } };
}

function isAllowedImage(image) {
  if (/^\/images\/(?:uploads\/)?[a-zA-Z0-9._-]+$/.test(image)) return true;
  try { const url = new URL(image); return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com'); } catch { return false; }
}

function validateProduct(payload, existing = {}) {
  const sizesInput = Array.isArray(payload.sizes) ? payload.sizes : normalizeText(payload.sizes, 240).split(',');
  const sizes = [...new Set(sizesInput.map((size) => normalizeText(size, 20)).filter(Boolean))].slice(0, 12);
  const price = Number(payload.price), compareAtPrice = Number(payload.compareAtPrice || 0), stock = Number(payload.stock), image = normalizeText(payload.image, 300);
  const product = { id: existing.id || normalizeText(payload.id, 32), slug: slugify(payload.slug || payload.nameEn || payload.nameId), nameId: normalizeText(payload.nameId, 100), nameEn: normalizeText(payload.nameEn, 100), descriptionId: normalizeText(payload.descriptionId, 500), descriptionEn: normalizeText(payload.descriptionEn, 500), category: slugify(payload.category), categoryId: normalizeText(payload.categoryId, 50), categoryEn: normalizeText(payload.categoryEn, 50), price, compareAtPrice, image, sizes, stock, badgeId: normalizeText(payload.badgeId, 40), badgeEn: normalizeText(payload.badgeEn, 40), featured: payload.featured === true || payload.featured === 'true' };
  const errors = [];
  if (product.nameId.length < 2 || product.nameEn.length < 2) errors.push('Nama produk Indonesia dan Inggris wajib diisi.');
  if (product.descriptionId.length < 10 || product.descriptionEn.length < 10) errors.push('Deskripsi produk minimal 10 karakter untuk kedua bahasa.');
  if (!product.category || !product.categoryId || !product.categoryEn) errors.push('Kategori produk belum lengkap.');
  if (!Number.isInteger(price) || price < 0 || price > 1000000000) errors.push('Harga produk tidak valid.');
  if (!Number.isInteger(compareAtPrice) || compareAtPrice < 0 || compareAtPrice > 1000000000) errors.push('Harga pembanding tidak valid.');
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) errors.push('Stok produk tidak valid.');
  if (!sizes.length) errors.push('Minimal satu ukuran wajib diisi.'); if (!isAllowedImage(image)) errors.push('Gambar harus berasal dari folder images atau Vercel Blob.'); if (!product.slug) errors.push('Slug produk tidak valid.');
  return errors.length ? { errors } : { value: product };
}

function createOrderId() { const date = new Date().toISOString().slice(0, 10).replaceAll('-', ''); return `AOME-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
function publicUser(user) { const { passwordHash, ...safe } = user; return safe; }
function sessionCookie(req, token, maxAgeSeconds) { const secure = Boolean(req.socket?.encrypted) || req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.VERCEL); return `aome_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`; }

function createRequestHandler(options = {}) {
  const dataStore = options.dataStore || createDataStore(options);
  const uploadDir = options.uploadDir || DEFAULT_UPLOAD_DIR;
  const envUsername = options.adminUsername || process.env.ADMIN_USERNAME || 'admin';
  const envPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD ?? '';
  const sessionSecret = options.sessionSecret || process.env.SESSION_SECRET || envPassword;
  const rateLimit = new Map();

  function isRateLimited(key, limit = 10) { const now = Date.now(), windowMs = 15 * 60 * 1000; const recent = (rateLimit.get(key) || []).filter((time) => now - time < windowMs); recent.push(now); rateLimit.set(key, recent); return recent.length > limit; }
  function virtualOwner() { return { id: 'env-owner', username: envUsername, name: 'Environment Owner', role: 'owner', active: true, virtual: true }; }

  async function authenticate(username, password) {
    const stored = await dataStore.findUserByUsername(username);
    if (stored && stored.active && await verifyPassword(password, stored.passwordHash)) {
      stored.lastLoginAt = new Date().toISOString(); await dataStore.updateUser(stored.id, stored); return stored;
    }
    if (envPassword && constantTimeEqual(username, envUsername) && constantTimeEqual(password, envPassword)) return virtualOwner();
    return null;
  }

  async function currentSession(req) {
    if (!sessionSecret) return null;
    const payload = verifySession(parseCookies(req).aome_admin, sessionSecret); if (!payload) return null;
    const user = payload.sub === 'env-owner' ? (envPassword && payload.username === envUsername ? virtualOwner() : null) : await dataStore.findUserById(payload.sub);
    if (!user || !user.active) return null;
    return { user, csrfToken: payload.csrf };
  }

  async function requireAdmin(req, res, { csrf = false, roles = USER_ROLES } = {}) {
    if (!sessionSecret || (!envPassword && !(await dataStore.listUsers()).length)) { sendJson(res, 503, { error: 'CMS belum dikonfigurasi. Tetapkan ADMIN_PASSWORD dan SESSION_SECRET.' }); return null; }
    const session = await currentSession(req); if (!session) { sendJson(res, 401, { error: 'Sesi admin tidak valid atau sudah berakhir.' }); return null; }
    if (!roles.includes(session.user.role)) { sendJson(res, 403, { error: 'Role pengguna tidak memiliki izin untuk tindakan ini.' }); return null; }
    if (csrf && (!isSameOrigin(req) || req.headers['x-csrf-token'] !== session.csrfToken)) { sendJson(res, 403, { error: 'Permintaan admin tidak dapat diverifikasi.' }); return null; }
    return session;
  }

  async function listUsersWithOwner() {
    const users = (await dataStore.listUsers()).map(publicUser);
    if (envPassword) users.unshift(virtualOwner());
    return users;
  }

  function analytics(orders, products) {
    const now = new Date(); const today = now.toISOString().slice(0, 10); const revenueStatuses = new Set(['paid', 'processing', 'shipped', 'completed']);
    const salesByDay = [];
    for (let offset = 6; offset >= 0; offset -= 1) { const day = new Date(now); day.setUTCDate(day.getUTCDate() - offset); const date = day.toISOString().slice(0, 10); const daily = orders.filter((order) => String(order.createdAt).slice(0, 10) === date); salesByDay.push({ date, orders: daily.length, revenue: daily.filter((order) => revenueStatuses.has(order.status)).reduce((sum, order) => sum + order.total, 0) }); }
    const statusCounts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, orders.filter((order) => order.status === status).length]));
    return { totalOrders: orders.length, todayOrders: orders.filter((order) => String(order.createdAt).slice(0, 10) === today).length, pendingOrders: orders.filter((order) => ['pending_confirmation', 'confirmed'].includes(order.status)).length, revenue: orders.filter((order) => revenueStatuses.has(order.status)).reduce((sum, order) => sum + order.total, 0), averageOrder: orders.length ? Math.round(orders.reduce((sum, order) => sum + order.total, 0) / orders.length) : 0, totalProducts: products.length, lowStock: products.filter((product) => product.stock <= 5).length, statusCounts, salesByDay, recentOrders: orders.slice(0, 6) };
  }

  async function handleAdminApi(req, res, url, method) {
    if (method === 'POST' && url.pathname === '/api/admin/login') {
      const ip = req.socket?.remoteAddress || 'unknown';
      if (!sessionSecret || !isSameOrigin(req) || isRateLimited(`login:${ip}`, 8)) { sendJson(res, !sessionSecret ? 503 : 429, { error: !sessionSecret ? 'CMS belum dikonfigurasi. Tetapkan ADMIN_PASSWORD dan SESSION_SECRET.' : 'Login ditolak. Tunggu beberapa menit lalu coba lagi.' }); return; }
      const payload = await readBody(req); const user = await authenticate(payload.username || '', payload.password || '');
      if (!user) { sendJson(res, 401, { error: 'Username atau password salah.' }); return; }
      const csrfToken = crypto.randomBytes(24).toString('base64url');
      const token = signSession({ sub: user.id, username: user.username, csrf: csrfToken, exp: Date.now() + SESSION_MAX_AGE }, sessionSecret);
      sendJson(res, 200, { user: publicUser(user), csrfToken }, { 'Set-Cookie': sessionCookie(req, token, SESSION_MAX_AGE / 1000) }); return;
    }
    if (method === 'GET' && url.pathname === '/api/admin/session') { const session = await requireAdmin(req, res); if (session) sendJson(res, 200, { user: publicUser(session.user), csrfToken: session.csrfToken, storageMode: dataStore.mode }); return; }
    if (method === 'POST' && url.pathname === '/api/admin/logout') { if (!(await requireAdmin(req, res, { csrf: true }))) return; sendJson(res, 200, { success: true }, { 'Set-Cookie': sessionCookie(req, '', 0) }); return; }

    if (method === 'GET' && url.pathname === '/api/admin/dashboard') { if (!(await requireAdmin(req, res))) return; const [orders, products] = await Promise.all([dataStore.listOrders(), dataStore.listProducts()]); sendJson(res, 200, { dashboard: analytics(orders, products) }); return; }
    if (method === 'GET' && url.pathname === '/api/admin/orders') { if (!(await requireAdmin(req, res))) return; sendJson(res, 200, { orders: await dataStore.listOrders(), statuses: ORDER_STATUSES }); return; }
    const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([a-zA-Z0-9-]+)$/);
    if (orderMatch && method === 'PATCH') { const session = await requireAdmin(req, res, { csrf: true }); if (!session) return; const body = await readBody(req); if (!ORDER_STATUSES.includes(body.status)) { sendJson(res, 400, { error: 'Status transaksi tidak valid.' }); return; } const order = await dataStore.updateOrderStatus(orderMatch[1], { status: body.status, at: new Date().toISOString(), by: session.user.username, note: normalizeText(body.note, 200) }); if (!order) { sendJson(res, 404, { error: 'Transaksi tidak ditemukan.' }); return; } sendJson(res, 200, { order }); return; }

    if (method === 'GET' && url.pathname === '/api/admin/products') { if (!(await requireAdmin(req, res))) return; sendJson(res, 200, { products: await dataStore.listProducts() }); return; }
    if (method === 'POST' && url.pathname === '/api/admin/images') {
      if (!(await requireAdmin(req, res, { csrf: true }))) return; const payload = await readBody(req, MAX_UPLOAD_BODY_SIZE); const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }; const extension = extensions[payload.mimeType]; const encoded = normalizeText(payload.data, MAX_UPLOAD_BODY_SIZE);
      if (!extension || !/^[a-zA-Z0-9+/=]+$/.test(encoded)) { sendJson(res, 400, { error: 'Format gambar tidak didukung.' }); return; }
      const buffer = Buffer.from(encoded, 'base64'); const png = buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'; const jpeg = buffer.subarray(0, 3).toString('hex') === 'ffd8ff'; const webp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
      if (!buffer.length || buffer.length > MAX_IMAGE_SIZE || (extension === 'png' && !png) || (extension === 'jpg' && !jpeg) || (extension === 'webp' && !webp)) { sendJson(res, 400, { error: 'Isi atau ukuran gambar tidak valid. Maksimal 2 MB.' }); return; }
      const image = await saveImage({ buffer, originalName: normalizeText(payload.name, 100), extension, mimeType: payload.mimeType, uploadDir }); sendJson(res, 201, { image }); return;
    }
    if (method === 'POST' && url.pathname === '/api/admin/products') { if (!(await requireAdmin(req, res, { csrf: true }))) return; const payload = await readBody(req); payload.id = `AOME-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; const validation = validateProduct(payload); if (validation.errors) { sendJson(res, 400, { error: 'Data produk belum valid.', details: validation.errors }); return; } const products = await dataStore.listProducts(); if (products.some((item) => item.slug === validation.value.slug)) validation.value.slug += `-${crypto.randomBytes(2).toString('hex')}`; sendJson(res, 201, { product: await dataStore.createProduct(validation.value) }); return; }
    const productMatch = url.pathname.match(/^\/api\/admin\/products\/([a-zA-Z0-9_-]+)$/);
    if (productMatch && method === 'PUT') { if (!(await requireAdmin(req, res, { csrf: true }))) return; const products = await dataStore.listProducts(); const existing = products.find((product) => product.id === productMatch[1]); if (!existing) { sendJson(res, 404, { error: 'Produk tidak ditemukan.' }); return; } const validation = validateProduct(await readBody(req), existing); if (validation.errors) { sendJson(res, 400, { error: 'Data produk belum valid.', details: validation.errors }); return; } if (products.some((item) => item.id !== existing.id && item.slug === validation.value.slug)) validation.value.slug += `-${crypto.randomBytes(2).toString('hex')}`; sendJson(res, 200, { product: await dataStore.updateProduct(existing.id, validation.value) }); return; }
    if (productMatch && method === 'DELETE') { if (!(await requireAdmin(req, res, { csrf: true }))) return; const products = await dataStore.listProducts(); if (!products.some((product) => product.id === productMatch[1])) { sendJson(res, 404, { error: 'Produk tidak ditemukan.' }); return; } await dataStore.deleteProduct(productMatch[1]); sendJson(res, 200, { success: true }); return; }

    if (method === 'GET' && url.pathname === '/api/admin/users') { if (!(await requireAdmin(req, res, { roles: ['owner', 'admin'] }))) return; sendJson(res, 200, { users: await listUsersWithOwner(), roles: USER_ROLES }); return; }
    if (method === 'POST' && url.pathname === '/api/admin/users') {
      const session = await requireAdmin(req, res, { csrf: true, roles: ['owner', 'admin'] }); if (!session) return; const body = await readBody(req); const username = normalizeText(body.username, 40).toLowerCase(), name = normalizeText(body.name, 80), role = normalizeText(body.role, 20), password = String(body.password || ''); const errors = [];
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) errors.push('Username minimal 3 karakter dan hanya boleh memakai huruf kecil, angka, titik, garis bawah, atau strip.'); if (name.length < 2) errors.push('Nama pengguna wajib diisi.'); if (!USER_ROLES.includes(role)) errors.push('Role pengguna tidak valid.'); if (session.user.role === 'admin' && role === 'owner') errors.push('Admin tidak dapat membuat owner.'); if (password.length < 10) errors.push('Password minimal 10 karakter.'); if (await dataStore.findUserByUsername(username) || (envPassword && username === envUsername.toLowerCase())) errors.push('Username sudah digunakan.');
      if (errors.length) { sendJson(res, 400, { error: 'Data pengguna belum valid.', details: errors }); return; }
      const now = new Date().toISOString(); const user = { id: `USR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`, username, name, role, active: body.active !== false, passwordHash: await hashPassword(password), createdAt: now, updatedAt: now, lastLoginAt: null };
      sendJson(res, 201, { user: publicUser(await dataStore.createUser(user)) }); return;
    }
    const userMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)$/);
    if (userMatch && method === 'PUT') {
      const session = await requireAdmin(req, res, { csrf: true, roles: ['owner', 'admin'] }); if (!session) return; const existing = await dataStore.findUserById(userMatch[1]); if (!existing) { sendJson(res, 404, { error: 'Pengguna tidak ditemukan.' }); return; } if (existing.role === 'owner' && session.user.role !== 'owner') { sendJson(res, 403, { error: 'Admin tidak dapat mengubah akun owner.' }); return; }
      const body = await readBody(req); const name = normalizeText(body.name, 80), role = normalizeText(body.role, 20); const active = body.active !== false; const errors = []; if (name.length < 2) errors.push('Nama pengguna wajib diisi.'); if (!USER_ROLES.includes(role)) errors.push('Role pengguna tidak valid.'); if (session.user.role === 'admin' && role === 'owner') errors.push('Admin tidak dapat menetapkan role owner.'); if (existing.id === session.user.id && !active) errors.push('Anda tidak dapat menonaktifkan akun sendiri.'); if (body.password && String(body.password).length < 10) errors.push('Password baru minimal 10 karakter.'); if (errors.length) { sendJson(res, 400, { error: 'Data pengguna belum valid.', details: errors }); return; }
      const user = { ...existing, name, role, active, updatedAt: new Date().toISOString() }; if (body.password) user.passwordHash = await hashPassword(body.password); sendJson(res, 200, { user: publicUser(await dataStore.updateUser(existing.id, user)) }); return;
    }
    if (userMatch && method === 'DELETE') { const session = await requireAdmin(req, res, { csrf: true, roles: ['owner', 'admin'] }); if (!session) return; const existing = await dataStore.findUserById(userMatch[1]); if (!existing) { sendJson(res, 404, { error: 'Pengguna tidak ditemukan.' }); return; } if (existing.id === session.user.id) { sendJson(res, 400, { error: 'Anda tidak dapat menghapus akun sendiri.' }); return; } if (existing.role === 'owner' && session.user.role !== 'owner') { sendJson(res, 403, { error: 'Admin tidak dapat menghapus owner.' }); return; } await dataStore.deleteUser(existing.id); sendJson(res, 200, { success: true }); return; }
    sendJson(res, 404, { error: 'Endpoint admin tidak ditemukan.' });
  }

  return async function requestHandler(req, res) {
    const method = req.method || 'GET'; let url;
    try { url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`); } catch { sendJson(res, 400, { error: 'URL tidak valid.' }); return; }
    try {
      await dataStore.init();
      if (url.pathname.startsWith('/api/admin/')) { await handleAdminApi(req, res, url, method); return; }
      if (method === 'GET' && url.pathname === '/api/health') { sendJson(res, 200, { status: 'ok', service: 'apple-of-my-eye-store', storage: dataStore.mode, timestamp: new Date().toISOString() }); return; }
      if (method === 'GET' && url.pathname === '/api/store') { const [store, products] = await Promise.all([readJson(STORE_FILE), dataStore.listProducts()]); store.whatsapp = process.env.STORE_WHATSAPP || store.whatsapp; sendJson(res, 200, { store, products }); return; }
      if (method === 'GET' && url.pathname === '/api/products') { const products = await dataStore.listProducts(); const category = normalizeText(url.searchParams.get('category'), 30).toLowerCase(), query = normalizeText(url.searchParams.get('q'), 80).toLowerCase(); const filtered = products.filter((product) => { const categoryMatch = !category || category === 'all' || product.category === category; const haystack = `${product.nameId} ${product.nameEn} ${product.descriptionId} ${product.categoryId}`.toLowerCase(); return categoryMatch && (!query || haystack.includes(query)); }); sendJson(res, 200, { products: filtered, count: filtered.length }); return; }
      if (method === 'POST' && url.pathname === '/api/orders') { const ip = req.socket?.remoteAddress || 'unknown'; if (isRateLimited(`order:${ip}`)) { sendJson(res, 429, { error: 'Terlalu banyak percobaan. Silakan coba lagi beberapa menit lagi.' }, { 'Retry-After': '900' }); return; } const [payload, products, store] = await Promise.all([readBody(req), dataStore.listProducts(), readJson(STORE_FILE)]); const validation = validateOrder(payload, products, store); if (validation.errors) { sendJson(res, 400, { error: 'Data checkout belum valid.', details: validation.errors }); return; } const now = new Date().toISOString(); const order = { id: createOrderId(), status: 'pending_confirmation', createdAt: now, updatedAt: now, statusHistory: [{ status: 'pending_confirmation', at: now, by: 'customer', note: '' }], ...validation.value }; await dataStore.createOrder(order); const whatsapp = process.env.STORE_WHATSAPP || store.whatsapp; const message = encodeURIComponent(`Halo Apple of My Eye, saya sudah membuat pesanan ${order.id} dengan total Rp${order.total.toLocaleString('id-ID')}. Mohon konfirmasi pembayaran dan pengirimannya.`); sendJson(res, 201, { order: { id: order.id, status: order.status, subtotal: order.subtotal, shipping: order.shipping, total: order.total }, whatsappUrl: `https://wa.me/${whatsapp}?text=${message}` }); return; }
      if (method === 'GET' && ['/fashion.html', '/electronic.html', '/jewellery.html'].includes(url.pathname)) { res.writeHead(302, { Location: '/#shop', ...securityHeaders('text/plain; charset=utf-8') }); res.end('Redirecting'); return; }
      if (method === 'GET' || method === 'HEAD') { let relativeFile = STATIC_FILES.get(url.pathname), customFile; if (!relativeFile && /^\/images\/[a-zA-Z0-9._-]+$/.test(url.pathname)) relativeFile = url.pathname.slice(1); if (!relativeFile && /^\/images\/uploads\/[a-zA-Z0-9._-]+$/.test(url.pathname)) customFile = path.join(uploadDir, path.basename(url.pathname)); if (relativeFile || customFile) { const filePath = customFile || path.join(ROOT, relativeFile); const content = await fs.readFile(filePath); const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'; const cache = url.pathname.startsWith('/images/') ? 'public, max-age=604800' : 'no-cache'; res.writeHead(200, { ...securityHeaders(contentType), 'Cache-Control': cache, 'Content-Length': content.length }); res.end(method === 'HEAD' ? undefined : content); return; } }
      sendJson(res, 404, { error: 'Halaman tidak ditemukan.' });
    } catch (error) { const status = error.statusCode || (error.code === 'ENOENT' ? 404 : 500); if (status >= 500) console.error(error); sendJson(res, status, { error: status >= 500 ? 'Terjadi kesalahan pada server.' : (error.message || 'Data tidak ditemukan.') }); }
  };
}

function createServer(options = {}) { return http.createServer(createRequestHandler(options)); }

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000, host = process.env.HOST || '0.0.0.0'; const server = createServer();
  server.listen(port, host, () => { console.log(`Apple of My Eye berjalan di http://${host}:${port}`); if (!process.env.ADMIN_PASSWORD && !process.env.DATABASE_URL) console.warn('CMS nonaktif: tetapkan ADMIN_PASSWORD dan SESSION_SECRET.'); });
}

module.exports = { createServer, createRequestHandler, validateOrder, validateProduct };
