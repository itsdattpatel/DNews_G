/**
 * backend/src/library/services/bookmarkService.ts
 * Unified bookmark management for all Library artifacts (history, verses, quotes, mind).
 */
import { getDb } from '../../db/db';

export type LibraryItemType = 'history' | 'verse' | 'quote' | 'mind';

export interface LibraryBookmark {
  id: number;
  item_type: LibraryItemType;
  item_id: number;
  note: string | null;
  created_at: string;
}

export function getLibraryBookmarks(): LibraryBookmark[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, item_type, item_id, note, created_at FROM library_bookmarks ORDER BY created_at DESC')
    .all() as LibraryBookmark[];
  return rows;
}

export function toggleLibraryBookmark(
  itemType: LibraryItemType,
  itemId: number,
  note?: string
): { bookmarked: boolean; id?: number } {
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM library_bookmarks WHERE item_type = ? AND item_id = ?')
    .get(itemType, itemId) as { id: number } | undefined;

  if (existing) {
    db.prepare('DELETE FROM library_bookmarks WHERE id = ?').run(existing.id);
    return { bookmarked: false };
  }

  const result = db
    .prepare('INSERT INTO library_bookmarks (item_type, item_id, note) VALUES (?, ?, ?)')
    .run(itemType, itemId, note ?? null);

  return { bookmarked: true, id: Number(result.lastInsertRowid) };
}

export function deleteLibraryBookmark(id: number): boolean {
  const db = getDb();
  const info = db.prepare('DELETE FROM library_bookmarks WHERE id = ?').run(id);
  return info.changes > 0;
}

export function isItemBookmarked(itemType: LibraryItemType, itemId: number): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT id FROM library_bookmarks WHERE item_type = ? AND item_id = ?')
    .get(itemType, itemId);
  return Boolean(row);
}
