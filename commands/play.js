import { SlashCommandBuilder } from 'discord.js';
import { playSong } from '../music/player.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Phát nhạc từ YouTube (link hoặc tên bài hát)')
  .addStringOption(option =>
    option
      .setName('song')
      .setDescription('Tên bài hát hoặc URL YouTube')
      .setRequired(true)
  );

export async function execute(interaction) {
  const songQuery = interaction.options.getString('song');
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ Bạn phải tham gia một Voice Channel (kênh đàm thoại) trước!',
      ephemeral: true
    });
  }

  // Defer reply because fetching metadata and streams from YouTube takes time
  await interaction.deferReply();

  try {
    const result = await playSong(
      interaction.guild.id,
      voiceChannel,
      interaction.channel,
      songQuery,
      interaction.user.username
    );

    if (!result.success) {
      return interaction.editReply({ content: `❌ ${result.message}` });
    }

    if (result.playlist) {
      let content = `✅ Đã thêm **${result.count}** bài từ playlist **${result.playlistTitle}** vào hàng đợi.`;

      if (result.truncated) {
        content += `\n📋 *Playlist có ${result.totalCount} bài, đã lấy ${result.count} bài đầu.*`;
      }

      if (!result.queued) {
        content += `\n🎶 Bắt đầu phát: **[${result.firstSong.title}](${result.firstSong.url})**`;
      } else {
        content += `\n⏳ Hiện có **${result.waitingCount}** bài đang chờ trước các bài vừa thêm.`;
      }

      return interaction.editReply({ content });
    }

    if (result.queued) {
      return interaction.editReply({
        content: `✅ Đã thêm vào hàng đợi: **[${result.song.title}](${result.song.url})** (yêu cầu bởi: ${interaction.user.username})`
      });
    }

    return interaction.editReply({
      content: `🎶 Bắt đầu phát: **[${result.song.title}](${result.song.url})**`
    });
  } catch (err) {
    console.error('Play command error:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi thực thi lệnh phát nhạc.'
    });
  }
}
