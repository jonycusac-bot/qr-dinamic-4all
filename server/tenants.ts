import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';
// actorId must be supplied by a server-verified session when routes are integrated.
// This repository does not authenticate a user and is not exposed as a public API.
export interface TenantContext { companyId: string; actorId: string }
export class TenantAccessError extends Error {
  readonly status = 403;
  constructor() { super('No tienes permiso para acceder a este espacio.'); }
}
export class TenantNotFoundError extends Error {
  readonly status = 404;
  constructor() { super('QR no encontrado en este espacio.'); }
}
const allRoles: TenantRole[] = ['owner', 'admin', 'member', 'viewer'];
const writers: TenantRole[] = ['owner', 'admin', 'member'];
function name(value: string, limit: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('Nombre no válido.');
  return value.trim();
}
function destination(value: string) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Destino no válido.');
  let url:URL;try{url=new URL(value);}catch{throw new Error('Destino no válido.');}
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Destino no válido.');
  return value;
}
function panelProject(p:any){return {id:p.id,clientName:p.details?.clientName||p.name,projectName:p.name,shortCode:p.short_code,destinationUrl:p.destination_url,destinationHistory:[],notes:'',technician:'',qrTargetType:'dynamic',qrDesign:{foregroundColor:'#0f172a',backgroundColor:'#ffffff',logoSize:20,logoMargin:4,errorCorrectionLevel:'H',dotStyle:'square',cornerSquareStyle:'square',includeFrame:false,frameText:'Escanea este código',frameColor:'#0f172a',includeClientLabel:true},...p.details,status:p.status,scanCount:p.scans||0,lastScannedAt:p.last_scan,createdAt:p.created_at,updatedAt:p.updated_at};}
export function createTenantRepository(pool: Pool) {
  async function transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL statement_timeout = '10s'");
      const result = await work(db);
      await db.query('COMMIT');
      return result;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async function scoped<T>(ctx: TenantContext, roles: TenantRole[], work: (db: PoolClient, role: TenantRole) => Promise<T>) {
    return transaction(async db => {
      // Authorize each transaction; a company ID alone never grants access.
      const result = await db.query(`SELECT m.role FROM tenant_memberships m
        JOIN tenant_companies c ON c.id = m.company_id
        WHERE m.company_id = $1 AND m.identity_id = $2 AND c.status = 'active'
        FOR SHARE OF m, c`, [ctx.companyId, ctx.actorId]);
      const role = result.rows[0]?.role as TenantRole | undefined;
      if (!role || !roles.includes(role)) throw new TenantAccessError();
      return work(db, role);
    });
  }
  return {
    // Trusted provisioning operation, for the platform administrator only.
    // No unauthenticated/public route may call this function directly.
    async provisionCompany(ownerIdentityId: string, companyName: string) {
      if (!ownerIdentityId || ownerIdentityId.length > 200) throw new Error('Identidad no válida.');
      return transaction(async db => {
        const id = randomUUID();
        const result = await db.query('INSERT INTO tenant_companies(id,name) VALUES($1,$2) RETURNING *', [id,name(companyName,60)]);
        await db.query("INSERT INTO tenant_memberships(company_id,identity_id,role) VALUES($1,$2,'owner')", [id,ownerIdentityId]);
        return result.rows[0];
      });
    },
    getCompany(ctx: TenantContext) {
      return scoped(ctx, allRoles, async db => (await db.query('SELECT id,name,logo_url,status FROM tenant_companies WHERE id=$1',[ctx.companyId])).rows[0]);
    },
    updateBrand(ctx: TenantContext, companyName: string, logoUrl: string) {
      if (typeof logoUrl !== 'string' || logoUrl.length > 1500000 || (logoUrl && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoUrl))) throw new Error('Logo no válido.');
      return scoped(ctx,['owner','admin'],async db => (await db.query('UPDATE tenant_companies SET name=$2,logo_url=$3 WHERE id=$1 RETURNING id,name,logo_url',[ctx.companyId,name(companyName,60),logoUrl])).rows[0]);
    },
    addMember(ctx: TenantContext, identityId: string, role: Exclude<TenantRole,'owner'>) {
      if (!identityId || identityId.length>200 || !['admin','member','viewer'].includes(role)) throw new Error('Miembro no válido.');
      return scoped(ctx,['owner','admin'],async (db,actorRole) => {
        if (role==='admin' && actorRole!=='owner') throw new TenantAccessError();
        // No UPSERT: inviting an existing user must never overwrite their owner role.
        await db.query('INSERT INTO tenant_memberships(company_id,identity_id,role) VALUES($1,$2,$3)',[ctx.companyId,identityId,role]);
      });
    },
    listMembers(ctx: TenantContext) {
      return scoped(ctx,['owner','admin'],async db => (await db.query('SELECT identity_id,role FROM tenant_memberships WHERE company_id=$1 ORDER BY created_at',[ctx.companyId])).rows);
    },
    listProjects(ctx: TenantContext) {
      return scoped(ctx,allRoles,async db => (await db.query('SELECT * FROM tenant_qr_projects WHERE company_id=$1 ORDER BY created_at,id',[ctx.companyId])).rows);
    },
    createProject(ctx: TenantContext, input: {name:string;shortCode:string;destinationUrl:string}) {
      if (typeof input.shortCode!=='string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.shortCode)) throw new Error('Código QR no válido.');
      return scoped(ctx,writers,async db => (await db.query(`INSERT INTO tenant_qr_projects(id,company_id,name,short_code,destination_url)
        VALUES($1,$2,$3,$4,$5) RETURNING *`,[randomUUID(),ctx.companyId,name(input.name,200),input.shortCode.toLowerCase(),destination(input.destinationUrl)])).rows[0]);
    },
    updateDestination(ctx: TenantContext, projectId: string, url: string) {
      return scoped(ctx,writers,async db => {
        const result=await db.query('UPDATE tenant_qr_projects SET destination_url=$3,updated_at=now() WHERE company_id=$1 AND id=$2 RETURNING *',[ctx.companyId,projectId,destination(url)]);
        if(!result.rowCount) throw new TenantNotFoundError();
        return result.rows[0];
      });
    },
    updateStatus(ctx: TenantContext, projectId:string, status:string) {
      if(!['active','paused','archived'].includes(status))throw new Error('Estado no válido.');
      return scoped(ctx,writers,async db=>{const result=await db.query('UPDATE tenant_qr_projects SET status=$3,updated_at=now() WHERE company_id=$1 AND id=$2 RETURNING *',[ctx.companyId,projectId,status]);if(!result.rowCount)throw new TenantNotFoundError();return result.rows[0];});
    },
    panelState(ctx:TenantContext){
      return scoped(ctx,allRoles,async db=>{
        const company=(await db.query('SELECT name,logo_url FROM tenant_companies WHERE id=$1',[ctx.companyId])).rows[0];
        const users=(await db.query(`SELECT u.id::text AS id,u.name,u.email,m.role,m.created_at FROM tenant_memberships m JOIN neon_auth."user" u ON u.id::text=m.identity_id WHERE m.company_id=$1`,[ctx.companyId])).rows.map(u=>({...u,role:['owner','admin'].includes(u.role)?'admin':u.role==='viewer'?'viewer':'technician',active:true,createdAt:u.created_at,installationsAssigned:0}));
        const rows=(await db.query(`SELECT p.*,count(s.id)::int AS scans,max(s.scanned_at) AS last_scan FROM tenant_qr_projects p LEFT JOIN tenant_scan_events s ON s.company_id=p.company_id AND s.project_id=p.id WHERE p.company_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`,[ctx.companyId])).rows;
        const projects=rows.map(panelProject);
        const scans=(await db.query('SELECT * FROM tenant_scan_events WHERE company_id=$1 ORDER BY scanned_at DESC',[ctx.companyId])).rows.map(s=>{const p=projects.find(p=>p.id===s.project_id);return {deviceType:'unknown',os:'Desconocido',browser:'Desconocido',city:'',country:'',ipMasked:'',...s.details,id:s.id,projectId:s.project_id,scannedAt:s.scanned_at,clientName:p?.clientName||'',projectName:p?.projectName||'',shortCode:p?.shortCode||'',redirectUrl:s.details?.redirectUrl||''};});
        return {branding:{name:company.name,logoUrl:company.logo_url},projects,users,scans};
      });
    },
    savePanelProject(ctx:TenantContext,input:any,id?:string){
      const target=destination(input.destinationUrl);
      const projectName=name(input.projectName,200),clientName=name(input.clientName,200);
      if(input.status!==undefined&&!['active','paused','archived'].includes(input.status))throw new Error('Estado no válido.');
      if(input.qrTargetType!==undefined&&!['dynamic','direct'].includes(input.qrTargetType))throw new Error('Código QR no válido.');
      const details={clientName,projectName,notes:typeof input.notes==='string'?input.notes.slice(0,10000):'',technician:typeof input.technician==='string'?input.technician.slice(0,200):'',technicianId:typeof input.technicianId==='string'?input.technicianId.slice(0,200):'',qrTargetType:input.qrTargetType||'dynamic',qrDesign:input.qrDesign};
      if(JSON.stringify(details).length>2000000)throw new Error('Código QR no válido.');
      return scoped(ctx,writers,async db=>{
        let previous:any;
        if(id){previous=(await db.query('SELECT * FROM tenant_qr_projects WHERE company_id=$1 AND id=$2 FOR UPDATE',[ctx.companyId,id])).rows[0];if(!previous)throw new TenantNotFoundError();}
        const history=previous?.details?.destinationHistory||[];
        if(!previous||previous.destination_url!==target)history.push({id:randomUUID(),url:target,changedAt:new Date().toISOString(),changedBy:ctx.actorId,reason:typeof input.changeReason==='string'?input.changeReason.slice(0,500):''});
        const savedDetails={...details,destinationHistory:history};
        const result=id?await db.query('UPDATE tenant_qr_projects SET name=$3,destination_url=$4,status=$5,details=$6,updated_at=now() WHERE company_id=$1 AND id=$2 RETURNING *',[ctx.companyId,id,projectName,target,input.status||previous.status,savedDetails]):await db.query('INSERT INTO tenant_qr_projects(id,company_id,name,short_code,destination_url,status,details) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[randomUUID(),ctx.companyId,projectName,randomUUID().replaceAll('-',''),target,input.status||'active',savedDetails]);
        const count=await db.query('SELECT count(*)::int AS total,max(scanned_at) AS last_scan FROM tenant_scan_events WHERE company_id=$1 AND project_id=$2',[ctx.companyId,result.rows[0].id]);
        return panelProject({...result.rows[0],scans:count.rows[0].total,last_scan:count.rows[0].last_scan});
      });
    },
    archivePanelProject(ctx:TenantContext,id:string){return scoped(ctx,writers,async db=>{const result=await db.query("UPDATE tenant_qr_projects SET status='archived',updated_at=now() WHERE company_id=$1 AND id=$2 RETURNING id",[ctx.companyId,id]);if(!result.rowCount)throw new TenantNotFoundError();});},
    simulatePanelScan(ctx:TenantContext,shortCode:string){return scoped(ctx,writers,async db=>{const p=(await db.query("SELECT * FROM tenant_qr_projects WHERE company_id=$1 AND short_code=$2 AND status='active'",[ctx.companyId,shortCode])).rows[0];if(!p)throw new TenantNotFoundError();const id=randomUUID();const result=await db.query('INSERT INTO tenant_scan_events(id,company_id,project_id,details) VALUES($1,$2,$3,$4) RETURNING scanned_at',[id,ctx.companyId,p.id,{simulated:true,redirectUrl:p.destination_url}]);return {id,projectId:p.id,scannedAt:result.rows[0].scanned_at,shortCode,clientName:p.details?.clientName||p.name,projectName:p.name,redirectUrl:p.destination_url,deviceType:'unknown',os:'Simulado',browser:'Simulado',city:'',country:'',ipMasked:''};});},

    listScans(ctx: TenantContext) {
      return scoped(ctx,allRoles,async db => (await db.query('SELECT id,project_id,scanned_at FROM tenant_scan_events WHERE company_id=$1 ORDER BY scanned_at',[ctx.companyId])).rows);
    },
  };
}
