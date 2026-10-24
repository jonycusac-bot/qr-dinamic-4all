import type {Router,Request,Response} from 'express';
import type {Pool} from 'pg';
import {TenantAccessError} from './tenants.js';
export function installAdminUsage(router:Router,pool:Pool,route:(fn:(req:Request,res:Response)=>Promise<void>)=>any){
 async function admin(res:Response){if(!(await pool.query('SELECT 1 FROM platform_administrators WHERE identity_id=$1',[res.locals.identity.id])).rowCount)throw new TenantAccessError();}
 router.get('/api/account/admin/usage',route(async(_req,res)=>{
  await admin(res);
  const result=await pool.query(`WITH projects AS (SELECT company_id,count(*)::int AS total,count(*) FILTER(WHERE status='active')::int AS active,count(*) FILTER(WHERE status='paused')::int AS paused,count(*) FILTER(WHERE status='archived')::int AS archived FROM tenant_qr_projects GROUP BY company_id), scans AS (SELECT company_id,count(*) FILTER(WHERE COALESCE(details->>'simulated','false')<>'true')::int AS scans,count(*) FILTER(WHERE COALESCE(details->>'simulated','false')<>'true' AND scanned_at>=date_trunc('month',now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid')::int AS month_scans,count(*) FILTER(WHERE details->>'simulated'='true')::int AS simulated FROM tenant_scan_events GROUP BY company_id) SELECT c.id,c.name,c.status,c.qr_limit,COALESCE(p.total,0) AS total,COALESCE(p.active,0) AS active,COALESCE(p.paused,0) AS paused,COALESCE(p.archived,0) AS archived,COALESCE(s.scans,0) AS scans,COALESCE(s.month_scans,0) AS month_scans,COALESCE(s.simulated,0) AS simulated FROM tenant_companies c LEFT JOIN projects p ON p.company_id=c.id LEFT JOIN scans s ON s.company_id=c.id ORDER BY c.name,c.id`);
  res.json(result.rows.map(c=>({...c,excess:Math.max(0,c.total-c.qr_limit),overLimit:c.total>c.qr_limit})));
 }));
 router.put('/api/account/admin/companies/:companyId/limit',route(async(req,res)=>{
  await admin(res);const limit=req.body?.limit;
  if(!Number.isSafeInteger(limit)||limit<1||limit>1000000){res.status(400).json({error:'El límite debe ser un número entero entre 1 y 1.000.000.'});return;}
  const result=await pool.query('UPDATE tenant_companies SET qr_limit=$2 WHERE id=$1 RETURNING id,qr_limit',[req.params.companyId,limit]);
  if(!result.rowCount){res.status(404).json({error:'Empresa no encontrada.'});return;}res.json(result.rows[0]);
 }));
 router.get('/api/account/admin/companies/:companyId/projects',route(async(req,res)=>{
  await admin(res);const offset=Number(req.query.offset||0);
  if(!Number.isSafeInteger(offset)||offset<0){res.status(400).json({error:'Página no válida.'});return;}
  const company=await pool.query('SELECT id,name FROM tenant_companies WHERE id=$1',[req.params.companyId]);if(!company.rowCount){res.status(404).json({error:'Empresa no encontrada.'});return;}
  const projects=await pool.query(`SELECT p.id,p.name,p.short_code,p.destination_url,p.status,p.created_at,p.details->>'clientName' AS client_name,COALESCE(s.real,0)::int AS scans,COALESCE(s.simulated,0)::int AS simulated FROM tenant_qr_projects p LEFT JOIN LATERAL (SELECT count(*) FILTER(WHERE COALESCE(details->>'simulated','false')<>'true') AS real,count(*) FILTER(WHERE details->>'simulated'='true') AS simulated FROM tenant_scan_events WHERE company_id=p.company_id AND project_id=p.id) s ON true WHERE p.company_id=$1 ORDER BY p.created_at DESC,p.id LIMIT 50 OFFSET $2`,[req.params.companyId,offset]);
  const total=await pool.query('SELECT count(*)::int AS total FROM tenant_qr_projects WHERE company_id=$1',[req.params.companyId]);
  res.json({company:company.rows[0],projects:projects.rows,total:total.rows[0].total,offset,pageSize:50});
 }));
}
