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

// Setup ffmpeg path in environment so @discordjs/voice can find it
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

// Map to hold voice playback queues for each guild
export const queues = new Map();

// Helper to ensure yt-dlp binary is present
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

// Search and extract video metadata using yt-dlp
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
        resolve({
          title: metadata.title,
          url: metadata.webpage_url || metadata.url,
          duration: metadata.duration || 0,
          thumbnail: metadata.thumbnail || (metadata.thumbnails && metadata.thumbnails[0]?.url) || '',
          uploader: metadata.uploader || 'Không rõ'
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Convert seconds to format MM:SS or HH:MM:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatProgressBar(elapsed, total) {
  const size = 15;
  const progress = total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) : 0;
  const position = Math.round(size * progress);
  let bar = '';
  for (let i = 0; i <= size; i++) {
    if (i === position) {
      bar += '●';
    } else {
      bar += '▬';
    }
  }
  return `\`${bar} [${formatTime(elapsed)} / ${formatTime(total)}]\``;
}

export function createPlayerEmbed(song, elapsed = 0) {
  const isFav = db.isFavorite(song.url);
  const embed = new EmbedBuilder()
    .setColor('#ff75a0')
    .setTitle(`🎶 LDR Space Player`)
    .setDescription(`**[${song.title}](${song.url})**`)
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: '👤 Kênh/Uploader', value: song.uploader || 'Không rõ', inline: true },
      { name: '✨ Yêu cầu bởi', value: song.requestedBy || 'Không rõ', inline: true },
      { name: '⭐ Trạng thái', value: isFav ? 'Đã lưu yêu thích' : 'Chưa lưu', inline: true },
      { name: '⏳ Tiến trình', value: formatProgressBar(elapsed, song.duration) }
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Music Companion' });

  return embed;
}

export function createPlayerButtons(paused = false, url = '') {
  const isFav = db.isFavorite(url);
  
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

  const row = new ActionRowBuilder().addComponents(pauseResumeButton, skipButton, stopButton, favButton);
  return row;
}

async function updatePlayerMessage(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.currentSong || !queue.playerMessage) return;

  try {
    let elapsed = 0;
    if (queue.audioResource) {
      elapsed = Math.floor(queue.audioResource.playbackDuration / 1000);
    }
    
    const embed = createPlayerEmbed(queue.currentSong, elapsed);
    const row = createPlayerButtons(queue.paused, queue.currentSong.url);

    await queue.playerMessage.edit({
      embeds: [embed],
      components: [row]
    });
  } catch (err) {
    console.error('Failed to update player message:', err);
  }
}

function startUpdateInterval(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  if (queue.updateInterval) {
    clearInterval(queue.updateInterval);
  }

  queue.updateInterval = setInterval(async () => {
    const activeQueue = queues.get(guildId);
    if (!activeQueue || activeQueue.paused || !activeQueue.audioResource) return;
    await updatePlayerMessage(guildId);
  }, 10000);
}

function stopUpdateInterval(guildId) {
  const queue = queues.get(guildId);
  if (queue && queue.updateInterval) {
    clearInterval(queue.updateInterval);
    queue.updateInterval = null;
  }
}

export async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  stopUpdateInterval(guildId);

  // Terminate any active yt-dlp stream process
  if (queue.audioProcess) {
    try {
      queue.audioProcess.kill();
    } catch (e) {
      // ignore kill errors
    }
    queue.audioProcess = null;
  }

  if (queue.songs.length === 0) {
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
    db.addMusicHistory(nextSong.title, nextSong.url);
    console.log(`[Player] Bắt đầu phát bài hát: "${nextSong.title}" (${nextSong.url})`);

    // Spawn yt-dlp for streaming
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

    // Pipe child.stdout directly into the audio resource
    const resource = createAudioResource(child.stdout, {
      inputType: StreamType.Arbitrary
    });
    
    queue.audioResource = resource;
    queue.player.play(resource);
    console.log(`[Player] Luồng dữ liệu âm thanh đã nạp thành công vào AudioPlayer.`);

    const embed = createPlayerEmbed(nextSong, 0);
    const row = createPlayerButtons(false, nextSong.url);
    
    if (queue.playerMessage) {
      try {
        await queue.playerMessage.delete();
      } catch (e) {
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

    startUpdateInterval(guildId);

  } catch (err) {
    console.error('Playback execution error:', err);
    try {
      await queue.textChannel.send(`⚠️ *Không thể phát bài hát **${nextSong.title}** do lỗi kỹ thuật.*`);
    } catch (e) {
      console.error('Failed to send playback error message:', e);
    }
    playNext(guildId);
  }
}

export async function playSong(guildId, voiceChannel, textChannel, query, requester) {
  let queue = queues.get(guildId);

  // Ensure yt-dlp is available before doing any actions
  try {
    await ensureYtdlp();
  } catch (err) {
    console.error('Failed to ensure yt-dlp binary:', err);
    return { success: false, message: 'Đang tải bộ giải mã âm thanh yt-dlp, vui lòng thử lại sau vài giây!' };
  }

  let songInfo = null;
  try {
    songInfo = await ytdlpExtractInfo(query);
    songInfo.requestedBy = requester;
  } catch (err) {
    console.error('yt-dlp extract info error:', err);
    return { success: false, message: 'Đã xảy ra lỗi khi tìm kiếm bài hát.' };
  }

  if (!queue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch (error) {
        stopQueue(guildId);
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
      updateInterval: null
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
  }

  if (queue.currentSong) {
    queue.songs.push(songInfo);
    return { success: true, queued: true, song: songInfo };
  } else {
    queue.songs.push(songInfo);
    playNext(guildId);
    return { success: true, queued: false, song: songInfo };
  }
}

export function pauseQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.paused) return false;

  queue.paused = true;
  queue.player.pause();
  stopUpdateInterval(guildId);
  updatePlayerMessage(guildId);
  return true;
}

export function resumeQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.paused) return false;

  queue.paused = false;
  queue.player.unpause();
  startUpdateInterval(guildId);
  updatePlayerMessage(guildId);
  return true;
}

export function skipQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;

  queue.player.stop();
  return true;
}

export function stopQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;

  stopUpdateInterval(guildId);
  if (queue.timeoutId) clearTimeout(queue.timeoutId);

  // Terminate streaming process
  if (queue.audioProcess) {
    try {
      queue.audioProcess.kill();
    } catch (e) {
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

export function toggleFavoriteQueue(guildId, userTag) {
  const queue = queues.get(guildId);
  if (!queue || !queue.currentSong) return { success: false, added: false };

  const song = queue.currentSong;
  const isFav = db.isFavorite(song.url);
  
  if (isFav) {
    db.removeFavorite(song.url);
    updatePlayerMessage(guildId);
    return { success: true, added: false, song };
  } else {
    db.addFavorite(song.title, song.url, userTag);
    updatePlayerMessage(guildId);
    return { success: true, added: true, song };
  }
}

export default {
  queues,
  playSong,
  pauseQueue,
  resumeQueue,
  skipQueue,
  stopQueue,
  toggleFavoriteQueue,
  formatProgressBar,
  createPlayerEmbed,
  createPlayerButtons
};
