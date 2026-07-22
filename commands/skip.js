import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { skipQueue } from '../music/player.js';
import { getPlayerAccess } from '../music/playerAccess.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Bỏ qua bài hát đang phát');

export async function execute(interaction) {
  const access = getPlayerAccess(interaction);
  if (!access.ok) {
    return interaction.reply(access.reply);
  }

  const { queue } = access;
  const skipped = queue.currentSong;

  skipQueue(interaction.guildId);

  return interaction.reply({
    content: `⏭️ Đã bỏ qua **[${skipped.title}](${skipped.url})**.`,
    flags: MessageFlags.Ephemeral
  });
}
