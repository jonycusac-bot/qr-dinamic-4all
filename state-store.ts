import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import type { RequestHandler } from 'express';
import type { QRProject, AppUser, ScanEvent, Branding } from './src/types.js';

export interface AppState { projects: QRProject[]; users: AppUser[]; scans: ScanEvent[]; branding?: Branding }
export interface StateStore {
  transaction(work: (state: AppState) => Promise<AppState>): Promise<void>;
}

export function createPostgresStore(connectionString: string, initial: AppState, testSchema?: string) {
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
  if (process.env.VERCEL) attachDatabasePool(pool);
  return {
    async transaction(work: (state: AppState) => Promise<AppState>) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Integration tests use an isolated schema on the same Neon service.
        if (testSchema) await client.query("SELECT set_config('search_path', $1, true)", [testSchema]);
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query("SET LOCAL statement_timeout = '12s'");
        // A transactional snapshot keeps QR destinations and branding consistent.
        await client.query('SELECT pg_advisory_xact_lock(71623001)');
        const result = await client.query('SELECT state FROM qr_app_state WHERE id = 1 FOR UPDATE');
        const original: AppState = result.rows[0]?.state ?? structuredClone(initial);
        const before = JSON.stringify(original);
        const updated = await work(original);
        const after = JSON.stringify(updated);
        if (!result.rowCount || before !== after) {
          await client.query(`INSERT INTO qr_app_state(id, state, updated_at) VALUES (1, $1::jsonb, now())
            ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`, [after]);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally { client.release(); }
    },
    close: () => pool.end(),
  };
}

// Existing route handlers are synchronous. Serialize their shared snapshot across
// requests; Postgres additionally serializes PC and Vercel instances with a lock.
let queue: Promise<void> = Promise.resolve();
export function transactionalMiddleware(store: StateStore | null, getState: () => AppState, setState: (state: AppState) => void): RequestHandler {
  return async (req, res, next) => {
    if (!store) { res.status(503).json({ error: 'Falta configurar DATABASE_URL en el servidor.' }); return; }
    const previous = queue;
    let unlock!: () => void;
    queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    if (res.destroyed) { unlock(); return; }
    const end = res.end.bind(res);
    const write = res.write.bind(res);
    const chunks: Buffer[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onClose: (() => void) | undefined;
    const original = structuredClone(getState());
    try {
      await store.transaction(async state => {
        setState(state);
        const before = structuredClone(state);
        await new Promise<void>((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Request timed out')), 20000);
          onClose = () => reject(new Error('Client disconnected'));
          res.once('close', onClose);
          res.write = ((chunk: any, encoding?: any, callback?: any) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding as BufferEncoding : undefined));
            if (typeof encoding === 'function') encoding(); else callback?.();
            return true;
          }) as typeof res.write;
          res.end = ((chunk?: any, encoding?: any) => {
            if (chunk != null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding as BufferEncoding : undefined));
            resolve(); return res;
          }) as typeof res.end;
          next();
        });
        return res.statusCode >= 400 ? before : getState();
      });
      end(Buffer.concat(chunks));
    } catch (error) {
      setState(original);
      console.error('[DB] Request failed:', error instanceof Error ? error.message : 'Unknown error');
      if (!res.headersSent && !res.destroyed) {
        for (const header of ['Location', 'Content-Length', 'ETag', 'Content-Encoding']) res.removeHeader(header);
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        end(JSON.stringify({ error: 'No se pudo confirmar la operación en la base de datos. Inténtalo de nuevo.' }));
      }
    } finally {
      clearTimeout(timer);
      if (onClose) res.off('close', onClose);
      res.end = end; res.write = write; unlock();
    }
  };
}
