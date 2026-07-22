import { MessageFlags } from 'discord.js';
import { buildQueueView } from '../commands/queue.js';
import { promoteInQueue, queues } from '../music/player.js';

function isInSameVoiceChannel(interaction, queue) {
  const memberVoiceChannel = interaction.member.voice.channel;
  return memberVoiceChannel && memberVoiceChannel.id === queue.voiceChannel.id;
}

export async function handleQueueRefresh(interaction) {
  const queue = queues.get(interaction.guildId);

  if (!queue) {
    return interaction.reply({
      content: '❌ Không có bài hát nào đang phát hoặc trình phát đã dừng.',
      flags: MessageFlags.Ephemeral
    });
  }

  if (!isInSameVoiceChannel(interaction, queue)) {
    return interaction.reply({
      content: '❌ Bạn phải ở cùng Voice Channel với bot để xem hàng đợi!',
      flags: MessageFlags.Ephemeral
    });
  }

  const view = buildQueueView(interaction.guildId);
  if (!view) {
    return interaction.update({
      content: '📭 Hàng đợi đã trống.',
      embeds: [],
      components: []
    });
  }

  await interaction.update(view);
}

export async function handleQueuePromote(interaction) {
  const queue = queues.get(interaction.guildId);

  if (!queue) {
    return interaction.reply({
      content: '❌ Không có bài hát nào đang phát hoặc trình phát đã dừng.',
      flags: MessageFlags.Ephemeral
    });
  }

  if (!isInSameVoiceChannel(interaction, queue)) {
    return interaction.reply({
      content: '❌ Bạn phải ở cùng Voice Channel với bot để sắp xếp hàng đợi!',
      flags: MessageFlags.Ephemeral
    });
  }

  const index = parseInt(interaction.values[0], 10);
  const promotedSong = promoteInQueue(interaction.guildId, index);

  if (!promotedSong) {
    return interaction.reply({
      content: '❌ Không thể đẩy bài hát này. Hàng đợi có thể đã thay đổi, hãy thử lại.',
      flags: MessageFlags.Ephemeral
    });
  }

  const view = buildQueueView(interaction.guildId);
  await interaction.update(view);

  await interaction.followUp({
    content: `⬆️ Đã đẩy **[${promotedSong.title}](${promotedSong.url})** lên đầu hàng đợi! Sẽ phát sau bài hiện tại.`,
    ephemeral: true
  });
}
