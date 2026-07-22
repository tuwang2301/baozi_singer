import { 
  pauseQueue, 
  resumeQueue, 
  skipQueue, 
  stopQueue, 
  toggleFavoriteQueue,
  queues
} from '../music/player.js';

export async function handlePlayerButtons(interaction) {
  const { customId, guildId } = interaction;
  const queue = queues.get(guildId);

  if (!queue) {
    return interaction.reply({
      content: '❌ Không có bài hát nào đang phát hoặc trình phát đã dừng.',
      ephemeral: true
    });
  }

  // Check if user is in the same voice channel as the bot
  const memberVoiceChannel = interaction.member.voice.channel;
  if (!memberVoiceChannel || memberVoiceChannel.id !== queue.voiceChannel.id) {
    return interaction.reply({
      content: '❌ Bạn phải ở cùng Voice Channel với bot để sử dụng các nút này!',
      ephemeral: true
    });
  }

  await interaction.deferUpdate();

  switch (customId) {
    case 'player_pause_resume':
      if (queue.paused) {
        resumeQueue(guildId);
      } else {
        pauseQueue(guildId);
      }
      break;

    case 'player_skip':
      skipQueue(guildId);
      break;

    case 'player_stop':
      stopQueue(guildId);
      await queue.textChannel.send(`⏹️ Bot đã được dừng phát và rời khỏi Voice Channel bởi **${interaction.user.username}**.`);
      break;

    case 'player_favorite':
      const userTag = interaction.user.username;
      const res = toggleFavoriteQueue(guildId, userTag);
      if (res.success) {
        const msg = res.added 
          ? `💖 Đã thêm bài hát vào danh sách yêu thích chung!` 
          : `💔 Đã xóa bài hát khỏi danh sách yêu thích chung!`;
        await interaction.followUp({
          content: msg,
          ephemeral: true
        });
      }
      break;
  }
}
