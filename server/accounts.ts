import express from 'express';
import { installAccountFeatures } from './account-features.js';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { createTenantRepository, TenantAccessError, TenantNotFoundError } from './tenants.js';

export interface AccountConfig { authBaseUrl: string; appOrigin: string; databaseUrl: string }
export function createAccountRouter(config: AccountConfig) {
  const router=express.Router();
  const provider=new URL(config.authBaseUrl);
  if(provider.protocol!=='https:' || !provider.hostname.includes('.neonauth.')) throw new Error('NEON_AUTH_BASE_URL no válida.');
  const origin=new URL(config.appOrigin).origin;
  const pool=new Pool({connectionString:config.databaseUrl,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
  if(process.env.VERCEL)attachDatabasePool(pool);
  const repo=createTenantRepository(pool);
  router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.use((req,res,next)=>{
    if(['POST','PUT','PATCH','DELETE'].includes(req.method) && req.get('Origin')!==origin) {res.status(403).json({error:'Origen de solicitud no permitido.'});return;}
    next();
  });
  function providerHeaders(req: express.Request) {
    const headers=new Headers({'Content-Type':'application/json','Origin':origin});
    if(req.headers.cookie)headers.set('Cookie',req.headers.cookie);
    return headers;
  }
  const paths=new Map([
    ['/sign-up/email','POST'],['/sign-in/email','POST'],['/get-session','GET'],['/sign-out','POST'],
    ['/request-password-reset','POST'],['/reset-password','POST'],['/verify-email','GET'],['/token','GET'],
  ]);
  router.use('/api/identity',async(req,res)=>{
    if(paths.get(req.path)!==req.method){res.status(404).json({error:'Operación de acceso no disponible.'});return;}
    try {
      const target=new URL(config.authBaseUrl.replace(/\/$/,'')+req.path);
      // Only the documented query parameters; never allow an arbitrary upstream URL.
      for(const key of ['token','callbackURL','disableCookieCache']) if(typeof req.query[key]==='string')target.searchParams.set(key,req.query[key] as string);
      const response=await fetch(target,{method:req.method,headers:providerHeaders(req),body:req.method==='POST'?JSON.stringify(req.body):undefined,redirect:'manual',signal:AbortSignal.timeout(15000)});
      const cookies=response.headers.getSetCookie().map(cookie=>cookie.replace(/;\s*Domain=[^;]+/ig,'').replace(/;\s*Path=[^;]+/ig,'; Path=/'));
      if(cookies.length)res.setHeader('Set-Cookie',cookies);
      // Auth redirect links must never send the browser to an arbitrary host.
      const location=response.headers.get('location');
      if(location){const redirect=new URL(location,origin);if(redirect.origin!==origin){res.status(400).json({error:'Redirección de acceso no válida.'});return;}res.setHeader('Location',redirect.href);}
      res.status(response.status).type(response.headers.get('content-type')||'application/json').send(await response.text());
    }catch{res.status(503).json({error:'No se pudo contactar con el servicio de acceso. Inténtalo de nuevo.'});}
  });
  router.use('/api/account',async(req,res,next)=>{
    try {
      // Verify the live provider session on every protected request. No identity from the browser.
      const response=await fetch(config.authBaseUrl.replace(/\/$/,'')+'/get-session?disableCookieCache=true',{headers:providerHeaders(req),signal:AbortSignal.timeout(15000)});
      if(!response.ok){res.status(response.status>=500?503:401).json({error:'No se pudo validar tu sesión.'});return;}
      const session=await response.json();
      if(!session?.user?.id || !session?.session?.id || !Number.isFinite(new Date(session.session.expiresAt).getTime()) || new Date(session.session.expiresAt).getTime()<=Date.now() || session.user.banned){res.status(401).json({error:'Inicia sesión para continuar.'});return;}
      res.locals.identity={id:session.user.id,email:session.user.email,name:session.user.name};
      next();
    }catch{res.status(503).json({error:'No se pudo verificar la sesión. Inténtalo de nuevo.'});}
  });
  function context(req:express.Request,res:express.Response){return{companyId:req.params.companyId,actorId:res.locals.identity.id};}
  const route=(handler:(req:express.Request,res:express.Response)=>Promise<void>):express.RequestHandler=>(req,res)=>{
    void handler(req,res).catch(error=>{
      if(error instanceof TenantAccessError || error instanceof TenantNotFoundError){res.status(error.status).json({error:error.message});return;}
      if(error instanceof Error && /Nombre no válido|Logo no válido|Destino no válido|Código QR no válido|Estado no válido/.test(error.message)){res.status(400).json({error:error.message});return;}
      if(error?.code==='22P02'){res.status(400).json({error:'Identificador no válido.'});return;}
      console.error('[Accounts] Operation failed');res.status(503).json({error:'No se pudo completar la operación.'});
    });
  };
  router.get('/api/account/session',route(async(_req,res)=>{
    const companies=await pool.query(`SELECT c.id,c.name,c.logo_url,m.role FROM tenant_companies c JOIN tenant_memberships m ON m.company_id=c.id WHERE m.identity_id=$1 AND c.status='active' ORDER BY c.created_at`,[res.locals.identity.id]);
    const admin=await pool.query('SELECT 1 FROM platform_administrators WHERE identity_id=$1',[res.locals.identity.id]);
    res.json({user:res.locals.identity,companies:companies.rows,isPlatformAdmin:!!admin.rowCount});
  }));
  router.get('/api/account/companies/:companyId',route(async(req,res)=>{res.json(await repo.getCompany(context(req,res)));}));
  router.put('/api/account/companies/:companyId/branding',route(async(req,res)=>{res.json(await repo.updateBrand(context(req,res),req.body?.name,req.body?.logoUrl));}));
  router.get('/api/account/companies/:companyId/projects',route(async(req,res)=>{res.json(await repo.listProjects(context(req,res)));}));
  router.get('/api/account/companies/:companyId/members',route(async(req,res)=>{res.json(await repo.listMembers(context(req,res)));}));
  installAccountFeatures(router,pool,route);
  // Never fall through to the legacy password/profile routes in account mode.
  router.use('/api',(_req,res)=>{res.status(404).json({error:'Ruta no encontrada.'});});
  router.use('/r',(_req,res)=>{res.status(404).send('Este entorno de cuentas todavía no sirve las redirecciones de la demo.');});
  return {router,close:()=>pool.end()};
}
