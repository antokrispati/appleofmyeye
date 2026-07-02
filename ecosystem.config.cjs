module.exports = {
  apps: [
    {
      name: 'apple-of-my-eye',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        SESSION_SECRET: process.env.SESSION_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN
      }
    }
  ]
};
