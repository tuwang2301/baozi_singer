import { SlashCommandBuilder } from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('set-meetup')
  .setDescription('Cập nhật ngày gặp nhau tiếp theo')
  .addStringOption(option =>
    option
      .setName('date')
      .setDescription('Ngày hẹn gặp lại (định dạng YYYY-MM-DD, ví dụ: 2026-12-25)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const dateStr = interaction.options.getString('date');
  
  // Validate YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return interaction.reply({
      content: '❌ Định dạng ngày không đúng! Vui lòng nhập dạng `YYYY-MM-DD` (Ví dụ: `2026-12-25`).',
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

  await db.setStat('meetup_date', dateStr);

  return interaction.reply({
    content: `✈️ Cập nhật thành công! Ngày gặp nhau tiếp theo của hai bạn được đặt là: **${dateStr}**.\n👉 Xem đếm ngược bằng lệnh \`/countdown\`.`
  });
}
