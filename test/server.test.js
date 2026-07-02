'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

async function withServer(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aome-test-'));
  const ordersFile = path.join(directory, 'orders.json');
  const productsFile = path.join(directory, 'products.json');
  const usersFile = path.join(directory, 'users.json');
  const uploadDir = path.join(directory, 'uploads');
  await fs.copyFile(path.join(__dirname, '..', 'data', 'products.json'), productsFile);
  await Promise.all([
    fs.writeFile(ordersFile, '[]\n'),
    fs.writeFile(usersFile, '[]\n')
  ]);
  const server = createServer({
    ordersFile,
    productsFile,
    usersFile,
    uploadDir,
    adminUsername: 'admin',
    adminPassword: 'test-password-123',
    sessionSecret: 'test-session-secret-with-more-than-32-characters'
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`, { ordersFile, productsFile, usersFile, uploadDir });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('health endpoint menjawab dan source server tidak terekspos', async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');

    const source = await fetch(`${baseUrl}/server.js`);
    assert.equal(source.status, 404);
  });
});

async function loginAdmin(baseUrl) {
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'test-password-123' })
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  return {
    session,
    cookie: login.headers.get('set-cookie').split(';')[0],
    headers: {
      'Content-Type': 'application/json',
      Cookie: login.headers.get('set-cookie').split(';')[0],
      'X-CSRF-Token': session.csrfToken
    }
  };
}

test('katalog dapat difilter berdasarkan kategori', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products?category=kids`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.ok(payload.count >= 2);
    assert.ok(payload.products.every((product) => product.category === 'kids'));
  });
});

test('checkout menolak data kosong', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.error, 'Data checkout belum valid.');
    assert.ok(payload.details.length > 0);
  });
});

test('checkout menghitung total di server dan menyimpan pesanan', async () => {
  await withServer(async (baseUrl, { ordersFile }) => {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Pelanggan Uji',
          whatsapp: '081234567890',
          email: 'pelanggan@example.com',
          address: 'Jalan Pengujian Nomor 12',
          city: 'Jakarta',
          postalCode: '12345'
        },
        shippingId: 'jne',
        paymentId: 'bank_transfer',
        items: [{ productId: 'AOME-001', size: 'M', quantity: 2, price: 1 }]
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.order.subtotal, 898000);
    assert.equal(payload.order.total, 916000);
    assert.match(payload.order.id, /^AOME-\d{8}-[A-F0-9]{6}$/);

    const saved = JSON.parse(await fs.readFile(ordersFile, 'utf8'));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].items[0].unitPrice, 449000);
  });
});

test('CMS menolak akses tanpa sesi dan menerima login yang valid', async () => {
  await withServer(async (baseUrl) => {
    const unauthorized = await fetch(`${baseUrl}/api/admin/products`);
    assert.equal(unauthorized.status, 401);

    const badLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'salah' })
    });
    assert.equal(badLogin.status, 401);

    const login = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'test-password-123' })
    });
    const payload = await login.json();
    assert.equal(login.status, 200);
    assert.ok(payload.csrfToken);
    assert.match(login.headers.get('set-cookie'), /aome_admin=/);
  });
});

test('CMS dapat membuat, memperbarui, dan menghapus produk', async () => {
  await withServer(async (baseUrl, { productsFile }) => {
    const login = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'test-password-123' })
    });
    const session = await login.json();
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const headers = { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': session.csrfToken };
    const product = {
      nameId: 'Produk CMS Uji', nameEn: 'CMS Test Product',
      descriptionId: 'Deskripsi produk uji yang lengkap.', descriptionEn: 'A complete test product description.',
      category: 'test', categoryId: 'Pengujian', categoryEn: 'Testing',
      price: 125000, compareAtPrice: 150000, image: '/images/icon-apple.png',
      sizes: ['S', 'M'], stock: 7, badgeId: 'Uji', badgeEn: 'Test', featured: true
    };

    const create = await fetch(`${baseUrl}/api/admin/products`, { method: 'POST', headers, body: JSON.stringify(product) });
    const created = await create.json();
    assert.equal(create.status, 201);
    assert.match(created.product.id, /^AOME-[A-F0-9]{8}$/);

    const update = await fetch(`${baseUrl}/api/admin/products/${created.product.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ ...product, price: 135000, stock: 5 })
    });
    const updated = await update.json();
    assert.equal(update.status, 200);
    assert.equal(updated.product.price, 135000);
    assert.equal(updated.product.stock, 5);

    const remove = await fetch(`${baseUrl}/api/admin/products/${created.product.id}`, { method: 'DELETE', headers });
    assert.equal(remove.status, 200);
    const saved = JSON.parse(await fs.readFile(productsFile, 'utf8'));
    assert.equal(saved.some((item) => item.id === created.product.id), false);
  });
});

test('CMS memvalidasi dan menyimpan upload gambar', async () => {
  await withServer(async (baseUrl, { uploadDir }) => {
    const login = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'test-password-123' })
    });
    const session = await login.json();
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwM6WQAAAABJRU5ErkJggg==';
    const upload = await fetch(`${baseUrl}/api/admin/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': session.csrfToken },
      body: JSON.stringify({ name: 'produk-uji.png', mimeType: 'image/png', data: png })
    });
    const payload = await upload.json();
    assert.equal(upload.status, 201);
    assert.match(payload.image, /^\/images\/uploads\/.+\.png$/);
    const files = await fs.readdir(uploadDir);
    assert.equal(files.length, 1);
  });
});

test('dashboard mencatat transaksi dan admin dapat memperbarui statusnya', async () => {
  await withServer(async (baseUrl) => {
    const checkout = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Pembeli Dashboard', whatsapp: '081234567890', email: 'dashboard@example.com',
          address: 'Jalan Dashboard Nomor 10', city: 'Bandung', postalCode: '40111'
        },
        shippingId: 'jne', paymentId: 'bank_transfer',
        items: [{ productId: 'AOME-001', size: 'M', quantity: 1 }]
      })
    });
    const checkoutPayload = await checkout.json();
    assert.equal(checkout.status, 201);

    const admin = await loginAdmin(baseUrl);
    const update = await fetch(`${baseUrl}/api/admin/orders/${checkoutPayload.order.id}`, {
      method: 'PATCH', headers: admin.headers, body: JSON.stringify({ status: 'paid', note: 'Pembayaran terverifikasi.' })
    });
    assert.equal(update.status, 200);
    const updated = await update.json();
    assert.equal(updated.order.status, 'paid');
    assert.equal(updated.order.statusHistory.at(-1).by, 'admin');

    const dashboard = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Cookie: admin.cookie } });
    const payload = await dashboard.json();
    assert.equal(dashboard.status, 200);
    assert.equal(payload.dashboard.totalOrders, 1);
    assert.equal(payload.dashboard.revenue, checkoutPayload.order.total);
    assert.equal(payload.dashboard.statusCounts.paid, 1);
  });
});

test('owner dapat membuat pengguna CMS dan password tidak disimpan sebagai teks biasa', async () => {
  await withServer(async (baseUrl, { usersFile }) => {
    const admin = await loginAdmin(baseUrl);
    const create = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST', headers: admin.headers,
      body: JSON.stringify({ username: 'operator', name: 'Operator Toko', role: 'editor', password: 'password-operator-aman', active: true })
    });
    const created = await create.json();
    assert.equal(create.status, 201);
    assert.equal(created.user.username, 'operator');
    assert.equal(created.user.passwordHash, undefined);

    const saved = JSON.parse(await fs.readFile(usersFile, 'utf8'));
    assert.equal(saved.length, 1);
    assert.notEqual(saved[0].passwordHash, 'password-operator-aman');
    assert.match(saved[0].passwordHash, /^scrypt\$/);

    const userLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'password-operator-aman' })
    });
    assert.equal(userLogin.status, 200);
    assert.equal((await userLogin.json()).user.role, 'editor');
  });
});
