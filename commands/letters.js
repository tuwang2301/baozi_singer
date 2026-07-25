import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} from 'discord.js';
import { getInboxLetters, getOutboxLetters } from '../database.js';

function formatDateShort(dateInput) {
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function truncateText(str, maxLength = 80) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

export const data = new SlashCommandBuilder()
  .setName('letters')
  .setDescription('Xem hòm thư đi và đến của bạn (gồm thư đang khóa và đã mở)');

export async function execute(interaction) {
  if (interaction.isChatInputCommand()) {
    await interaction.deferReply();
  } else {
    await interaction.deferUpdate();
  }
  const userId = interaction.user.id;

  try {
    const inbox = await getInboxLetters(userId);
    const outbox = await getOutboxLetters(userId);

    const embed = new EmbedBuilder()
      .setColor('#ffc6ff')
      .setTitle('📫 Hòm thư tình yêu của bạn')
      .setDescription('Nơi lưu trữ những bức thư tình gửi từ tương lai. Thư đang khóa sẽ chỉ đọc được khi đến đúng ngày hẹn.')
      .setTimestamp();

    // 1. Format Inbox Section
    let inboxText = '';
    const unlockedInbox = [];

    if (inbox.length === 0) {
      inboxText = '*Hòm thư đến trống.*';
    } else {
      inboxText = inbox.map((letter, index) => {
        const unlockDateStr = formatDateShort(letter.unlock_date);
        if (letter.is_unlocked) {
          unlockedInbox.push(letter);
          return `**${index + 1}.** 🔓 **${truncateText(letter.title, 40)}** — từ *${letter.sender_name}* (Đã mở khóa)`;
        } else {
          return `**${index + 1}.** 🔒 *Thư từ ${letter.sender_name}* (Mở khóa ngày: **${unlockDateStr}**)`;
        }
      }).join('\n');
    }
    embed.addFields({ name: '📥 Thư đã nhận (Inbox)', value: inboxText });

    // 2. Format Outbox Section
    let outboxText = '';
    if (outbox.length === 0) {
      outboxText = '*Hòm thư đi trống.*';
    } else {
      outboxText = outbox.map((letter, index) => {
        const unlockDateStr = formatDateShort(letter.unlock_date);
        const status = letter.is_unlocked ? '🔓 Đã mở khóa' : '🔒 Đang khóa';
        return `**${index + 1}.** ✉️ **${truncateText(letter.title, 40)}** — gửi đến *${letter.recipient_name}* (${status} - Mở ngày: ${unlockDateStr})`;
      }).join('\n');
    }
    embed.addFields({ name: '📤 Thư đã gửi (Outbox)', value: outboxText });

    // 3. Build Select Menu for Unlocked Received Letters
    const components = [];
    if (unlockedInbox.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('letter_read_select')
        .setPlaceholder('Chọn một bức thư đã mở khóa để đọc nội dung...');

      unlockedInbox.forEach(letter => {
        selectMenu.addOptions({
          label: truncateText(letter.title, 40),
          description: `Gửi từ ${letter.sender_name} • Mở khóa ngày ${formatDateShort(letter.unlock_date)}`,
          value: `letter_read:${letter.id}`
        });
      });

      const row = new ActionRowBuilder().addComponents(selectMenu);
      components.push(row);
    }

    return interaction.editReply({ embeds: [embed], components });

  } catch (err) {
    console.error('Failed to execute letters command:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi tải hòm thư. Vui lòng thử lại sau!'
    });
  }
}
