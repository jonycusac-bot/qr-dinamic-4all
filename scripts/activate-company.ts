import { parseArgs } from 'node:util';
import pg from 'pg';
import { developmentConnections } from './migrate-tenants.mjs';
import { createTenantRepository } from '../server/tenants.js';
// Local platform operator command, never reachable through an HTTP endpoint.
const {values}=parseArgs({options:{email:{type:'string'},company:{type:'string'}}});
if(!values.email || !values.company)throw new Error('Uso: npm run account:activate -- --email comprador@example.com --company "Empresa"');
const {pooled}=await developmentConnections();
const pool=new pg.Pool({connectionString:pooled,max:1,connectionTimeoutMillis:10000});
try {
 const identity=await pool.query('SELECT id,email FROM neon_auth."user" WHERE lower(email)=lower($1)',[values.email]);
 if(identity.rowCount!==1)throw new Error('El comprador debe registrar primero su cuenta de acceso.');
 const memberships=await pool.query('SELECT 1 FROM tenant_memberships WHERE identity_id=$1',[identity.rows[0].id]);
 if(memberships.rowCount)throw new Error('Esta cuenta ya pertenece a una empresa. Revisa antes de crear otra.');
 const company=await createTenantRepository(pool).provisionCompany(identity.rows[0].id,values.company);
 console.log('Empresa de pruebas activada:',company.name,'ID:',company.id);
}finally{await pool.end();}
