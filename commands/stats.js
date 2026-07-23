import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Hiển thị bảng thống kê tương tác và kỷ niệm của hai bạn');

export async function execute(interaction) {
  const stats = await db.getStats();
  const startDate = stats.start_date || 'Chưa thiết lập (Dùng `/set-start-date`)';
  const meetupDate = stats.meetup_date || 'Chưa thiết lập (Dùng `/set-meetup`)';
  
  const hugs = stats.hug_count || '0';
  const kisses = stats.kiss_count || '0';
  const misses = stats.miss_count || '0';
  const diaryCount = await db.getDiaryTotalPages() || 0;

  const embed = new EmbedBuilder()
    .setColor('#bdb2ff')
    .setTitle('📊 Bảng thống kê tình yêu - LDR Space')
    .setDescription('Những cột mốc và chỉ số tình cảm ngọt ngào hai bạn đã cùng tạo ra: ❤️')
    .addFields(
      { name: '📅 Ngày bắt đầu yêu', value: startDate, inline: true },
      { name: '✈️ Ngày hẹn gặp lại', value: meetupDate, inline: true },
      { name: '📖 Trang nhật ký', value: `${diaryCount} trang`, inline: true },
      { name: '🫂 Cái ôm (`/hug`)', value: `${hugs} lần`, inline: true },
      { name: '💋 Nụ hôn (`/kiss`)', value: `${kisses} lần`, inline: true },
      { name: '🥺 Nhớ nhung (`/miss`)', value: `${misses} lần`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Đồng hành cùng tình yêu của hai bạn' });

  return interaction.reply({ embeds: [embed] });
}
