import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import pg from 'pg';
import { createPostgresStore, type AppState } from '../state-store.js';

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED) throw new Error('Se requieren DATABASE_URL y DATABASE_URL_UNPOOLED.');
process.env.VERCEL = '1';
const { createApp, closeDatabase } = await import('../server.js');
const schema = `qr_test_${randomBytes(6).toString('hex')}`;
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, connectionTimeoutMillis: 10000 });
const seed: AppState = { projects: [], users: [], scans: [] };
const store = createPostgresStore(process.env.DATABASE_URL, seed, schema);
const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function serve() {
  const app = await createApp(store, ''); // Isolated storage test; panel access is tested separately.
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { base: `http://127.0.0.1:${address.port}`, close: async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}
await admin.connect();
let live: Awaited<ReturnType<typeof serve>> | undefined;
try {
  const before = await admin.query('SELECT md5(state::text) AS hash FROM public.qr_app_state WHERE id = 1');
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query('BEGIN');
  await admin.query("SELECT set_config('search_path', $1, true)", [schema]);
  await admin.query(await readFile(new URL('../migrations/001-state.sql', import.meta.url), 'utf8'));
  await admin.query('COMMIT');
  live = await serve();
  const created = await fetch(`${live.base}/api/projects`, json('POST', { shortCode: 'neon-e2e', clientName: 'Cliente ficticio E2E', destinationUrl: 'https://example.com/first' }));
  assert.equal(created.status, 201); const project = await created.json();
  assert.equal((await fetch(`${live.base}/api/projects/${project.id}`, json('PUT', { destinationUrl: 'https://example.com/second' }))).status, 200);
  const userResponse = await fetch(`${live.base}/api/users`, json('POST', { name: 'Técnico ficticio', email: 'test@example.com' }));
  assert.equal(userResponse.status, 201); const user = await userResponse.json();
  const redirects = await Promise.all(Array.from({ length: 5 }, () => fetch(`${live!.base}/r/neon-e2e`, { redirect: 'manual' })));
  for (const response of redirects) { assert.equal(response.status, 302); assert.equal(response.headers.get('location'), 'https://example.com/second'); }
  assert.equal((await fetch(`${live.base}/api/scans/record`, json('POST', { shortCode: 'neon-e2e' }))).status, 200);
  await live.close(); live = await serve();
  const persisted = await (await fetch(`${live.base}/api/state`)).json();
  assert.equal(persisted.projects[0].scanCount, 6); assert.equal(persisted.scans.length, 6);
  assert.equal(persisted.projects[0].destinationHistory[0].url, 'https://example.com/first');
  assert.equal(persisted.users[0].id, user.id);
  assert.equal((await fetch(`${live.base}/api/projects/${project.id}`, json('PUT', { status: 'paused' }))).status, 200);
  assert.equal((await fetch(`${live.base}/r/neon-e2e`)).status, 403);
  assert.equal((await fetch(`${live.base}/api/projects/${project.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(`${live.base}/api/users/${user.id}`, { method: 'DELETE' })).status, 200);
  const final = await (await fetch(`${live.base}/api/state`)).json();
  assert.equal(final.projects.length, 0); assert.equal(final.users.length, 0); assert.equal(final.scans.length, 6);
  const after = await admin.query('SELECT md5(state::text) AS hash FROM public.qr_app_state WHERE id = 1');
  assert.deepEqual(after.rows, before.rows, 'El estado de producción debe permanecer intacto.');
  console.log('PASS Neon E2E: API, altas/edición/bajas, destino 302 actualizado, 6 escaneos, historial y persistencia al reiniciar.');
  console.log('PASS: datos de producción intactos; pruebas realizadas en un esquema temporal aislado.');
} finally {
  await live?.close();
  await store.close();
  await closeDatabase();
  await admin.query('ROLLBACK').catch(() => undefined);
  // Only the randomly named schema created above is removed.
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
}
