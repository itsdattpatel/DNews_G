/**
 * backend/src/routes/sse.ts
 * Server-Sent Events endpoint. Maintains a registry of active clients.
 * Other modules call emitSseEvent() to push to all clients.
 */
import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

export const sseRouter: Router = createRouter();

interface SseClient {
  id: string;
  res: Response;
}

const clients: Map<string, SseClient> = new Map();

sseRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const client: SseClient = { id: clientId, res };
  clients.set(clientId, client);

  // Send immediate hello so client knows it's connected
  sendToClient(client, 'connected', { clientId });

  // Heartbeat every 30 s
  const heartbeatTimer = setInterval(() => {
    sendToClient(client, 'heartbeat', {});
  }, 30_000);

  _req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients.delete(clientId);
  });
});

/** Emit an event to ALL connected SSE clients */
export function emitSseEvent(event: string, data: unknown): void {
  const payload = JSON.stringify(data);
  for (const client of clients.values()) {
    sendToClient(client, event, payload);
  }
}

function sendToClient(client: SseClient, event: string, data: unknown): void {
  try {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    client.res.write(`event: ${event}\ndata: ${payload}\n\n`);
  } catch {
    clients.delete(client.id);
  }
}

// Fix unused param lint warning
const _req = {} as Request; void _req;
