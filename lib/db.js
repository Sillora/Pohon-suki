import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    const sslConfig = process.env.DB_CA_CERT
      ? {
          ca: Buffer.from(process.env.DB_CA_CERT, 'base64').toString('utf-8'),
          rejectUnauthorized: true,
        }
      : undefined;

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60000,
    });
  }
  return pool;
}
