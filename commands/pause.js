import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { pauseQueue } from '../music/player.js';
import { getPlayerAccess } from '../music/playerAccess.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Tạm dừng bài hát đang phát');

export async function execute(interaction) {
  const access = getPlayerAccess(interaction);
  if (!access.ok) {
    return interaction.reply(access.reply);
  }

  const { queue } = access;

  if (queue.paused) {
    return interaction.reply({
      content: '⏸️ Nhạc đang tạm dừng rồi. Dùng `/resume` để tiếp tục.',
      flags: MessageFlags.Ephemeral
    });
  }

  pauseQueue(interaction.guildId);

  return interaction.reply({
    content: `⏸️ Đã tạm dừng **[${queue.currentSong.title}](${queue.currentSong.url})**.`,
    flags: MessageFlags.Ephemeral
  });
}
