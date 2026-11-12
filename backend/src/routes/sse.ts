/**
 * backend/src/routes/sse.ts
 * Server-Sent Events endpoint with monotonic numeric event IDs,
 * 1,000-entry ring buffer, Last-Event-ID / ?since= replay, and resync signaling.
 */
import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

export const sseRouter: Router = createRouter();

export const SSE_BUFFER_LIMIT = 1000;

interface SseClient {
  id: string;
  res: Response;
}

interface BufferedSseEvent {
  id: number;
  event: string;
  payload: string;
  timestamp: string;
}

const clients: Map<string, SseClient> = new Map();
const replayBuffer: BufferedSseEvent[] = [];
let nextEventId = 0;

function parseSinceCursor(req: Request): number | null {
  const headerVal = req.header('last-event-id');
  const queryVal = req.query['since'];
  const raw = headerVal ?? (typeof queryVal === 'string' ? queryVal : undefined);
  if (raw === undefined || raw.trim() === '') return null;
  const parsed = parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

sseRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const client: SseClient = { id: clientId, res };
  clients.set(clientId, client);

  // Connected handshake omits `id:` so EventSource preserves its real Last-Event-ID cursor
  sendFrame(client, 'connected', JSON.stringify({ clientId, latestEventId: nextEventId }));

  // Replay missed events if client reconnected with ?since= or Last-Event-ID
  const sinceId = parseSinceCursor(req);
  if (sinceId !== null) {
    if (sinceId > nextEventId) {
      sendFrame(
        client,
        'resync_required',
        JSON.stringify({
          reason: 'server_restarted',
          clientCursor: sinceId,
          latestId: nextEventId,
        }),
      );
    } else if (replayBuffer.length > 0 && sinceId < replayBuffer[0]!.id - 1) {
      sendFrame(
        client,
        'resync_required',
        JSON.stringify({
          reason: 'cursor_expired',
          earliestAvailableId: replayBuffer[0]!.id,
          latestId: nextEventId,
        }),
      );
    } else if (replayBuffer.length > 0 && sinceId === 1 && replayBuffer[0]!.id > 2) {
      // Explicit gap before earliest surviving frame
      sendFrame(
        client,
        'resync_required',
        JSON.stringify({
          reason: 'cursor_expired',
          earliestAvailableId: replayBuffer[0]!.id,
          latestId: nextEventId,
        }),
      );
    } else {
      for (const entry of replayBuffer) {
        if (entry.id > sinceId) {
          sendFrame(client, entry.event, entry.payload, entry.id);
        }
      }
    }
  }

  // Heartbeat every 30 s — omit `id:` per SSE spec so cursor stays on domain events
  const heartbeatTimer = setInterval(() => {
    sendFrame(client, 'heartbeat', JSON.stringify({ ts: new Date().toISOString() }));
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients.delete(clientId);
  });
});

/** Emit a domain event to ALL connected SSE clients and store in ring buffer */
export function emitSseEvent(event: string, data: unknown): number {
  const id = ++nextEventId;
  const payload = JSON.stringify(data ?? {});
  replayBuffer.push({
    id,
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
  if (replayBuffer.length > SSE_BUFFER_LIMIT) {
    replayBuffer.shift();
  }

  for (const client of clients.values()) {
    sendFrame(client, event, payload, id);
  }
  return id;
}

export function getLatestSseEventId(): number {
  return nextEventId;
}

export function getSseClientCount(): number {
  return clients.size;
}

/** Close all active SSE response streams cleanly (graceful server stop/restart) */
export function closeAllSseConnections(): void {
  for (const client of clients.values()) {
    try {
      client.res.end();
    } catch {
      // ignore closed socket
    }
  }
  clients.clear();
}

/** Reset sequence counter & replay buffer (tests only) */
export function __resetSseForTests(): void {
  nextEventId = 0;
  replayBuffer.length = 0;
  closeAllSseConnections();
}

function sendFrame(client: SseClient, event: string, payload: string, id?: number): void {
  try {
    const idLine = id !== undefined ? `id: ${id}\n` : '';
    client.res.write(`${idLine}event: ${event}\ndata: ${payload}\n\n`);
  } catch {
    clients.delete(client.id);
  }
}
