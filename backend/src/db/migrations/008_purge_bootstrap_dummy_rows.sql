-- Migration 008: Purge bootstrap dummy rows (PRD A Category 4.3)
-- Removes initial mock/dummy articles created during early bootstrapping.
DELETE FROM keywords WHERE article_id IN (SELECT id FROM articles WHERE url LIKE 'http://example.com/%');
DELETE FROM article_categories WHERE article_id IN (SELECT id FROM articles WHERE url LIKE 'http://example.com/%');
DELETE FROM articles WHERE url LIKE 'http://example.com/%';

