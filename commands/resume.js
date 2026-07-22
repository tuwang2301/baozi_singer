import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { resumeQueue } from '../music/player.js';
import { getPlayerAccess } from '../music/playerAccess.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Tiếp tục phát nhạc đang tạm dừng');

export async function execute(interaction) {
  const access = getPlayerAccess(interaction);
  if (!access.ok) {
    return interaction.reply(access.reply);
  }

  const { queue } = access;

  if (!queue.paused) {
    return interaction.reply({
      content: '▶️ Nhạc đang phát rồi. Dùng `/pause` để tạm dừng.',
      flags: MessageFlags.Ephemeral
    });
  }

  resumeQueue(interaction.guildId);

  return interaction.reply({
    content: `▶️ Tiếp tục phát **[${queue.currentSong.title}](${queue.currentSong.url})**.`,
    flags: MessageFlags.Ephemeral
  });
}
