/** Server responses are authoritative; a failed save must never become a local QR. */
let panelAccessKey = '';
export function setPanelAccessKey(key: string) { panelAccessKey = key; }
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (panelAccessKey) headers.set('X-Panel-Key', panelAccessKey);
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers,
    signal: init.signal ?? AbortSignal.timeout(25000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error || `No se pudo completar la operación (${response.status}).`, response.status);
  if (body === null) throw new Error('El servidor no ha devuelto una respuesta válida.');
  return body as T;
}
