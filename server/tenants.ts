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
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Destino no válido.');
  return value;
}
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
    listScans(ctx: TenantContext) {
      return scoped(ctx,allRoles,async db => (await db.query('SELECT id,project_id,scanned_at FROM tenant_scan_events WHERE company_id=$1 ORDER BY scanned_at',[ctx.companyId])).rows);
    },
  };
}
