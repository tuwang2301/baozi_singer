import { SlashCommandBuilder } from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('set-start-date')
  .setDescription('Cập nhật ngày bắt đầu yêu nhau')
  .addStringOption(option =>
    option
      .setName('date')
      .setDescription('Ngày bắt đầu yêu nhau (định dạng YYYY-MM-DD, ví dụ: 2024-05-20)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const dateStr = interaction.options.getString('date');
  
  // Validate YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return interaction.reply({
      content: '❌ Định dạng ngày không đúng! Vui lòng nhập dạng `YYYY-MM-DD` (Ví dụ: `2024-05-20`).',
      ephemeral: true
    });
  }

  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    return interaction.reply({
      content: '❌ Ngày bạn nhập không hợp lệ! Vui lòng kiểm tra lại.',
      ephemeral: true
    });
  }

  await db.setStat('start_date', dateStr);

  return interaction.reply({
    content: `💖 Ghi nhận thành công! Ngày kỷ niệm bắt đầu yêu nhau được đặt là: **${dateStr}**.\n👉 Gõ lệnh \`/countdown\` để xem hai bạn đã bên nhau bao lâu nhé!`
  });
}
