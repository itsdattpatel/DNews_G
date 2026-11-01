/**
 * backend/src/services/sessionManager.ts
 * Real-Time Foundation (PRD A Category 1B)
 * Manages app_sessions, 30-second heartbeat, unclean exit/crash detection,
 * downtime gap tracking, and session article counts.
 */
import { getDb } from '../db/db';
import type { DbAppSession } from '../db/types';

let currentSessionId: number | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let lastDetectedGap: {
  detected: boolean;
  missedMinutes: number;
  missedWindowStart: string | null;
  missedWindowEnd: string | null;
  previousClean: boolean;
} | null = null;

/**
 * Initialize session lifecycle on backend startup.
 * Detects crashes / unclean exits, measures downtime gap, records new session.
 */
export function initAppSession(): {
  sessionId: number;
  gapDetected: boolean;
  missedMinutes: number;
  missedWindowStart: string | null;
  missedWindowEnd: string | null;
} {
  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();

  // Find previous session if any
  const prevSession = db
    .prepare<[], DbAppSession>('SELECT * FROM app_sessions ORDER BY id DESC LIMIT 1')
    .get();

  let gapStart: string | null = null;
  let previousClean = true;

  if (prevSession) {
    if (!prevSession.ended_at) {
      // Unclean shutdown or crash!
      previousClean = false;
      gapStart = prevSession.last_heartbeat_at;
      console.warn(
        `[Session] Previous session #${prevSession.id} terminated uncleanly. Last heartbeat: ${prevSession.last_heartbeat_at}`,
      );
      // Reconcile previous session record
      db.prepare(
        `UPDATE app_sessions
         SET ended_at = ?, clean_shutdown = 0, end_reason = 'unclean'
         WHERE id = ?`,
      ).run(prevSession.last_heartbeat_at, prevSession.id);
    } else {
      previousClean = prevSession.clean_shutdown === 1;
      gapStart = prevSession.ended_at;
    }
  }

  let gapDetected = false;
  let missedMinutes = 0;
  let missedWindowStart: string | null = null;
  let missedWindowEnd: string | null = null;

  if (gapStart) {
    const gapStartTime = new Date(gapStart).getTime();
    const durationMs = now.getTime() - gapStartTime;
    // 5 minutes threshold
    if (durationMs >= 5 * 60 * 1000) {
      gapDetected = true;
      missedMinutes = Math.floor(durationMs / 60000);
      missedWindowStart = gapStart;
      missedWindowEnd = nowIso;
      console.log(
        `[Session] Downtime gap detected: ${missedMinutes} minutes (${gapStart} to ${nowIso}). Previous clean: ${previousClean}`,
      );
    }
  }

  lastDetectedGap = {
    detected: gapDetected,
    missedMinutes,
    missedWindowStart,
    missedWindowEnd,
    previousClean,
  };

  // Insert new session row
  const insertStmt = db.prepare(`
    INSERT INTO app_sessions
      (started_at, last_heartbeat_at, ended_at, clean_shutdown, end_reason, missed_window_start, missed_window_end, articles_ingested_in_session)
    VALUES
      (?, ?, NULL, 0, NULL, ?, ?, 0)
  `);

  const result = insertStmt.run(nowIso, nowIso, missedWindowStart, missedWindowEnd);
  currentSessionId = Number(result.lastInsertRowid);
  console.log(`[Session] Started session #${currentSessionId} at ${nowIso}`);

  // Start 30-second heartbeat
  startHeartbeat();

  return {
    sessionId: currentSessionId,
    gapDetected,
    missedMinutes,
    missedWindowStart,
    missedWindowEnd,
  };
}

/**
 * 30-second heartbeat writer.
 */
function startHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    if (!currentSessionId) return;
    try {
      const db = getDb();
      const nowIso = new Date().toISOString();
      db.prepare('UPDATE app_sessions SET last_heartbeat_at = ? WHERE id = ?').run(
        nowIso,
        currentSessionId,
      );
    } catch (err) {
      console.error('[Session] Heartbeat write failed:', err);
    }
  }, 30000);

  // Allow Node process to exit without waiting on heartbeat
  heartbeatTimer.unref();
}

/**
 * Record newly ingested articles in the current session.
 */
export function recordSessionArticlesIngested(count: number): void {
  if (!currentSessionId || count <= 0) return;
  try {
    const db = getDb();
    db.prepare(
      'UPDATE app_sessions SET articles_ingested_in_session = articles_ingested_in_session + ? WHERE id = ?',
    ).run(count, currentSessionId);
  } catch (err) {
    console.error('[Session] Failed to record ingested count:', err);
  }
}

/**
 * Graceful session closure.
 */
export function closeAppSession(reason: 'clean' | 'unclean' | 'interrupted' = 'clean'): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (!currentSessionId) return;

  try {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const isClean = reason === 'clean' ? 1 : 0;
    db.prepare(
      'UPDATE app_sessions SET ended_at = ?, clean_shutdown = ?, end_reason = ? WHERE id = ?',
    ).run(nowIso, isClean, reason, currentSessionId);
    console.log(`[Session] Closed session #${currentSessionId} (${reason}) at ${nowIso}`);
  } catch (err) {
    console.error('[Session] Failed to close session cleanly:', err);
  } finally {
    currentSessionId = null;
  }
}

/**
 * Get current session info.
 */
export function getCurrentSession(): DbAppSession | null {
  if (!currentSessionId) return null;
  try {
    const db = getDb();
    return db
      .prepare<[number], DbAppSession>('SELECT * FROM app_sessions WHERE id = ?')
      .get(currentSessionId) ?? null;
  } catch {
    return null;
  }
}

/**
 * Get downtime gap information for the current session.
 */
export function getDowntimeGap() {
  const current = getCurrentSession();
  return {
    detected: lastDetectedGap?.detected ?? false,
    missedMinutes: lastDetectedGap?.missedMinutes ?? 0,
    missedWindowStart: lastDetectedGap?.missedWindowStart ?? null,
    missedWindowEnd: lastDetectedGap?.missedWindowEnd ?? null,
    previousClean: lastDetectedGap?.previousClean ?? true,
    articlesIngestedInSession: current?.articles_ingested_in_session ?? 0,
  };
}
