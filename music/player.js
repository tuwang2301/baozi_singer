import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus, 
  entersState,
  StreamType,
  NoSubscriberBehavior
} from '@discordjs/voice';
import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { spawn } from 'child_process';
import fs from 'fs';
import https from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'ffmpeg-static';
import db from '../database.js';

if (ffmpeg) {
  const ffmpegDir = dirname(ffmpeg);
  if (process.platform === 'win32') {
    process.env.PATH = `${ffmpegDir};${process.env.PATH}`;
  } else {
    process.env.PATH = `${ffmpegDir}:${process.env.PATH}`;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const ytdlpPath = join(__dirname, '..', isWindows ? 'yt-dlp.exe' : 'yt-dlp');

export const PLAYLIST_MAX = 25;

export const queues = new Map();

function resetPlaybackSession(queue) {
  queue.sessionSongs = [];
  queue.sessionLabel = null;
}

async function savePlaybackSessionIfNeeded(queue) {
  if (!queue.sessionSongs?.length) return;

  const label = queue.sessionLabel || `Phiên nghe ${new Date().toLocaleDateString('vi-VN')}`;
  await db.savePlaybackSession(label, queue.sessionSongs);
  resetPlaybackSession(queue);
}

function isStartingFresh(queue) {
  return !queue.currentSong && queue.songs.length === 0;
}

function prepareKnownSong(song, requester) {
  const videoId = parseVideoId(song.url);
  return {
    title: song.title,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : song.url,
    thumbnail: getThumbnailFromVideoId(videoId),
    uploader: song.uploader || 'YouTube',
    requestedBy: requester,
    snapshotId: song.snapshotId ?? null,
    snapshotPosition: song.snapshotPosition ?? null
  };
}

export async function enqueueKnownSongs(guildId, voiceChannel, textChannel, songs, requester, sessionLabel = null) {
  if (!songs.length) {
    return { success: false, message: 'Không có bài hát nào để phát.' };
  }

  try {
    await ensureYtdlp();
  } catch (err) {
    console.error('Failed to ensure yt-dlp binary:', err);
    return { success: false, message: 'Đang tải bộ giải mã yt-dlp, vui lòng thử lại sau vài giây!' };
  }

  const queue = ensureQueue(guildId, voiceChannel, textChannel);
  const wasPlaying = !!queue.currentSong;

  if (isStartingFresh(queue)) {
    resetPlaybackSession(queue);
    if (sessionLabel) {
      queue.sessionLabel = sessionLabel;
    }
  }

  const prepared = songs.map(song => prepareKnownSong(song, requester));
  queue.songs.push(...prepared);

  if (!wasPlaying) {
    await playNext(guildId);
  }

  return {
    success: true,
    queued: wasPlaying,
    count: prepared.length,
    song: prepared[0],
    firstSong: prepared[0]
  };
}

export function ensureYtdlp() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(ytdlpPath)) {
      return resolve();
    }

    console.log('Downloading yt-dlp binary during runtime...');
    const dest = ytdlpPath;
    const file = fs.createWriteStream(dest);
    const url = isWindows
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

    const request = (sourceUrl) => {
      https.get(sourceUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download yt-dlp: status code ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            if (!isWindows) {
              try {
                fs.chmodSync(ytdlpPath, '755');
              } catch (err) {
                console.error('Failed to set executable permissions on yt-dlp:', err);
              }
            }
            console.log('✅ yt-dlp binary downloaded successfully!');
            resolve();
          });
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ytdlpPath, args);
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', chunk => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderrData += chunk.toString();
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed with code ${code}. Stderr: ${stderrData}`));
        return;
      }
      resolve(stdoutData);
    });
  });
}

export function parseVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function getThumbnailFromVideoId(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
}

export function isPlaylistUrl(query) {
  if (!query.startsWith('http://') && !query.startsWith('https://')) {
    return false;
  }
  try {
    const url = new URL(query);
    return url.searchParams.has('list');
  } catch {
    return query.includes('list=');
  }
}

function buildSongFromEntry(entry, requester, fallbackIndex = 0) {
  const videoId = entry.id || parseVideoId(entry.url);
  const cleanUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : (entry.url || entry.webpage_url);

  return {
    title: entry.title || `Bài hát #${fallbackIndex + 1}`,
    url: cleanUrl,
    thumbnail: getThumbnailFromVideoId(videoId),
    uploader: entry.uploader || entry.channel || 'YouTube',
    requestedBy: requester
  };
}

function ytdlpExtractInfo(query) {
  return new Promise((resolve, reject) => {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const args = [
      isUrl ? query : `ytsearch1:${query}`,
      '--dump-json',
      '--no-playlist',
      '--js-runtimes', 'node',
      '--quiet'
    ];

    const child = spawn(ytdlpPath, args);
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', chunk => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderrData += chunk.toString();
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`yt-dlp extraction failed with code ${code}. Stderr: ${stderrData}`));
        return;
      }

      try {
        const metadata = JSON.parse(stdoutData);
        const videoId = metadata.id || parseVideoId(metadata.webpage_url || metadata.url);
        resolve(buildSongFromEntry({
          id: videoId,
          title: metadata.title,
          url: metadata.webpage_url || metadata.url,
          uploader: metadata.uploader
        }, null));
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function ytdlpExtractPlaylist(url, max = PLAYLIST_MAX) {
  const args = [
    url,
    '--flat-playlist',
    '--dump-json',
    '--playlist-end', String(max + 1),
    '--extractor-args', 'youtubetab:skip=authcheck',
    '--js-runtimes', 'node',
    '--quiet'
  ];

  const stdoutData = await runYtdlp(args);
  const lines = stdoutData.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return { playlistTitle: 'Playlist YouTube', entries: [], totalCount: 0, truncated: false };
  }

  const parsed = lines.map(line => JSON.parse(line));
  const truncated = parsed.length > max;
  const slice = parsed.slice(0, max);

  const first = slice[0];
  const playlistTitle = first.playlist_title || 'Playlist YouTube';
  const totalCount = first.playlist_count || parsed.length;

  return {
    playlistTitle,
    entries: slice,
    totalCount,
    truncated: truncated || totalCount > max
  };
}

export async function createPlayerEmbed(song, paused = false) {
  const isFav = await db.isFavorite(song.url);
  const statusText = paused ? '⏸️ Đang tạm dừng' : '▶️ Đang phát';

  const embed = new EmbedBuilder()
    .setColor('#ff75a0')
    .setTitle('🎶 LDR Space Player')
    .setDescription(`**[${song.title}](${song.url})**`)
    .addFields(
      { name: '👤 Kênh/Uploader', value: song.uploader || 'YouTube', inline: true },
      { name: '✨ Yêu cầu bởi', value: song.requestedBy || 'Không rõ', inline: true },
      { name: '⭐ Yêu thích', value: isFav ? 'Đã lưu' : 'Chưa lưu', inline: true },
      { name: '⏳ Trạng thái', value: statusText, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Music Companion' });

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  return embed;
}

export async function createPlayerButtons(paused = false, url = '') {
  const isFav = await db.isFavorite(url);

  const pauseResumeButton = new ButtonBuilder()
    .setCustomId('player_pause_resume')
    .setLabel(paused ? 'Tiếp tục' : 'Tạm dừng')
    .setEmoji(paused ? '▶️' : '⏸️')
    .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary);

  const skipButton = new ButtonBuilder()
    .setCustomId('player_skip')
    .setLabel('Bỏ qua')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary);

  const stopButton = new ButtonBuilder()
    .setCustomId('player_stop')
    .setLabel('Dừng phát')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Danger);

  const favButton = new ButtonBuilder()
    .setCustomId('player_favorite')
    .setLabel(isFav ? 'Đã thích' : 'Yêu thích')
    .setEmoji('⭐')
    .setStyle(isFav ? ButtonStyle.Success : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(pauseResumeButton, skipButton, stopButton, favButton);
}

async function updatePlayerMessage(guildId) {
  const queue = queues.get(guildId);
  if (!queue?.currentSong || !queue.playerMessage) return;

  try {
    const embed = await createPlayerEmbed(queue.currentSong, queue.paused);
    const row = await createPlayerButtons(queue.paused, queue.currentSong.url);

    await queue.playerMessage.edit({
      embeds: [embed],
      components: [row]
    });
  } catch (err) {
    console.error('Failed to update player message:', err);
  }
}

function ensureQueue(guildId, voiceChannel, textChannel) {
  let queue = queues.get(guildId);

  if (queue) {
    queue.textChannel = textChannel;
    queue.voiceChannel = voiceChannel;
    return queue;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      await stopQueue(guildId);
    }
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });
  connection.subscribe(player);

  queue = {
    connection,
    player,
    songs: [],
    textChannel,
    voiceChannel,
    currentSong: null,
    audioResource: null,
    audioProcess: null,
    playerMessage: null,
    paused: false,
    timeoutId: null,
    sessionSongs: [],
    sessionLabel: null,
    activeSnapshotId: null
  };

  queues.set(guildId, queue);

  player.on('stateChange', (oldState, newState) => {
    console.log(`[AudioPlayer] State changed from ${oldState.status} to ${newState.status}`);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log('[AudioPlayer] Idle detected, advancing queue.');
    playNext(guildId);
  });

  player.on('error', error => {
    console.error(`Audio player error: ${error.message}`);
    try {
      queue.textChannel.send(`⚠️ *Lỗi phát nhạc: ${error.message}*`);
    } catch (e) {
      console.error('Failed to send player error message to channel:', e);
    }
    playNext(guildId);
  });

  return queue;
}

export async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  if (queue.audioProcess) {
    try {
      queue.audioProcess.kill();
    } catch {
      // ignore kill errors
    }
    queue.audioProcess = null;
  }

  if (queue.songs.length === 0) {
    if (queue.activeSnapshotId != null) {
      await db.updatePlaylistSnapshotResumeIndex(queue.activeSnapshotId, 0);
      queue.activeSnapshotId = null;
    }
    await savePlaybackSessionIfNeeded(queue);
    queue.currentSong = null;
    queue.audioResource = null;

    if (queue.playerMessage) {
      try {
        await queue.playerMessage.edit({
          content: '🏁 *Đã phát hết danh sách nhạc.*',
          embeds: [],
          components: []
        });
      } catch (err) {
        console.error(err);
      }
      queue.playerMessage = null;
    }

    queue.timeoutId = setTimeout(() => {
      stopQueue(guildId);
    }, 5 * 60 * 1000);

    return;
  }

  if (queue.timeoutId) {
    clearTimeout(queue.timeoutId);
    queue.timeoutId = null;
  }

  const nextSong = queue.songs.shift();
  queue.currentSong = nextSong;
  queue.paused = false;

  try {
    if (nextSong.snapshotId != null && nextSong.snapshotPosition != null) {
      await db.updatePlaylistSnapshotResumeIndex(nextSong.snapshotId, nextSong.snapshotPosition);
      queue.activeSnapshotId = nextSong.snapshotId;
    }
    if (!queue.sessionSongs) queue.sessionSongs = [];
    queue.sessionSongs.push({ title: nextSong.title, url: nextSong.url });

    await db.addMusicHistory(nextSong.title, nextSong.url);
    console.log(`[Player] Bắt đầu phát bài hát: "${nextSong.title}" (${nextSong.url})`);

    const args = [
      nextSong.url,
      '-f', 'bestaudio',
      '-o', '-',
      '--no-playlist',
      '--quiet',
      '--js-runtimes', 'node'
    ];

    console.log(`[Player] Đang chạy yt-dlp: ${ytdlpPath} ${args.join(' ')}`);
    const child = spawn(ytdlpPath, args);
    queue.audioProcess = child;

    child.stderr.on('data', data => {
      console.error(`[yt-dlp Warning/Error] ${data.toString().trim()}`);
    });

    child.on('close', code => {
      console.log(`[yt-dlp] Tiến trình đã dừng với mã code: ${code}`);
    });

    const resource = createAudioResource(child.stdout, {
      inputType: StreamType.Arbitrary
    });

    queue.audioResource = resource;
    queue.player.play(resource);
    console.log('[Player] Luồng dữ liệu âm thanh đã nạp thành công vào AudioPlayer.');

    const embed = await createPlayerEmbed(nextSong, false);
    const row = await createPlayerButtons(false, nextSong.url);

    if (queue.playerMessage) {
      try {
        await queue.playerMessage.delete();
      } catch {
        // ignore delete failures
      }
    }

    try {
      queue.playerMessage = await queue.textChannel.send({
        embeds: [embed],
        components: [row]
      });
    } catch (e) {
      console.error('Failed to send player message:', e);
    }
  } catch (err) {
    console.error('Playback execution error:', err);
    try {
      await queue.textChannel.send(`⚠️ *Không thể phát bài hát **${nextSong.title}** do lỗi kỹ thuật.*`);
    } catch (e) {
      console.error('Failed to send playback error message:', e);
    }
    await playNext(guildId);
  }
}

export async function playSong(guildId, voiceChannel, textChannel, query, requester) {
  try {
    await ensureYtdlp();
  } catch (err) {
    console.error('Failed to ensure yt-dlp binary:', err);
    return { success: false, message: 'Đang tải bộ giải mã yt-dlp, vui lòng thử lại sau vài giây!' };
  }

  const queue = ensureQueue(guildId, voiceChannel, textChannel);
  const wasPlaying = !!queue.currentSong;
  const waitingBefore = queue.songs.length;
  const startingFresh = isStartingFresh(queue);

  if (isPlaylistUrl(query)) {
    let playlistData;
    try {
      playlistData = await ytdlpExtractPlaylist(query, PLAYLIST_MAX);
    } catch (err) {
      console.error('yt-dlp playlist extract error:', err);
      return { success: false, message: 'Không thể tải playlist. Kiểm tra lại link hoặc thử lại sau.' };
    }

    if (playlistData.entries.length === 0) {
      return { success: false, message: 'Playlist không có bài hát nào hoặc playlist bị ẩn.' };
    }

    if (startingFresh) {
      resetPlaybackSession(queue);
      queue.sessionLabel = playlistData.playlistTitle;
    }

    const songs = playlistData.entries.map((entry, index) => {
      const song = buildSongFromEntry(entry, requester, index);
      song.requestedBy = requester;
      return song;
    });

    const snapshotId = await db.upsertPlaylistSnapshot(
      playlistData.playlistTitle,
      query,
      songs.map(song => ({ title: song.title, url: song.url })),
      'playlist'
    );

    if (snapshotId) {
      songs.forEach((song, index) => {
        song.snapshotId = snapshotId;
        song.snapshotPosition = index;
      });
    }

    queue.songs.push(...songs);

    if (!wasPlaying) {
      await playNext(guildId);
    }

    return {
      success: true,
      playlist: true,
      queued: wasPlaying,
      count: songs.length,
      playlistTitle: playlistData.playlistTitle,
      totalCount: playlistData.totalCount,
      truncated: playlistData.truncated,
      firstSong: songs[0],
      waitingCount: wasPlaying ? waitingBefore : 0
    };
  }

  let songInfo;
  try {
    songInfo = await ytdlpExtractInfo(query);
    songInfo.requestedBy = requester;
  } catch (err) {
    console.error('yt-dlp extract info error:', err);
    return { success: false, message: 'Đã xảy ra lỗi khi tìm kiếm bài hát.' };
  }

  if (startingFresh) {
    resetPlaybackSession(queue);
  }

  queue.songs.push(songInfo);

  if (!wasPlaying) {
    await playNext(guildId);
    return { success: true, queued: false, song: songInfo };
  }

  return { success: true, queued: true, song: songInfo };
}

export function getQueueSnapshot(guildId) {
  const queue = queues.get(guildId);
  if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
    return null;
  }

  return {
    current: queue.currentSong,
    waiting: [...queue.songs]
  };
}

export function promoteInQueue(guildId, index) {
  const queue = queues.get(guildId);
  if (!queue || index < 0 || index >= queue.songs.length) {
    return null;
  }

  const [song] = queue.songs.splice(index, 1);
  queue.songs.unshift(song);
  return song;
}

export async function pauseQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.paused) return false;

  queue.paused = true;
  queue.player.pause();
  await updatePlayerMessage(guildId);
  return true;
}

export async function resumeQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.paused) return false;

  queue.paused = false;
  queue.player.unpause();
  await updatePlayerMessage(guildId);
  return true;
}

export function skipQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;

  queue.player.stop();
  return true;
}

export async function stopQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  if (queue.currentSong?.snapshotId != null && queue.currentSong?.snapshotPosition != null) {
    await db.updatePlaylistSnapshotResumeIndex(
      queue.currentSong.snapshotId,
      queue.currentSong.snapshotPosition
    );
  }

  if (queue.timeoutId) clearTimeout(queue.timeoutId);

  if (queue.audioProcess) {
    try {
      queue.audioProcess.kill();
    } catch {
      // ignore kill errors
    }
    queue.audioProcess = null;
  }

  try {
    queue.player.stop();
    queue.connection.destroy();
  } catch (err) {
    console.error('Error during cleanup:', err);
  }

  queues.delete(guildId);
  return true;
}

export async function toggleFavoriteQueue(guildId, userTag) {
  const queue = queues.get(guildId);
  if (!queue?.currentSong) return { success: false, added: false };

  const song = queue.currentSong;
  const isFav = await db.isFavorite(song.url);

  if (isFav) {
    await db.removeFavorite(song.url);
    await updatePlayerMessage(guildId);
    return { success: true, added: false, song };
  }

  await db.addFavorite(song.title, song.url, userTag);
  await updatePlayerMessage(guildId);
  return { success: true, added: true, song };
}

export default {
  queues,
  playSong,
  playNext,
  enqueueKnownSongs,
  pauseQueue,
  resumeQueue,
  skipQueue,
  stopQueue,
  toggleFavoriteQueue,
  getQueueSnapshot,
  promoteInQueue,
  createPlayerEmbed,
  createPlayerButtons,
  isPlaylistUrl,
  PLAYLIST_MAX
};
