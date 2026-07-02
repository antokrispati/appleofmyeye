'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function slugify(value) {
  return String(value || 'produk').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'produk';
}

async function saveImage({ buffer, originalName, extension, mimeType, uploadDir }) {
  const baseName = slugify(path.parse(originalName).name);
  const uniqueName = `${Date.now()}-${baseName}.${extension}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const blob = await put(`products/${uniqueName}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: mimeType,
      cacheControlMaxAge: 31536000
    });
    return blob.url;
  }
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, uniqueName), buffer, { flag: 'wx' });
  return `/images/uploads/${uniqueName}`;
}

module.exports = { saveImage };
