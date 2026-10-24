import {randomBytes,createHash,randomUUID} from 'node:crypto';
import type {Router,Request,Response} from 'express';
import type {Pool,PoolClient} from 'pg';
import {TenantAccessError} from './tenants.js';
export function installTeamAccess(router:Router,pool:Pool,route:(fn:(req:Request,res:Response)=>Promise<void>)=>any){
 async function manage(db:PoolClient,company:string,identity:string){const r=await db.query("SELECT m.role FROM tenant_companies c JOIN tenant_memberships m ON m.company_id=c.id WHERE c.id=$1 AND c.status='active' AND m.identity_id=$2 FOR UPDATE OF c",[company,identity]);if(!['owner','admin'].includes(r.rows[0]?.role))throw new TenantAccessError();return r.rows[0].role;}
 async function transaction<T>(fn:(db:PoolClient)=>Promise<T>){const db=await pool.connect();try{await db.query('BEGIN');const r=await fn(db);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 router.get('/api/account/companies/:companyId/invitations',route(async(req,res)=>{res.json(await transaction(async db=>{await manage(db,req.params.companyId,res.locals.identity.id);return (await db.query('SELECT id,name,email,role,expires_at,accepted_at,revoked_at FROM tenant_invitations WHERE company_id=$1 ORDER BY created_at DESC LIMIT 100',[req.params.companyId])).rows;}));}));
 router.post('/api/account/companies/:companyId/invitations',route(async(req,res)=>{
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';const role=req.body?.role;
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||!['admin','member','viewer'].includes(role)){res.status(400).json({error:'Indica un correo válido y un permiso de acceso.'});return;}
  const name=typeof req.body?.name==='string'?req.body.name.trim():'';if(name.length>100){res.status(400).json({error:'El nombre no puede superar 100 caracteres.'});return;}
  const token=randomBytes(32).toString('hex');const hash=createHash('sha256').update(token).digest('hex');
  const invitation=await transaction(async db=>{const actorRole=await manage(db,req.params.companyId,res.locals.identity.id);if(role==='admin'&&actorRole!=='owner')throw new TenantAccessError();
   const existing=await db.query('SELECT 1 FROM tenant_memberships m JOIN neon_auth."user" u ON u.id::text=m.identity_id WHERE m.company_id=$1 AND lower(u.email)=$2',[req.params.companyId,email]);if(existing.rowCount)return null;
   // Creating a replacement invalidates any previously shared link for this address.
   await db.query('UPDATE tenant_invitations SET revoked_at=now() WHERE company_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL',[req.params.companyId,email]);
   return (await db.query("INSERT INTO tenant_invitations(id,company_id,email,role,token_hash,created_by,name,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '7 days') RETURNING id,name,email,role,expires_at",[randomUUID(),req.params.companyId,email,role,hash,res.locals.identity.id,name])).rows[0];});
  if(!invitation){res.status(409).json({error:'Ese usuario ya tiene acceso a la empresa.'});return;}
  res.status(201).json({...invitation,token});
 }));
 router.delete('/api/account/companies/:companyId/invitations/:invitationId',route(async(req,res)=>{await transaction(async db=>{const role=await manage(db,req.params.companyId,res.locals.identity.id);const invitation=(await db.query('SELECT role FROM tenant_invitations WHERE company_id=$1 AND id=$2',[req.params.companyId,req.params.invitationId])).rows[0];if(invitation?.role==='admin'&&role!=='owner')throw new TenantAccessError();await db.query('UPDATE tenant_invitations SET revoked_at=now() WHERE company_id=$1 AND id=$2 AND accepted_at IS NULL',[req.params.companyId,req.params.invitationId]);});res.json({ok:true});}));
 router.post('/api/team-invitation',route(async(req,res)=>{
  const token=req.body?.token;if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)){res.status(400).json({error:'Enlace de alta no válido.'});return;}
  const hash=createHash('sha256').update(token).digest('hex');const result=await pool.query("SELECT i.name,i.email,c.name AS company_name FROM tenant_invitations i JOIN tenant_companies c ON c.id=i.company_id WHERE token_hash=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now() AND c.status='active'",[hash]);
  if(!result.rowCount){res.status(410).json({error:'El enlace de alta ha caducado o ya no está disponible. Pide uno nuevo a tu empresa.'});return;}res.json(result.rows[0]);
 }));
 router.post('/api/account/invitations/accept',route(async(req,res)=>{
  const token=req.body?.token;if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)){res.status(400).json({error:'Invitación no válida.'});return;}
  const company=await transaction(async db=>{
   const hash=createHash('sha256').update(token).digest('hex');const lookup=(await db.query('SELECT company_id FROM tenant_invitations WHERE token_hash=$1',[hash])).rows[0];if(!lookup)return null;
   const active=await db.query("SELECT id FROM tenant_companies WHERE id=$1 AND status='active' FOR UPDATE",[lookup.company_id]);if(!active.rowCount)return null;
   const i=(await db.query('SELECT * FROM tenant_invitations WHERE token_hash=$1 FOR UPDATE',[hash])).rows[0];
   if(!i||i.accepted_at||i.revoked_at||new Date(i.expires_at).getTime()<=Date.now())return null;
   if(i.email!==res.locals.identity.email?.trim().toLowerCase())throw new TenantAccessError();
   // A link cannot replace an existing owner's role or grant platform privileges.
   await db.query('INSERT INTO tenant_memberships(company_id,identity_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[i.company_id,res.locals.identity.id,i.role]);
   await db.query('UPDATE tenant_invitations SET accepted_at=now(),accepted_by=$2 WHERE id=$1',[i.id,res.locals.identity.id]);return i.company_id;
  });if(!company){res.status(410).json({error:'La invitación ha caducado, ya se ha utilizado o ha sido revocada.'});return;}res.json({companyId:company});
 }));
}
