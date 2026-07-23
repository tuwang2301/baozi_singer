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

export const data = new SlashCommandBuilder()
  .setName('favorites')
  .setDescription('Hiển thị danh sách các bài hát yêu thích chung');

export async function execute(interaction) {
  const favorites = await db.getFavorites();

  if (favorites.length === 0) {
    return interaction.reply({
      content: '💖 Danh sách yêu thích hiện đang trống. Hãy nhấn nút ⭐ Yêu thích trên trình phát nhạc để thêm bài hát!',
      flags: MessageFlags.Ephemeral
    });
  }

  const lines = favorites.map((song, i) =>
    `**${i + 1}.** ${truncateLabel(song.title)} — *${song.added_by}*`
  );
  let description = lines.join('\n');
  if (description.length > MAX_EMBED_DESC) {
    description = `${lines.slice(0, 15).join('\n')}\n\n*... dùng menu bên dưới để chọn bài.*`;
  }

  const embed = new EmbedBuilder()
    .setColor('#ffc6ff')
    .setTitle('💖 Danh sách bài hát yêu thích chung')
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Chọn bài hát bên dưới để phát nhanh' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('favorite_select')
    .setPlaceholder('Chọn bài hát yêu thích để phát...')
    .addOptions(
      favorites.slice(0, 25).map((song) => ({
        label: truncateLabel(song.title, 95),
        description: `Thêm bởi: ${song.added_by}`,
        value: String(song.id)
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
