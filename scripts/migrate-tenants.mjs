import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { parse } from 'dotenv';
// Explicit development config only; never fall back to the live DATABASE_URL.
export async function developmentConnections() {
  const env=parse(await readFile(new URL('../.env.multiempresa.local',import.meta.url)));
  const direct=env.MULTITENANT_DATABASE_URL_UNPOOLED;
  const pooled=env.MULTITENANT_DATABASE_URL;
  for(const value of [direct,pooled]) {
    if(!value || !['ep-fragrant-field-babzrb6l.c-8.eu-central-1.aws.neon.tech','ep-fragrant-field-babzrb6l-pooler.c-8.eu-central-1.aws.neon.tech'].includes(new URL(value).hostname)) throw new Error('Se requiere la conexión exclusiva de dev-multiempresa. No se modifica producción.');
  }
  return {direct,pooled};
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/migrate-tenants.mjs')) {
  const {direct}=await developmentConnections();
  const client=new pg.Client({connectionString:direct,connectionTimeoutMillis:10000});
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(new URL('../migrations/002-tenants.sql',import.meta.url),'utf8'));
    await client.query('COMMIT');
    console.log('PASS: tablas multiempresa preparadas únicamente en dev-multiempresa.');
  } catch(error) {await client.query('ROLLBACK');throw error;}
  finally {await client.end();}
}
