import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('diary')
  .setDescription('Mở nhật ký tình yêu của hai bạn');

export function createDiaryView(page = 1) {
  const totalPages = db.getDiaryTotalPages();
  const embed = new EmbedBuilder().setColor('#ffadad');

  if (totalPages === 0) {
    embed
      .setTitle('📖 Nhật ký tình yêu')
      .setDescription(
        'Chưa có trang nhật ký nào được viết. \n\nHãy nhấn nút **✍️ Viết nhật ký** bên dưới để lưu giữ kỷ niệm đầu tiên của hai bạn nhé! 💕'
      )
      .setFooter({ text: 'Trang 0 / 0 • LDR Space' })
      .setTimestamp();

    const writeButton = new ButtonBuilder()
      .setCustomId('diary_write')
      .setLabel('Viết nhật ký')
      .setEmoji('✍️')
      .setStyle(ButtonStyle.Primary);

    const prevButton = new ButtonBuilder()
      .setCustomId('diary_prev_0')
      .setLabel('Trang trước')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const nextButton = new ButtonBuilder()
      .setCustomId('diary_next_0')
      .setLabel('Trang sau')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(prevButton, writeButton, nextButton);
    return { embeds: [embed], components: [row] };
  }

  // Ensure page is within bounds
  let currentPage = Math.max(1, Math.min(page, totalPages));
  const entry = db.getDiaryPage(currentPage);

  if (!entry) {
    // Fallback if something went wrong
    embed.setTitle('Error').setDescription('Không tìm thấy trang nhật ký.');
    return { embeds: [embed], components: [] };
  }

  const createdDate = new Date(entry.created_at).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  embed
    .setTitle(`📖 ${entry.title}`)
    .setDescription(entry.content)
    .addFields(
      { name: '✍️ Người viết', value: entry.author, inline: true },
      { name: '📅 Thời gian', value: createdDate, inline: true }
    )
    .setFooter({ text: `Trang ${currentPage} / ${totalPages} • LDR Space` })
    .setTimestamp();

  const writeButton = new ButtonBuilder()
    .setCustomId('diary_write')
    .setLabel('Viết nhật ký')
    .setEmoji('✍️')
    .setStyle(ButtonStyle.Primary);

  const prevButton = new ButtonBuilder()
    .setCustomId(`diary_prev_${currentPage}`)
    .setLabel('Trang trước')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === 1);

  const nextButton = new ButtonBuilder()
    .setCustomId(`diary_next_${currentPage}`)
    .setLabel('Trang sau')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === totalPages);

  const row = new ActionRowBuilder().addComponents(prevButton, writeButton, nextButton);
  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  const diaryView = createDiaryView(1);
  return interaction.reply(diaryView);
}
