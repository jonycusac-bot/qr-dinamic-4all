import pg from 'pg';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error('Falta DATABASE_URL en .env.local o en las variables de Vercel.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10000,
});

try {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT current_database() AS database, to_regclass('qr_app_state') AS state_table, now() AS checked_at");
    if (!result.rows[0].state_table) throw new Error('Falta el esquema: ejecuta npm run db:migrate.');
    console.log(`Neon conectado correctamente. Base: ${result.rows[0].database}`);
  } finally {
    client.release();
  }
} catch (error) {
  console.error('No se pudo conectar con Neon:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
