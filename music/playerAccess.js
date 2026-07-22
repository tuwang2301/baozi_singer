import { MessageFlags } from 'discord.js';
import { queues } from './player.js';

export function getPlayerAccess(interaction) {
  const queue = queues.get(interaction.guildId);

  if (!queue?.currentSong) {
    return {
      ok: false,
      reply: {
        content: '❌ Không có bài hát nào đang phát hoặc trình phát đã dừng.',
        flags: MessageFlags.Ephemeral
      }
    };
  }

  const memberVoiceChannel = interaction.member.voice.channel;
  if (!memberVoiceChannel || memberVoiceChannel.id !== queue.voiceChannel.id) {
    return {
      ok: false,
      reply: {
        content: '❌ Bạn phải ở cùng Voice Channel với bot để điều khiển nhạc!',
        flags: MessageFlags.Ephemeral
      }
    };
  }

  return { ok: true, queue };
}
