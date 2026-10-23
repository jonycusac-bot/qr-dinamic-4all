import type { IncomingMessage, ServerResponse } from 'node:http';
import { appReady } from '../server.js';

// Both Vercel and Windows use the same transactional API and Neon data.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!process.env.PANEL_PASSWORD && req.url?.startsWith('/api/') && !req.url.startsWith('/api/health')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Falta configurar la clave privada del panel.' }));
    return;
  }
  const app = await appReady;
  await new Promise<void>((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    try { app(req, res); } catch (error) { reject(error); }
  });
}
