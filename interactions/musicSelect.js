import { MessageFlags } from 'discord.js';
import { enqueueKnownSongs, PLAYLIST_MAX } from '../music/player.js';
import db from '../database.js';

function toReplaySong(song, snapshotId, position) {
  return {
    title: song.title,
    url: song.url,
    snapshotId,
    snapshotPosition: position
  };
}

function buildModeMenu(snapshot) {
  const options = [{
    label: '📋 Phát từ đầu playlist',
    description: `Phát lại toàn bộ ${snapshot.song_count} bài từ bài 1`,
    value: `start:${snapshot.id}`
  }];

  if (snapshot.resume_index > 0 && snapshot.resume_index < snapshot.song_count) {
    options.push({
      label: '▶️ Tiếp tục từ lần dừng gần nhất',
      description: `Bắt đầu từ bài ${snapshot.resume_index + 1}`,
      value: `resume:${snapshot.id}`
    });
  }

  options.push({
    label: '⏩ Chọn bài để bắt đầu',
    description: 'Tự chọn bài số N rồi phát từ đó đến hết',
    value: `jump:${snapshot.id}`
  });

  return options;
}

function formatReplayResult(result, label) {
  if (!result.queued) {
    return `🔁 Đang phát lại **${result.count}** bài từ *${label}*.\n🎶 Đang phát: **[${result.firstSong.title}](${result.firstSong.url})**`;
  }
  return `🔁 Đã thêm **${result.count}** bài từ *${label}* vào hàng đợi.`;
}

export async function handleMusicSelect(interaction) {
  const { customId, values, member, guild, channel } = interaction;

  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ Bạn phải ở trong một Voice Channel để phát bài hát này!',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply();

  try {
    if (customId === 'history_select') {
      const entry = db.getMusicHistoryEntry(parseInt(values[0], 10));
      if (!entry) {
        return interaction.editReply({ content: '❌ Bài hát này không còn trong lịch sử.' });
      }
      const result = await enqueueKnownSongs(
        guild.id,
        voiceChannel,
        channel,
        [{ title: entry.title, url: entry.url }],
        interaction.user.username
      );
      if (!result.success) return interaction.editReply({ content: `❌ ${result.message}` });
      return interaction.editReply({
        content: result.queued
          ? `✅ Đã thêm vào hàng đợi: **[${result.song.title}](${result.song.url})**`
          : `🎶 Bắt đầu phát: **[${result.song.title}](${result.song.url})**`
      });
    } else if (customId === 'favorite_select') {
      const favorite = db.getFavoriteById(parseInt(values[0], 10));
      if (!favorite) {
        return interaction.editReply({ content: '❌ Bài hát này không còn trong danh sách yêu thích.' });
      }
      const result = await enqueueKnownSongs(
        guild.id,
        voiceChannel,
        channel,
        [{ title: favorite.title, url: favorite.url }],
        interaction.user.username
      );
      if (!result.success) return interaction.editReply({ content: `❌ ${result.message}` });
      return interaction.editReply({
        content: result.queued
          ? `✅ Đã thêm vào hàng đợi: **[${result.song.title}](${result.song.url})**`
          : `🎶 Bắt đầu phát: **[${result.song.title}](${result.song.url})**`
      });
    } else if (customId === 'replay_pick_playlist') {
      const snapshotId = parseInt(values[0], 10);
      const snapshot = db.getPlaylistSnapshot(snapshotId);
      if (!snapshot) {
        return interaction.editReply({ content: '❌ Playlist này không còn tồn tại.' });
      }

      const options = buildModeMenu(snapshot);
      return interaction.editReply({
        content: `🎛️ Chọn cách phát lại cho playlist **${snapshot.label}**:`,
        embeds: [],
        components: [{
          type: 1,
          components: [{
            type: 3,
            custom_id: 'replay_pick_mode',
            placeholder: 'Chọn cách phát lại...',
            options
          }]
        }]
      });
    } else if (customId === 'replay_pick_mode') {
      const [mode, snapshotIdRaw] = values[0].split(':');
      const snapshotId = parseInt(snapshotIdRaw, 10);
      const snapshot = db.getPlaylistSnapshot(snapshotId);
      if (!snapshot) {
        return interaction.editReply({ content: '❌ Playlist này không còn tồn tại.' });
      }

      const songs = db.getPlaylistSnapshotSongs(snapshotId);
      if (!songs.length) {
        return interaction.editReply({ content: '❌ Playlist này đang trống.' });
      }

      if (mode === 'jump') {
        const options = songs.slice(0, PLAYLIST_MAX).map((song, index) => ({
          label: `${index + 1}. ${song.title.length > 80 ? `${song.title.slice(0, 77)}...` : song.title}`,
          description: `Bắt đầu từ bài ${index + 1}`,
          value: `${snapshotId}:${index}`
        }));
        return interaction.editReply({
          content: `⏩ Chọn bài bắt đầu cho **${snapshot.label}**:`,
          embeds: [],
          components: [{
            type: 1,
            components: [{
              type: 3,
              custom_id: 'replay_pick_song',
              placeholder: 'Chọn bài bắt đầu...',
              options
            }]
          }]
        });
      }

      const startIndex = mode === 'resume' ? snapshot.resume_index : 0;
      const selectedSongs = songs
        .slice(startIndex, startIndex + PLAYLIST_MAX)
        .map((song, idx) => toReplaySong(song, snapshotId, startIndex + idx));
      const result = await enqueueKnownSongs(
        guild.id,
        voiceChannel,
        channel,
        selectedSongs,
        interaction.user.username,
        `Replay: ${snapshot.label}`
      );
      if (!result.success) return interaction.editReply({ content: `❌ ${result.message}` });
      return interaction.editReply({ content: formatReplayResult(result, snapshot.label), components: [] });
    } else if (customId === 'replay_pick_song') {
      const [snapshotIdRaw, startIndexRaw] = values[0].split(':');
      const snapshotId = parseInt(snapshotIdRaw, 10);
      const startIndex = parseInt(startIndexRaw, 10);
      const snapshot = db.getPlaylistSnapshot(snapshotId);
      if (!snapshot) {
        return interaction.editReply({ content: '❌ Playlist này không còn tồn tại.' });
      }
      const songs = db.getPlaylistSnapshotSongs(snapshotId);
      if (!songs.length || startIndex >= songs.length) {
        return interaction.editReply({ content: '❌ Bài đã chọn không hợp lệ.' });
      }
      const selectedSongs = songs
        .slice(startIndex, startIndex + PLAYLIST_MAX)
        .map((song, idx) => toReplaySong(song, snapshotId, startIndex + idx));
      const result = await enqueueKnownSongs(
        guild.id,
        voiceChannel,
        channel,
        selectedSongs,
        interaction.user.username,
        `Replay: ${snapshot.label}`
      );
      if (!result.success) return interaction.editReply({ content: `❌ ${result.message}` });
      return interaction.editReply({ content: formatReplayResult(result, `${snapshot.label} (từ bài ${startIndex + 1})`), components: [] });
    } else {
      return interaction.editReply({ content: '❌ Menu không hợp lệ.' });
    }
  } catch (err) {
    console.error('Music select error:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi cố gắng phát bài hát đã chọn.'
    });
  }
}
