import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { stopQueue } from '../music/player.js';
import { getPlayerAccess } from '../music/playerAccess.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Dừng phát nhạc và cho bot rời voice channel');

export async function execute(interaction) {
  const access = getPlayerAccess(interaction);
  if (!access.ok) {
    return interaction.reply(access.reply);
  }

  const { queue } = access;
  const textChannel = queue.textChannel;

  stopQueue(interaction.guildId);

  await textChannel.send(`⏹️ Bot đã được dừng phát và rời khỏi Voice Channel bởi **${interaction.user.username}**.`);

  return interaction.reply({
    content: '⏹️ Đã dừng phát nhạc và rời voice channel.',
    flags: MessageFlags.Ephemeral
  });
}
