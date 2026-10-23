import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('Configura DATABASE_URL_UNPOOLED para ejecutar migraciones.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, max: 1, connectionTimeoutMillis: 10000 });
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(new URL('../migrations/001-state.sql', import.meta.url), 'utf8'));
    await client.query('COMMIT');
    console.log('PASS: esquema Neon preparado; los registros existentes se conservan.');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
} finally { await pool.end(); }
