import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('countdown')
  .setDescription('Hiển thị số ngày đã bên nhau và đếm ngược tới ngày gặp lại');

export async function execute(interaction) {
  const startDateStr = await db.getStat('start_date');
  const meetupDateStr = await db.getStat('meetup_date');

  const embed = new EmbedBuilder()
    .setColor('#ffd6a5')
    .setTitle('💖 Không gian đếm ngược tình yêu')
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Kết nối yêu xa' });

  // 1. Calculate Days Together
  if (startDateStr) {
    try {
      const startDate = new Date(startDateStr);
      const today = new Date();
      // Reset hours to compare dates only
      startDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0) {
        embed.addFields({
          name: '🗓️ Ngày bên nhau',
          value: `🎉 Hai bạn đã ở bên nhau **${diffDays}** ngày rồi đấy! \n*(Bắt đầu từ ngày ${startDateStr})*`,
          inline: false
        });
      } else {
        // Future start date
        const daysToStart = Math.abs(diffDays);
        embed.addFields({
          name: '🗓️ Đếm ngược ngày bắt đầu',
          value: `⏳ Còn **${daysToStart}** ngày nữa là đến ngày kỷ niệm bắt đầu tình yêu của hai bạn! \n*(Dự kiến: ${startDateStr})*`,
          inline: false
        });
      }
    } catch (e) {
      embed.addFields({
        name: '🗓️ Ngày bên nhau',
        value: '⚠️ Định dạng ngày bắt đầu bị lỗi. Vui lòng thiết lập lại bằng `/set-start-date`.',
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '🗓️ Ngày bên nhau',
      value: 'Chưa thiết lập ngày hai bạn yêu nhau. \n👉 Dùng lệnh `/set-start-date [YYYY-MM-DD]` để lưu lại nhé!',
      inline: false
    });
  }

  // 2. Calculate Next Meetup
  if (meetupDateStr) {
    try {
      const meetupDate = new Date(meetupDateStr);
      const today = new Date();
      meetupDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = meetupDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        embed.addFields({
          name: '✈️ Đếm ngược ngày gặp mặt',
          value: `⏳ Chỉ còn **${diffDays}** ngày nữa là hai bạn được ôm nhau rồi! 💕 \n*(Ngày hẹn: ${meetupDateStr})*`,
          inline: false
        });
      } else if (diffDays === 0) {
        embed.addFields({
          name: '✈️ Đếm ngược ngày gặp mặt',
          value: `🥳 **HÔM NAY CHÍNH LÀ NGÀY GẶP NHAU!** Chúc hai bạn có những giây phút ngọt ngào nhất bên nhau! 🥰`,
          inline: false
        });
      } else {
        embed.addFields({
          name: '✈️ Đếm ngược ngày gặp mặt',
          value: `👋 Cuộc gặp gỡ gần nhất đã diễn ra vào ngày ${meetupDateStr} (${Math.abs(diffDays)} ngày trước).\n👉 Hãy lên lịch tiếp theo và cập nhật bằng lệnh \`/set-meetup [YYYY-MM-DD]\`!`,
          inline: false
        });
      }
    } catch (e) {
      embed.addFields({
        name: '✈️ Đếm ngược ngày gặp mặt',
        value: '⚠️ Định dạng ngày gặp mặt bị lỗi. Vui lòng thiết lập lại bằng `/set-meetup`.',
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '✈️ Đếm ngược ngày gặp mặt',
      value: 'Chưa thiết lập ngày gặp nhau tiếp theo. \n👉 Dùng lệnh `/set-meetup [YYYY-MM-DD]` để tạo đếm ngược nhé!',
      inline: false
    });
  }

  return interaction.reply({ embeds: [embed] });
}
