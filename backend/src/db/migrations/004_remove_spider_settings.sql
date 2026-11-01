-- Migration 004: Remove spider settings and deprecate spider_type
-- Safe migration: delete spider keys from settings table; leave existing spider_type in articles dormant without data loss.

DELETE FROM settings WHERE key IN ('max_spiders', 'spider_speed', 'spider_glitch', 'spider_pause_on_hover');

