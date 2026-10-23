import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import { INITIAL_PROJECTS, INITIAL_USERS } from './src/data/initialData.js';
import { QRProject, AppUser, ScanEvent, Branding } from './src/types.js';
import { createPostgresStore, transactionalMiddleware, type StateStore, type AppState } from './state-store.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const defaultBranding: Branding = {name:'QR Dinamic 4all',logoUrl:''};
let branding = structuredClone(defaultBranding);
const initialState: AppState = { projects: [], users: structuredClone(INITIAL_USERS), scans: [], branding: defaultBranding };
let projects: QRProject[] = [];
let users: AppUser[] = [];
let scans: ScanEvent[] = [];
export function snapshotState(): AppState { return { projects, users, scans, branding }; }
export function restoreState(state: AppState) { projects = state.projects; users = state.users; scans = state.scans; branding = state.branding || structuredClone(defaultBranding); }
restoreState(structuredClone(initialState));
const store = process.env.DATABASE_URL?.trim() ? createPostgresStore(process.env.DATABASE_URL.trim(), initialState) : null;
export const closeDatabase = async () => { await store?.close(); };
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
function validUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
function validateProject(data: Record<string, unknown>): string | null {
  if ('destinationUrl' in data && !validUrl(data.destinationUrl)) return 'El destino debe ser una dirección HTTP o HTTPS válida.';
  if ('status' in data && !['active', 'paused', 'archived'].includes(String(data.status))) return 'Estado de instalación no válido.';
  if ('qrTargetType' in data && !['dynamic', 'direct'].includes(String(data.qrTargetType))) return 'Tipo de QR no válido.';
  for (const field of ['clientName', 'projectName', 'notes', 'technician', 'technicianId', 'shortCode', 'changedBy', 'changeReason']) {
    if (field in data && (typeof data[field] !== 'string' || String(data[field]).length > (field === 'notes' ? 10000 : 200))) return `Campo no válido: ${field}.`;
  }
  if ('shortCode' in data && !/^[a-zA-Z0-9_-]{1,100}$/.test(String(data.shortCode))) return 'El código QR solo puede contener letras, números, guiones y guiones bajos (máximo 100).';
  if ('qrDesign' in data) {
    const design = data.qrDesign as Record<string, unknown>;
    if (!design || typeof design !== 'object' || Array.isArray(design)) return 'Diseño QR no válido.';
    for (const field of ['foregroundColor', 'backgroundColor', 'frameColor']) {
      if (field in design && (typeof design[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(String(design[field])))) return 'Color QR no válido.';
    }
    for (const field of ['logoSize', 'logoMargin', 'watermarkOpacity']) {
      if (field in design && (typeof design[field] !== 'number' || !Number.isFinite(design[field]) || Number(design[field]) < 0 || Number(design[field]) > 100)) return 'Tamaño QR no válido.';
    }
    for (const field of ['includeFrame', 'includeClientLabel', 'showWatermark']) if (field in design && typeof design[field] !== 'boolean') return 'Opción QR no válida.';
    for (const field of ['frameText', 'logoUrl']) if (field in design && (typeof design[field] !== 'string' || String(design[field]).length > (field === 'logoUrl' ? 2000000 : 200))) return 'Texto QR no válido.';
    for (const [field, values] of Object.entries({ errorCorrectionLevel: ['L', 'M', 'Q', 'H'], dotStyle: ['square', 'dots', 'rounded'], cornerSquareStyle: ['square', 'rounded', 'extra-rounded'] })) {
      if (field in design && !values.includes(String(design[field]))) return 'Estilo QR no válido.';
    }
  }
  return null;
}
function validateUser(data: Record<string, unknown>): string | null {
  for (const field of ['name', 'email', 'avatar']) if (field in data && (typeof data[field] !== 'string' || String(data[field]).length > 2048)) return `Campo no válido: ${field}.`;
  if ('role' in data && !['admin', 'technician', 'viewer'].includes(String(data.role))) return 'Perfil no válido.';
  if ('active' in data && typeof data.active !== 'boolean') return 'Estado de usuario no válido.';
  return null;
}
function projectUpdates(data: Partial<QRProject>): Partial<QRProject> {
  const allowed = ['clientName', 'projectName', 'destinationUrl', 'notes', 'technician', 'technicianId', 'status', 'qrTargetType', 'qrDesign'] as const;
  return Object.fromEntries(allowed.filter(key => key in data).map(key => [key, data[key]]));
}
function detectDevice(userAgent: string): {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  browser: string;
} {
  const ua = userAgent.toLowerCase();
  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'desktop';
  let os = 'Desconocido';
  let browser = 'Navegador';

  // Device type
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/iphone|ipod|mobile|android|blackberry|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  }

  // OS
  if (ua.includes('iphone') || ua.includes('ipod')) os = 'iOS';
  else if (ua.includes('ipad')) os = 'iPadOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('linux')) os = 'Linux';

  // Browser
  if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('samsungbrowser')) browser = 'Samsung Internet';

  return { deviceType, os, browser };
}

export async function createApp(stateStore: StateStore | null = store, panelPassword = process.env.PANEL_PASSWORD) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', (req, res, next) => {
    if (req.path === '/public-branding' || !panelPassword) { next(); return; }
    const supplied = req.get('X-Panel-Key') || '';
    const hash = (value: string) => crypto.createHash('sha256').update(value).digest();
    if (!crypto.timingSafeEqual(hash(supplied), hash(panelPassword))) {
      res.status(401).set('Cache-Control', 'no-store').json({ error: 'Introduce la clave del panel para continuar.' }); return;
    }
    next();
  });
  app.use(['/api', '/r'], transactionalMiddleware(stateStore, snapshotState, restoreState));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
      res.status(400).json({ error: 'El cuerpo de la solicitud debe ser un objeto JSON.' }); return;
    }
    next();
  });
  app.get('/api/public-branding', (_req, res) => res.json(branding));
  app.put('/api/branding', (req,res) => {
    const {name,logoUrl} = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length>60 || typeof logoUrl !== 'string' || logoUrl.length>1500000 || (logoUrl && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoUrl))) {
      res.status(400).json({error:'Introduce un nombre y un logo PNG, JPG o WebP válido.'}); return;
    }
    branding = {name:name.trim(),logoUrl}; res.json(branding);
  });
  app.get('/api/state', (_req, res) => res.json(snapshotState()));
  // Dynamic QR redirection route: /r/:shortCode
  app.get('/r/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });
    const project = projects.find(
      (p) => p.shortCode.toLowerCase() === shortCode.toLowerCase()
    );

    if (!project) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código QR No Encontrado</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 text-slate-800 font-sans">
          <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
            <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
            <h1 class="text-xl font-bold text-slate-900 mb-2">Instalación No Encontrada</h1>
            <p class="text-slate-600 mb-6 text-sm">El código QR escaneado (<strong>${escapeHtml(shortCode)}</strong>) no se encuentra registrado en el sistema o ha sido archivado.</p>
            <a href="/" class="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition">Volver al Panel</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (project.status !== 'active') {
      res.status(403).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Instalación en Mantenimiento</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 text-slate-800 font-sans">
          <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
            <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <h1 class="text-xl font-bold text-slate-900 mb-2">Acceso Temporalmente Pausado</h1>
            <p class="text-slate-600 mb-4 text-sm">La documentación para la instalación <strong>${escapeHtml(project.projectName)}</strong> (${escapeHtml(project.clientName)}) está en actualización técnica.</p>
            <p class="text-xs text-slate-500">Por favor, inténtelo de nuevo en unos minutos o contacte a su instalador.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (!validUrl(project.destinationUrl)) { res.status(422).json({ error: 'Esta instalación no tiene un destino válido.' }); return; }

    // Register scan analytics
    const ua = req.headers['user-agent'] || '';
    const { deviceType, os, browser } = detectDevice(ua);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ipMasked = typeof ip === 'string' ? ip.split(',')[0].replace(/\.\d+$/, '.***') : '127.0.0.***';

    const scanRecord: ScanEvent = {
      id: crypto.randomUUID(),
      projectId: project.id,
      clientName: project.clientName,
      projectName: project.projectName,
      shortCode: project.shortCode,
      scannedAt: new Date().toISOString(),
      deviceType,
      os,
      browser,
      city: 'No disponible',
      country: 'No disponible',
      ipMasked,
      redirectUrl: project.destinationUrl,
    };

    project.scanCount = (project.scanCount || 0) + 1;
    project.lastScannedAt = scanRecord.scannedAt;
    scans.unshift(scanRecord);


    // Use a direct, non-cacheable 302 by default. Embedded camera browsers can
    // break Microsoft 365 authentication when an intermediate HTML page is used.
    const showLanding = req.query.landing === 'true';
    if (!showLanding) {
      res.redirect(302, project.destinationUrl);
      return;
    }

    // Optional branded landing page for manual previews only.
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="1;url=${escapeHtml(project.destinationUrl)}">
        <title>Conectando con OneDrive - ${escapeHtml(project.projectName)}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
          .animate-spin-fast { animation: spin 0.8s linear infinite; }
        </style>
      </head>
      <body class="bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center min-h-screen p-6 font-sans">
        <div class="max-w-md w-full bg-slate-800/90 backdrop-blur border border-slate-700 p-8 rounded-3xl shadow-2xl text-center">
          
          <div class="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin-fast"></div>
            <!-- OneDrive Cloud Icon -->
            <svg class="w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>

          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Enlace Dinámico Activo
          </span>

          <h1 class="text-xl font-bold tracking-tight text-white mb-1">${escapeHtml(project.clientName)}</h1>
          <p class="text-sm text-slate-400 mb-6">${escapeHtml(project.projectName)}</p>

          <p class="text-xs text-slate-300 bg-slate-900/60 py-2.5 px-4 rounded-xl border border-slate-700/60 mb-6">
            Redirigiendo automáticamente a la carpeta de documentación en OneDrive...
          </p>

          <a href="${escapeHtml(project.destinationUrl)}" id="directBtn" class="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-2xl text-sm transition shadow-lg shadow-blue-600/30">
            <span>Abrir Documentación en OneDrive</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
          </a>
          
          <p class="mt-4 text-[11px] text-slate-400">Si no se abre automáticamente, pulsa el botón superior.</p>
        </div>


      </body>
      </html>
    `);
  });

  // Profiles are team records, not authenticated identities.
  // Projects
  app.get('/api/projects', (req, res) => {
    res.json(projects);
  });

  app.post('/api/projects', (req, res) => {
    const data = req.body;
    const validationError = validateProject(data);
    if (validationError) { res.status(400).json({ error: validationError }); return; }
    const now = new Date().toISOString();
    
    // Auto-generate shortCode if not provided
    const baseCode = data.shortCode
      ? data.shortCode.toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : (data.clientName || 'qr').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) + '-' + Math.random().toString(36).substr(2, 4);

    if (projects.some(p => p.shortCode.toLowerCase() === baseCode)) { res.status(409).json({ error: 'Ese código QR ya está registrado.' }); return; }

    const newProject: QRProject = {
      id: crypto.randomUUID(),
      clientName: data.clientName || 'Cliente Particular',
      projectName: data.projectName || 'Instalación',
      shortCode: baseCode,
      destinationUrl: data.destinationUrl || 'https://onedrive.live.com',
      destinationHistory: [],
      notes: data.notes || '',
      technician: data.technician || 'Mi equipo',
      technicianId: data.technicianId || 'user-1',
      status: data.status || 'active',
      qrTargetType: data.qrTargetType || 'dynamic',
      qrDesign: {
        foregroundColor: '#0284c7',
        backgroundColor: '#ffffff',
        logoUrl: '',
        logoSize: 22,
        logoMargin: 4,
        errorCorrectionLevel: 'H',
        dotStyle: 'rounded',
        cornerSquareStyle: 'extra-rounded',
        includeFrame: true,
        frameText: 'DOCUMENTACIÓN Y GARANTÍA',
        frameColor: '#0284c7',
        includeClientLabel: true,
        ...data.qrDesign,
      },
      scanCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    projects.unshift(newProject);

    res.status(201).json(newProject);
  });

  app.put('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const current = projects[index];
    const validationError = validateProject(req.body);
    if (validationError) { res.status(400).json({ error: validationError }); return; }
    if (req.body.shortCode !== undefined && req.body.shortCode !== current.shortCode) { res.status(409).json({ error: 'El código de un QR existente es permanente.' }); return; }
    const updates = req.body;
    const now = new Date().toISOString();

    // Check if destinationUrl changed, if so register to history!
    let history = current.destinationHistory ? [...current.destinationHistory] : [];
    if (updates.destinationUrl && updates.destinationUrl !== current.destinationUrl) {
      history.unshift({
        id: `hist-${Date.now()}`,
        url: current.destinationUrl,
        changedAt: now,
        changedBy: updates.changedBy || 'Administrador',
        reason: updates.changeReason || 'Actualización de enlace OneDrive',
      });
    }

    const updatedProject: QRProject = {
      ...current,
      ...projectUpdates(updates),
      qrDesign: { ...current.qrDesign, ...updates.qrDesign },
      destinationHistory: history,
      updatedAt: now,
    };

    projects[index] = updatedProject;

    res.json(updatedProject);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    projects = projects.filter((p) => p.id !== id);

    res.json({ success: true, id });
  });

  // Scans history
  app.get('/api/scans', (req, res) => {
    res.json(scans);
  });

  // Record a simulated or manual test scan
  app.post('/api/scans/record', (req, res) => {
    const { shortCode, clientName, projectName, deviceType, os, browser } = req.body;
    if (typeof shortCode !== 'string') { res.status(400).json({ error: 'Falta el código QR.' }); return; }
    if ([os, browser].some(value => value !== undefined && (typeof value !== 'string' || value.length > 100))) { res.status(400).json({ error: 'Datos de dispositivo no válidos.' }); return; }
    const project = projects.find(
      (p) => p.shortCode.toLowerCase() === (shortCode || '').toLowerCase()
    );
    if (!project) { res.status(404).json({ error: 'Instalación no encontrada.' }); return; }
    if (project.status !== 'active') { res.status(403).json({ error: 'La instalación no está activa.' }); return; }
    if (deviceType && !['mobile', 'tablet', 'desktop', 'unknown'].includes(deviceType)) { res.status(400).json({ error: 'Dispositivo no válido.' }); return; }

    const newScan: ScanEvent = {
      id: crypto.randomUUID(),
      projectId: project ? project.id : 'unknown',
      clientName: project.clientName,
      projectName: project.projectName,
      shortCode: shortCode || 'test',
      scannedAt: new Date().toISOString(),
      deviceType: deviceType || 'mobile',
      os: os || 'iOS',
      browser: browser || 'Safari',
      city: 'Simulación',
      country: 'No disponible',
      ipMasked: 'No registrada',
      redirectUrl: project ? project.destinationUrl : 'https://onedrive.live.com',
    };

    if (project) {
      project.scanCount = (project.scanCount || 0) + 1;
      project.lastScannedAt = newScan.scannedAt;
    }

    scans.unshift(newScan);

    res.json(newScan);
  });

  // Users (Listing requires auth; Creating/editing/deleting requires Admin)
  app.get('/api/users', (req, res) => {
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const data = req.body;
    const validationError = validateUser(data);
    if (validationError) { res.status(400).json({ error: validationError }); return; }
    const newUser: AppUser = {
      id: crypto.randomUUID(),
      name: data.name || 'Nuevo Usuario',
      email: data.email || 'usuario@empresa.com',
      role: data.role || 'technician',
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
      installationsAssigned: 0,
    };
    users.push(newUser);

    res.status(201).json(newUser);
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const validationError = validateUser(req.body);
    if (validationError) { res.status(400).json({ error: validationError }); return; }
    const allowed = ['name', 'email', 'role', 'active', 'avatar'];
    users[idx] = { ...users[idx], ...Object.fromEntries(allowed.filter(key => key in req.body).map(key => [key, req.body[key]])) };

    res.json(users[idx]);
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    users = users.filter((u) => u.id !== id);

    res.json({ success: true, id });
  });

  // Reset database to initial seed (protected by Admin)
  app.post('/api/reset-demo', (req, res) => {
    projects = structuredClone(INITIAL_PROJECTS);
    users = structuredClone(INITIAL_USERS);
    scans = [];

    res.json(snapshotState());
  });

  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Ruta no encontrada.' }); });
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(error.status === 400 ? 400 : 500).json({ error: error.status === 400 ? 'JSON no válido.' : 'No se pudo completar la solicitud.' }); });

  // Vite middleware for development
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production' && !process.argv[1]?.endsWith('.cjs')) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
export const appReady = createApp();
if (!process.env.VERCEL && !process.env.QR_NO_LISTEN) {
  void appReady.then(app => app.listen(PORT, '0.0.0.0', () => console.log(`[Server] QR app: http://localhost:${PORT}`)));
}
