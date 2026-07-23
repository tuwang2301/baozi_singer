import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} from 'discord.js';
import db from '../database.js';

const MAX_EMBED_DESC = 3800;

function truncateLabel(text, max = 55) {
  if (!text) return 'Không rõ tên';
  return text.length > max ? `${text.substring(0, max - 3)}...` : text;
}

function formatPlayedAt(playedAt) {
  const date = new Date(playedAt);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildHistoryDescription(history) {
  const lines = ['**25 bài nghe gần nhất:**'];
  let shown = 0;

  for (let i = 0; i < history.length; i++) {
    const line = `**${i + 1}.** ${truncateLabel(history[i].title)} — *${formatPlayedAt(history[i].played_at)}*`;
    const nextLength = lines.join('\n').length + line.length + 1;
    if (nextLength > MAX_EMBED_DESC) break;
    lines.push(line);
    shown++;
  }

  if (shown < history.length) {
    lines.push(`\n*... và ${history.length - shown} bài khác. Dùng menu bên dưới để phát lại.*`);
  }

  lines.push('\n💡 *Paste playlist hôm qua? Dùng `/replay` → chọn 📋 playlist đã lưu.*');
  return lines.join('\n');
}

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('Hiển thị 25 bài hát đã nghe gần đây');

export async function execute(interaction) {
  const history = await db.getMusicHistory(25);

  if (history.length === 0) {
    return interaction.reply({
      content: '📭 Lịch sử phát nhạc trống. Hãy dùng lệnh `/play` để nghe nhạc nhé!',
      flags: MessageFlags.Ephemeral
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#a0c4ff')
    .setTitle('⏳ Lịch sử phát nhạc gần đây')
    .setDescription(buildHistoryDescription(history))
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Chọn bài hát bên dưới để phát lại nhanh' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('history_select')
    .setPlaceholder('Chọn bài hát để phát lại...')
    .addOptions(
      history.slice(0, 25).map((song) => {
        const label = truncateLabel(song.title, 95);
        return {
          label,
          description: `Đã phát: ${formatPlayedAt(song.played_at)}`,
          value: String(song.id)
        };
      })
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
