-- Migration 018: Retroactively clamp future-dated articles in the database
-- Normalizes any print-edition embargoes or future-dated articles to their ingestion/fetch timestamp.

UPDATE articles
SET published_at = fetched_at
WHERE published_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+15 minutes');
