import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import type { AppState, StateStore } from '../state-store.js';
import { requestJson } from '../src/utils/api.js';
process.env.VERCEL = '1';
delete process.env.DATABASE_URL;
const { createApp } = await import('../server.js');
function memoryStore(): StateStore & { data: AppState; failCommit: boolean; failRead: boolean } {
  return {
    data: { projects: [], users: [], scans: [] }, failCommit: false, failRead: false,
    async transaction(work) {
      if (this.failRead) throw new Error('Test connection unavailable');
      const result = await work(structuredClone(this.data));
      if (this.failCommit) throw new Error('Test commit rejected');
      this.data = structuredClone(result);
    },
  };
}
async function serve(store: StateStore | null, password = '') {
  const app = await createApp(store, password);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { base: `http://127.0.0.1:${address.port}`, close: async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}
const headers = { 'Content-Type': 'application/json' };
const json = (method: string, body: unknown) => ({ method, headers, body: JSON.stringify(body) });
test('unified data: CRUD, immutable QR, redirects, scans, concurrent requests, archive and restart', async () => {
  const store = memoryStore();
  let live = await serve(store);
  try {
    assert.deepEqual(await (await fetch(`${live.base}/api/projects`)).json(), []);
    const created = await fetch(`${live.base}/api/projects`, json('POST', { shortCode: 'stable-qr', destinationUrl: 'https://example.com/first', clientName: '<script>bad()</script>' }));
    assert.equal(created.status, 201);
    const project = await created.json();
    assert.equal((await fetch(`${live.base}/api/projects`, json('POST', { shortCode: 'STABLE-QR' }))).status, 409);
    assert.equal((await fetch(`${live.base}/api/projects`, json('POST', { destinationUrl: 'javascript:alert(1)' }))).status, 400);
    assert.equal((await fetch(`${live.base}/api/projects`, json('POST', { shortCode: '' }))).status, 400);
    assert.equal((await fetch(`${live.base}/api/projects`, json('POST', { qrDesign: null }))).status, 400);
    assert.equal((await fetch(`${live.base}/api/projects/${project.id}`, json('PUT', { shortCode: 'changed' }))).status, 409);
    const update = await fetch(`${live.base}/api/projects/${project.id}`, json('PUT', { id: 'forged', scanCount: 999, destinationHistory: [], destinationUrl: 'https://example.com/second', changeReason: 'Test' }));
    assert.equal(update.status, 200);
    const updated = await update.json();
    assert.equal(updated.id, project.id); assert.equal(updated.scanCount, 0);
    assert.equal(updated.destinationHistory[0].url, 'https://example.com/first');
    await live.close(); live = await serve(store);
    const redirect = await fetch(`${live.base}/r/stable-qr`, { redirect: 'manual' });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), 'https://example.com/second');
    assert.match(redirect.headers.get('cache-control')!, /no-store/);
    assert.equal(store.data.scans.length, 1);
    await Promise.all(Array.from({ length: 8 }, () => fetch(`${live.base}/r/stable-qr`, { redirect: 'manual' })));
    assert.equal(store.data.projects[0].scanCount, 9, 'concurrent scans cannot overwrite one another');
    assert.equal(store.data.scans.length, 9);
    await fetch(`${live.base}/api/projects/${project.id}`, json('PUT', { status: 'paused' }));
    const paused = await fetch(`${live.base}/r/stable-qr`);
    assert.equal(paused.status, 403); assert.doesNotMatch(await paused.text(), /<script>bad\(\)<\/script>/);
    await fetch(`${live.base}/api/projects/${project.id}`, json('PUT', { status: 'archived' }));
    assert.equal((await fetch(`${live.base}/r/stable-qr`)).status, 403);
    assert.equal((await fetch(`${live.base}/api/scans/record`, json('POST', { shortCode: 'unknown' }))).status, 404);
    const userResponse = await fetch(`${live.base}/api/users`, json('POST', { name: 'Prueba', email: 'test@example.com' }));
    assert.equal(userResponse.status, 201); const user = await userResponse.json();
    await fetch(`${live.base}/api/users/${user.id}`, json('PUT', { name: 'Editado', id: 'forged' }));
    assert.equal(store.data.users[0].id, user.id); assert.equal(store.data.users[0].name, 'Editado');
    await fetch(`${live.base}/api/users/${user.id}`, { method: 'DELETE' });
    await fetch(`${live.base}/api/projects/${project.id}`, { method: 'DELETE' });
    const state = await (await fetch(`${live.base}/api/state`)).json();
    assert.deepEqual(state.projects, []); assert.deepEqual(state.users, []);
    assert.equal(state.scans.length, 9, 'deleting an installation preserves scan history');
  } finally { await live.close(); }
});
test('failed read/commit returns 503 without fake success or redirect; queue recovers', async () => {
  const store = memoryStore(); const live = await serve(store);
  try {
    store.failCommit = true;
    assert.equal((await fetch(`${live.base}/api/projects`, json('POST', { shortCode: 'failed' }))).status, 503);
    assert.deepEqual(store.data.projects, []);
    store.failCommit = false;
    await fetch(`${live.base}/api/projects`, json('POST', { shortCode: 'real', destinationUrl: 'https://example.com' }));
    store.failCommit = true;
    const redirect = await fetch(`${live.base}/r/real`, { redirect: 'manual' });
    assert.equal(redirect.status, 503); assert.equal(redirect.headers.get('location'), null);
    assert.equal(store.data.scans.length, 0);
    store.failCommit = false; store.failRead = true;
    assert.equal((await fetch(`${live.base}/api/state`)).status, 503);
    store.failRead = false; assert.equal((await fetch(`${live.base}/api/projects`)).status, 200);
  } finally { await live.close(); }
  const unconfigured = await serve(null);
  try {
    assert.equal((await fetch(`${unconfigured.base}/api/state`)).status, 503);
    assert.equal((await fetch(`${unconfigured.base}/r/anything`, { redirect: 'manual' })).status, 503);
    await assert.rejects(() => requestJson(`${unconfigured.base}/api/projects`, json('POST', {})), /DATABASE_URL/);
  } finally { await unconfigured.close(); }
});

test('public QR works while anonymous visitors cannot read or modify management data', async () => {
  const store = memoryStore(); const live = await serve(store, 'test-panel-password');
  try {
    assert.equal((await fetch(`${live.base}/api/state`)).status, 401);
    assert.equal((await fetch(`${live.base}/api/projects`, json('POST', { shortCode: 'demo' }))).status, 401);
    const protectedRequest = json('POST', { shortCode: 'demo', destinationUrl: 'https://example.com' });
    const created = await fetch(`${live.base}/api/projects`, { ...protectedRequest, headers: { ...protectedRequest.headers, 'X-Panel-Key': 'test-panel-password' } });
    assert.equal(created.status, 201);
    const qr = await fetch(`${live.base}/r/demo`, { redirect: 'manual' });
    assert.equal(qr.status, 302); assert.equal(qr.headers.get('location'), 'https://example.com');
    assert.equal((await fetch(`${live.base}/api/state`, { headers: { 'X-Panel-Key': 'wrong' } })).status, 401);
    assert.equal((await fetch(`${live.base}/api/state`, { headers: { 'X-Panel-Key': 'test-panel-password' } })).status, 200);
  } finally { await live.close(); }
});

 test('custom branding is public to read, protected to edit and survives restart', async () => {
 const store=memoryStore(); let live=await serve(store,'test-secret');
 try {
 assert.equal((await fetch(live.base+'/api/public-branding')).status,200);
 const brand={name:'Marca de prueba',logoUrl:''};
 assert.equal((await fetch(live.base+'/api/branding',json('PUT',brand))).status,401);
 const auth={...headers,'X-Panel-Key':'test-secret'};
 assert.equal((await fetch(live.base+'/api/branding',{method:'PUT',headers:auth,body:JSON.stringify(brand)})).status,200);
 assert.equal((await fetch(live.base+'/api/branding',{method:'PUT',headers:auth,body:JSON.stringify({...brand,logoUrl:'data:image/svg+xml;base64,AAAA'})})).status,400);
 await live.close();live=await serve(store,'test-secret');
 assert.deepEqual(await (await fetch(live.base+'/api/public-branding')).json(),brand);
 } finally {await live.close();}
});
