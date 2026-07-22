import { playSong } from '../music/player.js';

export async function handleMusicSelect(interaction) {
  const { customId, values, member, guild, channel } = interaction;
  const songUrl = values[0];

  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ Bạn phải ở trong một Voice Channel để phát bài hát này!',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    const result = await playSong(
      guild.id,
      voiceChannel,
      channel,
      songUrl,
      interaction.user.username
    );

    if (!result.success) {
      return interaction.editReply({ content: `❌ ${result.message}` });
    }

    if (result.queued) {
      return interaction.editReply({
        content: `✅ Đã thêm vào hàng đợi từ menu chọn: **[${result.song.title}](${result.song.url})**`
      });
    } else {
      return interaction.editReply({
        content: `🎶 Bắt đầu phát từ menu chọn: **[${result.song.title}](${result.song.url})**`
      });
    }
  } catch (err) {
    console.error('Music select error:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi cố gắng phát bài hát đã chọn.'
    });
  }
}
