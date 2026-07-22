import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'ldr_space.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS music_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_fav UNIQUE (url)
  );

  CREATE TABLE IF NOT EXISTS diary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS love_stats (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// --- Music History ---
export function addMusicHistory(title, url) {
  const insert = db.prepare('INSERT INTO music_history (title, url) VALUES (?, ?)');
  insert.run(title, url);
  
  // Optional: keep database clean by removing entries beyond 100
  const count = db.prepare('SELECT COUNT(*) as count FROM music_history').get().count;
  if (count > 100) {
    db.prepare('DELETE FROM music_history WHERE id IN (SELECT id FROM music_history ORDER BY played_at ASC LIMIT ?)')
      .run(count - 100);
  }
}

export function getMusicHistory(limit = 25) {
  return db.prepare('SELECT title, url, played_at FROM music_history ORDER BY id DESC LIMIT ?').all(limit);
}

// --- Favorites ---
export function addFavorite(title, url, addedBy) {
  try {
    const insert = db.prepare('INSERT OR REPLACE INTO favorites (title, url, added_by) VALUES (?, ?, ?)');
    insert.run(title, url, addedBy);
    return true;
  } catch (err) {
    console.error('Error adding favorite:', err);
    return false;
  }
}

export function removeFavorite(url) {
  const del = db.prepare('DELETE FROM favorites WHERE url = ?');
  return del.run(url).changes > 0;
}

export function getFavorites(limit = 25) {
  return db.prepare('SELECT title, url, added_by, added_at FROM favorites ORDER BY id DESC LIMIT ?').all(limit);
}

export function isFavorite(url) {
  const fav = db.prepare('SELECT id FROM favorites WHERE url = ?').get(url);
  return !!fav;
}

// --- Diary ---
export function addDiaryEntry(title, content, author) {
  const insert = db.prepare('INSERT INTO diary (title, content, author) VALUES (?, ?, ?)');
  return insert.run(title, content, author).lastInsertRowid;
}

export function getDiaryPage(pageNumber) {
  // pageNumber is 1-indexed
  const offset = pageNumber - 1;
  return db.prepare('SELECT id, title, content, author, created_at FROM diary ORDER BY created_at ASC LIMIT 1 OFFSET ?').get(offset);
}

export function getDiaryTotalPages() {
  const res = db.prepare('SELECT COUNT(*) as count FROM diary').get();
  return res ? res.count : 0;
}

// --- Love Stats & Configuration ---
export function getStat(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM love_stats WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function setStat(key, value) {
  const upsert = db.prepare('INSERT INTO love_stats (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  upsert.run(key, String(value));
}

export function incrementStat(key, amount = 1) {
  db.transaction(() => {
    const currentVal = parseInt(getStat(key, '0'), 10) || 0;
    setStat(key, currentVal + amount);
  })();
  return parseInt(getStat(key, '0'), 10);
}

export default {
  addMusicHistory,
  getMusicHistory,
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  addDiaryEntry,
  getDiaryPage,
  getDiaryTotalPages,
  getStat,
  setStat,
  incrementStat
};
