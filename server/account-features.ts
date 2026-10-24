import { installTeamAccess } from './team-access.js';
import { installAdminUsage } from './admin-usage.js';
import { randomUUID } from 'node:crypto';
import type { Router, Request, Response } from 'express';
import type { Pool } from 'pg';
import { createTenantRepository, TenantAccessError } from './tenants.js';

export function installAccountFeatures(router:Router,pool:Pool,route:(fn:(req:Request,res:Response)=>Promise<void>)=>any){
 installAdminUsage(router,pool,route);
 installTeamAccess(router,pool,route);
 const repo=createTenantRepository(pool);
 const ctx=(req:Request,res:Response)=>({companyId:req.params.companyId,actorId:res.locals.identity.id});
 async function admin(res:Response){if(!(await pool.query('SELECT 1 FROM platform_administrators WHERE identity_id=$1',[res.locals.identity.id])).rowCount)throw new TenantAccessError();}
 router.get('/api/account/admin/clients',route(async(_req,res)=>{
  await admin(res);
  res.json((await pool.query(`SELECT u.id,u.name,u.email,COALESCE(json_agg(json_build_object('id',c.id,'name',c.name,'status',c.status)) FILTER(WHERE c.id IS NOT NULL),'[]') AS companies FROM neon_auth."user" u LEFT JOIN tenant_memberships m ON m.identity_id=u.id::text LEFT JOIN tenant_companies c ON c.id=m.company_id GROUP BY u.id,u.name,u.email ORDER BY u.email`)).rows);
 }));
 router.post('/api/account/admin/activate',route(async(req,res)=>{
  await admin(res);
  const {identityId,name}=req.body||{};
  if(typeof identityId!=='string'||typeof name!=='string'||!name.trim()||name.length>60){res.status(400).json({error:'Indica un cliente y un nombre de empresa de hasta 60 caracteres.'});return;}
  const db=await pool.connect();
  try{await db.query('BEGIN');
   const user=await db.query('SELECT id FROM neon_auth."user" WHERE id=$1 FOR UPDATE',[identityId]);
   if(!user.rowCount){res.status(404).json({error:'El cliente debe registrarse primero.'});await db.query('ROLLBACK');return;}
   if((await db.query('SELECT 1 FROM tenant_memberships WHERE identity_id=$1',[identityId])).rowCount){res.status(409).json({error:'El cliente ya tiene una empresa.'});await db.query('ROLLBACK');return;}
   const id=randomUUID();await db.query('INSERT INTO tenant_companies(id,name) VALUES($1,$2)',[id,name.trim()]);
   await db.query("INSERT INTO tenant_memberships(company_id,identity_id,role) VALUES($1,$2,'owner')",[id,identityId]);
   await db.query('COMMIT');res.status(201).json({id,name:name.trim()});
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }));
 router.post('/api/account/companies/:companyId/projects',route(async(req,res)=>{
  const project=await repo.createProject(ctx(req,res),{name:req.body?.name,destinationUrl:req.body?.destinationUrl,shortCode:randomUUID().replaceAll('-','')});res.status(201).json(project);
 }));
 router.put('/api/account/companies/:companyId/projects/:projectId',route(async(req,res)=>{
  if(!/^[a-f0-9-]{36}$/i.test(req.params.projectId)){res.status(400).json({error:'QR no válido.'});return;}
  res.json(await repo.updateDestination(ctx(req,res),req.params.projectId,req.body?.destinationUrl));
 }));
 router.patch('/api/account/companies/:companyId/projects/:projectId/status',route(async(req,res)=>{
  res.json(await repo.updateStatus(ctx(req,res),req.params.projectId,req.body?.status));
 }));
 router.get('/api/account/companies/:companyId/scans',route(async(req,res)=>{res.json(await repo.listScans(ctx(req,res)));}));
 router.get('/api/account/companies/:companyId/panel/state',route(async(req,res)=>{res.json(await repo.panelState(ctx(req,res)));}));
 router.get('/api/account/companies/:companyId/panel/public-branding',route(async(req,res)=>{const c=await repo.getCompany(ctx(req,res));res.json({name:c.name,logoUrl:c.logo_url});}));
 router.put('/api/account/companies/:companyId/panel/branding',route(async(req,res)=>{const c=await repo.updateBrand(ctx(req,res),req.body?.name,req.body?.logoUrl);res.json({name:c.name,logoUrl:c.logo_url});}));
 router.post('/api/account/companies/:companyId/panel/projects',route(async(req,res)=>{res.status(201).json(await repo.savePanelProject(ctx(req,res),req.body));}));
 router.put('/api/account/companies/:companyId/panel/projects/:projectId',route(async(req,res)=>{res.json(await repo.savePanelProject(ctx(req,res),req.body,req.params.projectId));}));
 router.delete('/api/account/companies/:companyId/panel/projects/:projectId',route(async(req,res)=>{await repo.archivePanelProject(ctx(req,res),req.params.projectId);res.json({ok:true});}));
 router.post('/api/account/companies/:companyId/panel/scans/record',route(async(req,res)=>{res.json(await repo.simulatePanelScan(ctx(req,res),req.body?.shortCode));}));

 // A separate namespace keeps legacy /r links untouched.
 router.get('/q/:shortCode',route(async(req,res)=>{
  const result=await pool.query(`INSERT INTO tenant_scan_events(id,company_id,project_id,details) SELECT $1,p.company_id,p.id,jsonb_build_object('redirectUrl',p.destination_url) FROM tenant_qr_projects p JOIN tenant_companies c ON c.id=p.company_id WHERE p.short_code=$2 AND p.status='active' AND c.status='active' RETURNING project_id`,[randomUUID(),req.params.shortCode]);
  if(!result.rowCount){res.status(404).send('Este QR no está disponible.');return;}
  const project=await pool.query("SELECT destination_url FROM tenant_qr_projects WHERE id=$1 AND status='active'",[result.rows[0].project_id]);
  if(!project.rowCount){res.status(404).send('Este QR no está disponible.');return;}
  res.redirect(302,project.rows[0].destination_url);
 }));
}
