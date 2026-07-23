import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ CẢNH BÁO: Chưa cấu hình DATABASE_URL trong file .env.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('cockroach'))
    ? { rejectUnauthorized: false }
    : false
});

// Initialize database tables
async function initDb() {
  if (!connectionString) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS music_history (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        added_by TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_fav UNIQUE (url)
      );

      CREATE TABLE IF NOT EXISTS diary (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS love_stats (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playback_sessions (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        song_count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playback_session_songs (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES playback_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS playlist_snapshots (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        source_url TEXT,
        kind TEXT NOT NULL DEFAULT 'playlist',
        song_count INTEGER NOT NULL,
        resume_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playlist_snapshot_songs (
        id SERIAL PRIMARY KEY,
        snapshot_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        FOREIGN KEY (snapshot_id) REFERENCES playlist_snapshots(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ PostgreSQL tables checked/initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL tables:', err);
  }
}

// Call initialization
initDb();

// --- Music History ---
export async function addMusicHistory(title, url) {
  try {
    await pool.query('INSERT INTO music_history (title, url) VALUES ($1, $2)', [title, url]);
    
    // Keep database clean by removing entries beyond 100
    const res = await pool.query('SELECT COUNT(*) as count FROM music_history');
    const count = parseInt(res.rows[0].count, 10);
    if (count > 100) {
      await pool.query('DELETE FROM music_history WHERE id IN (SELECT id FROM music_history ORDER BY played_at ASC LIMIT $1)', [count - 100]);
    }
  } catch (err) {
    console.error('Failed to add music history:', err);
  }
}

export async function getMusicHistory(limit = 25) {
  try {
    const res = await pool.query('SELECT * FROM music_history ORDER BY played_at DESC LIMIT $1', [limit]);
    return res.rows;
  } catch (err) {
    console.error('Failed to get music history:', err);
    return [];
  }
}

export async function getMusicHistoryEntry(id) {
  try {
    const res = await pool.query('SELECT * FROM music_history WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Failed to get music history entry:', err);
    return null;
  }
}

// --- Favorites ---
export async function addFavorite(title, url, addedBy) {
  try {
    await pool.query(
      'INSERT INTO favorites (title, url, added_by) VALUES ($1, $2, $3) ON CONFLICT (url) DO NOTHING',
      [title, url, addedBy]
    );
    return true;
  } catch (err) {
    console.error('Failed to add favorite:', err);
    return false;
  }
}

export async function removeFavorite(url) {
  try {
    await pool.query('DELETE FROM favorites WHERE url = $1', [url]);
    return true;
  } catch (err) {
    console.error('Failed to remove favorite:', err);
    return false;
  }
}

export async function isFavorite(url) {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM favorites WHERE url = $1', [url]);
    return parseInt(res.rows[0].count, 10) > 0;
  } catch (err) {
    console.error('Failed to check favorite:', err);
    return false;
  }
}

export async function getFavorites() {
  try {
    const res = await pool.query('SELECT * FROM favorites ORDER BY added_at DESC');
    return res.rows;
  } catch (err) {
    console.error('Failed to get favorites:', err);
    return [];
  }
}

export async function getFavoriteById(id) {
  try {
    const res = await pool.query('SELECT * FROM favorites WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Failed to get favorite by ID:', err);
    return null;
  }
}

// --- Diary ---
export async function addDiaryEntry(title, content, author) {
  try {
    await pool.query(
      'INSERT INTO diary (title, content, author) VALUES ($1, $2, $3)',
      [title, content, author]
    );
    return true;
  } catch (err) {
    console.error('Failed to add diary entry:', err);
    return false;
  }
}

export async function getDiaryPage(page = 1, pageSize = 1) {
  try {
    const offset = (page - 1) * pageSize;
    const res = await pool.query(
      'SELECT * FROM diary ORDER BY created_at ASC LIMIT $1 OFFSET $2',
      [pageSize, offset]
    );
    return res.rows[0] || null;
  } catch (err) {
    console.error('Failed to get diary page:', err);
    return null;
  }
}

export async function getDiaryTotalPages(pageSize = 1) {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM diary');
    const totalCount = parseInt(res.rows[0].count, 10);
    return Math.max(1, Math.ceil(totalCount / pageSize));
  } catch (err) {
    console.error('Failed to get diary total pages:', err);
    return 1;
  }
}

// --- Love Stats (Anniversaries & Interaction Counters) ---
export async function setStat(key, value) {
  try {
    await pool.query(
      'INSERT INTO love_stats (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, String(value)]
    );
    return true;
  } catch (err) {
    console.error(`Failed to set stat ${key}:`, err);
    return false;
  }
}

export async function getStat(key) {
  try {
    const res = await pool.query('SELECT value FROM love_stats WHERE key = $1', [key]);
    return res.rows[0] ? res.rows[0].value : null;
  } catch (err) {
    console.error(`Failed to get stat ${key}:`, err);
    return null;
  }
}

export async function getStats() {
  try {
    const res = await pool.query('SELECT * FROM love_stats');
    const statsMap = {};
    res.rows.forEach(row => {
      statsMap[row.key] = row.value;
    });
    return statsMap;
  } catch (err) {
    console.error('Failed to get stats:', err);
    return {};
  }
}

// --- Playback Sessions ---
export async function savePlaybackSession(label, songs) {
  if (!songs || songs.length === 0) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query(
      'INSERT INTO playback_sessions (label, song_count) VALUES ($1, $2) RETURNING id',
      [label, songs.length]
    );
    const sessionId = sessionRes.rows[0].id;

    for (let i = 0; i < songs.length; i++) {
      await client.query(
        'INSERT INTO playback_session_songs (session_id, position, title, url) VALUES ($1, $2, $3, $4)',
        [sessionId, i, songs[i].title, songs[i].url]
      );
    }

    // Keep database clean by keeping only last 10 sessions
    const countRes = await client.query('SELECT COUNT(*) as count FROM playback_sessions');
    const sessionCount = parseInt(countRes.rows[0].count, 10);
    if (sessionCount > 10) {
      await client.query(
        'DELETE FROM playback_sessions WHERE id IN (SELECT id FROM playback_sessions ORDER BY created_at ASC LIMIT $1)',
        [sessionCount - 10]
      );
    }

    await client.query('COMMIT');
    return sessionId;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to save playback session:', err);
    return null;
  } finally {
    client.release();
  }
}

export async function getRecentPlaybackSessions(limit = 10) {
  try {
    const res = await pool.query('SELECT * FROM playback_sessions ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows;
  } catch (err) {
    console.error('Failed to get recent sessions:', err);
    return [];
  }
}

export async function getPlaybackSession(sessionId) {
  try {
    const res = await pool.query('SELECT * FROM playback_sessions WHERE id = $1', [sessionId]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Failed to get playback session:', err);
    return null;
  }
}

export async function getPlaybackSessionSongs(sessionId) {
  try {
    const res = await pool.query(
      'SELECT * FROM playback_session_songs WHERE session_id = $1 ORDER BY position ASC',
      [sessionId]
    );
    return res.rows;
  } catch (err) {
    console.error('Failed to get session songs:', err);
    return [];
  }
}

// --- Playlist Snapshots ---
export async function upsertPlaylistSnapshot(label, sourceUrl, songs, kind = 'playlist') {
  if (!songs || songs.length === 0) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query(
      'SELECT id FROM playlist_snapshots WHERE source_url = $1 ORDER BY created_at DESC, id DESC LIMIT 1',
      [sourceUrl]
    );
    const existing = existingRes.rows[0];

    let snapshotId;
    if (existing) {
      snapshotId = existing.id;
      await client.query(
        'UPDATE playlist_snapshots SET label = $1, kind = $2, song_count = $3, resume_index = 0, created_at = CURRENT_TIMESTAMP WHERE id = $4',
        [label, kind, songs.length, snapshotId]
      );
      await client.query('DELETE FROM playlist_snapshot_songs WHERE snapshot_id = $1', [snapshotId]);
    } else {
      const insertRes = await client.query(
        'INSERT INTO playlist_snapshots (label, source_url, kind, song_count, resume_index) VALUES ($1, $2, $3, $4, 0) RETURNING id',
        [label, sourceUrl, kind, songs.length]
      );
      snapshotId = insertRes.rows[0].id;
    }

    for (let i = 0; i < songs.length; i++) {
      await client.query(
        'INSERT INTO playlist_snapshot_songs (snapshot_id, position, title, url) VALUES ($1, $2, $3, $4)',
        [snapshotId, i, songs[i].title, songs[i].url]
      );
    }

    // Keep database clean by keeping only last 10 snapshots
    const countRes = await client.query('SELECT COUNT(*) as count FROM playlist_snapshots');
    const snapshotCount = parseInt(countRes.rows[0].count, 10);
    if (snapshotCount > 10) {
      const idsRes = await client.query(
        'SELECT id FROM playlist_snapshots ORDER BY created_at ASC LIMIT $1',
        [snapshotCount - 10]
      );
      const idsToDelete = idsRes.rows.map(row => row.id);
      if (idsToDelete.length > 0) {
        await client.query('DELETE FROM playlist_snapshots WHERE id = ANY($1)', [idsToDelete]);
      }
    }

    await client.query('COMMIT');
    return snapshotId;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to upsert playlist snapshot:', err);
    return null;
  } finally {
    client.release();
  }
}

export async function updatePlaylistSnapshotResumeIndex(snapshotId, resumeIndex) {
  try {
    await pool.query(
      'UPDATE playlist_snapshots SET resume_index = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2',
      [resumeIndex, snapshotId]
    );
  } catch (err) {
    console.error('Failed to update playlist resume index:', err);
  }
}

export async function getRecentPlaylistSnapshots(limit = 10) {
  try {
    const res = await pool.query('SELECT * FROM playlist_snapshots ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows;
  } catch (err) {
    console.error('Failed to get recent snapshots:', err);
    return [];
  }
}

export async function getPlaylistSnapshot(snapshotId) {
  try {
    const res = await pool.query('SELECT * FROM playlist_snapshots WHERE id = $1', [snapshotId]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Failed to get playlist snapshot:', err);
    return null;
  }
}

export async function getPlaylistSnapshotSongs(snapshotId) {
  try {
    const res = await pool.query(
      'SELECT * FROM playlist_snapshot_songs WHERE snapshot_id = $1 ORDER BY position ASC',
      [snapshotId]
    );
    return res.rows;
  } catch (err) {
    console.error('Failed to get snapshot songs:', err);
    return [];
  }
}

export async function incrementStat(key) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const getRes = await client.query('SELECT value FROM love_stats WHERE key = $1', [key]);
      let val = 0;
      if (getRes.rows[0]) {
        val = parseInt(getRes.rows[0].value, 10) || 0;
      }
      val += 1;
      await client.query(
        'INSERT INTO love_stats (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, String(val)]
      );
      await client.query('COMMIT');
      return val;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Failed to increment stat ${key}:`, err);
    return 1;
  }
}

export default {
  addMusicHistory,
  getMusicHistory,
  getMusicHistoryEntry,
  addFavorite,
  removeFavorite,
  isFavorite,
  getFavorites,
  getFavoriteById,
  addDiaryEntry,
  getDiaryPage,
  getDiaryTotalPages,
  setStat,
  getStat,
  getStats,
  incrementStat,
  savePlaybackSession,
  getRecentPlaybackSessions,
  getPlaybackSession,
  getPlaybackSessionSongs,
  upsertPlaylistSnapshot,
  updatePlaylistSnapshotResumeIndex,
  getRecentPlaylistSnapshots,
  getPlaylistSnapshot,
  getPlaylistSnapshotSongs
};
