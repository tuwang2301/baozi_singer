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

  CREATE TABLE IF NOT EXISTS playback_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    song_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS playback_session_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES playback_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS playlist_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    source_url TEXT,
    kind TEXT NOT NULL DEFAULT 'playlist',
    song_count INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_snapshot_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (snapshot_id) REFERENCES playlist_snapshots(id) ON DELETE CASCADE
  );
`);

const snapshotColumns = db.prepare(`PRAGMA table_info(playlist_snapshots)`).all();
if (!snapshotColumns.some(column => column.name === 'resume_index')) {
  db.exec('ALTER TABLE playlist_snapshots ADD COLUMN resume_index INTEGER NOT NULL DEFAULT 0;');
}

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
  return db.prepare('SELECT id, title, url, played_at FROM music_history ORDER BY id DESC LIMIT ?').all(limit);
}

export function getMusicHistoryEntry(id) {
  return db.prepare('SELECT id, title, url, played_at FROM music_history WHERE id = ?').get(id);
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
  return db.prepare('SELECT id, title, url, added_by, added_at FROM favorites ORDER BY id DESC LIMIT ?').all(limit);
}

export function getFavoriteById(id) {
  return db.prepare('SELECT id, title, url, added_by, added_at FROM favorites WHERE id = ?').get(id);
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

const MAX_STORED_SESSIONS = 20;

export function savePlaybackSession(label, songs) {
  if (!songs.length) return null;

  const insertSession = db.prepare(
    'INSERT INTO playback_sessions (label, song_count) VALUES (?, ?)'
  );
  const insertSong = db.prepare(
    'INSERT INTO playback_session_songs (session_id, position, title, url) VALUES (?, ?, ?, ?)'
  );

  const save = db.transaction(() => {
    const result = insertSession.run(label, songs.length);
    const sessionId = result.lastInsertRowid;

    songs.forEach((song, index) => {
      insertSong.run(sessionId, index, song.title, song.url);
    });

    const excess = db.prepare(`
      SELECT id FROM playback_sessions
      ORDER BY created_at DESC, id DESC
      LIMIT -1 OFFSET ?
    `).all(MAX_STORED_SESSIONS);

    if (excess.length > 0) {
      const placeholders = excess.map(() => '?').join(',');
      db.prepare(`DELETE FROM playback_sessions WHERE id IN (${placeholders})`)
        .run(...excess.map(row => row.id));
    }

    return sessionId;
  });

  return save();
}

export function getRecentPlaybackSessions(limit = 10) {
  return db.prepare(`
    SELECT id, label, created_at, song_count
    FROM playback_sessions
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

export function getPlaybackSessionSongs(sessionId) {
  return db.prepare(`
    SELECT title, url
    FROM playback_session_songs
    WHERE session_id = ?
    ORDER BY position ASC
  `).all(sessionId);
}

export function getPlaybackSession(sessionId) {
  return db.prepare(`
    SELECT id, label, created_at, song_count
    FROM playback_sessions
    WHERE id = ?
  `).get(sessionId);
}

export function getRecentPlayDates(limit = 7) {
  return db.prepare(`
    SELECT date(played_at, 'localtime') AS play_date, COUNT(*) AS song_count
    FROM music_history
    GROUP BY play_date
    ORDER BY play_date DESC
    LIMIT ?
  `).all(limit);
}

export function getMusicHistoryCountForDate(dateStr) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM music_history
    WHERE date(played_at, 'localtime') = ?
  `).get(dateStr);
  return row?.count || 0;
}

export function getMusicHistoryForDate(dateStr, limit = 25) {
  return db.prepare(`
    SELECT title, url
    FROM music_history
    WHERE date(played_at, 'localtime') = ?
    ORDER BY id ASC
    LIMIT ?
  `).all(dateStr, limit);
}

const MAX_STORED_SNAPSHOTS = 10;

export function upsertPlaylistSnapshot(label, sourceUrl, songs, kind = 'playlist') {
  if (!songs.length) return null;

  const findSnapshotByUrl = db.prepare(
    'SELECT id FROM playlist_snapshots WHERE source_url = ? ORDER BY created_at DESC, id DESC LIMIT 1'
  );
  const insertSnapshot = db.prepare(
    'INSERT INTO playlist_snapshots (label, source_url, kind, song_count, resume_index) VALUES (?, ?, ?, ?, 0)'
  );
  const updateSnapshot = db.prepare(
    'UPDATE playlist_snapshots SET label = ?, kind = ?, song_count = ?, resume_index = 0, created_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  const clearSnapshotSongs = db.prepare(
    'DELETE FROM playlist_snapshot_songs WHERE snapshot_id = ?'
  );
  const insertSong = db.prepare(
    'INSERT INTO playlist_snapshot_songs (snapshot_id, position, title, url) VALUES (?, ?, ?, ?)'
  );

  const save = db.transaction(() => {
    let snapshotId;
    const existed = sourceUrl ? findSnapshotByUrl.get(sourceUrl) : null;
    if (existed) {
      snapshotId = existed.id;
      updateSnapshot.run(label, kind, songs.length, snapshotId);
      clearSnapshotSongs.run(snapshotId);
    } else {
      const result = insertSnapshot.run(label, sourceUrl || null, kind, songs.length);
      snapshotId = result.lastInsertRowid;
    }

    songs.forEach((song, index) => {
      insertSong.run(snapshotId, index, song.title, song.url);
    });

    const excess = db.prepare(`
      SELECT id FROM playlist_snapshots
      ORDER BY created_at DESC, id DESC
      LIMIT -1 OFFSET ?
    `).all(MAX_STORED_SNAPSHOTS);

    if (excess.length > 0) {
      const placeholders = excess.map(() => '?').join(',');
      db.prepare(`DELETE FROM playlist_snapshots WHERE id IN (${placeholders})`)
        .run(...excess.map(row => row.id));
    }

    return snapshotId;
  });

  return save();
}

export function updatePlaylistSnapshotResumeIndex(snapshotId, resumeIndex) {
  return db.prepare(
    'UPDATE playlist_snapshots SET resume_index = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(resumeIndex, snapshotId).changes > 0;
}

export function getRecentPlaylistSnapshots(limit = 10) {
  return db.prepare(`
    SELECT id, label, source_url, kind, song_count, resume_index, created_at
    FROM playlist_snapshots
    WHERE source_url IS NOT NULL
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

export function getPlaylistSnapshot(snapshotId) {
  return db.prepare(`
    SELECT id, label, source_url, kind, song_count, resume_index, created_at
    FROM playlist_snapshots
    WHERE id = ?
  `).get(snapshotId);
}

export function getPlaylistSnapshotSongs(snapshotId) {
  return db.prepare(`
    SELECT title, url
    FROM playlist_snapshot_songs
    WHERE snapshot_id = ?
    ORDER BY position ASC
  `).all(snapshotId);
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
  incrementStat,
  getMusicHistoryEntry,
  getFavoriteById,
  savePlaybackSession,
  getRecentPlaybackSessions,
  getPlaybackSessionSongs,
  getPlaybackSession,
  getRecentPlayDates,
  getMusicHistoryCountForDate,
  getMusicHistoryForDate,
  upsertPlaylistSnapshot,
  updatePlaylistSnapshotResumeIndex,
  getRecentPlaylistSnapshots,
  getPlaylistSnapshot,
  getPlaylistSnapshotSongs
};
