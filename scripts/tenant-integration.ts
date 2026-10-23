import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createTenantRepository, TenantAccessError, TenantNotFoundError } from '../server/tenants.js';
import { developmentConnections } from './migrate-tenants.mjs';

const {direct,pooled}=await developmentConnections();
const admin=new pg.Client({connectionString:direct,connectionTimeoutMillis:10000});
const pool=new pg.Pool({connectionString:pooled,max:3,connectionTimeoutMillis:10000});
const repository=createTenantRepository(pool);
const tag=randomUUID();
const created:string[]=[];
await admin.connect();
try {
  const before=(await admin.query('SELECT md5(state::text) AS hash FROM qr_app_state WHERE id=1')).rows;
  const a=await repository.provisionCompany('owner-a-'+tag,'Empresa A de prueba');created.push(a.id);
  const b=await repository.provisionCompany('owner-b-'+tag,'Empresa B de prueba');created.push(b.id);
  const ctxA={companyId:a.id,actorId:'owner-a-'+tag};
  const ctxB={companyId:b.id,actorId:'owner-b-'+tag};
  const hostile={companyId:b.id,actorId:ctxA.actorId};
  assert.deepEqual(await repository.listProjects(ctxA),[]);
  assert.deepEqual(await repository.listProjects(ctxB),[]);
  assert.equal((await repository.listMembers(ctxA)).length,1);
  console.log('PASS: cada empresa empieza vacía con su propio propietario.');

  await repository.updateBrand(ctxA,'Marca A','data:image/png;base64,AAAA');
  assert.equal((await repository.getCompany(ctxB)).name,'Empresa B de prueba');
  await assert.rejects(repository.getCompany(hostile),TenantAccessError);
  await assert.rejects(repository.updateBrand(hostile,'Intrusión',''),TenantAccessError);
  await assert.rejects(repository.listMembers(hostile),TenantAccessError);
  await assert.rejects(repository.listProjects(hostile),TenantAccessError);
  await assert.rejects(repository.listScans(hostile),TenantAccessError);
  console.log('PASS: marca, miembros, QR y estadísticas de otra empresa denegados.');

  const qr=await repository.createProject(ctxA,{name:'QR A',shortCode:'test-'+tag,destinationUrl:'https://example.com/a'});
  const qrB=await repository.createProject(ctxB,{name:'QR B',shortCode:'test-b-'+tag,destinationUrl:'https://example.com/b'});
  assert.equal((await repository.listProjects(ctxA)).length,1);
  assert.equal((await repository.listProjects(ctxB))[0].id,qrB.id);
  await assert.rejects(repository.updateDestination(ctxB,qr.id,'https://example.com/intrusion'),TenantNotFoundError);
  assert.equal((await repository.listProjects(ctxA))[0].destination_url,'https://example.com/a');
  await assert.rejects(repository.createProject(ctxB,{name:'Duplicado',shortCode:qr.short_code.toUpperCase(),destinationUrl:'https://example.com/duplicate'}));
  await assert.rejects(repository.createProject(ctxA,{name:'Inválido',shortCode:'invalid-'+tag,destinationUrl:'javascript:alert(1)'}));
  console.log('PASS: modificación entre empresas denegada; códigos únicos y destinos validados.');

  await repository.addMember(ctxA,'viewer-'+tag,'viewer');
  await repository.addMember(ctxA,'member-'+tag,'member');
  await repository.addMember(ctxA,'admin-'+tag,'admin');
  const viewer={companyId:a.id,actorId:'viewer-'+tag};
  const member={companyId:a.id,actorId:'member-'+tag};
  const manager={companyId:a.id,actorId:'admin-'+tag};
  assert.equal((await repository.listProjects(viewer)).length,1);
  await assert.rejects(repository.updateDestination(viewer,qr.id,'https://example.com/forbidden'),TenantAccessError);
  await assert.rejects(repository.updateBrand(member,'Marca ajena',''),TenantAccessError);
  await assert.rejects(repository.addMember(member,'other-'+tag,'member'),TenantAccessError);
  await assert.rejects(repository.addMember(manager,'other-admin-'+tag,'admin'),TenantAccessError);
  await assert.rejects(repository.addMember(ctxA,ctxA.actorId,'viewer'));
  assert.equal((await repository.listMembers(ctxA)).find(m=>m.identity_id===ctxA.actorId)?.role,'owner');
  await repository.addMember(manager,'other-'+tag,'member');
  await repository.updateDestination(member,qr.id,'https://example.com/updated');
  assert.equal((await repository.listProjects(ctxA))[0].short_code,qr.short_code);
  console.log('PASS: roles aplicados; propietario protegido y QR estable al editar destino.');

  await assert.rejects(admin.query('INSERT INTO tenant_scan_events(id,company_id,project_id) VALUES($1,$2,$3)',[randomUUID(),b.id,qr.id]));
  await admin.query('INSERT INTO tenant_scan_events(id,company_id,project_id) VALUES($1,$2,$3)',[randomUUID(),a.id,qr.id]);
  assert.equal((await repository.listScans(ctxA)).length,1);
  assert.equal((await repository.listScans(ctxB)).length,0);
  console.log('PASS: la base de datos rechaza escaneos asociados a la empresa incorrecta.');

  const restarted=createTenantRepository(pool);
  assert.equal((await restarted.getCompany(ctxA)).name,'Marca A');
  assert.equal((await restarted.listProjects(ctxA))[0].destination_url,'https://example.com/updated');
  await admin.query("UPDATE tenant_companies SET status='suspended' WHERE id=$1",[a.id]);
  await assert.rejects(repository.listProjects(ctxA),TenantAccessError);
  await admin.query("UPDATE tenant_companies SET status='active' WHERE id=$1",[a.id]);
  await admin.query('DELETE FROM tenant_memberships WHERE company_id=$1 AND identity_id=$2',[a.id,member.actorId]);
  await assert.rejects(repository.listProjects(member),TenantAccessError);
  const after=(await admin.query('SELECT md5(state::text) AS hash FROM qr_app_state WHERE id=1')).rows;
  assert.deepEqual(after,before);
  console.log('PASS: persistencia, suspensión y retirada de acceso; demo existente intacta.');
} finally {
  // Only rows created by this run; deleting a company cascades its test records.
  if(created.length)await admin.query('DELETE FROM tenant_companies WHERE id=ANY($1::uuid[])',[created]);
  await pool.end();await admin.end();
}
