'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_FILES = {
  products: path.join(ROOT, 'data', 'products.json'),
  orders: path.join(ROOT, 'data', 'orders.json'),
  users: path.join(ROOT, 'data', 'users.json')
};

function asObject(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function createFileStore(files) {
  const queues = new Map();

  async function read(file) {
    try {
      const value = JSON.parse(await fs.readFile(file, 'utf8'));
      return Array.isArray(value) ? value : [];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async function mutate(file, updater) {
    const previous = queues.get(file) || Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      const current = await read(file);
      const updated = updater(current);
      const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(temp, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
      await fs.rename(temp, file);
      return updated;
    });
    queues.set(file, next);
    return next;
  }

  return {
    mode: 'file',
    async init() {
      await Promise.all(Object.values(files).map(async (file) => {
        try { await fs.access(file); } catch { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, '[]\n', { flag: 'wx' }); }
      }));
    },
    listProducts: () => read(files.products),
    async createProduct(product) { await mutate(files.products, (items) => [product, ...items]); return product; },
    async updateProduct(id, product) { await mutate(files.products, (items) => items.map((item) => item.id === id ? product : item)); return product; },
    async deleteProduct(id) { await mutate(files.products, (items) => items.filter((item) => item.id !== id)); },
    listOrders: async () => (await read(files.orders)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    async createOrder(order) { await mutate(files.orders, (items) => [...items, order]); return order; },
    async updateOrderStatus(id, statusEntry) {
      let updated;
      await mutate(files.orders, (items) => items.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, status: statusEntry.status, updatedAt: statusEntry.at, statusHistory: [...(item.statusHistory || []), statusEntry] };
        return updated;
      }));
      return updated;
    },
    listUsers: async () => (await read(files.users)).sort((a, b) => String(a.username).localeCompare(String(b.username))),
    async findUserByUsername(username) { return (await read(files.users)).find((user) => user.username.toLowerCase() === String(username).toLowerCase()) || null; },
    async findUserById(id) { return (await read(files.users)).find((user) => user.id === id) || null; },
    async createUser(user) { await mutate(files.users, (items) => [...items, user]); return user; },
    async updateUser(id, user) { await mutate(files.users, (items) => items.map((item) => item.id === id ? user : item)); return user; },
    async deleteUser(id) { await mutate(files.users, (items) => items.filter((item) => item.id !== id)); }
  };
}

function createPostgresStore(connectionString, seedFiles) {
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(connectionString);
  let initPromise;

  async function query(text, params = []) {
    return sql.query(text, params);
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      await query('CREATE TABLE IF NOT EXISTS aome_products (id TEXT PRIMARY KEY, position BIGINT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
      await query('CREATE TABLE IF NOT EXISTS aome_orders (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
      await query('CREATE TABLE IF NOT EXISTS aome_users (id TEXT PRIMARY KEY, username_key TEXT UNIQUE NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
      const [{ count: productCount }] = await query('SELECT COUNT(*)::int AS count FROM aome_products');
      if (!productCount) {
        const seedProducts = JSON.parse(await fs.readFile(seedFiles.products, 'utf8'));
        for (let index = 0; index < seedProducts.length; index += 1) {
          const product = seedProducts[index];
          await query('INSERT INTO aome_products (id, position, data) VALUES ($1, $2, CAST($3 AS jsonb)) ON CONFLICT (id) DO NOTHING', [product.id, index, JSON.stringify(product)]);
        }
      }
    })().catch((error) => { initPromise = null; throw error; });
    return initPromise;
  }

  async function list(table, orderBy) {
    await init();
    const rows = await query(`SELECT data FROM ${table} ORDER BY ${orderBy}`);
    return rows.map((row) => asObject(row.data));
  }

  return {
    mode: 'postgres', init,
    listProducts: () => list('aome_products', 'position ASC, created_at ASC'),
    async createProduct(product) { await init(); await query('INSERT INTO aome_products (id, position, data) VALUES ($1, $2, CAST($3 AS jsonb))', [product.id, -Date.now(), JSON.stringify(product)]); return product; },
    async updateProduct(id, product) { await init(); await query('UPDATE aome_products SET data = CAST($2 AS jsonb), updated_at = NOW() WHERE id = $1', [id, JSON.stringify(product)]); return product; },
    async deleteProduct(id) { await init(); await query('DELETE FROM aome_products WHERE id = $1', [id]); },
    listOrders: () => list('aome_orders', 'created_at DESC'),
    async createOrder(order) { await init(); await query('INSERT INTO aome_orders (id, data, created_at) VALUES ($1, CAST($2 AS jsonb), $3)', [order.id, JSON.stringify(order), order.createdAt]); return order; },
    async updateOrderStatus(id, statusEntry) {
      await init();
      const rows = await query('SELECT data FROM aome_orders WHERE id = $1 LIMIT 1', [id]);
      if (!rows.length) return null;
      const current = asObject(rows[0].data);
      const updated = { ...current, status: statusEntry.status, updatedAt: statusEntry.at, statusHistory: [...(current.statusHistory || []), statusEntry] };
      await query('UPDATE aome_orders SET data = CAST($2 AS jsonb), updated_at = NOW() WHERE id = $1', [id, JSON.stringify(updated)]);
      return updated;
    },
    listUsers: () => list('aome_users', "data->>'username' ASC"),
    async findUserByUsername(username) { await init(); const rows = await query('SELECT data FROM aome_users WHERE username_key = $1 LIMIT 1', [String(username).toLowerCase()]); return rows.length ? asObject(rows[0].data) : null; },
    async findUserById(id) { await init(); const rows = await query('SELECT data FROM aome_users WHERE id = $1 LIMIT 1', [id]); return rows.length ? asObject(rows[0].data) : null; },
    async createUser(user) { await init(); await query('INSERT INTO aome_users (id, username_key, data) VALUES ($1, $2, CAST($3 AS jsonb))', [user.id, user.username.toLowerCase(), JSON.stringify(user)]); return user; },
    async updateUser(id, user) { await init(); await query('UPDATE aome_users SET username_key = $2, data = CAST($3 AS jsonb), updated_at = NOW() WHERE id = $1', [id, user.username.toLowerCase(), JSON.stringify(user)]); return user; },
    async deleteUser(id) { await init(); await query('DELETE FROM aome_users WHERE id = $1', [id]); }
  };
}

function createDataStore(options = {}) {
  const files = {
    products: options.productsFile || DEFAULT_FILES.products,
    orders: options.ordersFile || DEFAULT_FILES.orders,
    users: options.usersFile || DEFAULT_FILES.users
  };
  const connectionString = options.databaseUrl ?? process.env.DATABASE_URL;
  return connectionString ? createPostgresStore(connectionString, files) : createFileStore(files);
}

module.exports = { createDataStore };
