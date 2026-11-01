-- Migration 005: Evidence highlight and reading mode preferences
INSERT OR IGNORE INTO settings (key, value) VALUES ('evidence_highlight_enabled', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('reading_mode_enabled', '1');

