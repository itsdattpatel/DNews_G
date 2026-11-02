import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import request from 'supertest';
import {
  createBackup,
  listBackups,
  pruneBackups,
  restoreBackup,
} from '../../services/backupManager';
import * as dbModule from '../../db/db';
import { createApp } from '../../app';

describe('Safety Net: Automated Backups, Settings Export/Import & Test Guard (PRD A Category 4)', () => {
  const TEST_BACKUPS_DIR = path.resolve('backups_test_sandbox');
  const TEST_DATA_DIR = path.resolve('data_test_backup_mgr');
  const testDbPath = path.join(TEST_DATA_DIR, 'news.sqlite');

  beforeEach(() => {
    delete process.env['DB_PATH'];
    dbModule.closeDb();
    process.env['DATA_DIR'] = TEST_DATA_DIR;
    process.env['BACKUPS_DIR'] = TEST_BACKUPS_DIR;

    try {
      if (fs.existsSync(TEST_BACKUPS_DIR)) {
        fs.rmSync(TEST_BACKUPS_DIR, { recursive: true, force: true });
      }
    } catch {}
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
    } catch {}

    fs.mkdirSync(TEST_BACKUPS_DIR, { recursive: true });
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // Initialize test database with clean schema and seed rows
    const db = dbModule.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'test_source', 'Test Source', 'US', 'https://example.com/feed', 'rss')
    `).run();
    db.prepare(`
      INSERT INTO articles (id, source_id, url, title_english)
      VALUES (1, 1, 'https://test.com/item1', 'Real Test Article 1'),
             (2, 1, 'https://test.com/item2', 'Real Test Article 2')
    `).run();
  });

  afterEach(() => {
    delete process.env['DB_PATH'];
    dbModule.closeDb();
    vi.restoreAllMocks();
    delete process.env['BACKUPS_DIR'];
    try {
      if (fs.existsSync(TEST_BACKUPS_DIR)) {
        fs.rmSync(TEST_BACKUPS_DIR, { recursive: true, force: true });
      }
    } catch {}
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('Backup Creation & Listing', () => {
    it('creates a physical SQLite backup with valid header', () => {
      const record = createBackup('manual', 'unit_test');
      expect(record.filename).toContain('news.backup_manual_unit_test');
      expect(fs.existsSync(record.path)).toBe(true);

      // Verify SQLite header
      const fd = fs.openSync(record.path, 'r');
      const buf = Buffer.alloc(16);
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);
      expect(buf.toString('utf8')).toContain('SQLite format 3');

      // Check listing
      const allBackups = listBackups();
      expect(allBackups.length).toBeGreaterThanOrEqual(1);
      expect(allBackups.some((b) => b.filename === record.filename)).toBe(true);
    });
  });

  describe('Restoration with Double Confirmation', () => {
    it('restores database successfully and creates a safety pre-restore backup', () => {
      const originalBackup = createBackup('manual', 'for_restore');

      // Mutate the active database
      const db = new Database(testDbPath);
      db.prepare(
        "INSERT INTO articles (id, source_id, url, title_english) VALUES (999, 1, 'https://test.com/temp', 'Temporary Article')"
      ).run();
      db.close();

      // Restore
      const result = restoreBackup(originalBackup.filename);
      expect(result.success).toBe(true);
      expect(result.articlesCount).toBe(2);
      expect(result.preRestoreBackup).toContain('news.backup_pre-restore');

      // Verify active database has exactly 2 rows
      const restoredDb = new Database(testDbPath);
      const rows = restoredDb.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number };
      expect(rows.cnt).toBe(2);
      restoredDb.close();
    });
  });

  describe('Test-Data Guard', () => {
    it('throws fatal error if tests attempt to connect to production news.sqlite', () => {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedAllow = process.env.ALLOW_PROD_DB_IN_TEST;
      try {
        process.env.NODE_ENV = 'test';
        delete process.env.ALLOW_PROD_DB_IN_TEST;
        process.env['DB_PATH'] = path.resolve('data/news.sqlite');
        dbModule.closeDb();

        expect(() => {
          dbModule.getDb();
        }).toThrow(/\[Test-Data Guard\] FATAL/);
      } finally {
        delete process.env['DB_PATH'];
        process.env.NODE_ENV = savedNodeEnv;
        if (savedAllow) process.env.ALLOW_PROD_DB_IN_TEST = savedAllow;
      }
    });
  });

  describe('Settings Export & Import (Strict Redaction)', () => {
    const app = createApp();

    it('exports settings stripped of all API keys and secrets', async () => {
      const res = await request(app).get('/api/settings/export');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('app', 'ai-world-news-desk');
      expect(res.body).toHaveProperty('schema_version', 1);
      expect(res.body).toHaveProperty('settings');

      const settings = res.body.settings;
      expect(settings).not.toHaveProperty('gemini_api_key');
      expect(settings).not.toHaveProperty('groq_api_key');
      expect(settings).not.toHaveProperty('youtube_api_key');
      expect(settings).not.toHaveProperty('secret');
    });

    it('imports valid settings while rejecting sensitive injected keys', async () => {
      const importPayload = {
        schema_version: 1,
        settings: {
          refresh_interval_minutes: 15,
          alert_threshold: 85,
          gemini_api_key: 'malicious_injected_secret_key',
          sound_enabled: true,
        },
      };

      const res = await request(app).post('/api/settings/import').send(importPayload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.applied_keys).toContain('refresh_interval_minutes');
      expect(res.body.applied_keys).toContain('alert_threshold');
      expect(res.body.applied_keys).not.toContain('gemini_api_key');
    });

    it('rejects unsupported schema version', async () => {
      const res = await request(app).post('/api/settings/import').send({
        schema_version: 99,
        settings: { refresh_interval_minutes: 5 },
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('UNSUPPORTED_VERSION');
    });
  });

  describe('Backups API Endpoints', () => {
    const app = createApp();

    it('GET /api/backups returns available backups', async () => {
      const res = await request(app).get('/api/backups');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('backups');
      expect(Array.isArray(res.body.backups)).toBe(true);
    });

    it('POST /api/backups/restore rejects without explicit RESTORE confirmation', async () => {
      const res = await request(app).post('/api/backups/restore').send({
        filename: 'some_backup.sqlite',
        confirmation: 'yes',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CONFIRMATION_REQUIRED');
    });
  });
});
