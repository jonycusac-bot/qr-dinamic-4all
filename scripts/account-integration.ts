import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import express from 'express';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { createAccountRouter } from '../server/accounts.js';
import { createTenantRepository } from '../server/tenants.js';
import { developmentConnections } from './migrate-tenants.mjs';

const env=parse(await readFile(new URL('../.env.multiempresa.local',import.meta.url)));
const {pooled}=await developmentConnections();
const origin='http://localhost:3001';
const accounts=createAccountRouter({databaseUrl:pooled,authBaseUrl:env.NEON_AUTH_BASE_URL,appOrigin:origin});
const app=express();app.use(express.json());app.use(accounts.router);
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
const address=server.address();assert.ok(address&&typeof address!=='string');
const base='http://127.0.0.1:'+address.port;
const pool=new pg.Pool({connectionString:pooled,max:1});const repo=createTenantRepository(pool);
const userIds:string[]=[],companyIds:string[]=[];
function browser(){
 const jar=new Map<string,string>();
 return {async request(path:string,method='GET',body?:unknown,extra:Record<string,string>={}){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';');const i=pair.indexOf('=');if(i!==-1){const key=pair.slice(0,i),value=pair.slice(i+1);if(!value)jar.delete(key);else jar.set(key,value);}}
  return response;
 },cookie:()=>[...jar].map(([k,v])=>k+'='+v).join('; ')};
}
const a=browser(),b=browser(),anonymous=browser();
try {
 const before=(await pool.query('SELECT md5(state::text) AS hash FROM qr_app_state WHERE id=1')).rows;
 assert.equal((await anonymous.request('/api/account/session')).status,401);
 assert.equal((await anonymous.request('/api/account/session','GET',undefined,{'X-Panel-Key':'anything','X-User-Id':'forged'})).status,401);
 assert.equal((await anonymous.request('/api/state')).status,404);
 assert.equal((await anonymous.request('/api/identity/sign-up/email','POST',{}, {Origin:'https://evil.example'})).status,403);
 console.log('PASS: sin sesión no hay acceso; clave antigua e identidad inventada no sirven; origen ajeno bloqueado.');
 const suffix=randomUUID();const emailA='test-a-'+suffix+'@example.com',emailB='test-b-'+suffix+'@example.com';const password=randomUUID()+'aA!';
 for(const [client,email]of[[a,emailA],[b,emailB]]as const){
  const response=await client.request('/api/identity/sign-up/email','POST',{name:'Prueba de cuenta',email,password});assert.equal(response.status,200);const data=await response.json();userIds.push(data.user.id);
  const session=await client.request('/api/account/session');assert.equal(session.status,200);const state=await session.json();assert.equal(state.user.id,data.user.id);assert.deepEqual(state.companies,[]);
 }
 console.log('PASS: dos registros reales en Neon Auth; cada cuenta comienza pendiente de activación.');
 const companyA=await repo.provisionCompany(userIds[0],'Empresa real A de prueba');companyIds.push(companyA.id);
 const companyB=await repo.provisionCompany(userIds[1],'Empresa real B de prueba');companyIds.push(companyB.id);
 const own=(await(await a.request('/api/account/session')).json()).companies;
 assert.deepEqual(own.map((c:any)=>c.id),[companyA.id]);
 assert.equal((await b.request('/api/account/companies/'+companyA.id)).status,403);
 assert.equal((await b.request('/api/account/companies/'+companyA.id+'/branding','PUT',{name:'Intrusión',logoUrl:''})).status,403);
 assert.equal((await b.request('/api/account/companies/'+companyA.id+'/projects')).status,403);
 assert.equal((await b.request('/api/account/companies/'+companyA.id+'/members')).status,403);
 assert.equal((await a.request('/api/account/companies/'+companyA.id+'/branding','PUT',{name:'Marca privada A',logoUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg=='})).status,200);
 assert.match((await(await a.request('/api/account/companies/'+companyA.id)).json()).logo_url,/^data:image\/png;base64,/);
 assert.equal((await(await b.request('/api/account/companies/'+companyB.id)).json()).name,'Empresa real B de prueba');
 console.log('PASS: sesiones reales vinculadas a empresas; lectura y escritura entre empresas denegadas por HTTP.');
 const cookieBeforeLogout=a.cookie();
 assert.equal((await a.request('/api/identity/sign-out','POST',{})).status,200);
 assert.equal((await a.request('/api/account/session')).status,401);
 assert.equal((await fetch(base+'/api/account/session',{headers:{Cookie:cookieBeforeLogout}})).status,401);
 assert.equal((await a.request('/api/identity/sign-in/email','POST',{email:emailA,password:'incorrect-password'})).status,401);
 assert.equal((await a.request('/api/identity/sign-in/email','POST',{email:emailA,password})).status,200);
 assert.equal((await a.request('/api/account/session')).status,200);
 const restored=browser();assert.equal((await restored.request('/api/account/session','GET',undefined,{Cookie:a.cookie()})).status,200);
 console.log('PASS: contraseña incorrecta rechazada; acceso, recarga de sesión y cierre con revocación comprobados.');
 const invalid=await anonymous.request('/api/identity/reset-password','POST',{token:'invalid-token',newPassword:randomUUID()});assert.equal(invalid.status,400);
 assert.deepEqual((await pool.query('SELECT md5(state::text) AS hash FROM qr_app_state WHERE id=1')).rows,before);
 console.log('PASS: enlace de recuperación inválido rechazado; datos existentes intactos. No se envían correos de prueba.');
} finally {
 if(companyIds.length)await pool.query('DELETE FROM tenant_companies WHERE id=ANY($1::uuid[])',[companyIds]);
 for(const id of userIds){
   const result=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c',`neon neon-auth user delete ${id} --project-id old-cell-68983129 --branch dev-multiempresa`],{encoding:'utf8',windowsHide:true});
   if(result.status!==0)console.error('No se pudo eliminar un usuario ficticio de prueba.');
 }
 await accounts.close();await pool.end();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
}
