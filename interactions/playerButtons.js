import { MessageFlags } from 'discord.js';
import {
  pauseQueue,
  resumeQueue,
  skipQueue,
  stopQueue,
  toggleFavoriteQueue
} from '../music/player.js';
import { getPlayerAccess } from '../music/playerAccess.js';

export async function handlePlayerButtons(interaction) {
  const access = getPlayerAccess(interaction);
  if (!access.ok) {
    return interaction.reply(access.reply);
  }

  const { customId, guildId } = interaction;
  const { queue } = access;

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

    case 'player_favorite': {
      const res = toggleFavoriteQueue(guildId, interaction.user.username);
      if (res.success) {
        const msg = res.added
          ? '💖 Đã thêm bài hát vào danh sách yêu thích chung!'
          : '💔 Đã xóa bài hát khỏi danh sách yêu thích chung!';
        await interaction.followUp({
          content: msg,
          flags: MessageFlags.Ephemeral
        });
      }
      break;
    }
  }
}
