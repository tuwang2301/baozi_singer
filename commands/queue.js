import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import { getQueueSnapshot, PLAYLIST_MAX } from '../music/player.js';

const MAX_EMBED_DESC = 3800;

function truncateLabel(text, max = 95) {
  if (!text) return 'Không rõ tên';
  return text.length > max ? `${text.substring(0, max - 3)}...` : text;
}

function formatSongLine(position, song, titleMax = 55) {
  return `**${position}.** ${truncateLabel(song.title, titleMax)} — *${song.requestedBy || 'Không rõ'}*`;
}

function buildQueueDescription(current, waiting) {
  const lines = [];

  if (current) {
    lines.push('**▶️ Đang phát:**');
    lines.push(formatSongLine(1, current, 70));
  }

  if (waiting.length > 0) {
    lines.push('');
    lines.push(`**⏳ Đang chờ (${waiting.length} bài):**`);

    const startPos = current ? 2 : 1;
    let shown = 0;

    for (let i = 0; i < waiting.length; i++) {
      const line = formatSongLine(startPos + i, waiting[i]);
      const nextLength = lines.join('\n').length + line.length + 1;
      if (nextLength > MAX_EMBED_DESC) break;
      lines.push(line);
      shown++;
    }

    if (shown < waiting.length) {
      lines.push(`\n*... và ${waiting.length - shown} bài khác. Dùng menu bên dưới để chọn bài.*`);
    }
  } else if (current) {
    lines.push('');
    lines.push('*Không còn bài nào trong hàng đợi.*');
  }

  return lines.join('\n');
}

export function buildQueueView(guildId) {
  const snapshot = getQueueSnapshot(guildId);
  if (!snapshot) return null;

  const { current, waiting } = snapshot;

  const embed = new EmbedBuilder()
    .setColor('#caffbf')
    .setTitle('🎵 Hàng đợi nhạc — LDR Space')
    .setDescription(buildQueueDescription(current, waiting))
    .setTimestamp()
    .setFooter({ text: `Tối đa ${PLAYLIST_MAX} bài mỗi lần thêm playlist • LDR Space` });

  const components = [];

  if (waiting.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('queue_promote_select')
      .setPlaceholder('Chọn bài để đẩy lên đầu hàng đợi...')
      .addOptions(
        waiting.slice(0, PLAYLIST_MAX).map((song, index) => ({
          label: truncateLabel(song.title),
          description: `Vị trí #${index + 1} trong hàng chờ`,
          value: String(index)
        }))
      );

    components.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  const refreshButton = new ButtonBuilder()
    .setCustomId('queue_refresh')
    .setLabel('Làm mới')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Secondary);

  components.push(new ActionRowBuilder().addComponents(refreshButton));

  return { embeds: [embed], components };
}

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Xem hàng đợi nhạc và sắp xếp bài sắp phát');

export async function execute(interaction) {
  const view = buildQueueView(interaction.guild.id);

  if (!view) {
    return interaction.reply({
      content: '📭 Không có bài hát nào đang phát hoặc trong hàng đợi. Dùng `/play` để bắt đầu nhé!',
      flags: MessageFlags.Ephemeral
    });
  }

  return interaction.reply(view);
}
